export interface WordTimestamp {
  word: string;
  start: number;
  end: number;
}

export interface TranscriptResult {
  words: WordTimestamp[];
  fullText: string;
  language: string;
}

let recognition: any = null;
let activeBlobUrl: string | null = null;

export function isSTTSupported(): boolean {
  return typeof window !== 'undefined' && (
    'SpeechRecognition' in window || 'webkitSpeechRecognition' in window
  );
}

export function getAvailableLanguages(): { code: string; name: string }[] {
  if (!isSTTSupported()) return [];
  const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
  if (!SpeechRecognition) return [];
  // Common languages supported by Web Speech API
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

export function transcribeAudio(
  audioBlob: Blob,
  language = 'en-US',
  onProgress?: (p: number) => void,
  signal?: AbortSignal
): Promise<TranscriptResult> {
  return new Promise((resolve, reject) => {
    if (!isSTTSupported()) {
      reject(new Error('Speech recognition not supported in this browser'));
      return;
    }

    // Stop any previous recognition instance
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

    recognition.onstart = () => {
      startTime = Date.now();
      onProgress?.(0);
    };

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
      });
    };

    recognition.onerror = (event: any) => {
      if (event.error === 'no-speech') {
        resolve({ words: [], fullText: '', language });
      } else {
        reject(new Error(`Speech recognition error: ${event.error}`));
      }
    };

    signal?.addEventListener('abort', () => {
      recognition?.stop();
    });

    // Convert blob to audio element and play for recognition
    const blobUrl = URL.createObjectURL(audioBlob);
    const audio = new Audio(blobUrl);
    audio.onplay = () => {
      try {
        recognition.start();
      } catch { /* already started */ }
    };
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

export function stopTranscription(): void {
  if (recognition) {
    try { recognition.stop(); } catch { /* ignore */ }
    recognition = null;
  }
  if (activeBlobUrl) {
    URL.revokeObjectURL(activeBlobUrl);
    activeBlobUrl = null;
  }
}

// Offline fallback: estimate word timestamps from text duration
export function estimateWordTimestamps(
  text: string,
  duration: number,
  wordsPerSecond = 2.5
): WordTimestamp[] {
  const words = text.split(/\s+/).filter(Boolean);
  const totalWords = words.length;
  const wordDuration = duration / Math.max(totalWords, 1);
  const gap = 1 / wordsPerSecond;

  let currentTime = 0;
  return words.map((word) => {
    const start = currentTime;
    const end = Math.min(start + wordDuration, start + gap);
    currentTime = end + 0.02;
    return { word, start, end };
  });
}
