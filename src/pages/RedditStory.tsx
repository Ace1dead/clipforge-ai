import { useState } from 'react'
import { MessagesSquare, Sparkles, RefreshCw } from 'lucide-react'
import { Button, Card, Select, Field, Slider, Textarea, ProgressBar, Badge, toast } from '../components/ui'
import { STREAMELEMENTS_VOICES, synthesizeStreamElements, estimateWordTiming, estimateSpeakingTime } from '../lib/tts'
import { renderComposition } from '../lib/video'
import { getStyle, drawCaptions } from '../lib/captions'
import { decodeAudio } from '../lib/audio'
import { proceduralImage } from '../lib/aiImage'
import { downloadBlob, fmtBytes } from '../lib/format'
import type { TimedWord } from '../lib/tts'

interface RedditPost { title: string; selftext: string; score: number; subreddit: string }

const SUBS = ['AskReddit', 'AmItheAsshole', 'TrueOffMyChest', 'tifu', 'relationship_advice', 'nosleep', 'pettyrevenge', 'confession']

export function RedditStory() {
  const [sub, setSub] = useState('AskReddit')
  const [post, setPost] = useState<RedditPost | null>(null)
  const [loading, setLoading] = useState(false)
  const [voice, setVoice] = useState('Brian')
  const [style, setStyle] = useState('pop-classic')
  const [wpm, setWpm] = useState(170)
  const [bgPrompt, setBgPrompt] = useState('dark ambient background, moody cinematic')
  const [generating, setGenerating] = useState(false)
  const [progress, setProgress] = useState(0)
  const [editText, setEditText] = useState('')

  const fetchPost = async () => {
    setLoading(true)
    setPost(null)
    try {
      // Try fetching from Reddit — may fail due to CORS/blocks
      const res = await fetch(`https://www.reddit.com/r/${sub}/top.json?t=week&limit=25`)
      const text = await res.text()
      let json: any
      try { json = JSON.parse(text) } catch { throw new Error('parse') }
      if (!res.ok || !json?.data?.children) throw new Error('blocked')
      const posts: RedditPost[] = (json.data.children ?? [])
        .map((c: { data?: Record<string, unknown> }) => c.data as unknown as RedditPost)
        .filter((p: RedditPost) => p && typeof p.selftext === 'string' && p.selftext.length > 200 && p.selftext.length < 4000)
      if (!posts.length) throw new Error('empty')
      const p = posts[Math.floor(Math.random() * Math.min(5, posts.length))]
      setPost(p)
      setEditText(p.selftext)
    } catch {
      // Reddit blocks automated access — provide manual paste fallback
      toast('info', 'Reddit blocks automated fetching. Paste a story below or use a direct link.')
      setPost({ title: `r/${sub} story`, selftext: '', score: 0, subreddit: sub })
      setEditText('')
    } finally { setLoading(false) }
  }

  const generate = async () => {
    if (!post) return
    setGenerating(true)
    setProgress(0)
    try {
      const story = `${post.title}. ${editText || post.selftext}`.slice(0, 1500)
      const expected = estimateSpeakingTime(story, wpm)
      const tts = await synthesizeStreamElements(story, voice)
      const ttsUrl = URL.createObjectURL(tts)
      const audio = await decodeAudio(ttsUrl)
      const duration = Math.max(audio.duration, expected * 0.8)
      const words: TimedWord[] = estimateWordTiming(story, duration)
      const bg = proceduralImage(bgPrompt || 'dark ambient background', 1080, 1920, Math.floor(Math.random() * 1e9))
      const bgUrl = bg.toDataURL('image/jpeg', 0.8)
      const styleDef = getStyle(style)
      setProgress(0.2)
      const blob = await renderComposition({
        sources: [{ url: bgUrl, fit: 'cover' }],
        outW: 1080, outH: 1920,
        trim: { start: 0, end: duration },
        audioLayers: [{ url: ttsUrl }],
        onProgress: (p) => setProgress(0.2 + p * 0.8),
        draw: (ctx, t, w, h) => drawCaptions(ctx, words, styleDef, t, w, h),
      })
      downloadBlob(blob, `reddit-story_${post.subreddit}.webm`)
      toast('success', 'Reddit story video ready', fmtBytes(blob.size))
    } catch (e) {
      toast('error', 'Generation failed', e instanceof Error ? e.message : undefined)
    } finally { setGenerating(false) }
  }

  return (
    <div className="max-w-6xl mx-auto px-4 md:px-8 py-8 anim-float-up">
      <div className="flex items-center gap-3 mb-2">
        <span className="w-10 h-10 rounded-xl accent-gradient flex items-center justify-center text-white"><MessagesSquare size={20} /></span>
        <div>
          <h1 className="text-xl font-bold tracking-tight">Reddit Story Videos</h1>
          <p className="text-[13px] text-muted">Turn Reddit posts into narrated, captioned viral videos in one click.</p>
        </div>
      </div>

      <div className="mt-6 grid lg:grid-cols-[1fr_380px] gap-5 items-start">
        <Card className="p-5">
          <div className="flex gap-3 items-end">
            <div className="flex-1">
              <Field label="Subreddit">
                <Select value={sub} onChange={(e) => setSub(e.target.value)}>
                  {SUBS.map((s) => <option key={s} value={s}>r/{s}</option>)}
                </Select>
              </Field>
            </div>
            <Button icon={<RefreshCw size={15} />} loading={loading} onClick={() => void fetchPost()}>Fetch story</Button>
          </div>

          {post ? (
            <div className="mt-5 anim-float-up">
              <div className="flex items-center gap-2 mb-2">
                <Badge>r/{post.subreddit}</Badge>
                <Badge tone="amber">▲ {post.score}</Badge>
              </div>
              <h3 className="font-bold text-[16px] leading-snug mb-3">{post.title}</h3>
              <Textarea rows={10} value={editText} onChange={(e) => setEditText(e.target.value)} className="text-[13px] leading-relaxed" />
              <p className="text-[11px] text-faint mt-1">{Math.ceil((editText.length / 5) / wpm * 60)}s estimated narration at {wpm} wpm</p>
            </div>
          ) : (
            <div className="py-10 text-center text-muted text-[13px] mt-4">Pick a subreddit and fetch a story to begin.</div>
          )}
        </Card>

        <Card className="p-5">
          <h3 className="font-semibold text-[14px] mb-3">Settings</h3>
          <div className="space-y-4">
            <Field label="Voice">
              <Select value={voice} onChange={(e) => setVoice(e.target.value)}>
                {STREAMELEMENTS_VOICES.filter((v) => v.lang.startsWith('en')).map((v) => <option key={v.id} value={v.id}>{v.name} · {v.lang}</option>)}
              </Select>
            </Field>
            <Field label="Caption style">
              <Select value={style} onChange={(e) => setStyle(e.target.value)}>
                {['pop-classic', 'pop-yellow', 'white-box', 'neon', 'impact', 'reddit'].map((s) => <option key={s} value={s}>{s}</option>)}
              </Select>
            </Field>
            <Slider label="Narration speed" value={wpm} min={120} max={220} unit=" wpm" onChange={setWpm} />
            <Field label="Background prompt (AI image)">
              <input value={bgPrompt} onChange={(e) => setBgPrompt(e.target.value)} className="w-full bg-elevated border border-white/10 rounded-xl px-3.5 py-2.5 text-sm outline-none focus:border-accent/60" />
            </Field>
            <Button className="w-full" size="lg" icon={<Sparkles size={17} />} loading={generating} disabled={!post} onClick={() => void generate()}>
              Generate story video
            </Button>
            {generating && <div><ProgressBar value={progress} /><p className="text-[11px] text-faint mt-1">{Math.round(progress * 100)}% — narrating, captioning and rendering…</p></div>}
          </div>
        </Card>
      </div>
    </div>
  )
}