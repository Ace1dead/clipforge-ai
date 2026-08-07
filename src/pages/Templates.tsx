import { useState, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { Sparkles, Play, Download, Clock, Zap, Film, Type, Mic, Layers, Wand2, Search, Filter, Palette } from 'lucide-react'
import { Button, Card, Badge, toast, Input, Select, Field } from '../components/ui'
import { ALL_VIRAL_PRESETS, type ViralPreset, type ViralCategory } from '../lib/viralPresets'
import { getPresetSummaries, autoSuggestPreset } from '../lib/templateEngine'
import { createBrandKitWithPreset, type BrandKit } from '../lib/brandKit'

const CATEGORY_FILTERS: Array<{ id: string; label: string }> = [
  { id: 'all', label: 'All Templates' },
  { id: 'podcast', label: 'Podcast' },
  { id: 'gaming', label: 'Gaming' },
  { id: 'storytelling', label: 'Storytelling' },
  { id: 'business', label: 'Business' },
  { id: 'fitness', label: 'Fitness' },
  { id: 'music', label: 'Music' },
  { id: 'educational', label: 'Educational' },
  { id: 'reaction', label: 'Reaction' },
]

const PLATFORM_BADGES: Record<string, string> = {
  tiktok: 'TikTok',
  reels: 'Reels',
  shorts: 'Shorts',
}

const CATEGORY_COLORS: Record<string, string> = {
  podcast: '#5e6ad2',
  gaming: '#00ff88',
  storytelling: '#22d3ee',
  business: '#FFD60A',
  fitness: '#ef4444',
  music: '#ec4899',
  educational: '#22d3ee',
  reaction: '#ef4444',
}

function getDifficultyLabel(preset: ViralPreset): 'Easy' | 'Medium' | 'Advanced' {
  const { editStyle, audio } = preset
  if (editStyle === 'documentary' || editStyle === 'kinetic_typography') return 'Easy'
  if (editStyle === 'music_video' || editStyle === 'compositing') return 'Advanced'
  if (audio.sfxOnTransitions && editStyle === 'sports') return 'Advanced'
  return 'Medium'
}

function getFeatureTags(preset: ViralPreset): string[] {
  const tags: string[] = []
  if (preset.captions.emphasisRule === 'every-word') tags.push('Word-by-word captions')
  if (preset.captions.uppercase) tags.push('ALL CAPS')
  if (preset.motion.shakeOnBeat) tags.push('Screen shake')
  if (preset.motion.zoomPunchIn > 1.05) tags.push('Zoom punch')
  if (preset.audio.sfxOnTransitions) tags.push('SFX on cuts')
  if (preset.overlays.progressBar) tags.push('Progress bar')
  if (preset.hooks.length > 0) tags.push('Hook overlay')
  if (preset.audio.normalizeTarget <= -14) tags.push('LUFS normalized')
  if (preset.color.contrast > 1.15) tags.push('High contrast')
  if (preset.timing.loopOverlap > 1.5) tags.push('Loop-optimized')
  if (preset.audio.noiseReduction) tags.push('Noise reduction')
  return tags.slice(0, 4)
}

export function Templates() {
  const navigate = useNavigate()
  const [category, setCategory] = useState('all')
  const [selected, setSelected] = useState<ViralPreset | null>(null)
  const [search, setSearch] = useState('')
  const [brandKit, setBrandKit] = useState<BrandKit | null>(null)
  const [showBrandKit, setShowBrandKit] = useState(false)

  const filtered = useMemo(() => {
    let presets = ALL_VIRAL_PRESETS
    if (category !== 'all') {
      presets = presets.filter(p => p.category === category)
    }
    if (search) {
      const q = search.toLowerCase()
      presets = presets.filter(p =>
        p.name.toLowerCase().includes(q) ||
        p.description.toLowerCase().includes(q) ||
        p.category.toLowerCase().includes(q)
      )
    }
    return presets
  }, [category, search])

  const applyTemplate = (preset: ViralPreset) => {
    // Store template config in localStorage for Editor to pick up
    const templateConfig = {
      presetId: preset.id,
      name: preset.name,
      category: preset.category,
      platforms: preset.platforms.map(p => PLATFORM_BADGES[p] || p),
      editStyle: preset.editStyle,
      colorSkin: preset.color.skin,
      captionStyle: preset.captions.style,
      suggestedDuration: `${preset.timing.minClipLength}-${preset.timing.maxClipLength}s`,
      timing: preset.timing,
      motion: preset.motion,
      captions: preset.captions,
      audio: preset.audio,
      color: preset.color,
      hooks: preset.hooks,
      overlays: preset.overlays,
    }
    localStorage.setItem('cf_template_config', JSON.stringify(templateConfig))
    if (brandKit) {
      localStorage.setItem('cf_brand_kit', JSON.stringify(brandKit))
    }
    toast('info', `Template "${preset.name}" applied — upload a video in the Editor`)
    navigate('/editor')
  }

  return (
    <div className="max-w-7xl mx-auto px-4 md:px-8 py-8 anim-float-up">
      <div className="flex items-center gap-3 mb-2">
        <span className="w-10 h-10 rounded-xl accent-gradient flex items-center justify-center text-white"><Layers size={20} /></span>
        <div>
          <h1 className="text-xl font-bold tracking-tight flex items-center gap-2">
            Viral Template Engine
            <Badge tone="accent">{ALL_VIRAL_PRESETS.length} presets</Badge>
          </h1>
          <p className="text-[13px] text-muted">Research-backed editing presets for TikTok, Reels, and Shorts. Each preset encodes exact timing, motion, captions, and audio rules.</p>
        </div>
      </div>

      {/* Search + Category Filter */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 mt-6">
        <div className="relative flex-1 w-full sm:max-w-xs">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-faint" />
          <input
            type="text"
            placeholder="Search templates..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full pl-9 pr-3 py-2 rounded-lg text-[13px] bg-elevated border border-border text-fg placeholder:text-faint focus:border-accent/40 focus:outline-none transition-colors"
          />
        </div>
        <div className="flex items-center gap-2 overflow-x-auto pb-2 flex-1">
          {CATEGORY_FILTERS.map(cat => (
            <button
              key={cat.id}
              onClick={() => setCategory(cat.id)}
              className={`px-3 py-1.5 rounded-lg text-[12px] font-medium border whitespace-nowrap transition-colors ${
                category === cat.id
                  ? 'bg-accent/20 border-accent/40 text-accent'
                  : 'bg-elevated border-white/10 text-muted hover:border-white/20'
              }`}
            >
              {cat.label}
            </button>
          ))}
        </div>
      </div>

      {/* Brand Kit Section */}
      <div className="mt-6">
        <button
          onClick={() => setShowBrandKit(!showBrandKit)}
          className="flex items-center gap-2 text-[13px] text-muted hover:text-fg transition-colors cursor-pointer"
        >
          <Palette size={14} className="text-accent" />
          <span className="font-medium">Brand Kit</span>
          <Badge tone="neutral" className="text-[10px]">{brandKit ? 'Active' : 'Optional'}</Badge>
          <span className="text-[11px] text-faint">{showBrandKit ? '▲' : '▼'}</span>
        </button>
        {showBrandKit && (
          <Card className="p-4 mt-3">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              <Field label="Preset">
                <Select
                  value={brandKit?.name ?? ''}
                  onChange={(e) => {
                    const val = e.target.value
                    if (!val) { setBrandKit(null); return }
                    const kit = createBrandKitWithPreset(val, val.toLowerCase() as any)
                    setBrandKit(kit)
                    toast('info', `Brand kit "${val}" applied to templates`)
                  }}
                >
                  <option value="">No brand kit</option>
                  <option value="Corporate">Corporate</option>
                  <option value="Creative">Creative</option>
                  <option value="Minimal">Minimal</option>
                  <option value="Bold">Bold</option>
                  <option value="Neon">Neon</option>
                </Select>
              </Field>
              {brandKit && (
                <>
                  <div>
                    <p className="text-[11px] text-faint mb-1.5">Colors</p>
                    <div className="flex gap-1.5">
                      {Object.entries(brandKit.colors).map(([key, color]) => (
                        <div key={key} className="flex flex-col items-center gap-0.5">
                          <div className="w-6 h-6 rounded border border-white/20" style={{ backgroundColor: color }} />
                          <span className="text-[8px] text-faint">{key.slice(0, 3)}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                  <div>
                    <p className="text-[11px] text-faint mb-1.5">Fonts</p>
                    <div className="space-y-0.5 text-[11px]">
                      <p><span className="text-faint">Heading:</span> {brandKit.fonts.heading}</p>
                      <p><span className="text-faint">Body:</span> {brandKit.fonts.body}</p>
                      <p><span className="text-faint">Accent:</span> {brandKit.fonts.accent}</p>
                    </div>
                  </div>
                </>
              )}
            </div>
            {brandKit && (
              <p className="text-[10px] text-faint mt-2">Brand colors and fonts will be applied to exported clips.</p>
            )}
          </Card>
        )}
      </div>

      {/* Templates Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mt-6">
        {filtered.map(preset => {
          const difficulty = getDifficultyLabel(preset)
          const features = getFeatureTags(preset)
          const accentColor = CATEGORY_COLORS[preset.category] || '#5e6ad2'

          return (
            <div
              key={preset.id}
              onClick={() => setSelected(preset)}
              className={`p-0 cursor-pointer transition-all hover:border-accent/30 rounded-xl border ${
                selected?.id === preset.id ? 'border-accent/40 bg-accent/5' : 'border-border'
              }`}
            >
              <Card className="p-5 border-0">
                <div className="flex items-start gap-3">
                  <div
                    className="w-12 h-12 rounded-xl flex items-center justify-center text-2xl shrink-0"
                    style={{ backgroundColor: `${accentColor}20` }}
                  >
                    {preset.icon}
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold text-[14px]">{preset.name}</h3>
                    <div className="flex items-center gap-2 mt-1">
                      <Badge tone="accent">{preset.category}</Badge>
                      <Badge tone="neutral">{difficulty}</Badge>
                    </div>
                  </div>
                </div>

                <p className="text-[12px] text-muted mt-3 line-clamp-2">{preset.description}</p>

                <div className="flex items-center gap-3 mt-3 text-[11px] text-faint">
                  <span className="flex items-center gap-1">
                    <Clock size={10} />
                    {preset.timing.minClipLength}-{preset.timing.maxClipLength}s
                  </span>
                  <span className="flex items-center gap-1">
                    <Film size={10} />
                    {preset.platforms.map(p => PLATFORM_BADGES[p] || p).join(', ')}
                  </span>
                </div>

                <div className="flex flex-wrap gap-1 mt-3">
                  {features.map(f => (
                    <span key={f} className="px-2 py-0.5 rounded-full bg-elevated text-[10px] text-faint border border-white/5">{f}</span>
                  ))}
                </div>

                <div className="flex gap-2 mt-4">
                  <Button
                    size="sm"
                    variant="primary"
                    icon={<Play size={12} />}
                    onClick={(e) => { e.stopPropagation(); applyTemplate(preset) }}
                  >
                    Use Template
                  </Button>
                </div>
              </Card>
            </div>
          )
        })}
      </div>

      {filtered.length === 0 && (
        <div className="text-center py-16">
          <Filter size={32} className="mx-auto text-faint mb-3" />
          <p className="text-[14px] text-muted">No templates match your search</p>
        </div>
      )}

      {/* Detail Modal */}
      {selected && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={() => setSelected(null)} />
          <Card className="relative max-w-lg w-full p-6 anim-float-up max-h-[85vh] overflow-y-auto">
            <div className="flex items-start gap-4">
              <div
                className="w-16 h-16 rounded-2xl flex items-center justify-center text-3xl shrink-0"
                style={{ backgroundColor: `${CATEGORY_COLORS[selected.category]}20` }}
              >
                {selected.icon}
              </div>
              <div>
                <h2 className="text-lg font-bold">{selected.name}</h2>
                <div className="flex items-center gap-2 mt-1">
                  <Badge tone="accent">{selected.category}</Badge>
                  <Badge tone="neutral">{getDifficultyLabel(selected)}</Badge>
                  <Badge tone="neutral">
                    <Clock size={10} className="inline mr-1" />
                    {selected.timing.minClipLength}-{selected.timing.maxClipLength}s
                  </Badge>
                </div>
              </div>
            </div>

            <p className="text-[13px] text-muted mt-4">{selected.description}</p>

            {/* Timing Rules */}
            <div className="mt-4">
              <h4 className="text-[12px] font-semibold text-faint uppercase tracking-wide mb-2">Timing Rules</h4>
              <div className="grid grid-cols-2 gap-2 text-[12px]">
                <div className="p-2 rounded-lg bg-elevated border border-white/5">
                  <span className="text-faint">Cut Interval</span>
                  <span className="float-right text-fg font-medium">{selected.timing.cutInterval[0]}-{selected.timing.cutInterval[1]}s</span>
                </div>
                <div className="p-2 rounded-lg bg-elevated border border-white/5">
                  <span className="text-faint">Hook Duration</span>
                  <span className="float-right text-fg font-medium">{selected.timing.hookDuration}s</span>
                </div>
                <div className="p-2 rounded-lg bg-elevated border border-white/5">
                  <span className="text-faint">Caption Words</span>
                  <span className="float-right text-fg font-medium">{selected.timing.captionWordCount[0]}-{selected.timing.captionWordCount[1]}</span>
                </div>
                <div className="p-2 rounded-lg bg-elevated border border-white/5">
                  <span className="text-faint">Fade Duration</span>
                  <span className="float-right text-fg font-medium">{selected.timing.fadeDuration}s</span>
                </div>
              </div>
            </div>

            {/* Motion */}
            <div className="mt-4">
              <h4 className="text-[12px] font-semibold text-faint uppercase tracking-wide mb-2">Motion</h4>
              <div className="grid grid-cols-2 gap-2 text-[12px]">
                <div className="p-2 rounded-lg bg-elevated border border-white/5">
                  <span className="text-faint">Zoom Punch</span>
                  <span className="float-right text-fg font-medium">{Math.round((selected.motion.zoomPunchIn - 1) * 100)}%</span>
                </div>
                <div className="p-2 rounded-lg bg-elevated border border-white/5">
                  <span className="text-faint">Screen Shake</span>
                  <span className="float-right text-fg font-medium">{selected.motion.shakeOnBeat ? `${Math.round(selected.motion.shakeIntensity * 100)}%` : 'Off'}</span>
                </div>
              </div>
            </div>

            {/* Captions */}
            <div className="mt-4">
              <h4 className="text-[12px] font-semibold text-faint uppercase tracking-wide mb-2">Captions</h4>
              <div className="grid grid-cols-2 gap-2 text-[12px]">
                <div className="p-2 rounded-lg bg-elevated border border-white/5">
                  <span className="text-faint">Style</span>
                  <span className="float-right text-fg font-medium">{selected.captions.style}</span>
                </div>
                <div className="p-2 rounded-lg bg-elevated border border-white/5">
                  <span className="text-faint">Font Size</span>
                  <span className="float-right text-fg font-medium">{Math.round(selected.captions.fontSize * 100)}%</span>
                </div>
                <div className="p-2 rounded-lg bg-elevated border border-white/5">
                  <span className="text-faint">Emphasis</span>
                  <span className="float-right text-fg font-medium">{selected.captions.emphasisRule}</span>
                </div>
                <div className="p-2 rounded-lg bg-elevated border border-white/5">
                  <span className="text-faint">Highlight</span>
                  <span className="float-right">
                    <span className="inline-block w-3 h-3 rounded-full border border-white/20" style={{ backgroundColor: selected.captions.highlightColor }} />
                  </span>
                </div>
              </div>
            </div>

            {/* Audio */}
            <div className="mt-4">
              <h4 className="text-[12px] font-semibold text-faint uppercase tracking-wide mb-2">Audio</h4>
              <div className="grid grid-cols-2 gap-2 text-[12px]">
                <div className="p-2 rounded-lg bg-elevated border border-white/5">
                  <span className="text-faint">Voice Ducking</span>
                  <span className="float-right text-fg font-medium">{selected.audio.duckingDb}dB</span>
                </div>
                <div className="p-2 rounded-lg bg-elevated border border-white/5">
                  <span className="text-faint">Normalize</span>
                  <span className="float-right text-fg font-medium">{selected.audio.normalizeTarget} LUFS</span>
                </div>
              </div>
            </div>

            {/* Platforms */}
            <div className="mt-4">
              <h4 className="text-[12px] font-semibold text-faint uppercase tracking-wide mb-2">Platforms</h4>
              <div className="flex gap-2">
                {selected.platforms.map(p => (
                  <Badge key={p} tone="neutral">{PLATFORM_BADGES[p] || p}</Badge>
                ))}
              </div>
            </div>

            <div className="flex gap-2 mt-6">
              <Button className="flex-1" icon={<Wand2 size={16} />} onClick={() => { applyTemplate(selected); setSelected(null) }}>
                Use This Template
              </Button>
              <Button variant="ghost" onClick={() => setSelected(null)}>Close</Button>
            </div>
          </Card>
        </div>
      )}
    </div>
  )
}
