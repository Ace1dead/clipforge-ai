import { Router } from 'express';

const router = Router();

interface AIRequestBody {
  messages: { role: 'system' | 'user' | 'assistant'; content: string }[];
  maxTokens?: number;
  temperature?: number;
  provider?: 'openai' | 'anthropic' | 'auto';
}

router.post('/generate', async (req, res) => {
  try {
    const { messages, maxTokens = 1000, temperature = 0.7, provider = 'auto' }: AIRequestBody = req.body;

    if (!messages || !Array.isArray(messages) || messages.length === 0) {
      res.status(400).json({ error: 'messages array is required' });
      return;
    }

    // Determine which provider to use based on available env vars
    const openaiKey = process.env.OPENAI_API_KEY;
    const anthropicKey = process.env.ANTHROPIC_API_KEY;

    let useProvider: string;
    let apiKey: string;

    if (provider === 'openai' && openaiKey) {
      useProvider = 'openai';
      apiKey = openaiKey;
    } else if (provider === 'anthropic' && anthropicKey) {
      useProvider = 'anthropic';
      apiKey = anthropicKey;
    } else if (openaiKey) {
      useProvider = 'openai';
      apiKey = openaiKey;
    } else if (anthropicKey) {
      useProvider = 'anthropic';
      apiKey = anthropicKey;
    } else {
      res.status(503).json({
        error: 'No AI provider configured on server. Set OPENAI_API_KEY or ANTHROPIC_API_KEY environment variables.',
      });
      return;
    }

    let content: string;
    let model: string;

    if (useProvider === 'openai') {
      const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          model: 'gpt-4o-mini',
          messages,
          max_tokens: maxTokens,
          temperature,
        }),
        signal: AbortSignal.timeout(60000),
      });

      if (!response.ok) {
        const text = await response.text().catch(() => '');
        res.status(response.status).json({ error: `OpenAI API error: ${text.slice(0, 200)}` });
        return;
      }

      const data = await response.json();
      content = data.choices?.[0]?.message?.content ?? '';
      model = data.model ?? 'gpt-4o-mini';
    } else {
      // Anthropic
      const systemMessage = messages.find(m => m.role === 'system')?.content ?? '';
      const nonSystemMessages = messages.filter(m => m.role !== 'system');

      const response = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': apiKey,
          'anthropic-version': '2023-06-01',
        },
        body: JSON.stringify({
          model: 'claude-3-5-haiku-20241022',
          max_tokens: maxTokens,
          temperature,
          system: systemMessage,
          messages: nonSystemMessages.map(m => ({ role: m.role, content: m.content })),
        }),
        signal: AbortSignal.timeout(60000),
      });

      if (!response.ok) {
        const text = await response.text().catch(() => '');
        res.status(response.status).json({ error: `Anthropic API error: ${text.slice(0, 200)}` });
        return;
      }

      const data = await response.json();
      content = data.content?.[0]?.text ?? '';
      model = data.model ?? 'claude-3-5-haiku-20241022';
    }

    res.json({
      content,
      model,
      provider: useProvider,
      tokensUsed: 0,
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    console.error('AI proxy error:', msg);
    res.status(500).json({ error: msg });
  }
});

router.get('/status', (_req, res) => {
  const hasOpenAI = !!process.env.OPENAI_API_KEY;
  const hasAnthropic = !!process.env.ANTHROPIC_API_KEY;
  res.json({
    configured: hasOpenAI || hasAnthropic,
    providers: {
      openai: hasOpenAI,
      anthropic: hasAnthropic,
    },
  });
});

export default router;
