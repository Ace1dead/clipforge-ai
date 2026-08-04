import { useState } from 'react'
import { Eraser, Image as ImageIcon } from 'lucide-react'
import { MediaToolShell } from '../components/MediaToolShell'
import { Tabs, Slider } from '../components/ui'
import { removeBgFromCanvas, removeBgFromData, featherAlpha } from '../lib/background'
import { canvasToBlob, loadImage } from '../lib/media'
import { renderComposition } from '../lib/video'

type Mode = 'image' | 'video'

export function RemoveBg() {
  const [mode, setMode] = useState<Mode>('image')
  const [tolerance, setTolerance] = useState(42)

  return (
    <MediaToolShell
      title="Background Remover"
      subtitle="Remove the background from images and video in one click — perfect for faceless channels and thumbnails. Works best on uniform backgrounds."
      icon={<Eraser size={20} />}
      dropType={mode === 'image' ? 'image' : 'video'}
      premium
      processLabel={mode === 'image' ? 'Remove background' : 'Process video'}
      config={
        <>
          <Tabs
            tabs={[
              { id: 'image', label: 'Image', icon: <ImageIcon size={14} /> },
              { id: 'video', label: 'Video', icon: <Eraser size={14} /> },
            ]}
            active={mode}
            onChange={(m) => setMode(m as Mode)}
          />
          <div className="mt-4">
            <Slider label="Sensitivity" value={tolerance} min={10} max={90} unit="" onChange={setTolerance} />
          </div>
          <p className="text-[12px] text-faint mt-2">Higher removes more background, but risks cutting into the subject.</p>
        </>
      }
      process={async (p, { onProgress, signal }) => {
        if (mode === 'image') {
          const img = await loadImage(p.url)
          onProgress(0.3)
          const canvas = await removeBgFromCanvas(img, { tolerance })
          onProgress(0.9)
          const blob = await canvasToBlob(canvas, 'image/png')
          return { blob, filename: `${p.file.name.replace(/\.[^.]+$/, '')}_nobg.png`, kind: 'image' }
        }
        const W = 540
        const H = 960
        const blob = await renderComposition({
          sources: [{ url: p.url }],
          outW: W, outH: H,
          fps: 20,
          bitrate: 4_000_000,
          onProgress, signal,
          draw: (ctx) => {
            const data = ctx.getImageData(0, 0, W, H)
            removeBgFromData(data.data, W, H, tolerance)
            featherAlpha(data.data, W, H, 1)
            ctx.putImageData(data, 0, 0)
          },
        })
        return { blob, filename: `${p.file.name.replace(/\.[^.]+$/, '')}_nobg.webm`, kind: 'video' }
      }}
    />
  )
}