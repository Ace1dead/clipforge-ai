import { Router } from 'express';

const router = Router();

// All supported providers with their API details
const PROVIDERS: Record<string, {
  envKey: string;
  baseUrl: string;
  defaultModel: string;
  headerKey: string;
  headerStyle: 'bearer' | 'x-api-key' | 'authorization';
  transformBody: (body: any) => any;
  extractContent: (data: any) => string;
  extractModel: (data: any) => string;
}> = {
  openai: {
    envKey: 'OPENAI_API_KEY',
    baseUrl: 'https://api.openai.com/v1',
    defaultModel: 'gpt-4o-mini',
    headerKey: 'Authorization',
    headerStyle: 'bearer',
    transformBody: (b) => ({ model: b.model, messages: b.messages, max_tokens: b.max_tokens, temperature: b.temperature }),
    extractContent: (d) => d.choices?.[0]?.message?.content ?? '',
    extractModel: (d) => d.model ?? '',
  },
  anthropic: {
    envKey: 'ANTHROPIC_API_KEY',
    baseUrl: 'https://api.anthropic.com/v1',
    defaultModel: 'claude-3-5-haiku-20241022',
    headerKey: 'x-api-key',
    headerStyle: 'x-api-key',
    transformBody: (b) => {
      const system = b.messages.find((m: any) => m.role === 'system')?.content ?? '';
      const msgs = b.messages.filter((m: any) => m.role !== 'system');
      return { model: b.model, max_tokens: b.max_tokens, temperature: b.temperature, system, messages: msgs };
    },
    extractContent: (d) => d.content?.[0]?.text ?? '',
    extractModel: (d) => d.model ?? '',
  },
  google: {
    envKey: 'GOOGLE_AI_API_KEY',
    baseUrl: 'https://generativelanguage.googleapis.com/v1beta',
    defaultModel: 'gemini-2.0-flash',
    headerKey: 'x-goog-api-key',
    headerStyle: 'x-api-key',
    transformBody: (b) => ({
      contents: b.messages.filter((m: any) => m.role !== 'system').map((m: any) => ({
        role: m.role === 'assistant' ? 'model' : 'user',
        parts: [{ text: m.content }],
      })),
      generationConfig: { maxOutputTokens: b.max_tokens, temperature: b.temperature },
      systemInstruction: b.messages.find((m: any) => m.role === 'system') ? { parts: [{ text: b.messages.find((m: any) => m.role === 'system')?.content }] } : undefined,
    }),
    extractContent: (d) => d.candidates?.[0]?.content?.parts?.[0]?.text ?? '',
    extractModel: (d) => d.modelVersion ?? '',
  },
  mistral: {
    envKey: 'MISTRAL_API_KEY',
    baseUrl: 'https://api.mistral.ai/v1',
    defaultModel: 'mistral-small-latest',
    headerKey: 'Authorization',
    headerStyle: 'bearer',
    transformBody: (b) => ({ model: b.model, messages: b.messages, max_tokens: b.max_tokens, temperature: b.temperature }),
    extractContent: (d) => d.choices?.[0]?.message?.content ?? '',
    extractModel: (d) => d.model ?? '',
  },
  groq: {
    envKey: 'GROQ_API_KEY',
    baseUrl: 'https://api.groq.com/openai/v1',
    defaultModel: 'llama-3.1-8b-instant',
    headerKey: 'Authorization',
    headerStyle: 'bearer',
    transformBody: (b) => ({ model: b.model, messages: b.messages, max_tokens: b.max_tokens, temperature: b.temperature }),
    extractContent: (d) => d.choices?.[0]?.message?.content ?? '',
    extractModel: (d) => d.model ?? '',
  },
  cohere: {
    envKey: 'COHERE_API_KEY',
    baseUrl: 'https://api.cohere.com/v2',
    defaultModel: 'command-r-plus',
    headerKey: 'Authorization',
    headerStyle: 'bearer',
    transformBody: (b) => ({
      model: b.model,
      messages: b.messages.map((m: any) => ({ role: m.role === 'assistant' ? 'CHATBOT' : 'USER', content: m.content })),
      max_tokens: b.max_tokens,
      temperature: b.temperature,
    }),
    extractContent: (d) => d.message?.content?.[0]?.text ?? '',
    extractModel: (d) => d.model ?? '',
  },
  deepseek: {
    envKey: 'DEEPSEEK_API_KEY',
    baseUrl: 'https://api.deepseek.com/v1',
    defaultModel: 'deepseek-chat',
    headerKey: 'Authorization',
    headerStyle: 'bearer',
    transformBody: (b) => ({ model: b.model, messages: b.messages, max_tokens: b.max_tokens, temperature: b.temperature }),
    extractContent: (d) => d.choices?.[0]?.message?.content ?? '',
    extractModel: (d) => d.model ?? '',
  },
  together: {
    envKey: 'TOGETHER_API_KEY',
    baseUrl: 'https://api.together.xyz/v1',
    defaultModel: 'meta-llama/Meta-Llama-3.1-8B-Instruct-Turbo',
    headerKey: 'Authorization',
    headerStyle: 'bearer',
    transformBody: (b) => ({ model: b.model, messages: b.messages, max_tokens: b.max_tokens, temperature: b.temperature }),
    extractContent: (d) => d.choices?.[0]?.message?.content ?? '',
    extractModel: (d) => d.model ?? '',
  },
};

function getHeaders(provider: typeof PROVIDERS[string], apiKey: string): Record<string, string> {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (provider.headerStyle === 'bearer') {
    headers['Authorization'] = `Bearer ${apiKey}`;
  } else if (provider.headerStyle === 'x-api-key') {
    headers[provider.headerKey] = apiKey;
  } else {
    headers[provider.headerKey] = apiKey;
  }
  if (provider.envKey === 'ANTHROPIC_API_KEY') {
    headers['anthropic-version'] = '2023-06-01';
  }
  return headers;
}

function getApiUrl(provider: typeof PROVIDERS[string], model: string): string {
  if (provider.envKey === 'GOOGLE_AI_API_KEY') {
    return `${provider.baseUrl}/models/${model}:generateContent`;
  }
  return `${provider.baseUrl}/chat/completions`;
}

interface AIRequestBody {
  messages: { role: 'system' | 'user' | 'assistant'; content: string }[];
  maxTokens?: number;
  temperature?: number;
  provider?: string;
}

router.post('/generate', async (req, res) => {
  try {
    const { messages, maxTokens = 1000, temperature = 0.7, provider: requestedProvider }: AIRequestBody = req.body;

    if (!messages || !Array.isArray(messages) || messages.length === 0) {
      res.status(400).json({ error: 'messages array is required' });
      return;
    }

    // Find available providers (those with env vars set)
    const available: { key: string; provider: typeof PROVIDERS[string]; apiKey: string }[] = [];

    if (requestedProvider && PROVIDERS[requestedProvider]) {
      const key = process.env[PROVIDERS[requestedProvider].envKey];
      if (key) available.push({ key: requestedProvider, provider: PROVIDERS[requestedProvider], apiKey: key });
    } else {
      for (const [key, prov] of Object.entries(PROVIDERS)) {
        const apiKey = process.env[prov.envKey];
        if (apiKey) available.push({ key, provider: prov, apiKey });
      }
    }

    if (available.length === 0) {
      const envKeys = Object.values(PROVIDERS).map(p => p.envKey);
      res.status(503).json({
        error: `No AI providers configured. Set at least one: ${envKeys.join(', ')}`,
      });
      return;
    }

    // Try each available provider
    let lastError = '';
    for (const { key, provider, apiKey } of available) {
      try {
        const model = requestedProvider === key ? (req.body.model || provider.defaultModel) : provider.defaultModel;
        const url = getApiUrl(provider, model);
        const headers = getHeaders(provider, apiKey);
        const body = provider.transformBody({ ...req.body, model });

        const response = await fetch(url, {
          method: 'POST',
          headers,
          body: JSON.stringify(body),
          signal: AbortSignal.timeout(60000),
        });

        if (!response.ok) {
          const text = await response.text().catch(() => '');
          lastError = `${key}: ${response.status} ${text.slice(0, 100)}`;
          continue;
        }

        const data = await response.json();
        const content = provider.extractContent(data);
        if (!content) {
          lastError = `${key}: empty response`;
          continue;
        }

        res.json({
          content,
          model: provider.extractModel(data) || model,
          provider: key,
          tokensUsed: data.usage?.total_tokens ?? 0,
        });
        return;
      } catch (e) {
        lastError = `${key}: ${e instanceof Error ? e.message : String(e)}`;
      }
    }

    res.status(502).json({ error: `All providers failed. Last: ${lastError}` });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    console.error('AI proxy error:', msg);
    res.status(500).json({ error: msg });
  }
});

router.get('/status', (_req, res) => {
  const configured: Record<string, boolean> = {};
  for (const [key, prov] of Object.entries(PROVIDERS)) {
    configured[key] = !!process.env[prov.envKey];
  }
  res.json({
    configured: Object.values(configured).some(v => v),
    providers: configured,
  });
});

export default router;
