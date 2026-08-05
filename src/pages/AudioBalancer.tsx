import { useState } from 'react'
import { Scale, Info } from 'lucide-react'
import { MediaToolShell } from '../components/MediaToolShell'
import { Slider, Field, Select } from '../components/ui'
import { decodeAudio, measureIntegratedLUFS, measureTruePeak, lufsNormalize, normalizePeak, bufferToBlob, analyzePeak } from '../lib/audio'
import { LUFS_PRESETS } from '../lib/audio'

export function AudioBalancer() {
  const [preset, setPreset] = useState<keyof typeof LUFS_PRESETS>('spotify')
  const [mode, setMode] = useState<'lufs' | 'peak'>('lufs')
  const [customTarget, setCustomTarget] = useState(-14)
  const [format, setFormat] = useState('mp3')
  const [analysis, setAnalysis] = useState<{ lufs: number; truePeak: number } | null>(null)

  const handlePicked = async (p: { url: string }) => {
    try {
      const buffer = await decodeAudio(p.url)
      const lufs = measureIntegratedLUFS(buffer)
      const tp = measureTruePeak(buffer)
      setAnalysis({ lufs, truePeak: tp })
    } catch { /* ignore analysis errors */ }
  }

  const targetLUFS = mode === 'lufs' ? (LUFS_PRESETS[preset]?.target ?? customTarget) : -14

  return (
    <MediaToolShell
      title="Audio Balancer"
      subtitle="Professional LUFS normalization to platform standards. Fixes quiet/loud audio, applies true-peak limiting, and meets streaming requirements."
      icon={<Scale size={20} />}
      dropType="any"
      processLabel="Balance audio"
      onPicked={handlePicked}
      config={
        <>
          {analysis && (
            <div className="p-3 rounded-xl bg-elevated border border-white/8 mb-4">
              <div className="flex items-center gap-2 mb-2">
                <Info size={14} className="text-accent" />
                <span className="text-[12px] font-semibold">Current Audio</span>
              </div>
              <div className="grid grid-cols-2 gap-2 text-[12px]">
                <div><span className="text-faint">Loudness:</span> <span className="font-mono">{analysis.lufs.toFixed(1)} LUFS</span></div>
                <div><span className="text-faint">True Peak:</span> <span className="font-mono">{analysis.truePeak.toFixed(1)} dBTP</span></div>
              </div>
            </div>
          )}

          <Field label="Normalization mode">
            <Select value={mode} onChange={(e) => setMode(e.target.value as 'lufs' | 'peak')}>
              <option value="lufs">LUFS loudness (BS.1770-4 standard)</option>
              <option value="peak">Peak normalize (legacy)</option>
            </Select>
          </Field>

          {mode === 'lufs' ? (
            <div className="mt-4">
              <Field label="Platform preset">
                <Select value={preset} onChange={(e) => setPreset(e.target.value as keyof typeof LUFS_PRESETS)}>
                  {Object.entries(LUFS_PRESETS).map(([key, p]) => (
                    <option key={key} value={key}>{p.label} — {p.desc}</option>
                  ))}
                </Select>
              </Field>
            </div>
          ) : (
            <div className="mt-4">
              <Slider label="Target peak" value={Math.round(customTarget * 100)} min={50} max={99} unit="%" onChange={(v) => setCustomTarget(v / 100)} />
            </div>
          )}

          <div className="mt-4">
            <Field label="Output format">
              <Select value={format} onChange={(e) => setFormat(e.target.value)}>
                <option value="mp3">MP3 (160 kbps)</option>
                <option value="wav">WAV (lossless)</option>
              </Select>
            </Field>
          </div>
        </>
      }
      process={async (p, ctx) => {
        const buffer = await decodeAudio(p.url)
        const beforeLUFS = measureIntegratedLUFS(buffer)
        const beforeTP = measureTruePeak(buffer)

        const out = mode === 'lufs' ? lufsNormalize(buffer, targetLUFS) : normalizePeak(buffer, targetLUFS / 100)

        const afterLUFS = measureIntegratedLUFS(out)
        const afterTP = measureTruePeak(out)
        const blob = await bufferToBlob(out, format as 'mp3' | 'wav')

        const meta = mode === 'lufs'
          ? `${beforeLUFS.toFixed(1)} → ${afterLUFS.toFixed(1)} LUFS · TP ${afterTP.toFixed(1)} dBTP`
          : `Peak ${(beforeTP * 100).toFixed(0)}% → balanced`

        return { blob, filename: `${p.file.name.replace(/\.[^.]+$/, '')}_balanced.${format}`, kind: 'audio', meta }
      }}
    />
  )
}
