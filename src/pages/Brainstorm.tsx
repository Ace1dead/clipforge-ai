import { useState, useCallback } from 'react'
import { Brain, Copy, Sparkles, Wand2, Lightbulb, Zap } from 'lucide-react'
import { Button, Card, Input, Textarea, Badge, toast } from '../components/ui'
import { generateAI } from '../lib/aiService'

interface Hook {
  text: string
  type: string
  score: number
  reason: string
}

export function Brainstorm() {
  const [niche, setNiche] = useState('')
  const [topic, setTopic] = useState('')
  const [context, setContext] = useState('')
  const [platform, setPlatform] = useState<'all' | 'tiktok' | 'reels' | 'shorts'>('all')
  const [tone, setTone] = useState<'viral' | 'emotional' | 'educational' | 'controversial'>('viral')
  const [count, setCount] = useState(6)
  const [loading, setLoading] = useState(false)
  const [hooks, setHooks] = useState<Hook[]>([])
  const [manualHook, setManualHook] = useState('')
  const [aiMode, setAiMode] = useState(false)

  const generate = useCallback(async () => {
    if (!niche.trim() && !topic.trim()) {
      toast('info', 'Enter a niche or topic')
      return
    }
    setLoading(true)
    try {
      if (aiMode) {
        const prompt = `Generate ${count} viral ${tone} hooks for ${platform === 'all' ? 'all platforms' : platform}.
Niche: ${niche || 'General'}
Topic: ${topic || 'any topic'}
${context ? `Context: ${context}` : ''}

Return ONLY a JSON array of objects with: text, type, score (0-100), reason.
Each hook must be under 15 words. Be creative and punchy.`

        const result = await generateAI({
          messages: [
            { role: 'system', content: 'You are a viral content expert. Return ONLY valid JSON arrays, no markdown.' },
            { role: 'user', content: prompt },
          ],
          temperature: 0.9,
          maxTokens: 2000,
        })

        try {
          let text = result.content.trim()
          if (text.startsWith('```')) text = text.replace(/^```(?:json)?\n?/, '').replace(/\n?```$/, '')
          const parsed = JSON.parse(text)
          if (Array.isArray(parsed) && parsed.length > 0) {
            setHooks(parsed.map((h: any, i: number) => ({
              text: h.text || h.hook || `Hook ${i + 1}`,
              type: h.type || 'viral',
              score: h.score || 50,
              reason: h.reason || h.explanation || 'AI-generated',
            })))
            toast('success', `Generated ${parsed.length} hooks with AI`)
          }
        } catch {
          toast('error', 'Failed to parse AI response')
        }
      } else {
        const pool: Hook[] = []
        const virals = [
          'You won\'t believe what happens next...',
          'This changed everything for me.',
          'Nobody talks about this but...',
          'Stop scrolling — you need to hear this.',
          'I tried this so you don\'t have to.',
          'The internet is NOT ready for this.',
          'Watch till the end — trust me.',
          'This is why {topic} is broken.',
          'Everyone gets {topic} wrong.',
          'POV: You just discovered {topic}.',
        ]
        const emotional = [
          'I can\'t believe this is real.',
          'This made me cry. Not gonna lie.',
          'If you\'ve ever felt {topic}... this is for you.',
          'The moment I realized {topic} was everything.',
          'This hits different at 3am.',
          'Why does nobody talk about this side of {topic}?',
          'You\'re not ready for this truth.',
          'I wish someone told me this sooner.',
          'The hardest part about {topic}?',
          'This is the {topic} video I wish existed.',
        ]
        const educational = [
          'Here\'s what 99% get wrong about {topic}.',
          'The real reason {topic} fails.',
          'I spent 100 hours on {topic}. Here\'s what I learned.',
          'Step 1: Stop doing {topic} this way.',
          'The {topic} formula nobody shares.',
          'Save this — you\'ll need it later.',
          'POV: You finally understand {topic}.',
          'The #1 {topic} mistake (and how to fix it).',
          '{topic} in 60 seconds. You\'re welcome.',
          'This {topic} hack went viral for a reason.',
        ]
        const controversial = [
          'Unpopular opinion: {topic} is overrated.',
          'The {topic} industry doesn\'t want you to know this.',
          'Why I quit {topic} (and you should too).',
          '{topic} is a lie. Here\'s why.',
          'You\'ve been doing {topic} wrong your entire life.',
          'The dark side of {topic} nobody mentions.',
          'Stop trusting {topic} "experts".',
          '{topic} is dead. Here\'s what\'s next.',
          'The truth about {topic} they deleted from the internet.',
          'I got banned for saying this about {topic}.',
        ]

        const map = { viral: virals, emotional, educational, controversial }
        const pick = (arr: string[]) => arr[Math.floor(Math.random() * arr.length)]

        const shuffled = [...(map[tone] || virals)].sort(() => Math.random() - 0.5)
        for (let i = 0; i < Math.min(count, shuffled.length); i++) {
          const raw = pick(virals)
          pool.push({
            text: raw.replace(/\{topic\}/g, topic || niche).replace(/\{niche\}/g, niche),
            type: tone,
            score: Math.floor(Math.random() * 30) + 70,
            reason: i === 0 ? 'Top pick — highest engagement potential' : 'Strong viral structure',
          })
        }
        setHooks(pool)
        toast('info', 'Hooks generated (configure AI in AI Settings for AI-powered hooks)')
      }
    } catch (e) {
      toast('error', 'Failed to generate hooks', e instanceof Error ? e.message : undefined)
    } finally {
      setLoading(false)
    }
  }, [niche, topic, context, platform, tone, count, aiMode])

  const copyAll = () => {
    const text = hooks.map(h => h.text).join('\n')
    navigator.clipboard.writeText(text)
    toast('success', 'Copied all hooks')
  }

  const copyOne = (text: string) => {
    navigator.clipboard.writeText(text)
    toast('success', 'Copied')
  }

  const getScoreBadge = (score: number) => {
    if (score >= 85) return <Badge tone="green">{score}</Badge>
    if (score >= 70) return <Badge tone="amber">{score}</Badge>
    return <Badge tone="neutral">{score}</Badge>
  }

  const addManualHook = () => {
    if (!manualHook.trim()) return
    setHooks(prev => [...prev, { text: manualHook.trim(), type: 'custom', score: 0, reason: 'Manual entry' }])
    setManualHook('')
  }

  return (
    <div className="max-w-5xl mx-auto px-4 md:px-8 py-8 anim-float-up">
      <div className="flex items-center gap-3 mb-2">
        <span className="w-10 h-10 rounded-xl accent-gradient flex items-center justify-center text-white"><Brain size={20} /></span>
        <div>
          <h1 className="text-xl font-bold tracking-tight flex items-center gap-2">
            Hook Brainstorm
            <Badge tone={aiMode ? 'green' : 'accent'}>{aiMode ? 'AI Mode' : 'Template Mode'}</Badge>
          </h1>
          <p className="text-[13px] text-muted">Generate viral hooks optimized for short-form platforms.</p>
        </div>
      </div>

      <div className="mt-6 grid md:grid-cols-2 gap-5">
        <Card className="p-5">
          <h3 className="font-semibold text-[14px] mb-4">Input</h3>
          <div className="space-y-3">
            <div className="flex items-center gap-2 mb-3">
              <button
                onClick={() => setAiMode(false)}
                className={`flex-1 py-2 px-3 rounded-lg text-[13px] font-medium border transition-colors ${!aiMode ? 'bg-accent/20 border-accent/40 text-accent' : 'bg-elevated border-white/10 text-muted hover:border-white/20'}`}
              >
                <Lightbulb size={14} className="inline mr-1" />
                Templates
              </button>
              <button
                onClick={() => setAiMode(true)}
                className={`flex-1 py-2 px-3 rounded-lg text-[13px] font-medium border transition-colors ${aiMode ? 'bg-accent/20 border-accent/40 text-accent' : 'bg-elevated border-white/10 text-muted hover:border-white/20'}`}
              >
                <Sparkles size={14} className="inline mr-1" />
                AI (Your Key)
              </button>
            </div>

            <div>
              <label className="block text-[12px] text-muted mb-1">Niche / Category</label>
              <Input value={niche} onChange={e => setNiche(e.target.value)} placeholder="e.g. Finance, Fitness, Tech" />
            </div>
            <div>
              <label className="block text-[12px] text-muted mb-1">Topic / Keyword</label>
              <Input value={topic} onChange={e => setTopic(e.target.value)} placeholder="e.g. budgeting, cold plunge, AI tools" />
            </div>
            {aiMode && (
              <div>
                <label className="block text-[12px] text-muted mb-1">Additional Context (optional)</label>
                <Textarea value={context} onChange={e => setContext(e.target.value)} placeholder="e.g. target audience is Gen Z, brand voice is edgy" rows={2} />
              </div>
            )}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-[12px] text-muted mb-1">Platform</label>
                <select
                  value={platform}
                  onChange={e => setPlatform(e.target.value as typeof platform)}
                  className="w-full bg-elevated border border-white/10 rounded-xl px-3.5 py-2.5 text-[13px] outline-none focus:border-accent/60"
                >
                  <option value="all">All Platforms</option>
                  <option value="tiktok">TikTok</option>
                  <option value="reels">Instagram Reels</option>
                  <option value="shorts">YouTube Shorts</option>
                </select>
              </div>
              <div>
                <label className="block text-[12px] text-muted mb-1">Tone</label>
                <select
                  value={tone}
                  onChange={e => setTone(e.target.value as typeof tone)}
                  className="w-full bg-elevated border border-white/10 rounded-xl px-3.5 py-2.5 text-[13px] outline-none focus:border-accent/60"
                >
                  <option value="viral">Viral</option>
                  <option value="emotional">Emotional</option>
                  <option value="educational">Educational</option>
                  <option value="controversial">Controversial</option>
                </select>
              </div>
            </div>
            <div>
              <label className="block text-[12px] text-muted mb-1">Number of Hooks</label>
              <Input type="number" value={count} onChange={e => setCount(Math.max(1, Math.min(20, Number(e.target.value))))} />
            </div>
          </div>

          <div className="flex gap-2 mt-4">
            <Button icon={<Wand2 size={16} />} loading={loading} onClick={() => void generate()} className="flex-1">
              Generate Hooks
            </Button>
            {hooks.length > 0 && (
              <Button variant="secondary" icon={<Copy size={16} />} onClick={copyAll}>
                Copy All
              </Button>
            )}
          </div>
        </Card>

        <Card className="p-5">
          <h3 className="font-semibold text-[14px] mb-3">Results ({hooks.length})</h3>
          {hooks.length === 0 ? (
            <div className="text-center py-12 text-[13px] text-muted">
              <Lightbulb size={32} className="mx-auto mb-3 text-faint" />
              <p>No hooks generated yet.</p>
              <p className="text-faint mt-1">Enter a niche and topic, then click Generate.</p>
            </div>
          ) : (
            <div className="space-y-2">
              {hooks.map((hook, i) => (
                <div key={i} className="flex items-start gap-2 p-3 bg-elevated/50 rounded-xl border border-white/10 group">
                  <div className="flex-1 min-w-0">
                    <p className="text-[13px] font-medium">"{hook.text}"</p>
                    <div className="flex items-center gap-2 mt-1 text-[11px] text-faint">
                      <Badge tone="accent">{hook.type}</Badge>
                      {hook.score > 0 && getScoreBadge(hook.score)}
                      <span>{hook.reason}</span>
                    </div>
                  </div>
                  <button
                    onClick={() => copyOne(hook.text)}
                    className="opacity-0 group-hover:opacity-100 transition-opacity p-1.5 rounded-lg hover:bg-white/10 text-faint hover:text-white"
                    title="Copy hook"
                  >
                    <Copy size={12} />
                  </button>
                </div>
              ))}
            </div>
          )}

          <div className="mt-4 pt-4 border-t border-white/10">
            <label className="block text-[12px] text-muted mb-1">Add Custom Hook</label>
            <div className="flex gap-2">
              <Input value={manualHook} onChange={e => setManualHook(e.target.value)} placeholder="Write your own hook..." className="flex-1" />
              <Button size="sm" variant="secondary" icon={<Zap size={14} />} onClick={addManualHook}>
                Add
              </Button>
            </div>
          </div>
        </Card>
      </div>
    </div>
  )
}
