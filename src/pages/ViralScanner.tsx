import { useState } from 'react'
import { TrendingUp, Sparkles, Download, Loader2, Zap, Clock, Target, Eye } from 'lucide-react'
import { MediaDropzone } from '../components/MediaDropzone'
import type { Picked } from '../components/MediaDropzone'
import { Button, Card, ProgressBar, Badge, toast } from '../components/ui'
import { decodeAudio } from '../lib/audio'
import { renderComposition } from '../lib/video'
import { fmtTime, downloadBlob, fmtBytes } from '../lib/format'
import { analyzeVideo, extractClips, type VideoAnalysis, type ClipResult } from '../lib/aiEngine'

export function ViralScanner() {
  const [picked, setPicked] = useState<Picked | null>(null)
  const [title, setTitle] = useState('')
  const [analyzing, setAnalyzing] = useState(false)
  const [progress, setProgress] = useState(0)
  const [analysis, setAnalysis] = useState<VideoAnalysis | null>(null)
  const [clips, setClips] = useState<ClipResult[]>([])
  const [duration, setDuration] = useState(0)
  const [exporting, setExporting] = useState<string | null>(null)

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

  const handlePicked = async (p: Picked) => {
    setPicked(p)
    setAnalysis(null)
    setClips([])
    const v = document.createElement('video')
    v.src = p.url
    await new Promise<void>((r) => { v.onloadedmetadata = () => { setDuration(v.duration); r() } })
  }

  const analyze = async () => {
    if (!picked) return
    setAnalyzing(true)
    setProgress(0)
    try {
      let energyProfile: number[] = []
      try {
        setProgress(0.1)
        const buf = await decodeAudio(picked.url)
        const raw = buf.getChannelData(0)
        const sps = buf.sampleRate
        for (let i = 0; i < buf.duration; i++) {
          const sl = raw.slice(i * sps, (i + 1) * sps)
          energyProfile.push(Math.sqrt(sl.reduce((s, v) => s + v * v, 0) / Math.max(sl.length, 1)))
        }
      } catch { /* optional */ }

      setProgress(0.3)
      const result = await analyzeVideo({
        duration,
        audioEnergyProfile: energyProfile.length > 0 ? energyProfile : undefined,
        title: title || picked.file.name,
      })
      setAnalysis(result)
      setProgress(0.6)

      const extracted = await extractClips({
        duration,
        analysis: result,
        targetPlatforms: ['tiktok', 'reels', 'shorts'],
        clipCount: 5,
        maxDuration: 60,
      })
      setClips(extracted)
      setProgress(1)
      toast('success', `Analysis complete — score: ${result.totalScore}/100`)
    } catch (e) {
      toast('error', 'Analysis failed', e instanceof Error ? e.message : undefined)
    } finally {
      setAnalyzing(false)
    }
  }

  const exportClip = async (clip: ClipResult) => {
    if (!picked) return
    setExporting(clip.id)
    setProgress(0)
    try {
      const blob = await renderComposition({
        sources: [{ url: picked.url, fit: 'cover' }],
        outW: clip.platform === 'tiktok' || clip.platform === 'reels' ? 1080 : 1920,
        outH: clip.platform === 'tiktok' || clip.platform === 'reels' ? 1920 : 1080,
        trim: { start: clip.start, end: clip.end },
        onProgress: (p: number) => setProgress(p),
      })
      downloadBlob(blob, `${clip.title.replace(/[^a-zA-Z0-9]/g, '_')}.webm`)
      toast('success', 'Clip exported', fmtBytes(blob.size))
    } catch (e) {
      toast('error', 'Export failed', e instanceof Error ? e.message : undefined)
    } finally {
      setExporting(null)
    }
  }

  return (
    <div className="max-w-7xl mx-auto px-4 md:px-8 py-8 anim-float-up">
      <div className="flex items-center gap-3 mb-2">
        <span className="w-10 h-10 rounded-xl accent-gradient flex items-center justify-center text-white"><TrendingUp size={20} /></span>
        <div>
          <h1 className="text-xl font-bold tracking-tight flex items-center gap-2">
            Viral Scanner
            <Badge tone="green">AI-Powered</Badge>
          </h1>
          <p className="text-[13px] text-muted">Analyze any video for viral potential. AI detects hooks, peaks, and optimal clip points.</p>
        </div>
      </div>

      {!analysis && (
        <div className="mt-6">
          <MediaDropzone onPicked={handlePicked} />
          {picked && (
            <div className="mt-4 space-y-3">
              <input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Video title (optional — helps AI analysis)"
                className="w-full bg-elevated border border-white/10 rounded-xl px-3.5 py-2.5 text-sm outline-none focus:border-accent/60"
              />
              <div className="flex items-center justify-between">
                <span className="text-[13px] text-muted">{picked.file.name} — {fmtTime(duration)}</span>
                <Button icon={<Sparkles size={16} />} loading={analyzing} onClick={() => void analyze()}>
                  Scan for Viral Potential
                </Button>
              </div>
            </div>
          )}
        </div>
      )}

      {analyzing && (
        <div className="mt-10 max-w-md mx-auto text-center">
          <div className="w-16 h-16 mx-auto accent-gradient rounded-full flex items-center justify-center mb-4">
            <Loader2 size={28} className="text-white animate-spin" />
          </div>
          <h3 className="font-bold text-[16px] mb-2">Scanning video...</h3>
          <p className="text-[13px] text-muted mb-4">AI is analyzing energy, speech, hooks, and viral moments</p>
          <ProgressBar value={progress} />
          <p className="text-[11px] text-faint mt-2">{Math.round(progress * 100)}%</p>
        </div>
      )}

      {analysis && !analyzing && (
        <div className="mt-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-[15px]">Analysis Results</h3>
            <Button variant="secondary" size="sm" onClick={() => { setAnalysis(null); setClips([]); setPicked(null) }}>
              Scan Another Video
            </Button>
          </div>

          <div className="grid lg:grid-cols-[1fr_380px] gap-5">
            <div className="space-y-4">
              <Card className="p-5">
                <div className="flex items-center gap-6">
                  <div className="text-center">
                    <div className={`text-5xl font-extrabold ${getScoreColor(analysis.totalScore)}`}>{analysis.totalScore}</div>
                    <div className="text-[11px] text-faint mt-1">Score · {getGrade(analysis.totalScore)}</div>
                  </div>
                  <div className="flex-1 space-y-2">
                    <div className="flex justify-between text-[12px]">
                      <span className="text-muted">Potential</span>
                      <Badge tone={analysis.viralPotential === 'high' || analysis.viralPotential === 'viral' ? 'green' : analysis.viralPotential === 'medium' ? 'amber' : 'neutral'}>
                        {analysis.viralPotential}
                      </Badge>
                    </div>
                    <div className="flex justify-between text-[12px]">
                      <span className="text-muted">Audio Energy</span>
                      <span>{Math.round(analysis.metadata.audioEnergy * 100)}%</span>
                    </div>
                    <div className="flex justify-between text-[12px]">
                      <span className="text-muted">Pacing</span>
                      <span>{Math.round(analysis.metadata.pacingScore * 100)}%</span>
                    </div>
                    <div className="flex justify-between text-[12px]">
                      <span className="text-muted">Duration</span>
                      <span>{fmtTime(duration)}</span>
                    </div>
                  </div>
                </div>
              </Card>

              <Card className="p-5">
                <h3 className="font-semibold text-[14px] mb-3">Energy Timeline</h3>
                <div className="flex items-end gap-px h-20">
                  {analysis.segments.length > 0 ? analysis.segments.map((seg, i) => {
                    const maxScore = Math.max(...analysis.segments.map(s => s.score), 1)
                    return (
                      <div
                        key={i}
                        className="flex-1 rounded-t bg-accent/40 hover:bg-accent transition-colors cursor-pointer min-w-[2px]"
                        style={{ height: `${Math.max(4, (seg.score / maxScore) * 100)}%` }}
                        title={`${fmtTime(seg.start)}-${fmtTime(seg.end)}: ${seg.score}%`}
                      />
                    )
                  }) : (
                    <div className="flex-1 bg-white/5 rounded h-4" />
                  )}
                </div>
                <div className="flex justify-between text-[10px] text-faint mt-1">
                  <span>0:00</span>
                  <span>{fmtTime(duration / 2)}</span>
                  <span>{fmtTime(duration)}</span>
                </div>
              </Card>

              <Card className="p-5">
                <h3 className="font-semibold text-[14px] mb-3">Best Clips</h3>
                <div className="space-y-2">
                  {clips.map((clip) => (
                    <div key={clip.id} className="flex items-center justify-between p-3 bg-elevated/50 rounded-xl border border-white/10">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="font-medium text-[13px] truncate">{clip.title}</span>
                          <Badge tone={clip.viralScore >= 70 ? 'green' : 'amber'}>{clip.viralScore}%</Badge>
                        </div>
                        <div className="flex items-center gap-2 mt-1 text-[11px] text-faint">
                          <Clock size={10} /> {fmtTime(clip.start)} - {fmtTime(clip.end)}
                          <Zap size={10} /> {clip.platform}
                        </div>
                        {clip.hooks[0] && <div className="text-[11px] text-accent mt-1 italic">"{clip.hooks[0]}"</div>}
                      </div>
                      <Button size="sm" icon={<Download size={14} />} loading={exporting === clip.id} onClick={() => void exportClip(clip)}>
                        Export
                      </Button>
                    </div>
                  ))}
                </div>
              </Card>
            </div>

            <div className="space-y-4">
              <Card className="p-5">
                <h3 className="font-semibold text-[14px] mb-3">AI Hooks</h3>
                <div className="space-y-2">
                  {analysis.hooks.map((hook, i) => (
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
                <h3 className="font-semibold text-[14px] mb-3">Viral Moments</h3>
                <div className="space-y-2">
                  {analysis.moments.map((m, i) => (
                    <div key={i} className="flex items-start gap-2 text-[12px]">
                      <span className="text-accent font-mono shrink-0">{fmtTime(m.timestamp)}</span>
                      <div>
                        <span className="text-muted">{m.description}</span>
                        <div className="text-[10px] text-faint">
                          Intensity: {Math.round(m.intensity * 100)}%
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </Card>

              <Card className="p-5">
                <h3 className="font-semibold text-[14px] mb-3">Suggestions</h3>
                <ul className="space-y-2">
                  {analysis.suggestions.map((s, i) => (
                    <li key={i} className="text-[12px] text-muted flex items-start gap-2">
                      <Target size={12} className="text-accent mt-0.5 shrink-0" />
                      {s}
                    </li>
                  ))}
                </ul>
              </Card>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
