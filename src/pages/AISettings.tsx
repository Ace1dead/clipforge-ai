import { useState, useEffect } from 'react'
import { Settings, Key, Wifi, WifiOff, Plus, Trash2, RefreshCw, ExternalLink, Check, X } from 'lucide-react'
import { Button, Card, Field, Input, Select, Badge, toast } from '../components/ui'
import {
  getAISettings,
  updateAISettings,
  addCustomProvider,
  removeCustomProvider,
  checkOmniRouteStatus,
  setActiveProvider,
  type AIProvider,
} from '../lib/aiService'

const PROVIDER_PRESETS = [
  { id: 'openai', name: 'OpenAI', model: 'gpt-4o-mini', baseUrl: 'https://api.openai.com/v1', headerStyle: 'bearer' },
  { id: 'anthropic', name: 'Anthropic', model: 'claude-3-5-haiku-20241022', baseUrl: 'https://api.anthropic.com', headerStyle: 'x-api-key' },
  { id: 'google', name: 'Google Gemini', model: 'gemini-2.0-flash', baseUrl: 'https://generativelanguage.googleapis.com/v1beta', headerStyle: 'x-api-key' },
  { id: 'mistral', name: 'Mistral', model: 'mistral-small-latest', baseUrl: 'https://api.mistral.ai/v1', headerStyle: 'bearer' },
  { id: 'groq', name: 'Groq', model: 'llama-3.1-8b-instant', baseUrl: 'https://api.groq.com/openai/v1', headerStyle: 'bearer' },
  { id: 'deepseek', name: 'DeepSeek', model: 'deepseek-chat', baseUrl: 'https://api.deepseek.com/v1', headerStyle: 'bearer' },
  { id: 'together', name: 'Together AI', model: 'meta-llama/Meta-Llama-3.1-8B-Instruct-Turbo', baseUrl: 'https://api.together.xyz/v1', headerStyle: 'bearer' },
  { id: 'cohere', name: 'Cohere', model: 'command-r-plus', baseUrl: 'https://api.cohere.com/v2', headerStyle: 'bearer' },
]

export function AISettings() {
  const [settings, setSettings] = useState(getAISettings())
  const [omniRouteStatus, setOmniRouteStatus] = useState<{ available: boolean; providers?: number; freeModels?: number }>({ available: false })
  const [checking, setChecking] = useState(false)
  const [showAddProvider, setShowAddProvider] = useState(false)
  const [newProvider, setNewProvider] = useState({
    name: '',
    type: 'openai' as const,
    baseUrl: 'https://api.openai.com/v1',
    apiKey: '',
    model: 'gpt-4o-mini',
  })

  useEffect(() => {
    checkOmniRoute()
  }, [])

  const checkOmniRoute = async () => {
    setChecking(true)
    const status = await checkOmniRouteStatus()
    setOmniRouteStatus(status)
    setChecking(false)
  }

  const toggleOmniRoute = (enabled: boolean) => {
    const newSettings = { ...settings, useOmniRoute: enabled }
    if (enabled) {
      const exists = newSettings.providers.some(p => p.id === 'omniroute-free')
      if (!exists) {
        newSettings.providers.unshift({
          id: 'omniroute-free',
          name: 'OmniRoute Free (Auto-Fallback)',
          type: 'omniroute',
          baseUrl: newSettings.omniRouteUrl,
          model: 'auto',
          priority: 1,
          enabled: true,
        })
        newSettings.activeProviderId = 'omniroute-free'
      }
    } else {
      newSettings.providers = newSettings.providers.filter(p => p.id !== 'omniroute-free')
      if (newSettings.activeProviderId === 'omniroute-free') {
        newSettings.activeProviderId = newSettings.providers[0]?.id ?? ''
      }
    }
    setSettings(newSettings)
    updateAISettings(newSettings)
    toast('success', enabled ? 'OmniRoute enabled' : 'OmniRoute disabled')
  }

  const updateOmniRouteUrl = (url: string) => {
    const newSettings = { ...settings, omniRouteUrl: url }
    newSettings.providers = newSettings.providers.map(p =>
      p.type === 'omniroute' ? { ...p, baseUrl: url } : p
    )
    setSettings(newSettings)
    updateAISettings(newSettings)
  }

  const addPresetProvider = (preset: typeof PROVIDER_PRESETS[number]) => {
    const exists = settings.providers.find(p => p.name === preset.name && p.type !== 'omniroute')
    if (exists) {
      toast('info', `${preset.name} already added`)
      return
    }
    addCustomProvider({
      name: preset.name,
      type: preset.id as any,
      baseUrl: preset.baseUrl,
      apiKey: '',
      model: preset.model,
      priority: settings.providers.length + 1,
      enabled: true,
    })
    setSettings(getAISettings())
    toast('success', `Added ${preset.name} — paste your API key below`)
  }

  const handleAddProvider = () => {
    if (!newProvider.name.trim()) {
      toast('error', 'Provider name required')
      return
    }
    addCustomProvider({
      ...newProvider,
      priority: settings.providers.length + 1,
      enabled: true,
    })
    setSettings(getAISettings())
    setShowAddProvider(false)
    setNewProvider({ name: '', type: 'openai', baseUrl: 'https://api.openai.com/v1', apiKey: '', model: 'gpt-4o-mini' })
    toast('success', 'Provider added')
  }

  const handleRemoveProvider = (id: string) => {
    removeCustomProvider(id)
    setSettings(getAISettings())
    toast('success', 'Provider removed')
  }

  const handleSetActive = (id: string) => {
    setActiveProvider(id)
    setSettings(getAISettings())
    toast('success', 'Active provider updated')
  }

  const toggleProviderEnabled = (id: string) => {
    const providers = settings.providers.map(p =>
      p.id === id ? { ...p, enabled: !p.enabled } : p
    )
    const newSettings = { ...settings, providers }
    setSettings(newSettings)
    updateAISettings(newSettings)
  }

  const updateProviderKey = (id: string, apiKey: string) => {
    const providers = settings.providers.map(p =>
      p.id === id ? { ...p, apiKey } : p
    )
    const newSettings = { ...settings, providers }
    setSettings(newSettings)
    updateAISettings(newSettings)
  }

  const hasKey = settings.providers.some(p => p.enabled && p.apiKey && p.type !== 'omniroute')
  const omniEnabled = settings.useOmniRoute && omniRouteStatus.available

  return (
    <div className="max-w-4xl mx-auto px-4 md:px-8 py-8 anim-float-up">
      <div className="flex items-center gap-3 mb-2">
        <span className="w-10 h-10 rounded-xl accent-gradient flex items-center justify-center text-white"><Settings size={20} /></span>
        <div>
          <h1 className="text-xl font-bold tracking-tight">AI Settings</h1>
          <p className="text-[13px] text-muted">Add your API key to unlock AI features.</p>
        </div>
      </div>

      {/* Status Banner */}
      <div className={`mt-6 p-4 rounded-xl border text-[13px] flex items-center gap-3 ${
        hasKey || omniEnabled
          ? 'border-green/30 bg-green/5 text-green'
          : 'border-amber/30 bg-amber/5 text-amber'
      }`}>
        {hasKey || omniEnabled ? (
          <>
            <Check size={16} />
            <span><strong>AI is active.</strong> {hasKey ? 'Using your API key.' : ''} {omniEnabled ? 'OmniRoute connected.' : ''}</span>
          </>
        ) : (
          <>
            <Key size={16} />
            <span><strong>No AI configured.</strong> Add a provider key below or enable OmniRoute.</span>
          </>
        )}
      </div>

      {/* Quick Add Providers */}
      <Card className="p-5 mt-4">
        <h3 className="font-semibold text-[14px] mb-1">Add Provider</h3>
        <p className="text-[12px] text-muted mb-3">Click a provider, then paste your API key.</p>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
          {PROVIDER_PRESETS.map(preset => {
            const added = settings.providers.some(p => p.name === preset.name && p.type !== 'omniroute')
            return (
              <button
                key={preset.id}
                onClick={() => addPresetProvider(preset)}
                disabled={added}
                className={`p-3 rounded-xl border text-left transition-all ${
                  added
                    ? 'border-green/30 bg-green/5'
                    : 'border-white/10 bg-elevated/50 hover:border-accent/40 hover:bg-accent/5 cursor-pointer'
                }`}
              >
                <div className="flex items-center gap-2 mb-1">
                  {added ? <Check size={12} className="text-green" /> : <Plus size={12} className="text-faint" />}
                  <span className="text-[13px] font-medium">{preset.name}</span>
                </div>
                <span className="text-[10px] text-faint">{preset.model}</span>
              </button>
            )
          })}
        </div>
      </Card>

      {/* Configured Providers */}
      <Card className="p-5 mt-4">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold text-[14px]">Your Providers</h3>
          <Button size="sm" variant="secondary" icon={<Plus size={14} />} onClick={() => setShowAddProvider(true)}>
            Custom
          </Button>
        </div>

        {settings.providers.filter(p => p.type !== 'omniroute').length === 0 ? (
          <div className="text-center py-8 text-muted text-[13px]">
            No providers added yet. Click a provider above to get started.
          </div>
        ) : (
          <div className="space-y-3">
            {settings.providers.filter(p => p.type !== 'omniroute').map((provider) => (
              <div
                key={provider.id}
                className={`p-4 rounded-xl border transition-colors ${
                  provider.id === settings.activeProviderId
                    ? 'border-accent/40 bg-accent/5'
                    : 'border-white/10 bg-elevated/50'
                }`}
              >
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <div className={`w-2 h-2 rounded-full ${provider.apiKey ? 'bg-green' : 'bg-amber'}`} />
                    <span className="text-[13px] font-medium">{provider.name}</span>
                    {provider.id === settings.activeProviderId && <Badge tone="green">Active</Badge>}
                    {!provider.apiKey && <Badge tone="amber">No key</Badge>}
                  </div>
                  <div className="flex items-center gap-1.5">
                    <button
                      onClick={() => toggleProviderEnabled(provider.id)}
                      className={`w-9 h-5 rounded-full transition-colors ${provider.enabled ? 'bg-accent' : 'bg-elevated'}`}
                    >
                      <div className={`w-4 h-4 rounded-full bg-white transition-transform ${provider.enabled ? 'translate-x-4' : 'translate-x-0.5'}`} />
                    </button>
                    {provider.id !== settings.activeProviderId && (
                      <Button size="sm" variant="ghost" onClick={() => handleSetActive(provider.id)}>Active</Button>
                    )}
                    <button onClick={() => handleRemoveProvider(provider.id)} className="text-faint hover:text-red p-1 cursor-pointer">
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Key size={12} className="text-faint shrink-0" />
                  <input
                    type="password"
                    value={provider.apiKey || ''}
                    onChange={(e) => updateProviderKey(provider.id, e.target.value)}
                    placeholder={`Paste ${provider.name} API key...`}
                    className="flex-1 bg-elevated border border-white/10 rounded-lg px-3 py-1.5 text-[12px] outline-none focus:border-accent/40"
                  />
                  <span className="text-[10px] text-faint shrink-0 w-24 text-right truncate">{provider.model}</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>

      {/* OmniRoute */}
      <Card className="p-5 mt-4">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-3">
            <div className={`w-3 h-3 rounded-full ${omniRouteStatus.available ? 'bg-green' : 'bg-faint'}`} />
            <div>
              <h3 className="font-semibold text-[14px]">OmniRoute (Free Models)</h3>
              <p className="text-[12px] text-muted">
                {omniRouteStatus.available
                  ? `${omniRouteStatus.freeModels ?? 0} free models — no API key needed`
                  : 'Not connected'}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="secondary" size="sm" icon={<RefreshCw size={14} className={checking ? 'animate-spin' : ''} />} onClick={checkOmniRoute} disabled={checking}>
              Check
            </Button>
            <label className="relative inline-flex items-center cursor-pointer">
              <input type="checkbox" className="sr-only peer" checked={settings.useOmniRoute} onChange={(e) => toggleOmniRoute(e.target.checked)} />
              <div className="w-11 h-6 bg-elevated peer-focus:ring-2 peer-focus:ring-accent/20 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-accent"></div>
            </label>
          </div>
        </div>
        {settings.useOmniRoute && (
          <div className="space-y-2">
            <input value={settings.omniRouteUrl} onChange={(e) => updateOmniRouteUrl(e.target.value)} placeholder="http://localhost:20128/v1" className="w-full bg-elevated border border-white/10 rounded-xl px-3.5 py-2.5 text-sm outline-none focus:border-accent/60" />
            {!omniRouteStatus.available && (
              <div className="flex items-center gap-2 text-[12px] text-muted">
                <WifiOff size={14} className="text-faint" />
                <span>Install for free AI:</span>
                <a href="https://github.com/diegosouzapw/OmniRoute" target="_blank" rel="noopener" className="text-accent hover:underline inline-flex items-center gap-1">
                  GitHub <ExternalLink size={10} />
                </a>
              </div>
            )}
          </div>
        )}
      </Card>

      {/* Add Custom Modal */}
      {showAddProvider && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={() => setShowAddProvider(false)} />
          <Card className="relative w-full max-w-md p-5 anim-float-up">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold">Add Custom Provider</h3>
              <button onClick={() => setShowAddProvider(false)} className="text-faint hover:text-fg cursor-pointer"><X size={18} /></button>
            </div>
            <div className="space-y-3">
              <Field label="Name">
                <input value={newProvider.name} onChange={(e) => setNewProvider({ ...newProvider, name: e.target.value })} placeholder="My Provider" className="w-full bg-elevated border border-white/10 rounded-xl px-3.5 py-2.5 text-sm outline-none focus:border-accent/60" />
              </Field>
              <Field label="Type">
                <Select value={newProvider.type} onChange={(e) => {
                  const type = e.target.value as any
                  const preset = PROVIDER_PRESETS.find(p => p.id === type)
                  setNewProvider({ ...newProvider, type, baseUrl: preset?.baseUrl || '', model: preset?.model || '' })
                }}>
                  {PROVIDER_PRESETS.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                  <option value="custom">Custom (OpenAI-compatible)</option>
                </Select>
              </Field>
              <Field label="Base URL">
                <input value={newProvider.baseUrl} onChange={(e) => setNewProvider({ ...newProvider, baseUrl: e.target.value })} className="w-full bg-elevated border border-white/10 rounded-xl px-3.5 py-2.5 text-sm outline-none focus:border-accent/60" />
              </Field>
              <Field label="API Key">
                <input type="password" value={newProvider.apiKey} onChange={(e) => setNewProvider({ ...newProvider, apiKey: e.target.value })} placeholder="sk-..." className="w-full bg-elevated border border-white/10 rounded-xl px-3.5 py-2.5 text-sm outline-none focus:border-accent/60" />
              </Field>
              <Field label="Model">
                <input value={newProvider.model} onChange={(e) => setNewProvider({ ...newProvider, model: e.target.value })} className="w-full bg-elevated border border-white/10 rounded-xl px-3.5 py-2.5 text-sm outline-none focus:border-accent/60" />
              </Field>
              <div className="flex gap-2 pt-2">
                <Button variant="secondary" onClick={() => setShowAddProvider(false)} className="flex-1">Cancel</Button>
                <Button onClick={handleAddProvider} className="flex-1">Add</Button>
              </div>
            </div>
          </Card>
        </div>
      )}

      {/* Help */}
      <Card className="p-5 mt-4">
        <h3 className="font-semibold text-[14px] mb-3">How It Works</h3>
        <div className="space-y-2 text-[12px] text-muted">
          <p>1. Click a provider above → paste your API key → done.</p>
          <p>2. Your key stays in your browser only — never sent to our servers.</p>
          <p>3. All AI features (Auto Clip, Viral Scanner, Brainstorm) use your active provider.</p>
          <p>4. No key? Enable OmniRoute for free models, or use features without AI (heuristic mode).</p>
        </div>
      </Card>
    </div>
  )
}
