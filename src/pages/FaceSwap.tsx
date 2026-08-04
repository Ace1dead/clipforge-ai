import { useEffect, useRef, useState } from 'react'
import { Smile, Download, RefreshCw } from 'lucide-react'
import { Button, Card, Slider, toast } from '../components/ui'
import { MediaDropzone } from '../components/MediaDropzone'
import type { Picked } from '../components/MediaDropzone'
import { canvasToBlob } from '../lib/media'
import { downloadBlob } from '../lib/format'

interface Rect { x: number; y: number; w: number; h: number }

function loadImage(url: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.onload = () => resolve(img)
    img.onerror = () => reject(new Error('Could not load image'))
    img.src = url
  })
}

export function FaceSwap() {
  const [base, setBase] = useState<Picked | null>(null)
  const [face, setFace] = useState<Picked | null>(null)
  const [baseImg, setBaseImg] = useState<HTMLImageElement | null>(null)
  const [faceImg, setFaceImg] = useState<HTMLImageElement | null>(null)
  const [rect, setRect] = useState<Rect | null>(null)
  const [drawing, setDrawing] = useState(false)
  const [blend, setBlend] = useState(0.85)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const startRef = useRef<{ x: number; y: number } | null>(null)

  useEffect(() => {
    if (!base) { setBaseImg(null); setRect(null); return }
    void loadImage(base.url).then(setBaseImg).catch(() => setBaseImg(null))
  }, [base])

  useEffect(() => {
    if (!face) { setFaceImg(null); return }
    void loadImage(face.url).then(setFaceImg).catch(() => setFaceImg(null))
  }, [face])

  useEffect(() => {
    const canvas = canvasRef.current
    const ctx = canvas?.getContext('2d')
    if (!canvas || !ctx || !baseImg) return
    if (canvas.width === 0 || canvas.dataset.src !== baseImg.src) {
      const scale = Math.min(1, 900 / baseImg.naturalWidth)
      canvas.width = Math.max(1, Math.round(baseImg.naturalWidth * scale))
      canvas.height = Math.max(1, Math.round(baseImg.naturalHeight * scale))
      canvas.dataset.src = baseImg.src
    }
    ctx.clearRect(0, 0, canvas.width, canvas.height)
    ctx.drawImage(baseImg, 0, 0, canvas.width, canvas.height)
    if (rect && faceImg) {
      ctx.save()
      // Clip to ellipse for natural face shape
      ctx.beginPath()
      const cx = rect.x + rect.w / 2
      const cy = rect.y + rect.h / 2
      ctx.ellipse(cx, cy, rect.w / 2, rect.h / 2, 0, 0, Math.PI * 2)
      ctx.clip()
      // Draw face with feathered edge via radial gradient mask
      const scale = Math.max(rect.w / faceImg.naturalWidth, rect.h / faceImg.naturalHeight)
      const dw = faceImg.naturalWidth * scale
      const dh = faceImg.naturalHeight * scale
      const dx = rect.x + (rect.w - dw) / 2
      const dy = rect.y + (rect.h - dh) / 2
      ctx.globalAlpha = blend
      ctx.drawImage(faceImg, dx, dy, dw, dh)
      // Soft edge feather: draw a ring of the base image around the ellipse edge
      ctx.globalAlpha = 0.4
      ctx.globalCompositeOperation = 'destination-over'
      const feather = Math.max(rect.w, rect.h) * 0.15
      ctx.beginPath()
      ctx.ellipse(cx, cy, rect.w / 2 + feather, rect.h / 2 + feather, 0, 0, Math.PI * 2)
      ctx.clip()
      ctx.drawImage(baseImg, 0, 0, canvas.width, canvas.height)
      ctx.restore()
      // Draw selection border
      ctx.strokeStyle = 'rgba(94,106,210,0.9)'
      ctx.lineWidth = 2
      ctx.setLineDash([6, 4])
      ctx.strokeRect(rect.x, rect.y, rect.w, rect.h)
      ctx.setLineDash([])
    }
  }, [baseImg, faceImg, rect, blend])

  const toCanvasCoords = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current!
    const b = canvas.getBoundingClientRect()
    return { x: (e.clientX - b.left) * (canvas.width / b.width), y: (e.clientY - b.top) * (canvas.height / b.height) }
  }

  const onDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!faceImg) { toast('info', 'Add a replacement face first'); return }
    const p = toCanvasCoords(e)
    startRef.current = p
    setRect({ x: p.x, y: p.y, w: 4, h: 4 })
    setDrawing(true)
  }

  const onMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!drawing || !startRef.current) return
    const p = toCanvasCoords(e)
    setRect({ x: Math.min(startRef.current.x, p.x), y: Math.min(startRef.current.y, p.y), w: Math.abs(p.x - startRef.current.x), h: Math.abs(p.y - startRef.current.y) })
  }

  const save = async () => {
    const canvas = canvasRef.current
    if (!canvas) return
    const blob = await canvasToBlob(canvas, 'image/png')
    downloadBlob(blob, 'face-swap.png')
    toast('success', 'Face swap saved')
  }

  return (
    <div className="max-w-6xl mx-auto px-4 md:px-8 py-8 anim-float-up">
      <div className="flex items-center gap-3 mb-2">
        <span className="w-10 h-10 rounded-xl accent-gradient flex items-center justify-center text-white"><Smile size={20} /></span>
        <div>
          <h1 className="text-xl font-bold tracking-tight flex items-center gap-2">Face Overlay</h1>
          <p className="text-[13px] text-muted">Blend a face into any photo. Drag a rectangle to select where the face goes — the edges are feathered for a natural look.</p>
        </div>
      </div>

      <div className="mt-6 grid lg:grid-cols-[1fr_340px] gap-5 items-start">
        <Card className="p-4">
          {!base ? (
            <MediaDropzone type="image" label="Upload the base photo" onPicked={setBase} />
          ) : (
            <>
              <div className="relative">
                <canvas ref={canvasRef} onMouseDown={onDown} onMouseMove={onMove} onMouseUp={() => setDrawing(false)} onMouseLeave={() => setDrawing(false)} className="w-full rounded-xl bg-black/40 cursor-crosshair" />
                {!rect && faceImg && <p className="absolute top-3 left-1/2 -translate-x-1/2 text-[11px] bg-black/70 rounded-full px-3 py-1 whitespace-nowrap">Drag on the photo to select the face region</p>}
              </div>
              <div className="flex items-center justify-between mt-3">
                <Button variant="ghost" size="sm" icon={<RefreshCw size={14} />} onClick={() => { setBase(null); setRect(null); setFace(null) }}>New photo</Button>
                <Button size="sm" icon={<Download size={14} />} onClick={() => void save()}>Download PNG</Button>
              </div>
            </>
          )}
        </Card>

        <Card className="p-5">
          <h3 className="font-semibold text-[14px] mb-3">Replacement face</h3>
          {face ? (
            <div className="flex items-center gap-3 bg-elevated border border-white/10 rounded-xl p-2 mb-3">
              <img src={face.url} alt="face" className="w-12 h-12 rounded-lg object-cover" />
              <div className="flex-1 min-w-0">
                <p className="text-[13px] font-medium truncate">{face.file.name}</p>
              </div>
              <button className="text-faint hover:text-red text-[12px] cursor-pointer" onClick={() => setFace(null)}>Remove</button>
            </div>
          ) : (
            <MediaDropzone type="image" label="Upload the face to swap in" height="h-32" onPicked={setFace} />
          )}
          <div className="mt-4">
            <Slider label="Blend strength" value={Math.round(blend * 100)} min={30} max={100} unit="%" onChange={(v) => setBlend(v / 100)} />
          </div>
          <p className="text-[12px] text-faint mt-3 leading-relaxed">Tip: use two similar-angle photos for the most natural result.</p>
        </Card>
      </div>
    </div>
  )
}