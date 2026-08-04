import { useState } from 'react'
import { Subtitles } from 'lucide-react'
import { MediaToolShell } from '../components/MediaToolShell'
import { Slider, Field, SegmentedControl } from '../components/ui'
import { renderComposition } from '../lib/video'
import { subtitleBand } from '../lib/background'

type Mode = 'blur' | 'cover' | 'crop'

export function SubtitleRemover() {
  const [band, setBand] = useState(0.18)
  const [mode, setMode] = useState<Mode>('blur')

  return (
    <MediaToolShell
      title="Subtitle Remover"
      subtitle="Remove or blur burned-in subtitles from your video — the bottom band is smart-cleaned so text disappears."
      icon={<Subtitles size={20} />}
      processLabel="Clean subtitles"
      config={
        <>
          <Field label="Cleanup mode">
            <SegmentedControl
              options={[
                { value: 'blur', label: 'Blur' },
                { value: 'cover', label: 'Cover' },
                { value: 'crop', label: 'Crop out' },
              ]}
              value={mode}
              onChange={(v) => setMode(v as Mode)}
            />
          </Field>
          <div className="mt-4">
            <Slider label="Band height" value={Math.round(band * 100)} min={8} max={40} unit="%" onChange={(v) => setBand(v / 100)} />
          </div>
        </>
      }
      process={async (p, { onProgress, signal }) => {
        const blob = await renderComposition({
          sources: [{ url: p.url }],
          outW: 1080, outH: 1920,
          onProgress, signal,
          draw: (ctx, _t, w, h) => {
            const b = subtitleBand(h, band)
            if (mode === 'cover') {
              ctx.fillStyle = '#000'
              ctx.fillRect(0, b.y, w, b.h)
              return
            }
            if (mode === 'crop') {
              ctx.save()
              ctx.drawImage(ctx.canvas, 0, 0, w, b.y, 0, 0, w, h)
              ctx.restore()
              return
            }
            // blur the band using the canvas as its own source
            ctx.save()
            ctx.filter = 'blur(22px)'
            ctx.drawImage(ctx.canvas, 0, b.y, w, b.h, 0, b.y, w, b.h)
            ctx.restore()
            ctx.fillStyle = 'rgba(0,0,0,0.28)'
            ctx.fillRect(0, b.y, w, b.h)
          },
        })
        return { blob, filename: `${p.file.name.replace(/\.[^.]+$/, '')}_cleaned.webm`, kind: 'video' }
      }}
    />
  )
}