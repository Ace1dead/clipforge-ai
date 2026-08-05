export interface WordTimestamp {
  word: string;
  start: number;
  end: number;
}

export interface TranscriptResult {
  words: WordTimestamp[];
  fullText: string;
  language: string;
  engine: 'web-speech' | 'deepgram' | 'estimated';
}

// ─── Web Speech API (browser-native, Chrome-only) ─────────────

let recognition: any = null;

export function isSTTSupported(): boolean {
  return typeof window !== 'undefined' && (
    'SpeechRecognition' in window || 'webkitSpeechRecognition' in window
  );
}

export function getAvailableLanguages(): { code: string; name: string }[] {
  return [
    { code: 'en-US', name: 'English (US)' },
    { code: 'en-GB', name: 'English (UK)' },
    { code: 'es-ES', name: 'Spanish' },
    { code: 'fr-FR', name: 'French' },
    { code: 'de-DE', name: 'German' },
    { code: 'it-IT', name: 'Italian' },
    { code: 'pt-BR', name: 'Portuguese (Brazil)' },
    { code: 'ja-JP', name: 'Japanese' },
    { code: 'ko-KR', name: 'Korean' },
    { code: 'zh-CN', name: 'Chinese (Mandarin)' },
    { code: 'hi-IN', name: 'Hindi' },
    { code: 'ar-SA', name: 'Arabic' },
    { code: 'ru-RU', name: 'Russian' },
  ];
}

function transcribeWebSpeech(
  audioBlob: Blob,
  language = 'en-US',
  onProgress?: (p: number) => void,
  signal?: AbortSignal
): Promise<TranscriptResult> {
  return new Promise((resolve, reject) => {
    if (!isSTTSupported()) {
      reject(new Error('Speech recognition not supported'));
      return;
    }

    if (recognition) {
      try { recognition.stop(); } catch { /* ignore */ }
      recognition = null;
    }

    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    recognition = new SpeechRecognition();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = language;
    recognition.maxAlternatives = 1;

    const words: WordTimestamp[] = [];
    let startTime = Date.now();
    let finalText = '';

    recognition.onstart = () => { startTime = Date.now(); onProgress?.(0); };

    recognition.onresult = (event: any) => {
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const result = event.results[i];
        if (result.isFinal) {
          const text = result[0].transcript.trim();
          const elapsed = (Date.now() - startTime) / 1000;
          const wordCount = text.split(/\s+/).length;
          const wordDuration = elapsed / Math.max(wordCount, 1);

          text.split(/\s+/).forEach((word: string, idx: number) => {
            words.push({
              word,
              start: elapsed - (wordCount - idx) * wordDuration,
              end: elapsed - (wordCount - idx - 1) * wordDuration,
            });
          });
          finalText += text + ' ';
          onProgress?.(Math.min(0.9, words.length / 50));
        }
      }
    };

    recognition.onend = () => {
      resolve({
        words: words.sort((a, b) => a.start - b.start),
        fullText: finalText.trim(),
        language,
        engine: 'web-speech',
      });
    };

    recognition.onerror = (event: any) => {
      if (event.error === 'no-speech') {
        resolve({ words: [], fullText: '', language, engine: 'web-speech' });
      } else {
        reject(new Error(`Speech recognition error: ${event.error}`));
      }
    };

    signal?.addEventListener('abort', () => { recognition?.stop(); });

    const blobUrl = URL.createObjectURL(audioBlob);
    const audio = new Audio(blobUrl);
    audio.onplay = () => { try { recognition.start(); } catch { /* already started */ } };
    audio.onended = () => {
      URL.revokeObjectURL(blobUrl);
      setTimeout(() => recognition?.stop(), 500);
    };
    audio.onerror = () => {
      URL.revokeObjectURL(blobUrl);
      reject(new Error('Could not play audio for transcription'));
    };
    audio.play().catch(reject);
  });
}

// ─── Deepgram API (server proxy) ──────────────────────────────

async function transcribeDeepgram(
  audioBlob: Blob,
  language = 'en',
  onProgress?: (p: number) => void,
  signal?: AbortSignal
): Promise<TranscriptResult> {
  onProgress?.(0.1);

  // Convert blob to base64 for server transport
  const arrayBuffer = await audioBlob.arrayBuffer();
  const base64 = btoa(String.fromCharCode(...new Uint8Array(arrayBuffer)));

  onProgress?.(0.3);

  const res = await fetch('/api/transcribe', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ audio: base64, language, mimeType: audioBlob.type || 'audio/webm' }),
    signal,
  });

  onProgress?.(0.8);

  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: 'Transcription failed' }));
    throw new Error(err.error || `Deepgram error ${res.status}`);
  }

  const data = await res.json();
  onProgress?.(1);

  return {
    words: data.words ?? [],
    fullText: data.fullText ?? '',
    language: data.language ?? language,
    engine: 'deepgram',
  };
}

// ─── Estimated timestamps (offline fallback) ──────────────────

function estimateTimestamps(
  text: string,
  duration: number,
  wordsPerSecond = 2.5
): TranscriptResult {
  const words = text.split(/\s+/).filter(Boolean);
  const wordDuration = duration / Math.max(words.length, 1);
  const gap = 1 / wordsPerSecond;

  let currentTime = 0;
  const timestamps: WordTimestamp[] = words.map((word) => {
    const start = currentTime;
    const end = Math.min(start + wordDuration, start + gap);
    currentTime = end + 0.02;
    return { word, start, end };
  });

  return {
    words: timestamps,
    fullText: text,
    language: 'en',
    engine: 'estimated',
  };
}

// ─── Main export with fallback chain ──────────────────────────

export async function transcribeAudio(
  audioBlob: Blob,
  language = 'en-US',
  onProgress?: (p: number) => void,
  signal?: AbortSignal,
  preferredEngine?: 'web-speech' | 'deepgram'
): Promise<TranscriptResult> {
  // Try preferred engine first, then fallback chain
  const engines = preferredEngine
    ? [preferredEngine, ...(preferredEngine === 'web-speech' ? ['deepgram'] : ['web-speech'])]
    : ['web-speech', 'deepgram'];

  for (const engine of engines) {
    try {
      if (engine === 'web-speech' && isSTTSupported()) {
        return await transcribeWebSpeech(audioBlob, language, onProgress, signal);
      }
      if (engine === 'deepgram') {
        return await transcribeDeepgram(audioBlob, language.replace('-', ''), onProgress, signal);
      }
    } catch (e) {
      // If this engine fails, try next
      continue;
    }
  }

  // All engines failed — return empty (caller should use estimateWordTimestamps)
  return { words: [], fullText: '', language, engine: 'estimated' };
}

export function stopTranscription(): void {
  if (recognition) {
    try { recognition.stop(); } catch { /* ignore */ }
    recognition = null;
  }
}

// ─── Estimated timestamps (standalone export) ─────────────────

export function estimateWordTimestamps(
  text: string,
  duration: number,
  wordsPerSecond = 2.5
): WordTimestamp[] {
  return estimateTimestamps(text, duration, wordsPerSecond).words;
}
