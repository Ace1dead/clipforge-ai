import { useState } from 'react'
import { Scale } from 'lucide-react'
import { MediaToolShell } from '../components/MediaToolShell'
import { Slider, Field, Select, Toggle } from '../components/ui'
import { decodeAudio, loudnessNormalize, normalizePeak, bufferToBlob, analyzePeak } from '../lib/audio'
import { fmtTime } from '../lib/format'

export function AudioBalancer() {
  const [mode, setMode] = useState<'peak' | 'loudness'>('loudness')
  const [amount, setAmount] = useState(0.12)
  const [format, setFormat] = useState('mp3')

  return (
    <MediaToolShell
      title="Audio Balancer"
      subtitle="Balance and normalize audio levels automatically. Fix quiet videos and boost your voice to platform-standard loudness."
      icon={<Scale size={20} />}
      dropType="any"
      processLabel="Balance audio"
      config={
        <>
          <Field label="Mode">
            <Select value={mode} onChange={(e) => setMode(e.target.value as 'peak' | 'loudness')}>
              <option value="loudness">Loudness normalize (recommended)</option>
              <option value="peak">Peak normalize</option>
            </Select>
          </Field>
          <div className="mt-4">
            {mode === 'loudness' ? (
              <Slider label="Target loudness" value={Math.round(amount * 1000)} min={50} max={200} unit="" onChange={(v) => setAmount(v / 1000)} />
            ) : (
              <Slider label="Target peak" value={Math.round(amount * 100)} min={50} max={99} unit="%" onChange={(v) => setAmount(v / 100)} />
            )}
          </div>
          <div className="mt-4">
            <Field label="Output format">
              <Select value={format} onChange={(e) => setFormat(e.target.value)}>
                <option value="mp3">MP3</option>
                <option value="wav">WAV</option>
              </Select>
            </Field>
          </div>
        </>
      }
      process={async (p, ctx) => {
        const buffer = await decodeAudio(p.url)
        const peak = analyzePeak(buffer)
        const out = mode === 'loudness' ? loudnessNormalize(buffer, amount) : normalizePeak(buffer, amount)
        const blob = await bufferToBlob(out, format as 'mp3' | 'wav')
        return { blob, filename: `${p.file.name.replace(/\.[^.]+$/, '')}_balanced.${format}`, kind: 'audio', meta: `Peak ${(peak * 100).toFixed(0)}% → balanced` }
      }}
    />
  )
}