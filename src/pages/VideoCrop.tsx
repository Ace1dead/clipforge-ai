import { useState } from 'react'
import { Crop } from 'lucide-react'
import { MediaToolShell } from '../components/MediaToolShell'
import { SegmentedControl, Slider, Field } from '../components/ui'
import { videoMeta, renderComposition } from '../lib/video'

const RATIOS = [
  { id: 'orig', label: 'Original', w: 0, h: 0 },
  { id: '9:16', label: '9:16 Shorts', w: 1080, h: 1920 },
  { id: '16:9', label: '16:9', w: 1920, h: 1080 },
  { id: '1:1', label: '1:1 Square', w: 1080, h: 1080 },
  { id: '4:5', label: '4:5 Portrait', w: 1080, h: 1350 },
  { id: '4:3', label: '4:3', w: 1280, h: 960 },
]

export function VideoCrop() {
  const [ratio, setRatio] = useState('9:16')
  const [offset, setOffset] = useState(0)
  const [meta, setMeta] = useState({ w: 1280, h: 720 })

  const target = RATIOS.find((r) => r.id === ratio)!

  return (
    <MediaToolShell
      title="Video Crop"
      subtitle="Crop any video to vertical, square or widescreen formats for every platform — no quality loss in preview."
      icon={<Crop size={20} />}
      processLabel="Crop video"
      config={
        <>
          <Field label="Aspect ratio">
            <SegmentedControl
              options={RATIOS.map((r) => ({ value: r.id, label: r.label }))}
              value={ratio}
              onChange={(v) => setRatio(v)}
            />
          </Field>
          <div className="mt-4">
            <Slider label="Vertical focus" value={offset} min={-1} max={1} step={0.05} onChange={setOffset} />
          </div>
          <p className="text-[12px] text-faint mt-2">{meta.w}×{meta.h} → {ratio === 'orig' ? 'original size' : `${target.w}×${target.h}`}</p>
        </>
      }
      onPicked={async (p) => {
        const m = await videoMeta(p.url)
        setMeta({ w: m.width || 1280, h: m.height || 720 })
      }}
      process={async (p, { onProgress, signal }) => {
        const ow = ratio === 'orig' ? meta.w : target.w
        const oh = ratio === 'orig' ? meta.h : target.h
        const blob = await renderComposition({
          sources: [{ url: p.url, offsetY: offset }],
          outW: ow, outH: oh,
          onProgress, signal,
        })
        return { blob, filename: `${p.file.name.replace(/\.[^.]+$/, '')}_cropped.webm`, kind: 'video' }
      }}
    />
  )
}