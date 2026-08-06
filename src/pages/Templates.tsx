import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Sparkles, Play, Download, Clock, Zap, Film, Type, Mic, Layers, Wand2 } from 'lucide-react'
import { Button, Card, Badge, toast } from '../components/ui'

interface Template {
  id: string
  name: string
  category: string
  description: string
  platforms: string[]
  duration: string
  difficulty: 'Easy' | 'Medium' | 'Advanced'
  features: string[]
  preview: string
}

const TEMPLATES: Template[] = [
  {
    id: 'viral-hook',
    name: 'Viral Hook Short',
    category: 'Short-Form',
    description: '3-second hook + punchline structure optimized for TikTok/Reels. Grabs attention instantly.',
    platforms: ['TikTok', 'Reels', 'Shorts'],
    duration: '15-30s',
    difficulty: 'Easy',
    features: ['Bold text hook', 'Trending audio', 'Quick cuts', 'CTA overlay'],
    preview: '🎯',
  },
  {
    id: 'story-time',
    name: 'Story Time',
    category: 'Short-Form',
    description: 'Reddit/text story format with narration, captions, and background gameplay footage.',
    platforms: ['TikTok', 'Reels', 'YouTube'],
    duration: '60-180s',
    difficulty: 'Easy',
    features: ['TTS narration', 'Animated captions', 'B-roll sync', 'Emoji reactions'],
    preview: '📖',
  },
  {
    id: 'before-after',
    name: 'Before / After',
    category: 'Short-Form',
    description: 'Split-screen transformation reveal. Perfect for tutorials, makeovers, and comparisons.',
    platforms: ['TikTok', 'Reels', 'Shorts'],
    duration: '15-30s',
    difficulty: 'Medium',
    features: ['Split layout', 'Swipe transition', 'Music sync', 'Text labels'],
    preview: '🔄',
  },
  {
    id: 'ai-explainer',
    name: 'AI Explainer',
    category: 'Educational',
    description: 'Script-to-video with AI voiceover, stock footage, and animated captions.',
    platforms: ['YouTube', 'LinkedIn', 'Twitter'],
    duration: '60-120s',
    difficulty: 'Medium',
    features: ['AI voiceover', 'Stock B-roll', 'Key points', 'End card'],
    preview: '🎓',
  },
  {
    id: 'talking-head',
    name: 'Talking Head Pro',
    category: 'Educational',
    description: 'Face-to-camera with auto-captions, b-roll inserts, and lower thirds.',
    platforms: ['YouTube', 'Reels', 'TikTok'],
    duration: '30-90s',
    difficulty: 'Easy',
    features: ['Auto captions', 'B-roll cutaway', 'Lower third', 'Intro/outro'],
    preview: '🗣️',
  },
  {
    id: 'product-showcase',
    name: 'Product Showcase',
    category: 'Marketing',
    description: 'Clean product reveal with feature callouts, pricing, and CTA.',
    platforms: ['Instagram', 'TikTok', 'Website'],
    duration: '15-30s',
    difficulty: 'Medium',
    features: ['Zoom pan', 'Feature text', 'Price tag', 'Shop CTA'],
    preview: '📦',
  },
  {
    id: 'meme-edit',
    name: 'Meme Edit',
    category: 'Entertainment',
    description: 'Fast-paced meme compilation with trending sounds and reaction clips.',
    platforms: ['TikTok', 'Reels', 'Twitter'],
    duration: '10-30s',
    difficulty: 'Easy',
    features: ['Meme templates', 'Sound effects', 'Zoom punch', 'Text-to-speech'],
    preview: '😂',
  },
  {
    id: 'tutorial-step',
    name: 'Step-by-Step Tutorial',
    category: 'Educational',
    description: 'Numbered steps with screen recording, voiceover, and progress indicators.',
    platforms: ['YouTube', 'TikTok', 'LinkedIn'],
    duration: '60-180s',
    difficulty: 'Advanced',
    features: ['Step counter', 'Screen record', 'Highlight zoom', 'Chapter markers'],
    preview: '📋',
  },
  {
    id: 'cinematic-reel',
    name: 'Cinematic Reel',
    category: 'Creative',
    description: 'Film-style montage with letterbox, color grading, and dramatic transitions.',
    platforms: ['Instagram', 'YouTube', 'Vimeo'],
    duration: '15-60s',
    difficulty: 'Advanced',
    features: ['Letterbox', 'Color grade', 'Speed ramps', 'Film grain'],
    preview: '🎬',
  },
  {
    id: 'comparison',
    name: 'VS Comparison',
    category: 'Marketing',
    description: 'Side-by-side product/service comparison with score tracking.',
    platforms: ['YouTube', 'TikTok', 'Instagram'],
    duration: '30-60s',
    difficulty: 'Medium',
    features: ['Split screen', 'Score counter', 'Pros/cons', 'Winner reveal'],
    preview: '⚔️',
  },
  {
    id: 'behind-scenes',
    name: 'Behind the Scenes',
    category: 'Entertainment',
    description: 'Raw footage with casual narration, showing the creative process.',
    platforms: ['TikTok', 'Reels', 'YouTube'],
    duration: '30-90s',
    difficulty: 'Easy',
    features: ['Casual style', 'Raw audio', 'Day-in-life', 'Vlog captions'],
    preview: '🎥',
  },
  {
    id: 'data-viz',
    name: 'Data Visualization',
    category: 'Educational',
    description: 'Animated charts and infographics with voiceover explaining key stats.',
    platforms: ['LinkedIn', 'Twitter', 'YouTube'],
    duration: '30-60s',
    difficulty: 'Advanced',
    features: ['Animated charts', 'Stat callouts', 'Clean design', 'Data source'],
    preview: '📊',
  },
]

const CATEGORIES = ['All', 'Short-Form', 'Educational', 'Marketing', 'Entertainment', 'Creative']

export function Templates() {
  const navigate = useNavigate()
  const [category, setCategory] = useState('All')
  const [selected, setSelected] = useState<Template | null>(null)

  const filtered = category === 'All' ? TEMPLATES : TEMPLATES.filter(t => t.category === category)

  const applyTemplate = (template: Template) => {
    // Store template config in localStorage for Editor to pick up
    const templateConfig = {
      name: template.name,
      category: template.category,
      platforms: template.platforms,
      features: template.features,
      suggestedStyle: template.category === 'Short-Form' ? 'velocity'
        : template.category === 'Educational' ? 'kinetic_typography'
        : template.category === 'Creative' ? 'compositing'
        : template.category === 'Entertainment' ? 'raw_impact'
        : 'flow_match',
      suggestedDuration: template.duration,
    }
    localStorage.setItem('cf_template_config', JSON.stringify(templateConfig))
    toast('info', `Template "${template.name}" applied — upload a video in the Editor`)
    navigate('/editor')
  }

  return (
    <div className="max-w-7xl mx-auto px-4 md:px-8 py-8 anim-float-up">
      <div className="flex items-center gap-3 mb-2">
        <span className="w-10 h-10 rounded-xl accent-gradient flex items-center justify-center text-white"><Layers size={20} /></span>
        <div>
          <h1 className="text-xl font-bold tracking-tight flex items-center gap-2">
            Template Gallery
            <Badge tone="accent">{TEMPLATES.length} templates</Badge>
          </h1>
          <p className="text-[13px] text-muted">Ready-made video templates for every content style. Pick one and start creating.</p>
        </div>
      </div>

      {/* Category Filter */}
      <div className="flex items-center gap-2 mt-6 overflow-x-auto pb-2">
        {CATEGORIES.map(cat => (
          <button
            key={cat}
            onClick={() => setCategory(cat)}
            className={`px-3 py-1.5 rounded-lg text-[12px] font-medium border whitespace-nowrap transition-colors ${
              category === cat
                ? 'bg-accent/20 border-accent/40 text-accent'
                : 'bg-elevated border-white/10 text-muted hover:border-white/20'
            }`}
          >
            {cat}
          </button>
        ))}
      </div>

      {/* Templates Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mt-6">
        {filtered.map(template => (
          <div
            key={template.id}
            onClick={() => setSelected(template)}
            className={`p-0 cursor-pointer transition-all hover:border-accent/30 rounded-xl border ${
              selected?.id === template.id ? 'border-accent/40 bg-accent/5' : 'border-border'
            }`}
          >
            <Card className="p-5 border-0">
            <div className="flex items-start gap-3">
              <div className="w-12 h-12 rounded-xl bg-elevated flex items-center justify-center text-2xl shrink-0">
                {template.preview}
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="font-semibold text-[14px]">{template.name}</h3>
                <div className="flex items-center gap-2 mt-1">
                  <Badge tone="accent">{template.category}</Badge>
                  <Badge tone="neutral">{template.difficulty}</Badge>
                </div>
              </div>
            </div>

            <p className="text-[12px] text-muted mt-3 line-clamp-2">{template.description}</p>

            <div className="flex items-center gap-3 mt-3 text-[11px] text-faint">
              <span className="flex items-center gap-1"><Clock size={10} /> {template.duration}</span>
              <span className="flex items-center gap-1"><Film size={10} /> {template.platforms.join(', ')}</span>
            </div>

            <div className="flex flex-wrap gap-1 mt-3">
              {template.features.map(f => (
                <span key={f} className="px-2 py-0.5 rounded-full bg-elevated text-[10px] text-faint border border-white/5">{f}</span>
              ))}
            </div>

            <div className="flex gap-2 mt-4">
              <Button
                size="sm"
                variant="primary"
                icon={<Play size={12} />}
                onClick={(e) => { e.stopPropagation(); applyTemplate(template) }}
              >
                Use Template
              </Button>
            </div>
            </Card>
          </div>
        ))}
      </div>

      {selected && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={() => setSelected(null)} />
          <Card className="relative max-w-lg w-full p-6 anim-float-up">
            <div className="flex items-start gap-4">
              <div className="w-16 h-16 rounded-2xl bg-elevated flex items-center justify-center text-3xl shrink-0">
                {selected.preview}
              </div>
              <div>
                <h2 className="text-lg font-bold">{selected.name}</h2>
                <div className="flex items-center gap-2 mt-1">
                  <Badge tone="accent">{selected.category}</Badge>
                  <Badge tone="neutral">{selected.difficulty}</Badge>
                  <Badge tone="neutral"><Clock size={10} className="inline mr-1" />{selected.duration}</Badge>
                </div>
              </div>
            </div>

            <p className="text-[13px] text-muted mt-4">{selected.description}</p>

            <div className="mt-4">
              <h4 className="text-[12px] font-semibold text-faint uppercase tracking-wide mb-2">Platforms</h4>
              <div className="flex gap-2">
                {selected.platforms.map(p => (
                  <Badge key={p} tone="neutral">{p}</Badge>
                ))}
              </div>
            </div>

            <div className="mt-4">
              <h4 className="text-[12px] font-semibold text-faint uppercase tracking-wide mb-2">Features</h4>
              <div className="flex flex-wrap gap-2">
                {selected.features.map(f => (
                  <span key={f} className="px-2.5 py-1 rounded-lg bg-elevated text-[12px] text-fg border border-white/8">{f}</span>
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
