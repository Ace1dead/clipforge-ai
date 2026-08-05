import { useState, useEffect } from 'react'
import { Settings, Key, Wifi, WifiOff, Plus, Trash2, RefreshCw, ExternalLink, Check, X, Server, Shield } from 'lucide-react'
import { Button, Card, Field, Input, Select, Badge, toast } from '../components/ui'
import {
  getAISettings,
  updateAISettings,
  addCustomProvider,
  removeCustomProvider,
  checkOmniRouteStatus,
  checkServerAIStatus,
  setActiveProvider,
  type AIProvider,
} from '../lib/aiService'

const PROVIDER_PRESETS = [
  { id: 'openai', name: 'OpenAI', model: 'gpt-4o-mini', baseUrl: 'https://api.openai.com/v1', envKey: 'OPENAI_API_KEY', color: 'bg-green' },
  { id: 'anthropic', name: 'Anthropic', model: 'claude-3-5-haiku-20241022', baseUrl: 'https://api.anthropic.com', envKey: 'ANTHROPIC_API_KEY', color: 'bg-amber' },
  { id: 'google', name: 'Google Gemini', model: 'gemini-2.0-flash', baseUrl: 'https://generativelanguage.googleapis.com/v1beta', envKey: 'GOOGLE_AI_API_KEY', color: 'bg-blue' },
  { id: 'mistral', name: 'Mistral', model: 'mistral-small-latest', baseUrl: 'https://api.mistral.ai/v1', envKey: 'MISTRAL_API_KEY', color: 'bg-orange' },
  { id: 'groq', name: 'Groq', model: 'llama-3.1-8b-instant', baseUrl: 'https://api.groq.com/openai/v1', envKey: 'GROQ_API_KEY', color: 'bg-purple' },
  { id: 'deepseek', name: 'DeepSeek', model: 'deepseek-chat', baseUrl: 'https://api.deepseek.com/v1', envKey: 'DEEPSEEK_API_KEY', color: 'bg-cyan' },
  { id: 'together', name: 'Together AI', model: 'meta-llama/Meta-Llama-3.1-8B-Instruct-Turbo', baseUrl: 'https://api.together.xyz/v1', envKey: 'TOGETHER_API_KEY', color: 'bg-pink' },
  { id: 'cohere', name: 'Cohere', model: 'command-r-plus', baseUrl: 'https://api.cohere.com/v2', envKey: 'COHERE_API_KEY', color: 'bg-teal' },
]

export function AISettings() {
  const [settings, setSettings] = useState(getAISettings())
  const [omniRouteStatus, setOmniRouteStatus] = useState<{ available: boolean; providers?: number; freeModels?: number }>({ available: false })
  const [serverStatus, setServerStatus] = useState<{ configured: boolean; providers: Record<string, boolean> }>({ configured: false, providers: {} })
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
    checkAll()
  }, [])

  const checkAll = async () => {
    setChecking(true)
    const [omni, srv] = await Promise.all([checkOmniRouteStatus(), checkServerAIStatus()])
    setOmniRouteStatus(omni)
    setServerStatus(srv)
    setChecking(false)
  }

  const toggleOmniRoute = async (enabled: boolean) => {
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
    const provider = addCustomProvider({
      name: preset.name,
      type: 'custom',
      baseUrl: preset.baseUrl,
      apiKey: '',
      model: preset.model,
      priority: settings.providers.length + 1,
      enabled: true,
    })
    setSettings(getAISettings())
    toast('success', `Added ${preset.name} — add your API key to use it`)
  }

  const handleAddProvider = () => {
    if (!newProvider.name.trim()) {
      toast('error', 'Provider name required')
      return
    }
    const provider = addCustomProvider({
      ...newProvider,
      priority: settings.providers.length + 1,
      enabled: true,
    })
    setSettings(getAISettings())
    setShowAddProvider(false)
    setNewProvider({ name: '', type: 'openai', baseUrl: 'https://api.openai.com/v1', apiKey: '', model: 'gpt-4o-mini' })
    toast('success', `Added ${provider.name}`)
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

  const serverConfiguredCount = Object.values(serverStatus.providers).filter(v => v).length

  return (
    <div className="max-w-4xl mx-auto px-4 md:px-8 py-8 anim-float-up">
      <div className="flex items-center gap-3 mb-2">
        <span className="w-10 h-10 rounded-xl accent-gradient flex items-center justify-center text-white"><Settings size={20} /></span>
        <div>
          <h1 className="text-xl font-bold tracking-tight">AI Settings</h1>
          <p className="text-[13px] text-muted">Configure AI providers for content generation, brainstorming, and more.</p>
        </div>
      </div>

      {/* Server-Side Providers */}
      <Card className="p-5 mt-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <Server size={18} className="text-accent" />
            <div>
              <h3 className="font-semibold text-[14px]">Server AI Keys</h3>
              <p className="text-[12px] text-muted">
                {serverConfiguredCount > 0
                  ? `${serverConfiguredCount} provider${serverConfiguredCount > 1 ? 's' : ''} configured — all users get AI automatically`
                  : 'No keys set — admin users only'}
              </p>
            </div>
          </div>
          <Button variant="secondary" size="sm" icon={<RefreshCw size={14} className={checking ? 'animate-spin' : ''} />} onClick={checkAll} disabled={checking}>
            Refresh
          </Button>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
          {PROVIDER_PRESETS.map(preset => (
            <div key={preset.id} className={`flex items-center gap-2 p-2.5 rounded-lg border text-[12px] ${
              serverStatus.providers[preset.id] ? 'border-green/30 bg-green/5' : 'border-white/10 bg-elevated/30'
            }`}>
              <div className={`w-2 h-2 rounded-full shrink-0 ${serverStatus.providers[preset.id] ? 'bg-green' : 'bg-faint'}`} />
              <div className="min-w-0">
                <span className="font-medium truncate block">{preset.name}</span>
                <span className="text-[10px] text-faint">{serverStatus.providers[preset.id] ? 'Active' : 'Not set'}</span>
              </div>
            </div>
          ))}
        </div>

        {serverConfiguredCount === 0 && (
          <div className="mt-3 p-3 bg-accent/10 rounded-xl text-[12px] text-accent">
            <strong>Admin:</strong> Set env vars on Render (e.g. <code>OPENAI_API_KEY=sk-...</code>) to enable AI for all users.
          </div>
        )}
      </Card>

      {/* OmniRoute Status */}
      <Card className="p-5 mt-4">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className={`w-3 h-3 rounded-full ${omniRouteStatus.available ? 'bg-green' : 'bg-red'}`} />
            <div>
              <h3 className="font-semibold text-[14px]">OmniRoute Gateway</h3>
              <p className="text-[12px] text-muted">
                {omniRouteStatus.available
                  ? `${omniRouteStatus.freeModels ?? 0} free models available`
                  : 'Not connected — install for free AI'}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="secondary" size="sm" icon={<RefreshCw size={14} className={checking ? 'animate-spin' : ''} />} onClick={checkAll} disabled={checking}>
              Check
            </Button>
            <label className="relative inline-flex items-center cursor-pointer">
              <input type="checkbox" className="sr-only peer" checked={settings.useOmniRoute} onChange={(e) => toggleOmniRoute(e.target.checked)} />
              <div className="w-11 h-6 bg-elevated peer-focus:ring-2 peer-focus:ring-accent/20 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-accent"></div>
            </label>
          </div>
        </div>

        {settings.useOmniRoute && (
          <div className="space-y-3">
            <Field label="OmniRoute URL">
              <input value={settings.omniRouteUrl} onChange={(e) => updateOmniRouteUrl(e.target.value)} placeholder="http://localhost:20128/v1" className="w-full bg-elevated border border-white/10 rounded-xl px-3.5 py-2.5 text-sm outline-none focus:border-accent/60" />
            </Field>
            {!omniRouteStatus.available && (
              <div className="flex items-center gap-2 text-[12px] text-muted">
                <WifiOff size={14} className="text-red" />
                <span>Install OmniRoute for free AI:</span>
                <a href="https://github.com/diegosouzapw/OmniRoute" target="_blank" rel="noopener" className="text-accent hover:underline inline-flex items-center gap-1">
                  GitHub <ExternalLink size={10} />
                </a>
              </div>
            )}
          </div>
        )}
      </Card>

      {/* Client-Side Providers */}
      <Card className="p-5 mt-4">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold text-[14px]">Your API Keys (Client-Side)</h3>
          <Button size="sm" icon={<Plus size={14} />} onClick={() => setShowAddProvider(true)}>
            Add Key
          </Button>
        </div>

        {/* Quick Add Presets */}
        <div className="mb-4">
          <p className="text-[11px] text-faint mb-2">Quick add:</p>
          <div className="flex flex-wrap gap-1.5">
            {PROVIDER_PRESETS.map(preset => {
              const added = settings.providers.some(p => p.name === preset.name && p.type !== 'omniroute')
              return (
                <button
                  key={preset.id}
                  onClick={() => addPresetProvider(preset)}
                  disabled={added}
                  className={`px-2.5 py-1 rounded-lg text-[11px] font-medium border transition-colors ${
                    added
                      ? 'border-green/30 bg-green/5 text-green cursor-default'
                      : 'border-white/10 bg-elevated/50 text-muted hover:border-accent/40 hover:text-fg cursor-pointer'
                  }`}
                >
                  {added ? <Check size={10} className="inline mr-1" /> : <Plus size={10} className="inline mr-1" />}
                  {preset.name}
                </button>
              )
            })}
          </div>
        </div>

        {settings.providers.filter(p => p.type !== 'omniroute').length === 0 ? (
          <div className="text-center py-6 text-muted text-[13px]">
            No client keys added. Use quick-add above or add a custom provider.
          </div>
        ) : (
          <div className="space-y-2">
            {settings.providers.filter(p => p.type !== 'omniroute').map((provider) => (
              <div key={provider.id} className={`flex items-center justify-between p-3 rounded-xl border transition-colors ${
                provider.id === settings.activeProviderId ? 'border-accent/40 bg-accent/5' : 'border-white/10 bg-elevated/50'
              }`}>
                <div className="flex items-center gap-3 flex-1 min-w-0">
                  <div className={`w-2 h-2 rounded-full shrink-0 ${provider.enabled ? 'bg-green' : 'bg-faint'}`} />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="text-[13px] font-medium truncate">{provider.name}</span>
                      {provider.id === settings.activeProviderId && <Badge tone="green">Active</Badge>}
                    </div>
                    <div className="flex items-center gap-2 mt-1">
                      <input
                        type="password"
                        value={provider.apiKey || ''}
                        onChange={(e) => updateProviderKey(provider.id, e.target.value)}
                        placeholder="Paste API key..."
                        className="flex-1 max-w-xs bg-elevated border border-white/10 rounded-lg px-2 py-1 text-[11px] outline-none focus:border-accent/40"
                        onClick={(e) => e.stopPropagation()}
                      />
                      <span className="text-[10px] text-faint shrink-0">{provider.model}</span>
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-1.5 ml-3">
                  <button onClick={() => toggleProviderEnabled(provider.id)} className={`w-9 h-5 rounded-full transition-colors ${provider.enabled ? 'bg-accent' : 'bg-elevated'}`}>
                    <div className={`w-4 h-4 rounded-full bg-white transition-transform ${provider.enabled ? 'translate-x-4' : 'translate-x-0.5'}`} />
                  </button>
                  {provider.id !== settings.activeProviderId && (
                    <Button size="sm" variant="ghost" onClick={() => handleSetActive(provider.id)}>Set Active</Button>
                  )}
                  <button onClick={() => handleRemoveProvider(provider.id)} className="text-faint hover:text-red p-1 cursor-pointer">
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>

      {/* Add Custom Provider Modal */}
      {showAddProvider && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={() => setShowAddProvider(false)} />
          <Card className="relative w-full max-w-md p-5 anim-float-up">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold">Add AI Provider</h3>
              <button onClick={() => setShowAddProvider(false)} className="text-faint hover:text-fg cursor-pointer"><X size={18} /></button>
            </div>
            <div className="space-y-3">
              <Field label="Provider Name">
                <input value={newProvider.name} onChange={(e) => setNewProvider({ ...newProvider, name: e.target.value })} placeholder="My API Key" className="w-full bg-elevated border border-white/10 rounded-xl px-3.5 py-2.5 text-sm outline-none focus:border-accent/60" />
              </Field>
              <Field label="Type">
                <Select value={newProvider.type} onChange={(e) => {
                  const type = e.target.value as typeof newProvider.type
                  const preset = PROVIDER_PRESETS.find(p => p.id === type)
                  setNewProvider({ ...newProvider, type, baseUrl: preset?.baseUrl || '', model: preset?.model || '' })
                }}>
                  {PROVIDER_PRESETS.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                  <option value="custom">Custom (OpenAI-compatible)</option>
                </Select>
              </Field>
              <Field label="Base URL">
                <input value={newProvider.baseUrl} onChange={(e) => setNewProvider({ ...newProvider, baseUrl: e.target.value })} placeholder="https://api.openai.com/v1" className="w-full bg-elevated border border-white/10 rounded-xl px-3.5 py-2.5 text-sm outline-none focus:border-accent/60" />
              </Field>
              <Field label="API Key">
                <input type="password" value={newProvider.apiKey} onChange={(e) => setNewProvider({ ...newProvider, apiKey: e.target.value })} placeholder="sk-..." className="w-full bg-elevated border border-white/10 rounded-xl px-3.5 py-2.5 text-sm outline-none focus:border-accent/60" />
              </Field>
              <Field label="Model">
                <input value={newProvider.model} onChange={(e) => setNewProvider({ ...newProvider, model: e.target.value })} placeholder="gpt-4o-mini" className="w-full bg-elevated border border-white/10 rounded-xl px-3.5 py-2.5 text-sm outline-none focus:border-accent/60" />
              </Field>
              <div className="flex gap-2 pt-2">
                <Button variant="secondary" onClick={() => setShowAddProvider(false)} className="flex-1">Cancel</Button>
                <Button onClick={handleAddProvider} className="flex-1">Add Provider</Button>
              </div>
            </div>
          </Card>
        </div>
      )}

      {/* Help Section */}
      <Card className="p-5 mt-4">
        <h3 className="font-semibold text-[14px] mb-3">How AI Works in ClipForge</h3>
        <div className="space-y-3 text-[13px] text-muted">
          <div className="flex items-start gap-2">
            <Shield size={14} className="text-accent mt-0.5 shrink-0" />
            <span><strong>Server Keys (Recommended):</strong> Admin sets API keys on Render. All users get AI automatically — no setup needed.</span>
          </div>
          <div className="flex items-start gap-2">
            <Key size={14} className="text-green mt-0.5 shrink-0" />
            <span><strong>Your Own Keys:</strong> Add your API key in the section above. Stored in your browser only.</span>
          </div>
          <div className="flex items-start gap-2">
            <Wifi size={14} className="text-purple mt-0.5 shrink-0" />
            <span><strong>OmniRoute Free:</strong> 90+ free AI models with auto-fallback. No API keys needed. Install locally.</span>
          </div>
        </div>
        <div className="mt-4 grid grid-cols-2 md:grid-cols-4 gap-2 text-[11px]">
          {PROVIDER_PRESETS.map(p => (
            <div key={p.id} className="bg-elevated/50 rounded-lg p-2 text-center">
              <div className="font-medium">{p.name}</div>
              <div className="text-faint">{p.model}</div>
            </div>
          ))}
        </div>
      </Card>
    </div>
  )
}
