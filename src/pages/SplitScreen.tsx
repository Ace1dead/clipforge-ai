import { useState } from 'react'
import { Columns2, Sparkles } from 'lucide-react'
import { MediaDropzone, FilePill } from '../components/MediaDropzone'
import type { Picked } from '../components/MediaDropzone'
import { Button, Card, SegmentedControl, Field, ProgressBar, toast } from '../components/ui'
import { renderComposition } from '../lib/video'
import { fmtBytes, downloadBlob } from '../lib/format'

type Layout = '2v' | '2h' | '3' | '4'
const LAYOUTS: { id: Layout; label: string }[] = [
  { id: '2v', label: '2 Side-by-side' },
  { id: '2h', label: '2 Stacked' },
  { id: '3', label: '1 + 2' },
  { id: '4', label: '2 × 2' },
]

function cellsFor(layout: Layout, W: number, H: number) {
  if (layout === '2v') return [{ x: 0, y: 0, w: W / 2, h: H }, { x: W / 2, y: 0, w: W / 2, h: H }]
  if (layout === '2h') return [{ x: 0, y: 0, w: W, h: H / 2 }, { x: 0, y: H / 2, w: W, h: H / 2 }]
  if (layout === '4') return [
    { x: 0, y: 0, w: W / 2, h: H / 2 }, { x: W / 2, y: 0, w: W / 2, h: H / 2 },
    { x: 0, y: H / 2, w: W / 2, h: H / 2 }, { x: W / 2, y: H / 2, w: W / 2, h: H / 2 },
  ]
  return [
    { x: 0, y: 0, w: (W * 2) / 3, h: H },
    { x: (W * 2) / 3, y: 0, w: W / 3, h: H / 2 },
    { x: (W * 2) / 3, y: H / 2, w: W / 3, h: H / 2 },
  ]
}

export function SplitScreen() {
  const [layout, setLayout] = useState<Layout>('2v')
  const [picked, setPicked] = useState<(Picked | null)[]>([null, null, null, null])
  const [processing, setProcessing] = useState(false)
  const [progress, setProgress] = useState(0)

  const slots = layout === '2v' || layout === '2h' ? 2 : layout === '3' ? 3 : 4
  const filled = picked.slice(0, slots).filter(Boolean).length

  const run = async () => {
    const srcs = picked.slice(0, slots) as Picked[]
    if (srcs.some((s) => !s)) return
    setProcessing(true)
    setProgress(0)
    try {
      const W = layout === '2v' ? 1920 : layout === '2h' ? 1080 : 1080
      const H = layout === '2v' ? 1080 : layout === '2h' ? 1920 : 1080
      const blob = await renderComposition({
        sources: srcs.map((s, i) => ({ url: s.url, cell: cellsFor(layout, W, H)[i] })),
        outW: W, outH: H,
        onProgress: setProgress,
      })
      downloadBlob(blob, `split-screen_${layout}.webm`)
      toast('success', 'Split video ready', fmtBytes(blob.size))
    } catch (e) {
      toast('error', 'Render failed', e instanceof Error ? e.message : undefined)
    } finally { setProcessing(false) }
  }

  return (
    <div className="max-w-6xl mx-auto px-4 md:px-8 py-8 anim-float-up">
      <div className="flex items-center gap-3 mb-2">
        <span className="w-10 h-10 rounded-xl accent-gradient flex items-center justify-center text-white"><Columns2 size={20} /></span>
        <div>
          <h1 className="text-xl font-bold tracking-tight">Split Screen Videos</h1>
          <p className="text-[13px] text-muted">Combine 2–4 videos into one layout — the classic streamer/reaction format.</p>
        </div>
      </div>
      <div className="mt-6 grid lg:grid-cols-[1fr_340px] gap-5 items-start">
        <Card className="p-4">
          <div className="grid gap-3" style={{ gridTemplateColumns: layout === '4' ? '1fr 1fr' : layout === '3' ? '2fr 1fr' : '1fr 1fr' }}>
            {Array.from({ length: slots }).map((_, i) => (
              <div key={i}>
                {picked[i] ? (
                  <FilePill file={picked[i]!.file} onClear={() => setPicked((prev) => { const n = [...prev]; n[i] = null; return n })} />
                ) : (
                  <MediaDropzone type="video" label={`Video ${i + 1}`} height="h-36" onPicked={(p) => setPicked((prev) => { const n = [...prev]; n[i] = p; return n })} />
                )}
              </div>
            ))}
          </div>
        </Card>
        <Card className="p-5">
          <Field label="Layout">
            <SegmentedControl options={LAYOUTS.map((l) => ({ value: l.id, label: l.label }))} value={layout} onChange={(v) => setLayout(v as Layout)} />
          </Field>
          <div className="mt-4 space-y-2">
            <p className="text-[13px] text-muted">{filled}/{slots} videos added</p>
            {processing && <ProgressBar value={progress} />}
            <Button className="w-full" icon={<Sparkles size={16} />} loading={processing} disabled={filled < slots} onClick={() => void run()}>
              Generate split video
            </Button>
          </div>
        </Card>
      </div>
    </div>
  )
}