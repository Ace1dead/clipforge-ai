import { useState } from 'react'
import { AudioLines, Music2, Mic2 } from 'lucide-react'
import { MediaToolShell } from '../components/MediaToolShell'
import { Tabs, Slider, Toggle, Field } from '../components/ui'
import { decodeAudio, enhanceSpeech, vocalRemove, extractVocals, bufferToBlob } from '../lib/audio'
import type { AudioFormat } from '../lib/audio'
import { fmtTime } from '../lib/format'

type Mode = 'enhance' | 'remove-vocals' | 'extract-vocals'

export function SpeechEnhancer() {
  const [mode, setMode] = useState<Mode>('enhance')
  const [deNoise, setDeNoise] = useState(60)
  const [presence, setPresence] = useState(45)
  const [warm, setWarm] = useState(20)
  const [air, setAir] = useState(25)
  const [compress, setCompress] = useState(true)
  const [format, setFormat] = useState<AudioFormat>('wav')

  return (
    <MediaToolShell
      title="Speech Enhancer"
      subtitle="Clean up podcast audio, remove background noise, and make voices sound broadcast-ready with one click."
      icon={<AudioLines size={20} />}
      dropType="any"
      processLabel="Enhance audio"
      config={
        <>
          <Tabs
            tabs={[
              { id: 'enhance', label: 'Enhance speech', icon: <AudioLines size={14} /> },
              { id: 'remove-vocals', label: 'Remove vocals', icon: <Music2 size={14} /> },
              { id: 'extract-vocals', label: 'Extract vocals', icon: <Mic2 size={14} /> },
            ]}
            active={mode}
            onChange={(m) => setMode(m as Mode)}
          />
          <div className="mt-4 space-y-4">
            {mode === 'enhance' && (
              <>
                <Slider label="Noise reduction" value={deNoise} min={0} max={100} unit="%" onChange={setDeNoise} />
                <Slider label="Presence (vocal clarity)" value={presence} min={0} max={100} unit="%" onChange={setPresence} />
                <Slider label="Warmth" value={warm} min={0} max={100} unit="%" onChange={setWarm} />
                <Slider label="Air (treble)" value={air} min={0} max={100} unit="%" onChange={setAir} />
                <Toggle checked={compress} onChange={setCompress} label="Broadcast compression" />
              </>
            )}
            {mode === 'remove-vocals' && <p className="text-[13px] text-muted">Removes the lead vocal from a stereo track (karaoke style) using center-channel cancellation.</p>}
            {mode === 'extract-vocals' && <p className="text-[13px] text-muted">Isolates the center vocal content and cuts low frequencies to keep the voice.</p>}
            <Field label="Output format">
              <div className="flex gap-2">
                {(['wav', 'mp3'] as AudioFormat[]).map((f) => (
                  <button key={f} onClick={() => setFormat(f)} className={`flex-1 py-2 rounded-lg text-[13px] font-semibold border transition-all cursor-pointer ${format === f ? 'bg-accent text-white border-accent' : 'bg-elevated border-white/10 text-muted hover:text-fg'}`}>{f.toUpperCase()}</button>
                ))}
              </div>
            </Field>
          </div>
        </>
      }
      process={async (p, ctx) => {
        const buffer = await decodeAudio(p.url)
        let out = buffer
        if (mode === 'enhance') out = await enhanceSpeech(buffer, { deNoise: deNoise / 100, presence: presence / 100, warm: warm / 100, air: air / 100, compress })
        else if (mode === 'remove-vocals') out = vocalRemove(buffer)
        else out = await extractVocals(buffer)
        const blob = await bufferToBlob(out, format, 192)
        return { blob, filename: `${p.file.name.replace(/\.[^.]+$/, '')}_${mode}.${format}`, kind: 'audio', meta: fmtTime(out.duration) }
      }}
    />
  )
}