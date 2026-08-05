import { Router } from 'express';

const router = Router();

/**
 * POST /api/transcribe
 * Server-side transcription proxy — supports Deepgram, AssemblyAI, or Groq Whisper.
 * Requires DEEPGRAM_API_KEY, ASSEMBLYAI_API_KEY, or GROQ_API_KEY env var.
 * Body: { audio: base64string, language: string, mimeType: string }
 */
router.post('/', async (req, res) => {
  const { audio, language = 'en', mimeType = 'audio/webm' } = req.body;
  if (!audio) {
    res.status(400).json({ error: 'Audio data required (base64)' });
    return;
  }

  const audioBuffer = Buffer.from(audio, 'base64');

  // Try providers in order: Deepgram → AssemblyAI → Groq
  const providers = [
    {
      name: 'deepgram',
      key: process.env.DEEPGRAM_API_KEY,
      url: `https://api.deepgram.com/v1/listen?model=nova-2&language=${language}&smart_format=true&paragraphs=true`,
      transform: (data: any) => ({
        words: (data.results?.channels?.[0]?.alternatives?.[0]?.words ?? []).map((w: any) => ({
          word: w.word,
          start: w.start,
          end: w.end,
        })),
        fullText: data.results?.channels?.[0]?.alternatives?.[0]?.transcript ?? '',
        language,
      }),
    },
    {
      name: 'assemblyai',
      key: process.env.ASSEMBLYAI_API_KEY,
      url: 'https://api.assemblyai.com/v2/transcript',
      transform: (data: any) => ({
        words: (data.words ?? []).map((w: any) => ({
          word: w.text,
          start: w.start / 1000,
          end: w.end / 1000,
        })),
        fullText: data.text ?? '',
        language: data.language_code ?? language,
      }),
    },
    {
      name: 'groq',
      key: process.env.GROQ_API_KEY,
      url: 'https://api.groq.com/openai/v1/audio/transcriptions',
      transform: (data: any) => ({
        words: (data.words ?? []).map((w: any) => ({
          word: w.word,
          start: w.start,
          end: w.end,
        })),
        fullText: data.text ?? '',
        language: data.language ?? language,
      }),
    },
  ];

  for (const provider of providers) {
    if (!provider.key) continue;

    try {
      let response: Response;

      if (provider.name === 'deepgram') {
        response = await fetch(provider.url, {
          method: 'POST',
          headers: {
            'Authorization': `Token ${provider.key}`,
            'Content-Type': mimeType,
          },
          body: audioBuffer,
        });
      } else if (provider.name === 'assemblyai') {
        // AssemblyAI requires upload first, then polling
        const uploadRes = await fetch('https://api.assemblyai.com/v2/upload', {
          method: 'POST',
          headers: { 'Authorization': provider.key, 'Content-Type': 'application/octet-stream' },
          body: audioBuffer,
        });
        if (!uploadRes.ok) continue;
        const { upload_url } = await uploadRes.json() as any;

        const transcriptRes = await fetch(provider.url, {
          method: 'POST',
          headers: { 'Authorization': provider.key, 'Content-Type': 'application/json' },
          body: JSON.stringify({ audio_url: upload_url, word_boost: 'auto' }),
        });
        if (!transcriptRes.ok) continue;
        const { id } = await transcriptRes.json() as any;

        // Poll for completion (max 60s)
        for (let i = 0; i < 30; i++) {
          await new Promise(r => setTimeout(r, 2000));
          const pollRes = await fetch(`${provider.url}/${id}`, {
            headers: { 'Authorization': provider.key },
          });
          const pollData = await pollRes.json() as any;
          if (pollData.status === 'completed') {
            const result = provider.transform(pollData);
            res.json(result);
            return;
          }
          if (pollData.status === 'error') break;
        }
        continue;
      } else {
        // Groq (OpenAI-compatible)
        const formData = new FormData();
        formData.append('file', new Blob([audioBuffer], { type: mimeType }), 'audio.webm');
        formData.append('model', 'whisper-large-v3');
        formData.append('response_format', 'verbose_json');
        formData.append('timestamp_granularities[]', 'word');
        if (language) formData.append('language', language);

        response = await fetch(provider.url, {
          method: 'POST',
          headers: { 'Authorization': `Bearer ${provider.key}` },
          body: formData,
        });
      }

      if (!response || !response.ok) continue;

      const data = await response.json();
      const result = provider.transform(data);
      res.json(result);
      return;

    } catch (e) {
      // Try next provider
      continue;
    }
  }

  // No providers configured
  res.status(503).json({
    error: 'No transcription API configured. Set DEEPGRAM_API_KEY, ASSEMBLYAI_API_KEY, or GROQ_API_KEY.',
    configured: providers.map(p => ({ name: p.name, configured: !!p.key })),
  });
});

export default router;
