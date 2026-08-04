import { useEffect, useState } from 'react'
import { Mic, Play, Square, Download, Sparkles } from 'lucide-react'
import { Button, Card, Textarea, Select, Field, Slider, Badge, toast } from '../components/ui'
import { STREAMELEMENTS_VOICES, getBrowserVoices, synthesizeStreamElements, speakBrowser, estimateSpeakingTime } from '../lib/tts'
import { downloadBlob, fmtBytes } from '../lib/format'

const SAMPLE = 'This video is going to change the way you think about content. Stay until the end — it gets wild.'

export function Voiceover() {
  const [script, setScript] = useState(SAMPLE)
  const [voiceId, setVoiceId] = useState('Brian')
  const [rate, setRate] = useState(1)
  const [pitch, setPitch] = useState(1)
  const [speaking, setSpeaking] = useState(false)
  const [gen, setGen] = useState(false)
  const [result, setResult] = useState<{ blob: Blob; url: string; size: number } | null>(null)
  const [browserVoices, setBrowserVoices] = useState<ReturnType<typeof getBrowserVoices>>([])

  useEffect(() => {
    setBrowserVoices(getBrowserVoices())
    const load = () => setBrowserVoices(getBrowserVoices())
    if ('speechSynthesis' in window) speechSynthesis.onvoiceschanged = load
    return () => { if ('speechSynthesis' in window) speechSynthesis.onvoiceschanged = null }
  }, [])

  const preview = async () => {
    if (!script.trim()) return
    if (speaking) { speechSynthesis.cancel(); setSpeaking(false); return }
    setSpeaking(true)
    const { duration } = await speakBrowser(script, browserVoices[0]?.id ?? '', rate, pitch)
    setTimeout(() => setSpeaking(false), duration * 1000 + 200)
  }

  const generate = async () => {
    if (!script.trim()) { toast('error', 'Write a script first'); return }
    setGen(true)
    try {
      const blob = await synthesizeStreamElements(script.slice(0, 2000), voiceId)
      const url = URL.createObjectURL(blob)
      setResult({ blob, url, size: blob.size })
      toast('success', 'Voiceover generated', fmtBytes(blob.size))
    } catch (e) {
      toast('error', 'Could not generate voiceover', e instanceof Error ? e.message : undefined)
    } finally { setGen(false) }
  }

  const est = estimateSpeakingTime(script, 165)

  return (
    <div className="max-w-6xl mx-auto px-4 md:px-8 py-8 anim-float-up">
      <div className="flex items-center gap-3 mb-2">
        <span className="w-10 h-10 rounded-xl accent-gradient flex items-center justify-center text-white"><Mic size={20} /></span>
        <div>
          <h1 className="text-xl font-bold tracking-tight flex items-center gap-2">AI Voiceover <Badge tone="amber">PREMIUM</Badge></h1>
          <p className="text-[13px] text-muted">Turn any script into a realistic voiceover with 27 premium voices in 12 languages.</p>
        </div>
      </div>

      <div className="mt-6 grid lg:grid-cols-[1fr_380px] gap-5 items-start">
        <Card className="p-5">
          <Field label="Script">
            <Textarea rows={10} value={script} onChange={(e) => setScript(e.target.value)} className="leading-relaxed" />
          </Field>
          <div className="flex items-center justify-between mt-3">
            <p className="text-[12px] text-faint">{script.trim().split(/\s+/).filter(Boolean).length} words · ~{est.toFixed(0)}s narration</p>
            <Button variant="ghost" size="sm" onClick={() => setScript(SAMPLE)}>Reset sample</Button>
          </div>
          <div className="grid grid-cols-2 gap-4 mt-5">
            <Field label="Voice">
              <Select value={voiceId} onChange={(e) => setVoiceId(e.target.value)}>
                {STREAMELEMENTS_VOICES.map((v) => <option key={v.id} value={v.id}>{v.name} · {v.lang} · {v.gender}</option>)}
              </Select>
            </Field>
            <Field label="Speed">
              <Select value={String(rate)} onChange={(e) => setRate(Number(e.target.value))}>
                <option value="0.8">Slow</option><option value="1">Normal</option><option value="1.2">Fast</option><option value="1.4">Very fast</option>
              </Select>
            </Field>
          </div>
          <div className="mt-4"><Slider label="Pitch" value={Math.round(pitch * 100)} min={50} max={150} unit="" onChange={(v) => setPitch(v / 100)} /></div>
        </Card>

        <Card className="p-5">
          <h3 className="font-semibold text-[14px] mb-3">Generate</h3>
          <div className="space-y-3">
            <Button variant="secondary" className="w-full" icon={speaking ? <Square size={15} /> : <Play size={15} />} onClick={() => void preview()}>
              {speaking ? 'Stop preview' : 'Preview (browser voice)'}
            </Button>
            <Button className="w-full" size="lg" icon={<Sparkles size={17} />} loading={gen} onClick={() => void generate()}>
              Generate voiceover
            </Button>
          </div>
          {result && (
            <div className="mt-5 anim-float-up">
              <p className="text-[13px] font-semibold mb-2">Your voiceover</p>
              <audio src={result.url} controls className="w-full mb-3" />
              <Button className="w-full" icon={<Download size={15} />} onClick={() => downloadBlob(result.blob, 'voiceover.mp3')}>Download MP3</Button>
            </div>
          )}
          <div className="mt-5 pt-4 border-t border-white/8">
            <p className="text-[12px] text-faint leading-relaxed">Premium voices render in seconds. Try <span className="text-fg font-medium">r/AskReddit</span> stories, gaming narrations or faceless channel scripts — then add captions in the editor.</p>
          </div>
        </Card>
      </div>
    </div>
  )
}