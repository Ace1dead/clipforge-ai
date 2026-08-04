import { useRef, useState } from 'react'
import { SlidersHorizontal } from 'lucide-react'
import { MediaToolShell } from '../components/MediaToolShell'
import type { Picked } from '../components/MediaDropzone'
import { Slider, Field, Select, Button } from '../components/ui'
import { decodeAudio, pitchShift, bufferToBlob, getAudioCtx, applyGain, normalizePeak } from '../lib/audio'
import type { AudioFormat } from '../lib/audio'

const PRESETS = [
  { id: 'deep', label: 'Deep', semitones: -6 },
  { id: 'chipmunk', label: 'Chipmunk', semitones: 9 },
  { id: 'demon', label: 'Demon', semitones: -12 },
  { id: 'helium', label: 'Helium', semitones: 5 },
  { id: 'robot', label: 'Robot', semitones: 0 },
]

/** Ring modulation — creates a metallic robot voice effect */
function ringMod(buffer: AudioBuffer, frequency = 30): AudioBuffer {
  const ctx = getAudioCtx()
  const out = ctx.createBuffer(buffer.numberOfChannels, buffer.length, buffer.sampleRate)
  for (let c = 0; c < buffer.numberOfChannels; c++) {
    const src = buffer.getChannelData(c)
    const dst = out.getChannelData(c)
    for (let i = 0; i < src.length; i++) {
      dst[i] = src[i] * Math.sin(2 * Math.PI * frequency * i / buffer.sampleRate)
    }
  }
  return normalizePeak(out, 0.9)
}

export function VoiceChanger() {
  const [semitones, setSemitones] = useState(0)
  const [presetId, setPresetId] = useState<string | null>(null)
  const [format, setFormat] = useState<AudioFormat>('wav')
  const [testing, setTesting] = useState(false)
  const playingRef = useRef<AudioBufferSourceNode | null>(null)

  const test = async (url: string) => {
    if (!semitones) return
    try {
      setTesting(true)
      const buffer = await decodeAudio(url)
      let processed = buffer
      if (presetId === 'robot') {
        processed = ringMod(buffer)
      } else if (semitones !== 0) {
        const { buffer: shifted } = pitchShift(buffer, semitones)
        processed = shifted
      }
      const ctx = getAudioCtx()
      playingRef.current?.stop()
      const src = ctx.createBufferSource()
      src.buffer = processed
      if (presetId !== 'robot') {
        const { rate } = pitchShift(buffer, semitones)
        src.playbackRate.value = rate
      }
      src.connect(ctx.destination)
      src.start(0)
      playingRef.current = src
    } finally { setTesting(false) }
  }

  return (
    <MediaToolShell
      title="Voice Changer"
      subtitle="Shift your voice up or down — from deep movie-trailer narrator to chipmunk. Preview before exporting."
      icon={<SlidersHorizontal size={20} />}
      dropType="any"
      processLabel="Change voice"
      config={(p: Picked) => (
        <>
          <Field label="Presets">
            <div className="grid grid-cols-5 gap-1.5">
              {PRESETS.map((pr) => (
                <button key={pr.id} onClick={() => { setSemitones(pr.semitones); setPresetId(pr.id) }} className={`py-1.5 rounded-lg text-[11px] font-semibold border transition-all cursor-pointer ${presetId === pr.id ? 'bg-accent text-white border-accent' : 'bg-elevated border-white/10 text-muted hover:text-fg'}`}>{pr.label}</button>
              ))}
            </div>
          </Field>
          <div className="mt-4">
            <Slider label="Pitch shift" value={semitones} min={-12} max={12} step={1} unit=" st" onChange={setSemitones} />
          </div>
          <div className="mt-4 flex gap-2 items-end">
            <div className="flex-1">
              <Field label="Output format">
                <Select value={format} onChange={(e) => setFormat(e.target.value as AudioFormat)}>
                  <option value="wav">WAV</option>
                  <option value="mp3">MP3</option>
                </Select>
              </Field>
            </div>
            <Button variant="secondary" size="sm" loading={testing} disabled={!semitones && presetId !== 'robot'} onClick={() => void test(p.url)}>Preview</Button>
          </div>
        </>
      )}
      process={async (p, ctx) => {
        const buffer = await decodeAudio(p.url)
        let processed = buffer
        if (presetId === 'robot') {
          processed = ringMod(buffer)
        } else if (semitones !== 0) {
          const { buffer: shifted } = pitchShift(buffer, semitones)
          processed = shifted
        }
        const blob = await bufferToBlob(processed, format, 192)
        return { blob, filename: `${p.file.name.replace(/\.[^.]+$/, '')}_shifted.${format}`, kind: 'audio' }
      }}
    />
  )
}