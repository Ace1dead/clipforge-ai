import { useState } from 'react'
import { Slice } from 'lucide-react'
import { MediaToolShell } from '../components/MediaToolShell'
import { Slider, Field } from '../components/ui'
import { videoMeta, renderComposition } from '../lib/video'
import { fmtTime } from '../lib/format'

export function VideoCutter() {
  const [duration, setDuration] = useState(60)
  const [start, setStart] = useState(0)
  const [end, setEnd] = useState(30)
  const [meta, setMeta] = useState({ w: 1280, h: 720 })

  return (
    <MediaToolShell
      title="Video Cutter"
      subtitle="Trim your video to the best moments in seconds. Perfect for clipping podcasts, streams and long videos."
      icon={<Slice size={20} />}
      processLabel="Slice video"
      config={
        <>
          <Field label="Trim range">
            <div className="space-y-4">
              <Slider label="Start" value={start} min={0} max={Math.max(1, duration - 0.5)} step={0.1} unit="s" onChange={(v) => setStart(Math.min(v, end - 0.5))} />
              <Slider label="End" value={end} min={Math.min(start + 0.5, duration)} max={duration} step={0.1} unit="s" onChange={(v) => setEnd(v)} />
            </div>
          </Field>
          <p className="text-[12px] text-faint mt-2">Selected: {fmtTime(start)} → {fmtTime(end)} · {fmtTime(end - start)} clip</p>
        </>
      }
      onPicked={async (p) => {
        const m = await videoMeta(p.url)
        setDuration(m.duration || 60)
        setEnd(Math.min(30, m.duration || 60))
        setMeta({ w: m.width || 1280, h: m.height || 720 })
      }}
      process={async (p, { onProgress, signal }) => {
        const blob = await renderComposition({
          sources: [{ url: p.url }],
          outW: meta.w, outH: meta.h,
          trim: { start, end },
          onProgress, signal,
        })
        return { blob, filename: `${p.file.name.replace(/\.[^.]+$/, '')}_cut.webm`, kind: 'video' }
      }}
    />
  )
}