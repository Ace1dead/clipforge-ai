import { useState } from 'react'
import { Boxes, Download, RefreshCw } from 'lucide-react'
import { Button, Card, Field, SegmentedControl, toast } from '../components/ui'
import { generateIcon, ICON_STYLES } from '../lib/icons'
import type { IconStyle } from '../lib/icons'
import { downloadBlob } from '../lib/format'
import { canvasToBlob } from '../lib/media'

export function IconGenerator() {
  const [prompt, setPrompt] = useState('AI app icon with rocket')
  const [style, setStyle] = useState<IconStyle>('gradient')
  const [size, setSize] = useState(512)
  const [seed, setSeed] = useState(() => Math.floor(Math.random() * 1e9))
  const [canvas, setCanvas] = useState<HTMLCanvasElement | null>(null)

  const generate = () => {
    const newSeed = Math.floor(Math.random() * 1e9)
    setSeed(newSeed)
    setCanvas(generateIcon(prompt, style, size, newSeed))
  }

  const save = async () => {
    if (!canvas) return
    const blob = await canvasToBlob(canvas, 'image/png')
    downloadBlob(blob, `icon-${prompt.replace(/\s+/g, '-').slice(0, 20)}.png`)
    toast('success', 'Icon downloaded')
  }

  return (
    <div className="max-w-5xl mx-auto px-4 md:px-8 py-8 anim-float-up">
      <div className="flex items-center gap-3 mb-2">
        <span className="w-10 h-10 rounded-xl accent-gradient flex items-center justify-center text-white"><Boxes size={20} /></span>
        <div>
          <h1 className="text-xl font-bold tracking-tight">Icon Generator</h1>
          <p className="text-[13px] text-muted">Describe an icon and get a polished app-style icon — great for channel branding and videos.</p>
        </div>
      </div>

      <div className="mt-6 grid lg:grid-cols-[1fr_360px] gap-5 items-start">
        <Card className="p-8 flex flex-col items-center justify-center min-h-[380px]">
          {canvas ? (
            <img src={canvas.toDataURL('image/png')} alt="generated icon" className="w-56 h-56 rounded-3xl shadow-2xl shadow-accent/20 anim-float-up" />
          ) : (
            <div className="text-center text-faint flex flex-col items-center gap-2">
              <RefreshCw size={26} />
              <p className="text-[13px]">Configure and generate</p>
            </div>
          )}
          <div className="flex gap-2 mt-6">
            <Button variant="secondary" icon={<RefreshCw size={15} />} onClick={generate}>Shuffle</Button>
            <Button icon={<Download size={15} />} disabled={!canvas} onClick={() => void save()}>Download PNG</Button>
          </div>
          <p className="text-[11px] text-faint mt-2">Seed {seed}</p>
        </Card>

        <Card className="p-5">
          <Field label="Describe your icon">
            <input value={prompt} onChange={(e) => setPrompt(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') generate() }} className="w-full bg-elevated border border-white/10 rounded-xl px-3.5 py-2.5 text-sm outline-none focus:border-accent/60" placeholder="e.g. pizza delivery app icon" />
          </Field>
          <div className="mt-4">
            <Field label="Style">
              <SegmentedControl options={ICON_STYLES.map((s) => ({ value: s.id, label: s.name }))} value={style} onChange={(v) => setStyle(v as IconStyle)} />
            </Field>
          </div>
          <div className="mt-4">
            <Field label="Size">
              <SegmentedControl options={[{ value: '256', label: '256' }, { value: '512', label: '512' }, { value: '1024', label: '1024' }]} value={String(size)} onChange={(v) => setSize(Number(v))} />
            </Field>
          </div>
          <Button className="w-full mt-5" onClick={generate}>Generate icon</Button>
        </Card>
      </div>
    </div>
  )
}