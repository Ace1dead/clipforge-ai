import { useState } from 'react'
import { Archive } from 'lucide-react'
import { MediaToolShell } from '../components/MediaToolShell'
import { SegmentedControl, Field, Slider } from '../components/ui'
import { videoMeta, renderComposition } from '../lib/video'
import { fmtBytes, fmtTime } from '../lib/format'

const PRESETS = [
  { id: 'high', label: 'High (1080p)', scale: 1, bitrate: 6_000_000 },
  { id: 'medium', label: 'Medium (720p)', scale: 0.66, bitrate: 3_000_000 },
  { id: 'low', label: 'Small (480p)', scale: 0.44, bitrate: 1_500_000 },
]

export function VideoCompressor() {
  const [preset, setPreset] = useState('medium')
  const [meta, setMeta] = useState({ w: 1920, h: 1080, dur: 60 })

  const presetCfg = PRESETS.find((x) => x.id === preset)!

  return (
    <MediaToolShell
      title="Video Compressor"
      subtitle="Shrink video file size dramatically while keeping quality. Perfect before uploading to chat apps or storage."
      icon={<Archive size={20} />}
      processLabel="Compress video"
      config={
        <>
          <Field label="Quality preset">
            <SegmentedControl options={PRESETS.map((x) => ({ value: x.id, label: x.label }))} value={preset} onChange={setPreset} />
          </Field>
          <p className="text-[12px] text-faint mt-2">Output ~{Math.round(presetCfg.scale * 100)}% resolution · ~{(presetCfg.bitrate / 1_000_000).toFixed(1)} Mbps</p>
        </>
      }
      onPicked={async (p) => {
        const m = await videoMeta(p.url)
        setMeta({ w: m.width || 1920, h: m.height || 1080, dur: m.duration || 60 })
      }}
      process={async (p, { onProgress, signal }) => {
        const blob = await renderComposition({
          sources: [{ url: p.url }],
          outW: Math.round(meta.w * presetCfg.scale),
          outH: Math.round(meta.h * presetCfg.scale),
          fps: 24,
          bitrate: presetCfg.bitrate,
          onProgress, signal,
        })
        return { blob, filename: `${p.file.name.replace(/\.[^.]+$/, '')}_compressed.webm`, kind: 'video', meta: `${fmtTime(meta.dur)} · ${fmtBytes(blob.size)}` }
      }}
    />
  )
}