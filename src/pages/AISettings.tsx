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

  const toggleOmniRoute = async (enabled: boolean) => {
    const newSettings = { ...settings, useOmniRoute: enabled }
    
    // Add or remove OmniRoute provider
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
    setNewProvider({
      name: '',
      type: 'openai',
      baseUrl: 'https://api.openai.com/v1',
      apiKey: '',
      model: 'gpt-4o-mini',
    })
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

  return (
    <div className="max-w-4xl mx-auto px-4 md:px-8 py-8 anim-float-up">
      <div className="flex items-center gap-3 mb-2">
        <span className="w-10 h-10 rounded-xl accent-gradient flex items-center justify-center text-white"><Settings size={20} /></span>
        <div>
          <h1 className="text-xl font-bold tracking-tight">AI Settings</h1>
          <p className="text-[13px] text-muted">Configure AI providers for content generation, brainstorming, and more.</p>
        </div>
      </div>

      {/* OmniRoute Status */}
      <Card className="p-5 mt-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className={`w-3 h-3 rounded-full ${omniRouteStatus.available ? 'bg-green' : 'bg-red'}`} />
            <div>
              <h3 className="font-semibold text-[14px]">OmniRoute Gateway</h3>
              <p className="text-[12px] text-muted">
                {omniRouteStatus.available
                  ? `${omniRouteStatus.freeModels ?? 0} free models available`
                  : 'Not connected'}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="secondary"
              size="sm"
              icon={<RefreshCw size={14} className={checking ? 'animate-spin' : ''} />}
              onClick={checkOmniRoute}
              disabled={checking}
            >
              Check
            </Button>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                className="sr-only peer"
                checked={settings.useOmniRoute}
                onChange={(e) => toggleOmniRoute(e.target.checked)}
              />
              <div className="w-11 h-6 bg-elevated peer-focus:ring-2 peer-focus:ring-accent/20 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-accent"></div>
            </label>
          </div>
        </div>

        {settings.useOmniRoute && (
          <div className="space-y-3">
            <Field label="OmniRoute URL">
              <input
                value={settings.omniRouteUrl}
                onChange={(e) => updateOmniRouteUrl(e.target.value)}
                placeholder="http://localhost:20128/v1"
                className="w-full bg-elevated border border-white/10 rounded-xl px-3.5 py-2.5 text-sm outline-none focus:border-accent/60"
              />
            </Field>
            <div className="flex items-center gap-2 text-[12px] text-muted">
              {omniRouteStatus.available ? (
                <>
                  <Wifi size={14} className="text-green" />
                  <span>Connected — auto-fallback enabled across {omniRouteStatus.providers ?? 0} providers</span>
                </>
              ) : (
                <>
                  <WifiOff size={14} className="text-red" />
                  <span>Not detected. Install OmniRoute for free AI models:</span>
                  <a href="https://github.com/diegosouzapw/OmniRoute" target="_blank" rel="noopener" className="text-accent hover:underline inline-flex items-center gap-1">
                    GitHub <ExternalLink size={10} />
                  </a>
                </>
              )}
            </div>
          </div>
        )}
      </Card>

      {/* Provider List */}
      <Card className="p-5 mt-4">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold text-[14px]">AI Providers</h3>
          <Button size="sm" icon={<Plus size={14} />} onClick={() => setShowAddProvider(true)}>
            Add Provider
          </Button>
        </div>

        {settings.providers.length === 0 ? (
          <div className="text-center py-8 text-muted text-[13px]">
            No providers configured. Enable OmniRoute or add your own API key.
          </div>
        ) : (
          <div className="space-y-3">
            {settings.providers.map((provider) => (
              <div
                key={provider.id}
                className={`flex items-center justify-between p-3 rounded-xl border transition-colors ${
                  provider.id === settings.activeProviderId
                    ? 'border-accent/40 bg-accent/5'
                    : 'border-white/10 bg-elevated/50'
                }`}
              >
                <div className="flex items-center gap-3">
                  <div className={`w-2 h-2 rounded-full ${provider.enabled ? 'bg-green' : 'bg-faint'}`} />
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-[13px] font-medium">{provider.name}</span>
                      {provider.id === settings.activeProviderId && (
                        <Badge tone="green">Active</Badge>
                      )}
                      {provider.type === 'omniroute' && (
                        <Badge tone="accent">Free</Badge>
                      )}
                    </div>
                    <span className="text-[11px] text-faint">
                      {provider.model} • {provider.type}
                    </span>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => toggleProviderEnabled(provider.id)}
                    className={`w-9 h-5 rounded-full transition-colors ${
                      provider.enabled ? 'bg-accent' : 'bg-elevated'
                    }`}
                  >
                    <div className={`w-4 h-4 rounded-full bg-white transition-transform ${
                      provider.enabled ? 'translate-x-4' : 'translate-x-0.5'
                    }`} />
                  </button>
                  {provider.id !== settings.activeProviderId && (
                    <Button size="sm" variant="ghost" onClick={() => handleSetActive(provider.id)}>
                      Set Active
                    </Button>
                  )}
                  {provider.type !== 'omniroute' && (
                    <button
                      onClick={() => handleRemoveProvider(provider.id)}
                      className="text-faint hover:text-red p-1 cursor-pointer"
                    >
                      <Trash2 size={14} />
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>

      {/* Add Provider Modal */}
      {showAddProvider && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={() => setShowAddProvider(false)} />
          <Card className="relative w-full max-w-md p-5 anim-float-up">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold">Add AI Provider</h3>
              <button onClick={() => setShowAddProvider(false)} className="text-faint hover:text-fg cursor-pointer">
                <X size={18} />
              </button>
            </div>
            <div className="space-y-3">
              <Field label="Provider Name">
                <input
                  value={newProvider.name}
                  onChange={(e) => setNewProvider({ ...newProvider, name: e.target.value })}
                  placeholder="My OpenAI Key"
                  className="w-full bg-elevated border border-white/10 rounded-xl px-3.5 py-2.5 text-sm outline-none focus:border-accent/60"
                />
              </Field>
              <Field label="Type">
                <Select
                  value={newProvider.type}
                  onChange={(e) => {
                    const type = e.target.value as typeof newProvider.type
                    const urls: Record<string, string> = {
                      openai: 'https://api.openai.com/v1',
                      anthropic: 'https://api.anthropic.com',
                      custom: '',
                    }
                    setNewProvider({ ...newProvider, type, baseUrl: urls[type] || '' })
                  }}
                >
                  <option value="openai">OpenAI</option>
                  <option value="anthropic">Anthropic</option>
                  <option value="custom">Custom (OpenAI-compatible)</option>
                </Select>
              </Field>
              <Field label="Base URL">
                <input
                  value={newProvider.baseUrl}
                  onChange={(e) => setNewProvider({ ...newProvider, baseUrl: e.target.value })}
                  placeholder="https://api.openai.com/v1"
                  className="w-full bg-elevated border border-white/10 rounded-xl px-3.5 py-2.5 text-sm outline-none focus:border-accent/60"
                />
              </Field>
              <Field label="API Key">
                <input
                  type="password"
                  value={newProvider.apiKey}
                  onChange={(e) => setNewProvider({ ...newProvider, apiKey: e.target.value })}
                  placeholder="sk-..."
                  className="w-full bg-elevated border border-white/10 rounded-xl px-3.5 py-2.5 text-sm outline-none focus:border-accent/60"
                />
              </Field>
              <Field label="Model">
                <input
                  value={newProvider.model}
                  onChange={(e) => setNewProvider({ ...newProvider, model: e.target.value })}
                  placeholder="gpt-4o-mini"
                  className="w-full bg-elevated border border-white/10 rounded-xl px-3.5 py-2.5 text-sm outline-none focus:border-accent/60"
                />
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
        <h3 className="font-semibold text-[14px] mb-3">How AI Providers Work</h3>
        <div className="space-y-3 text-[13px] text-muted">
          <div className="flex items-start gap-2">
            <Check size={14} className="text-green mt-0.5 shrink-0" />
            <span><strong>OmniRoute Free:</strong> Access 90+ free AI models with automatic fallback. When one model's quota is exhausted, it seamlessly switches to the next.</span>
          </div>
          <div className="flex items-start gap-2">
            <Check size={14} className="text-green mt-0.5 shrink-0" />
            <span><strong>Your Own Keys:</strong> Use your OpenAI, Anthropic, or custom API keys. You control the costs and usage.</span>
          </div>
          <div className="flex items-start gap-2">
            <Check size={14} className="text-green mt-0.5 shrink-0" />
            <span><strong>Built-in Free:</strong> AI Images (Pollinations) and Voiceover (StreamElements) work without any API keys.</span>
          </div>
        </div>
        <div className="mt-4 p-3 bg-accent/10 rounded-xl text-[12px] text-accent">
          <strong>Tip:</strong> Enable OmniRoute for free access to models like DeepSeek, Gemini, and more. No API keys needed!
        </div>
      </Card>
    </div>
  )
}
