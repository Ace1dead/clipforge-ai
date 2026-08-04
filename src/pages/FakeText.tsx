import { useEffect, useRef, useState } from 'react'
import { Type, Sparkles, Wand2 } from 'lucide-react'
import { MediaDropzone, FilePill } from '../components/MediaDropzone'
import type { Picked } from '../components/MediaDropzone'
import { Button, Card, Textarea, SegmentedControl, Field, Slider, ProgressBar, toast } from '../components/ui'
import { renderComposition, videoMeta } from '../lib/video'
import { fmtBytes, downloadBlob } from '../lib/format'

const STYLES = [
  { id: 'bubble', label: 'Chat bubble' },
  { id: 'yell', label: 'Yell (caps)' },
  { id: 'story', label: 'Story text' },
  { id: 'meme', label: 'Meme caption' },
]

const SAMPLE = 'Bro this clip is actually insane 💀\nHow did he even do that\nNo way this is real\nBro is him 🐐'

export function FakeText() {
  const [picked, setPicked] = useState<Picked | null>(null)
  const [script, setScript] = useState(SAMPLE)
  const [style, setStyle] = useState('bubble')
  const [duration, setDuration] = useState(20)
  const [processing, setProcessing] = useState(false)
  const [progress, setProgress] = useState(0)

  const run = async () => {
    if (!picked) return
    const lines = script.split('\n').map((l) => l.trim()).filter(Boolean)
    if (!lines.length) { toast('error', 'Add some text lines first'); return }
    setProcessing(true)
    setProgress(0)
    try {
      const seg = duration / lines.length
      const blob = await renderComposition({
        sources: [{ url: picked.url }],
        outW: 1080, outH: 1920,
        trim: { start: 0, end: duration },
        onProgress: setProgress,
        draw: (ctx, t, w, h) => {
          const idx = Math.min(lines.length - 1, Math.floor(t / seg))
          const label = style === 'yell' ? lines[idx].toUpperCase() : lines[idx]
          const fontSize = Math.min(w, h) * (label.length > 40 ? 0.045 : 0.06)
          ctx.save()
          ctx.font = `800 ${fontSize}px "Inter", sans-serif`
          ctx.textAlign = 'center'
          ctx.textBaseline = 'middle'
          const words = label.split(' ')
          const wrapped = wrapText(ctx, words, w * 0.86)
          const lineH = fontSize * 1.18
          const blockH = wrapped.length * lineH
          let y = h / 2 - blockH / 2
          const age = t - idx * seg
          const pop = Math.min(1, Math.max(0, age * 5))
          for (const line of wrapped) {
            ctx.globalAlpha = pop
            const bw = ctx.measureText(line).width + fontSize * 0.7
            const bh = lineH * 0.92
            if (style === 'bubble') {
              ctx.fillStyle = 'rgba(0,0,0,0.72)'
              roundRect(ctx, w / 2 - bw / 2, y - bh / 2, bw, bh, fontSize * 0.35)
              ctx.fill()
            }
            ctx.strokeStyle = 'rgba(0,0,0,0.9)'
            ctx.lineWidth = fontSize * 0.06
            ctx.lineJoin = 'round'
            ctx.strokeText(line, w / 2, y)
            ctx.fillStyle = style === 'meme' ? '#fbbf24' : '#ffffff'
            ctx.fillText(line, w / 2, y)
            y += lineH
          }
          ctx.restore()
        },
      })
      downloadBlob(blob, 'fake-text-video.webm')
      toast('success', 'Brainrot video ready', fmtBytes(blob.size))
    } catch (e) {
      toast('error', 'Render failed', e instanceof Error ? e.message : undefined)
    } finally { setProcessing(false) }
  }

  return (
    <div className="max-w-6xl mx-auto px-4 md:px-8 py-8 anim-float-up">
      <div className="flex items-center gap-3 mb-2">
        <span className="w-10 h-10 rounded-xl accent-gradient flex items-center justify-center text-white"><Type size={20} /></span>
        <div>
          <h1 className="text-xl font-bold tracking-tight">Fake Text Videos</h1>
          <p className="text-[13px] text-muted">The viral brainrot format — bold text popping over gameplay or clips.</p>
        </div>
      </div>

      {!picked ? (
        <div className="mt-6"><MediaDropzone type="video" label="Drop a background video (gameplay, clip…)" onPicked={(p) => { setPicked(p); void videoMeta(p.url).then((m) => setDuration(Math.min(60, m.duration || 20))).catch(() => undefined) }} /></div>
      ) : (
        <div className="mt-6 grid lg:grid-cols-[1fr_360px] gap-5 items-start">
          <Card className="p-4">
            <FilePill file={picked.file} onClear={() => setPicked(null)} />
            <div className="mt-3">
              <Field label="Text lines (one per line)">
                <Textarea rows={6} value={script} onChange={(e) => setScript(e.target.value)} />
              </Field>
            </div>
            <div className="mt-3">
              <SegmentedControl options={STYLES.map((s) => ({ value: s.id, label: s.label }))} value={style} onChange={setStyle} />
            </div>
            <div className="mt-4">
              <Slider label="Video length" value={duration} min={5} max={60} unit="s" onChange={setDuration} />
            </div>
          </Card>
          <Card className="p-5">
            <h3 className="font-semibold text-[14px] mb-2">Preview timing</h3>
            {script.split('\n').filter(Boolean).map((l, i) => (
              <p key={i} className="text-[12px] text-muted py-1 border-b border-white/5">#{i + 1} · {Math.round(duration / Math.max(1, script.split('\n').filter(Boolean).length))}s · {l.slice(0, 40)}</p>
            ))}
            <Button className="w-full mt-4" size="lg" icon={<Wand2 size={17} />} loading={processing} onClick={() => void run()}>Generate video</Button>
            {processing && <div className="mt-3"><ProgressBar value={progress} /></div>}
            <Button variant="ghost" size="sm" className="w-full mt-2" icon={<Sparkles size={14} />} onClick={() => setScript(SAMPLE)}>Reset sample</Button>
          </Card>
        </div>
      )}
    </div>
  )
}

function wrapText(ctx: CanvasRenderingContext2D, words: string[], maxW: number): string[] {
  const lines: string[] = []
  let cur = ''
  for (const w of words) {
    const test = cur ? `${cur} ${w}` : w
    if (ctx.measureText(test).width > maxW && cur) { lines.push(cur); cur = w }
    else cur = test
  }
  if (cur) lines.push(cur)
  return lines
}

function roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number): void {
  const rr = Math.min(r, w / 2, h / 2)
  ctx.beginPath()
  ctx.moveTo(x + rr, y)
  ctx.arcTo(x + w, y, x + w, y + h, rr)
  ctx.arcTo(x + w, y + h, x, y + h, rr)
  ctx.arcTo(x, y + h, x, y, rr)
  ctx.arcTo(x, y, x + w, y, rr)
  ctx.closePath()
}