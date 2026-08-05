/**
 * AI Service Layer — Client-side only.
 * Users add their own API keys in AI Settings.
 * Fallback: Client keys → Local AI server → suggest install
 */

export interface AIProvider {
  id: string;
  name: string;
  type: 'omniroute' | 'openai' | 'anthropic' | 'google' | 'mistral' | 'groq' | 'deepseek' | 'together' | 'cohere' | 'custom';
  baseUrl: string;
  apiKey?: string;
  model: string;
  priority: number;
  enabled: boolean;
}

export interface AISettings {
  providers: AIProvider[];
  activeProviderId: string;
  useOmniRoute: boolean;
  omniRouteUrl: string;
}

export interface AIRequest {
  messages: { role: 'system' | 'user' | 'assistant'; content: string }[];
  maxTokens?: number;
  temperature?: number;
}

export interface AIResponse {
  content: string;
  model: string;
  provider: string;
  tokensUsed: number;
}

const SETTINGS_KEY = 'cf_ai_settings';

const DEFAULT_SETTINGS: AISettings = {
  providers: [
    {
      id: 'omniroute-free',
      name: 'OmniRoute Free (Auto-Fallback)',
      type: 'omniroute',
      baseUrl: 'http://localhost:20128/v1',
      model: 'auto',
      priority: 1,
      enabled: true,
    },
  ],
  activeProviderId: 'omniroute-free',
  useOmniRoute: true,
  omniRouteUrl: 'http://localhost:20128/v1',
};

let currentSettings: AISettings = loadSettings();

function loadSettings(): AISettings {
  try {
    const stored = localStorage.getItem(SETTINGS_KEY);
    if (stored) {
      const parsed = JSON.parse(stored);
      return { ...DEFAULT_SETTINGS, ...parsed };
    }
  } catch { /* ignore */ }
  return { ...DEFAULT_SETTINGS };
}

function saveSettings(settings: AISettings): void {
  currentSettings = settings;
  localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
}

export function getAISettings(): AISettings {
  return currentSettings;
}

export function updateAISettings(updates: Partial<AISettings>): void {
  saveSettings({ ...currentSettings, ...updates });
}

export function setActiveProvider(providerId: string): void {
  updateAISettings({ activeProviderId: providerId });
}

export function addCustomProvider(provider: Omit<AIProvider, 'id'>): AIProvider {
  const newProvider: AIProvider = {
    ...provider,
    id: `custom-${Date.now()}`,
  };
  const providers = [...currentSettings.providers, newProvider];
  updateAISettings({ providers });
  return newProvider;
}

export function removeCustomProvider(providerId: string): void {
  const providers = currentSettings.providers.filter(p => p.id !== providerId);
  const activeProviderId = currentSettings.activeProviderId === providerId
    ? providers[0]?.id ?? ''
    : currentSettings.activeProviderId;
  updateAISettings({ providers, activeProviderId });
}

/**
 * Generate content using client-side providers.
 * Fallback: providers with API keys → Local AI → error
 */
export async function generateAI(request: AIRequest): Promise<AIResponse> {
  // 1. Try client-side providers with API keys (non-local)
  const enabledProviders = currentSettings.providers
    .filter(p => p.enabled && p.apiKey && p.type !== 'omniroute')
    .sort((a, b) => a.priority - b.priority);

  for (const provider of enabledProviders) {
    try {
      return await callProvider(provider, request);
    } catch (e) {
      console.warn(`AI provider ${provider.name} failed:`, e instanceof Error ? e.message : e);
    }
  }

  // 2. Try local AI server (free, self-hosted)
  if (currentSettings.useOmniRoute) {
    try {
      const omniProvider = currentSettings.providers.find(p => p.type === 'omniroute' && p.enabled);
      if (omniProvider) {
        return await callProvider(omniProvider, request);
      }
    } catch {
      // Local AI unavailable
    }
  }

  // 3. Nothing available
  throw new Error(
    'No AI configured. Go to AI Settings and add your API key (OpenAI, Anthropic, Google, Groq, etc.) or install a local AI server for free models.'
  );
}

async function callProvider(
  provider: AIProvider,
  request: AIRequest
): Promise<AIResponse> {
  const baseUrl = provider.type === 'omniroute'
    ? currentSettings.omniRouteUrl
    : provider.baseUrl;

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };

  if (provider.apiKey) {
    // Anthropic uses x-api-key header
    if (provider.type === 'anthropic') {
      headers['x-api-key'] = provider.apiKey;
      headers['anthropic-version'] = '2023-06-01';
    } else {
      headers['Authorization'] = `Bearer ${provider.apiKey}`;
    }
  }

  let url = `${baseUrl}/chat/completions`;
  let body: any;

  if (provider.type === 'anthropic') {
    // Anthropic uses different API format
    url = `${baseUrl}/messages`;
    const system = request.messages.find(m => m.role === 'system')?.content ?? '';
    const msgs = request.messages.filter(m => m.role !== 'system');
    body = {
      model: provider.model,
      max_tokens: request.maxTokens ?? 1000,
      temperature: request.temperature ?? 0.7,
      system,
      messages: msgs.map(m => ({ role: m.role, content: m.content })),
    };
  } else if (provider.type === 'google') {
    // Google uses different API format
    url = `${baseUrl}/models/${provider.model}:generateContent`;
    headers['x-goog-api-key'] = provider.apiKey ?? '';
    delete headers['Authorization'];
    const contents = request.messages.filter(m => m.role !== 'system').map(m => ({
      role: m.role === 'assistant' ? 'model' : 'user',
      parts: [{ text: m.content }],
    }));
    const systemMsg = request.messages.find(m => m.role === 'system')?.content;
    body = {
      contents,
      generationConfig: {
        maxOutputTokens: request.maxTokens ?? 1000,
        temperature: request.temperature ?? 0.7,
      },
      ...(systemMsg ? { systemInstruction: { parts: [{ text: systemMsg }] } } : {}),
    };
  } else {
    // OpenAI-compatible (OpenAI, Groq, Mistral, DeepSeek, Together, Cohere, OmniRoute)
    body = {
      model: provider.model,
      messages: request.messages,
      max_tokens: request.maxTokens ?? 1000,
      temperature: request.temperature ?? 0.7,
    };
  }

  const response = await fetch(url, {
    method: 'POST',
    headers,
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(60000),
  });

  if (!response.ok) {
    const text = await response.text().catch(() => '');
    throw new Error(`AI API error ${response.status}: ${text.slice(0, 200)}`);
  }

  const data = await response.json();

  // Extract content based on provider type
  let content = '';
  let model = provider.model;

  if (provider.type === 'anthropic') {
    content = data.content?.[0]?.text ?? '';
    model = data.model ?? provider.model;
  } else if (provider.type === 'google') {
    content = data.candidates?.[0]?.content?.parts?.[0]?.text ?? '';
    model = data.modelVersion ?? provider.model;
  } else {
    content = data.choices?.[0]?.message?.content ?? '';
    model = data.model ?? provider.model;
  }

  return {
    content,
    model,
    provider: provider.name,
    tokensUsed: data.usage?.total_tokens ?? 0,
  };
}

/**
 * Check if OmniRoute is running and available.
 */
export async function checkOmniRouteStatus(): Promise<{
  available: boolean;
  providers?: number;
  freeModels?: number;
}> {
  try {
    const response = await fetch(`${currentSettings.omniRouteUrl}/models`, {
      signal: AbortSignal.timeout(5000),
    });
    if (!response.ok) return { available: false };
    const data = await response.json();
    return {
      available: true,
      providers: data.data?.length ?? 0,
      freeModels: data.data?.filter((m: any) =>
        m.id?.includes('free') ||
        m.id?.includes('oc/') ||
        m.id?.includes('felo/')
      ).length ?? 0,
    };
  } catch {
    return { available: false };
  }
}

/**
 * Check if server has AI keys (optional, for display only).
 */
export async function checkServerAIStatus(): Promise<{
  configured: boolean;
  providers: Record<string, boolean>;
}> {
  try {
    const res = await fetch('/api/ai/status', { signal: AbortSignal.timeout(5000) });
    if (!res.ok) return { configured: false, providers: {} };
    return await res.json();
  } catch {
    return { configured: false, providers: {} };
  }
}

/**
 * Free model presets for common tasks.
 */
export const FREE_MODEL_PRESETS = {
  brainstorm: {
    name: 'Content Ideas',
    systemPrompt: 'You are a viral content strategist. Generate engaging, creative content ideas based on the user\'s niche. Be specific, actionable, and trend-aware.',
    temperature: 0.9,
    maxTokens: 800,
  },
  captions: {
    name: 'Video Captions',
    systemPrompt: 'You are a social media expert. Generate engaging captions and hashtags for viral videos. Keep captions concise and impactful.',
    temperature: 0.7,
    maxTokens: 200,
  },
  titles: {
    name: 'Video Titles',
    systemPrompt: 'You are a click-through-rate expert. Generate compelling, clickable titles for social media videos. Use power words and curiosity gaps.',
    temperature: 0.8,
    maxTokens: 150,
  },
  scripts: {
    name: 'Video Scripts',
    systemPrompt: 'You are a viral video scriptwriter. Write engaging, short-form video scripts optimized for platforms like TikTok, Instagram Reels, and YouTube Shorts.',
    temperature: 0.8,
    maxTokens: 1500,
  },
};

/**
 * Generate content with a preset template.
 */
export async function generateWithPreset(
  preset: keyof typeof FREE_MODEL_PRESETS,
  userInput: string
): Promise<string> {
  const config = FREE_MODEL_PRESETS[preset];
  const response = await generateAI({
    messages: [
      { role: 'system', content: config.systemPrompt },
      { role: 'user', content: userInput },
    ],
    maxTokens: config.maxTokens,
    temperature: config.temperature,
  });
  return response.content;
}
