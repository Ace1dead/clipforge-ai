import { useRef, useState } from 'react'
import { Scissors, Sparkles, Download, Loader2, Zap, Clock, Hash, Eye } from 'lucide-react'
import { MediaDropzone } from '../components/MediaDropzone'
import type { Picked } from '../components/MediaDropzone'
import { Button, Card, ProgressBar, Badge, toast } from '../components/ui'
import { decodeAudio } from '../lib/audio'
import { renderComposition } from '../lib/video'
import { fmtTime, downloadBlob, fmtBytes } from '../lib/format'
import { analyzeVideo, extractClips, type VideoAnalysis, type ClipResult } from '../lib/aiEngine'

type Step = 'upload' | 'analyze' | 'clips'

export function AutoClip() {
  const [picked, setPicked] = useState<Picked | null>(null)
  const [step, setStep] = useState<Step>('upload')
  const [analyzing, setAnalyzing] = useState(false)
  const [analysis, setAnalysis] = useState<VideoAnalysis | null>(null)
  const [clips, setClips] = useState<ClipResult[]>([])
  const [selectedClip, setSelectedClip] = useState<ClipResult | null>(null)
  const [generating, setGenerating] = useState(false)
  const [progress, setProgress] = useState(0)
  const [duration, setDuration] = useState(0)

  const handlePicked = async (p: Picked) => {
    setPicked(p)
    const v = document.createElement('video')
    v.src = p.url
    await new Promise<void>((r) => { v.onloadedmetadata = () => { setDuration(v.duration); r() } })
  }

  const analyzeWithAI = async () => {
    if (!picked) return
    setAnalyzing(true)
    setProgress(0)
    try {
      let energyProfile: number[] = []
      try {
        setProgress(0.1)
        const audioBuffer = await decodeAudio(picked.url)
        const rawEnergy = audioBuffer.getChannelData(0)
        const samplesPerSec = audioBuffer.sampleRate
        for (let i = 0; i < audioBuffer.duration; i++) {
          const slice = rawEnergy.slice(i * samplesPerSec, (i + 1) * samplesPerSec)
          const rms = Math.sqrt(slice.reduce((s, v) => s + v * v, 0) / Math.max(slice.length, 1))
          energyProfile.push(rms)
        }
      } catch { /* audio analysis optional */ }

      setProgress(0.3)
      const videoAnalysis = await analyzeVideo({
        duration,
        audioEnergyProfile: energyProfile.length > 0 ? energyProfile : undefined,
        title: picked.file.name,
      })
      setAnalysis(videoAnalysis)
      setProgress(0.6)

      const extractedClips = await extractClips({
        duration,
        analysis: videoAnalysis,
        targetPlatforms: ['tiktok', 'reels', 'shorts'],
        clipCount: 5,
        maxDuration: 60,
      })
      setClips(extractedClips)
      setSelectedClip(extractedClips[0] ?? null)
      setProgress(1)
      setStep('clips')
      toast('success', `Found ${extractedClips.length} viral clips`)
    } catch (e) {
      toast('error', 'Analysis failed', e instanceof Error ? e.message : undefined)
    } finally {
      setAnalyzing(false)
    }
  }

  const exportClip = async (clip: ClipResult) => {
    if (!picked) return
    setGenerating(true)
    setProgress(0)
    try {
      setProgress(0.1)
      const blob = await renderComposition({
        sources: [{ url: picked.url, fit: 'cover' }],
        outW: clip.platform === 'tiktok' || clip.platform === 'reels' ? 1080 : 1920,
        outH: clip.platform === 'tiktok' || clip.platform === 'reels' ? 1920 : 1080,
        trim: { start: clip.start, end: clip.end },
        onProgress: (p: number) => setProgress(0.1 + p * 0.8),
      })
      const ext = blob.type.includes('mp4') ? 'mp4' : 'webm'
      downloadBlob(blob, `${clip.title.replace(/[^a-zA-Z0-9]/g, '_')}.${ext}`)
      setProgress(1)
      toast('success', `Exported: ${clip.title}`, fmtBytes(blob.size))
    } catch (e) {
      toast('error', 'Export failed', e instanceof Error ? e.message : undefined)
    } finally {
      setGenerating(false)
    }
  }

  const getScoreColor = (score: number) => {
    if (score >= 80) return 'text-green'
    if (score >= 60) return 'text-amber'
    return 'text-faint'
  }

  const getGrade = (score: number) => {
    if (score >= 90) return 'A+'
    if (score >= 80) return 'A'
    if (score >= 70) return 'B+'
    if (score >= 60) return 'B'
    if (score >= 50) return 'C'
    return 'D'
  }

  return (
    <div className="max-w-7xl mx-auto px-4 md:px-8 py-8 anim-float-up">
      <div className="flex items-center gap-3 mb-2">
        <span className="w-10 h-10 rounded-xl accent-gradient flex items-center justify-center text-white"><Scissors size={20} /></span>
        <div>
          <h1 className="text-xl font-bold tracking-tight flex items-center gap-2">
            AI Auto Clip
            <Badge tone="green">AI-Powered</Badge>
          </h1>
          <p className="text-[13px] text-muted">Extract viral clips from long videos using AI analysis. Powered by free models via OmniRoute.</p>
        </div>
      </div>

      <div className="flex items-center gap-2 mt-6 text-[12px]">
        {(['upload', 'analyze', 'clips'] as Step[]).map((s, i) => (
          <div key={s} className="flex items-center gap-2">
            <div className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold ${
              step === s ? 'bg-accent text-white' :
              (step === 'clips' && (s === 'upload' || s === 'analyze')) ? 'bg-accent/20 text-accent' : 'bg-elevated text-faint'
            }`}>
              {i + 1}
            </div>
            <span className={step === s ? 'text-fg font-medium' : 'text-faint'}>{s}</span>
            {i < 2 && <div className="w-8 h-px bg-white/10" />}
          </div>
        ))}
      </div>

      {step === 'upload' && (
        <div className="mt-6">
          <MediaDropzone onPicked={handlePicked} />
          {picked && (
            <div className="mt-4 flex items-center justify-between">
              <div className="text-[13px] text-muted">
                {picked.file.name} — {fmtTime(duration)}
              </div>
              <Button icon={<Sparkles size={16} />} onClick={() => { setStep('analyze'); void analyzeWithAI() }}>
                Analyze with AI
              </Button>
            </div>
          )}
        </div>
      )}

      {step === 'analyze' && analyzing && (
        <div className="mt-10 max-w-md mx-auto text-center">
          <div className="w-16 h-16 mx-auto accent-gradient rounded-full flex items-center justify-center mb-4">
            <Loader2 size={28} className="text-white animate-spin" />
          </div>
          <h3 className="font-bold text-[16px] mb-2">AI is analyzing your video</h3>
          <p className="text-[13px] text-muted mb-4">Detecting viral moments, hooks, and optimal clip points...</p>
          <ProgressBar value={progress} />
          <p className="text-[11px] text-faint mt-2">{Math.round(progress * 100)}%</p>
        </div>
      )}

      {step === 'clips' && analysis && (
        <div className="mt-6 grid lg:grid-cols-[1fr_380px] gap-5">
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold text-[14px]">
                {clips.length} Clips Found —{' '}
                <span className={getScoreColor(analysis.totalScore)}>
                  Score: {analysis.totalScore}/100 ({getGrade(analysis.totalScore)})
                </span>
              </h3>
              <Button variant="secondary" size="sm" icon={<Scissors size={14} />} onClick={() => { setStep('upload'); setAnalysis(null); setClips([]) }}>
                New Video
              </Button>
            </div>

            {clips.map((clip) => (
              <div
                key={clip.id}
                className={`p-4 rounded-xl border cursor-pointer transition-all ${
                  selectedClip?.id === clip.id ? 'border-accent/40 bg-accent/5' : 'border-white/10 bg-elevated/50 hover:border-white/20'
                }`}
                onClick={() => setSelectedClip(clip)}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <h4 className="font-semibold text-[14px] truncate">{clip.title}</h4>
                      <Badge tone={clip.viralScore >= 70 ? 'green' : clip.viralScore >= 50 ? 'amber' : 'neutral'}>
                        {clip.viralScore}%
                      </Badge>
                    </div>
                    <p className="text-[12px] text-muted line-clamp-2">{clip.description}</p>
                    <div className="flex items-center gap-3 mt-2 text-[11px] text-faint">
                      <span className="flex items-center gap-1"><Clock size={10} /> {fmtTime(clip.start)} - {fmtTime(clip.end)}</span>
                      <span className="flex items-center gap-1"><Zap size={10} /> {clip.platform}</span>
                      <span className="flex items-center gap-1"><Hash size={10} /> {clip.hashtags.slice(0, 3).join(' ')}</span>
                    </div>
                    {clip.hooks.length > 0 && (
                      <div className="mt-2 text-[11px] text-accent italic">"{clip.hooks[0]}"</div>
                    )}
                  </div>
                  <Button
                    size="sm"
                    icon={<Download size={14} />}
                    loading={generating && selectedClip?.id === clip.id}
                    onClick={(e) => { e.stopPropagation(); void exportClip(clip) }}
                  >
                    Export
                  </Button>
                </div>
              </div>
            ))}
          </div>

          <div className="space-y-4">
            <Card className="p-5">
              <div className="text-center">
                <div className={`text-4xl font-extrabold ${getScoreColor(analysis.totalScore)}`}>{analysis.totalScore}</div>
                <div className="text-[12px] text-faint mt-1">Viral Score · Grade {getGrade(analysis.totalScore)}</div>
              </div>
              <div className="mt-4 space-y-2">
                <div className="flex justify-between text-[12px]">
                  <span className="text-muted">Speech</span>
                  <span>{analysis.metadata.hasSpeech ? 'Yes' : 'No'}</span>
                </div>
                <div className="flex justify-between text-[12px]">
                  <span className="text-muted">Audio Energy</span>
                  <span>{Math.round(analysis.metadata.audioEnergy * 100)}%</span>
                </div>
                <div className="flex justify-between text-[12px]">
                  <span className="text-muted">Pacing</span>
                  <span>{Math.round(analysis.metadata.pacingScore * 100)}%</span>
                </div>
              </div>
            </Card>

            <Card className="p-5">
              <h3 className="font-semibold text-[14px] mb-3">Viral Hooks</h3>
              <div className="space-y-2">
                {analysis.hooks.slice(0, 4).map((hook, i) => (
                  <div key={i} className="bg-elevated/60 rounded-lg p-2.5 text-[12px]">
                    <p className="font-medium">"{hook.text}"</p>
                    <div className="flex items-center gap-2 mt-1 text-[10px] text-faint">
                      <Badge tone="accent">{hook.type}</Badge>
                      <span>{hook.estimatedReach}</span>
                    </div>
                  </div>
                ))}
              </div>
            </Card>

            <Card className="p-5">
              <h3 className="font-semibold text-[14px] mb-3">Key Moments</h3>
              <div className="space-y-2">
                {analysis.moments.slice(0, 4).map((moment, i) => (
                  <div key={i} className="flex items-center gap-2 text-[12px]">
                    <span className="text-accent font-mono">{fmtTime(moment.timestamp)}</span>
                    <span className="text-muted">{moment.description}</span>
                  </div>
                ))}
              </div>
            </Card>

            {analysis.suggestions.length > 0 && (
              <Card className="p-5">
                <h3 className="font-semibold text-[14px] mb-3">AI Suggestions</h3>
                <ul className="space-y-2">
                  {analysis.suggestions.map((s, i) => (
                    <li key={i} className="text-[12px] text-muted flex items-start gap-2">
                      <Sparkles size={12} className="text-accent mt-0.5 shrink-0" />
                      {s}
                    </li>
                  ))}
                </ul>
              </Card>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
