import { useState, useEffect } from 'react'
import { Sparkles, Download, RefreshCw, Wand2 } from 'lucide-react'
import { Button, Card, Textarea, Select, Field, Slider, Badge, Skeleton, toast } from '../components/ui'
import { generatePollinations, proceduralImage } from '../lib/aiImage'
import { downloadBlob, fmtBytes } from '../lib/format'
import { canvasToBlob } from '../lib/media'

const PRESETS = [
  'cinematic sunset over a neon city skyline',
  'cute fox in a magical forest, soft light',
  'futuristic cyberpunk street in the rain',
  'minimalist abstract gradient waves',
  'space nebula with glowing planets',
  'mountain lake at dawn, photorealistic',
  'cozy coffee shop interior, warm tones',
  'ocean wave crashing at golden hour',
]

const SIZES = [
  { id: '512', label: '512×512', w: 512, h: 512 },
  { id: '768', label: '768×768', w: 768, h: 768 },
  { id: '1024', label: '1024×1024', w: 1024, h: 1024 },
]

export function AIImages() {
  const [prompt, setPrompt] = useState(PRESETS[0])
  const [provider, setProvider] = useState('pollinations')
  const [size, setSize] = useState('1024')
  const [count, setCount] = useState(4)
  const [images, setImages] = useState<{ url: string; blob?: Blob }[]>([])
  const [loading, setLoading] = useState(false)
  const [genCount, setGenCount] = useState(0)

  // Cleanup blob URLs on unmount or when images change
  useEffect(() => {
    return () => {
      images.forEach(img => {
        if (img.url.startsWith('blob:')) URL.revokeObjectURL(img.url)
      })
    }
  }, [images])

  const generate = async () => {
    if (!prompt.trim()) { toast('error', 'Describe an image first'); return }
    setLoading(true)
    setImages([])
    const s = SIZES.find((x) => x.id === size)!
    try {
      const results: { url: string; blob?: Blob }[] = []
      for (let i = 0; i < count; i++) {
        if (provider === 'pollinations') {
          const { url } = await generatePollinations(prompt, s.w, s.h)
          const blob = await (await fetch(url)).blob()
          results.push({ url, blob })
        } else {
          const canvas = proceduralImage(prompt, s.w, s.h, Math.floor(Math.random() * 1e9))
          const blob = await canvasToBlob(canvas, 'image/png')
          results.push({ url: URL.createObjectURL(blob), blob })
        }
      }
      setImages(results)
      setGenCount((c) => c + count)
      toast('success', `${results.length} images generated`)
    } catch (e) {
      toast('error', 'Generation failed', e instanceof Error ? e.message : undefined)
    } finally { setLoading(false) }
  }

  return (
    <div className="max-w-6xl mx-auto px-4 md:px-8 py-8 anim-float-up">
      <div className="flex items-center gap-3 mb-2">
        <span className="w-10 h-10 rounded-xl accent-gradient flex items-center justify-center text-white"><Sparkles size={20} /></span>
        <div>
          <h1 className="text-xl font-bold tracking-tight flex items-center gap-2">AI Images <Badge tone="amber">PREMIUM</Badge></h1>
          <p className="text-[13px] text-muted">Generate thumbnails, backgrounds and b-roll with AI. {genCount > 0 ? `${genCount} images generated this session.` : ''}</p>
        </div>
      </div>

      <div className="mt-6 grid lg:grid-cols-[380px_1fr] gap-5 items-start">
        <Card className="p-5">
          <Field label="Prompt">
            <Textarea rows={4} value={prompt} onChange={(e) => setPrompt(e.target.value)} />
          </Field>
          <div className="flex flex-wrap gap-1.5 mt-3">
            {PRESETS.map((p) => (
              <button key={p} onClick={() => setPrompt(p)} className={`text-[11px] px-2 py-1 rounded-full border transition-all cursor-pointer ${prompt === p ? 'bg-accent/20 text-accent border-accent/40' : 'bg-elevated border-white/10 text-muted hover:text-fg'}`}>{p.slice(0, 26)}…</button>
            ))}
          </div>
          <div className="grid grid-cols-2 gap-3 mt-4">
            <Field label="Model">
              <Select value={provider} onChange={(e) => setProvider(e.target.value)}>
                <option value="pollinations">Flux (online)</option>
                <option value="offline">Instant (offline)</option>
              </Select>
            </Field>
            <Field label="Size">
              <Select value={size} onChange={(e) => setSize(e.target.value)}>
                {SIZES.map((s) => <option key={s.id} value={s.id}>{s.label}</option>)}
              </Select>
            </Field>
          </div>
          <div className="mt-4">
            <Slider label="Images" value={count} min={1} max={8} onChange={setCount} />
          </div>
          <Button className="w-full mt-4" size="lg" icon={<Wand2 size={17} />} loading={loading} onClick={() => void generate()}>
            Generate images
          </Button>
        </Card>

        <div>
          {loading ? (
            <div className="grid grid-cols-2 gap-4">
              {Array.from({ length: count }).map((_, i) => <Skeleton key={i} className="aspect-square rounded-2xl" />)}
            </div>
          ) : images.length ? (
            <div className="grid grid-cols-2 gap-4">
              {images.map((img, i) => (
                <div key={i} className="card overflow-hidden group anim-float-up">
                  <img src={img.url} alt={`AI generated ${i + 1}`} className="w-full aspect-square object-cover" />
                  <div className="p-3 flex items-center justify-between">
                    <span className="text-[12px] text-muted">{provider === 'pollinations' ? 'Flux' : 'Offline'}</span>
                    <Button variant="secondary" size="xs" icon={<Download size={13} />} onClick={() => img.blob && downloadBlob(img.blob, `ai-image-${i + 1}.png`)}>PNG</Button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <Card className="p-10 text-center text-muted text-[13px] flex flex-col items-center gap-3">
              <RefreshCw size={22} className="text-faint" />
              Your generated images will appear here
            </Card>
          )}
        </div>
      </div>
    </div>
  )
}