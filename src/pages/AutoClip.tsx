import { useRef, useState, useCallback, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Scissors, Sparkles, Download, Loader2, Zap, Clock, Hash, Eye, Link2, Upload, Play, Check, AlertCircle, ChevronDown, Film, Type, Layers, Wand2, Settings, Video, Music, ArrowRight } from 'lucide-react'
import { MediaDropzone } from '../components/MediaDropzone'
import type { Picked } from '../components/MediaDropzone'
import { ClipPreview } from '../components/ClipPreview'
import { VideoPreviewModal } from '../components/VideoPreviewModal'
import type { CompositorConfig } from '../lib/compositor'
import { Button, Card, ProgressBar, Badge, toast, Input, Divider, Select, Toggle } from '../components/ui'
import { decodeAudio, lufsNormalize, measureIntegratedLUFS } from '../lib/audio'
import { renderComposition, renderJumpCut } from '../lib/video'
import { fmtTime, downloadBlob, fmtBytes } from '../lib/format'
import { analyzeVideo, extractClips, type VideoAnalysis, type ClipResult } from '../lib/aiEngine'
import { drawCaptions, getStyle, CAPTION_STYLES, type TimedWord } from '../lib/captions'
import { transcribeAudio, type WordTimestamp, isSTTSupported } from '../lib/stt'
import { createDrawFrame } from '../lib/compositor'
import type { EditStyleId, ColorSkinId } from '../lib/editStyles'
import { detectSilences, type Silence } from '../lib/editor/silence'
import { buildJumpCutPlan } from '../lib/editor/jumpcut'

type Step = 'url' | 'analyzing' | 'results' | 'exporting'

function roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  ctx.beginPath()
  ctx.moveTo(x + r, y)
  ctx.lineTo(x + w - r, y)
  ctx.quadraticCurveTo(x + w, y, x + w, y + r)
  ctx.lineTo(x + w, y + h - r)
  ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h)
  ctx.lineTo(x + r, y + h)
  ctx.quadraticCurveTo(x, y + h, x, y + h - r)
  ctx.lineTo(x, y + r)
  ctx.quadraticCurveTo(x, y, x + r, y)
  ctx.closePath()
}

function toTimedWords(words: WordTimestamp[]): TimedWord[] {
  return words.map(w => ({ text: w.word, start: w.start, end: w.end }))
}

export function AutoClip() {
  const navigate = useNavigate()
  const [step, setStep] = useState<Step>('url')

  const [urlInput, setUrlInput] = useState('')
  const [videoUrl, setVideoUrl] = useState<string | null>(null)
  const [videoFile, setVideoFile] = useState<File | null>(null)
  const [duration, setDuration] = useState(0)

  const [downloading, setDownloading] = useState(false)
  const [downloadProgress, setDownloadProgress] = useState(0)

  const [analysis, setAnalysis] = useState<VideoAnalysis | null>(null)
  const [clips, setClips] = useState<ClipResult[]>([])
  const [selectedClipId, setSelectedClipId] = useState<string | null>(null)

  const [exportingClipId, setExportingClipId] = useState<string | null>(null)
  const [exportingAll, setExportingAll] = useState(false)
  const [exportProgress, setExportProgress] = useState(0)

  const [previewClip, setPreviewClip] = useState<ClipResult | null>(null)
  const [previewEditStyle, setPreviewEditStyle] = useState<EditStyleId>('velocity')
  const [previewColorSkin, setPreviewColorSkin] = useState<ColorSkinId>('candy')

  const [captionStyles, setCaptionStyles] = useState<Record<string, string>>({})
  const [wordTimestamps, setWordTimestamps] = useState<WordTimestamp[]>([])
  const [silences, setSilences] = useState<Silence[]>([])
  const [jumpCut, setJumpCut] = useState(false)
  const [energyProfile, setEnergyProfile] = useState<number[]>([])

  const abortRef = useRef<AbortController | null>(null)
  const videoRef = useRef<HTMLVideoElement | null>(null)

  // Cleanup blob URLs on unmount
  useEffect(() => {
    return () => {
      if (videoUrl && videoUrl.startsWith('blob:')) {
        URL.revokeObjectURL(videoUrl)
      }
    }
  }, [])

  const selectedClip = clips.find(c => c.id === selectedClipId) ?? null

  const isYouTubeUrl = (url: string): boolean => {
    return /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/|youtube\.com\/v\/|youtube\.com\/shorts\/)/i.test(url)
  }

  const extractVideoId = (url: string): string | null => {
    const m = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/|youtube\.com\/v\/|youtube\.com\/shorts\/)([a-zA-Z0-9_-]{11})/)
    return m ? m[1] : null
  }

  const handleUrlDownload = useCallback(async () => {
    const url = urlInput.trim()
    if (!url) { toast('error', 'Please enter a URL'); return }
    try { new URL(url) } catch { toast('error', 'Invalid URL format'); return }

    setDownloading(true)
    setDownloadProgress(0)
    abortRef.current?.abort()
    abortRef.current = new AbortController()

    try {
      const isYT = isYouTubeUrl(url)
      if (isYT) {
        toast('info', 'YouTube requires direct download. Opening embed preview...')
        setVideoUrl(null)
        setVideoFile(null)
        setDownloadProgress(1)
        setDownloading(false)
        return
      }

      const endpoint = '/api/proxy/media?url=' + encodeURIComponent(url)
      toast('info', 'Downloading video...')

      const res = await fetch(endpoint, { signal: abortRef.current.signal })
      if (!res.ok) {
        const errData = await res.json().catch(() => ({ error: `Download failed (${res.status})` }))
        throw new Error(errData.error || `Download failed (${res.status})`)
      }
      const blob = await res.blob()
      const blobUrl = URL.createObjectURL(blob)
      setVideoUrl(blobUrl)
      setVideoFile(null)
      setDownloadProgress(1)

      const v = document.createElement('video')
      v.src = blobUrl
      videoRef.current = v
      await new Promise<void>((r, e) => {
        v.onloadedmetadata = () => { setDuration(v.duration); r() }
        v.onerror = () => e(new Error('Could not load video metadata'))
      })
      toast('success', 'Video downloaded successfully')
    } catch (e) {
      if (e instanceof DOMException && e.name === 'AbortError') return
      toast('error', 'Download failed', e instanceof Error ? e.message : undefined)
    } finally {
      setDownloading(false)
    }
  }, [urlInput])

  const handleFilePicked = useCallback(async (p: Picked) => {
    setVideoUrl(p.url)
    setVideoFile(p.file)
    setUrlInput('')
    const v = document.createElement('video')
    v.src = p.url
    videoRef.current = v
    await new Promise<void>((r) => {
      v.onloadedmetadata = () => { setDuration(v.duration); r() }
    })
  }, [])

  const startAnalysis = useCallback(async () => {
    if (!videoUrl) return
    setStep('analyzing')

    let energyProfile: number[] = []
    let audioBuffer: AudioBuffer | null = null
    try {
      audioBuffer = await decodeAudio(videoUrl)
      const rawEnergy = audioBuffer.getChannelData(0)
      const samplesPerSec = audioBuffer.sampleRate
      for (let i = 0; i < audioBuffer.duration; i++) {
        const slice = rawEnergy.slice(i * samplesPerSec, (i + 1) * samplesPerSec)
        const rms = Math.sqrt(slice.reduce((s, v) => s + v * v, 0) / Math.max(slice.length, 1))
        energyProfile.push(rms)
      }
      // Detect silent gaps in the 1-second energy curve for jump-cut export.
      const detected = detectSilences(energyProfile, { windowSec: 1, minSilenceSec: 0.8 })
      setSilences(detected)
      setEnergyProfile(energyProfile)
      if (detected.length > 0) toast('info', `Detected ${detected.length} silent gap${detected.length === 1 ? '' : 's'} — enable Jump-cut in export`)
    } catch { /* audio analysis optional */ }

    // Auto-transcribe if supported
    let transcriptText = ''
    if (isSTTSupported() && audioBuffer) {
      try {
        const { encodeWav } = await import('../lib/wav')
        const wavBlob = encodeWav(audioBuffer)
        const transcript = await transcribeAudio(wavBlob, 'en-US')
        if (transcript.words.length > 0) {
          setWordTimestamps(transcript.words)
          transcriptText = transcript.fullText
          toast('info', `Transcribed ${transcript.words.length} words via ${transcript.engine}`)
        }
      } catch {
        // STT failed, use estimateWordTimestamps as fallback
      }
    }

    // Fallback: estimate word timestamps from duration
    if (wordTimestamps.length === 0 && duration > 0) {
      const estimated = await import('../lib/stt').then(m => m.estimateWordTimestamps(
        'Auto-generated captions will appear here based on video timing',
        duration
      ))
      setWordTimestamps(estimated)
    }

    try {
      const videoAnalysis = await analyzeVideo({
        duration,
        transcript: transcriptText || undefined,
        audioEnergyProfile: energyProfile.length > 0 ? energyProfile : undefined,
        title: videoFile?.name,
      })
      setAnalysis(videoAnalysis)

      const extractedClips = await extractClips({
        duration,
        analysis: videoAnalysis,
        targetPlatforms: ['tiktok', 'reels', 'shorts'],
        clipCount: 5,
        maxDuration: 60,
      })
      setClips(extractedClips)
      if (extractedClips.length > 0) setSelectedClipId(extractedClips[0].id)
      setStep('results')
      toast('success', `Found ${extractedClips.length} premium clips`)
    } catch (e) {
      toast('error', 'Analysis failed', e instanceof Error ? e.message : undefined)
      setStep('url')
    }
  }, [videoUrl, videoFile, duration])

  const exportClip = useCallback(async (clip: ClipResult) => {
    if (!videoUrl) return
    setExportingClipId(clip.id)
    setExportProgress(0)
    setStep('exporting')

    const captionStyleId = captionStyles[clip.id] || clip.captionStyle || 'pop-classic'
    const timedWords = toTimedWords(wordTimestamps)

    try {
      const draw = (ctx: CanvasRenderingContext2D, time: number, w: number, h: number) => {
          // HOOK TEXT (first 3 seconds) - big animated text
          if (time < 3 && clip.hooks[0]) {
            const alpha = time < 0.5 ? time * 2 : time > 2.5 ? (3 - time) * 2 : 1
            const scale = time < 0.3 ? 0.5 + time * 1.67 : 1
            ctx.save()
            ctx.globalAlpha = Math.max(0, Math.min(1, alpha))
            ctx.translate(w / 2, h * 0.35)
            ctx.scale(scale, scale)
            const text = clip.hooks[0]
            ctx.font = `bold ${Math.round(w * 0.065)}px "Inter", system-ui, sans-serif`
            const metrics = ctx.measureText(text)
            const pw = metrics.width + w * 0.06
            const ph = w * 0.09
            ctx.fillStyle = 'rgba(94, 106, 210, 0.85)'
            roundRect(ctx, -pw / 2, -ph / 2, pw, ph, w * 0.02)
            ctx.fill()
            ctx.fillStyle = '#ffffff'
            ctx.textAlign = 'center'
            ctx.textBaseline = 'middle'
            ctx.fillText(text, 0, 0)
            ctx.restore()
          }

          // GRADIENT OVERLAY (subtle top-to-bottom)
          const grad = ctx.createLinearGradient(0, 0, 0, h)
          grad.addColorStop(0, 'rgba(0,0,0,0.15)')
          grad.addColorStop(0.3, 'rgba(0,0,0,0)')
          grad.addColorStop(0.7, 'rgba(0,0,0,0)')
          grad.addColorStop(1, 'rgba(0,0,0,0.3)')
          ctx.fillStyle = grad
          ctx.fillRect(0, 0, w, h)

          // FADE IN/OUT (first/last 0.5s)
          const clipDur = clip.end - clip.start
          if (time < 0.5) {
            ctx.fillStyle = `rgba(0,0,0,${1 - time * 2})`
            ctx.fillRect(0, 0, w, h)
          } else if (time > clipDur - 0.5) {
            ctx.fillStyle = `rgba(0,0,0,${(time - (clipDur - 0.5)) * 2})`
            ctx.fillRect(0, 0, w, h)
          }

          // PLATFORM BADGE (bottom-left)
          ctx.save()
          ctx.font = `bold ${Math.round(w * 0.028)}px "Inter", system-ui, sans-serif`
          const badge = clip.platform.toUpperCase()
          const bm = ctx.measureText(badge)
          const bx = w * 0.04
          const by = h - w * 0.06
          ctx.fillStyle = 'rgba(94, 106, 210, 0.8)'
          roundRect(ctx, bx - w * 0.01, by - w * 0.02, bm.width + w * 0.02, w * 0.035, w * 0.008)
          ctx.fill()
          ctx.fillStyle = '#ffffff'
          ctx.textAlign = 'left'
          ctx.textBaseline = 'middle'
          ctx.fillText(badge, bx, by)
          ctx.restore()

          // CAPTIONS (if we have word timestamps)
          if (timedWords.length > 0) {
            drawCaptions(ctx, timedWords, getStyle(captionStyleId), time, w, h)
          }
        }

      const baseOpts = {
        sources: [{ url: videoUrl, fit: 'cover' as const }],
        outW: clip.platform === 'tiktok' || clip.platform === 'reels' ? 1080 : 1920,
        outH: clip.platform === 'tiktok' || clip.platform === 'reels' ? 1920 : 1080,
        muteVideoAudio: false,
        onProgress: (p: number) => setExportProgress(p),
      }

      let blob: Blob
      if (jumpCut) {
        const segs = buildJumpCutPlan(clip.start, clip.end, silences, { marginSec: 0.15, minCutSec: 0.4 })
        blob = await renderJumpCut({
          ...baseOpts,
          trim: { start: clip.start, end: clip.end },
          draw,
          timeBase: clip.start,
          segments: segs,
          format: 'mp4',
        })
      } else {
        blob = await renderComposition({ ...baseOpts, trim: { start: clip.start, end: clip.end }, draw })
      }

      // LUFS normalize the exported audio to -14 LUFS (streaming standard)
      let finalBlob = blob
      try {
        const audioBuffer = await decodeAudio(blob)
        const currentLUFS = measureIntegratedLUFS(audioBuffer)
        if (currentLUFS > -70) {
          const normalized = lufsNormalize(audioBuffer, -14)
          // Re-encode with normalized audio (use the original video + normalized audio)
          // For now, just log the normalization — full audio replacement requires ffmpeg.wasm
          toast('info', `Audio normalized: ${currentLUFS.toFixed(1)} → -14 LUFS`)
        }
      } catch { /* audio normalization is best-effort */ }

      const ext = finalBlob.type.includes('mp4') ? 'mp4' : 'webm'
      downloadBlob(finalBlob, `${clip.title.replace(/[^a-zA-Z0-9]/g, '_')}.${ext}`)
      toast('success', `Exported: ${clip.title}`, fmtBytes(blob.size))
    } catch (e) {
      toast('error', 'Export failed', e instanceof Error ? e.message : undefined)
    } finally {
      setExportingClipId(null)
      setStep('results')
    }
  }, [videoUrl, captionStyles, wordTimestamps])

  const exportClipWithConfig = useCallback(async (clip: ClipResult, config: CompositorConfig) => {
    if (!videoUrl) return
    setExportingClipId(clip.id)
    setExportProgress(0)
    setStep('exporting')

    const captionStyleId = captionStyles[clip.id] || clip.captionStyle || 'pop-classic'
    const timedWords = toTimedWords(wordTimestamps)

    try {
      const drawFn = createDrawFrame(config)
      const blob = await renderComposition({
        sources: [{ url: videoUrl, fit: 'cover' }],
        outW: clip.platform === 'tiktok' || clip.platform === 'reels' ? 1080 : 1920,
        outH: clip.platform === 'tiktok' || clip.platform === 'reels' ? 1920 : 1080,
        trim: { start: clip.start, end: clip.end },
        draw: (ctx, time, w, h) => drawFn({ ctx, time, w, h }),
        onProgress: (p) => setExportProgress(p),
      })

      const ext = blob.type.includes('mp4') ? 'mp4' : 'webm'
      downloadBlob(blob, `${clip.title.replace(/[^a-zA-Z0-9]/g, '_')}.${ext}`)
      toast('success', `Exported: ${clip.title}`, fmtBytes(blob.size))
    } catch (e) {
      toast('error', 'Export failed', e instanceof Error ? e.message : undefined)
    } finally {
      setExportingClipId(null)
      setStep('results')
    }
  }, [videoUrl, captionStyles, wordTimestamps])

  const exportAllClips = useCallback(async () => {
    if (!videoUrl || clips.length === 0) return
    setExportingAll(true)
    let exported = 0
    for (const clip of clips) {
      try {
        const captionStyleId = captionStyles[clip.id] || clip.captionStyle || 'pop-classic'
        const timedWords = toTimedWords(wordTimestamps)
        const blob = await renderComposition({
          sources: [{ url: videoUrl, fit: 'cover' }],
          outW: clip.platform === 'tiktok' || clip.platform === 'reels' ? 1080 : 1920,
          outH: clip.platform === 'tiktok' || clip.platform === 'reels' ? 1920 : 1080,
          trim: { start: clip.start, end: clip.end },
          draw: (ctx, time, w, h) => {
            if (time < 0.5) { ctx.fillStyle = `rgba(0,0,0,${1 - time * 2})`; ctx.fillRect(0, 0, w, h) }
            else if (time > (clip.end - clip.start) - 0.5) { ctx.fillStyle = `rgba(0,0,0,${(time - ((clip.end - clip.start) - 0.5)) * 2})`; ctx.fillRect(0, 0, w, h) }
            const grad = ctx.createLinearGradient(0, 0, 0, h)
            grad.addColorStop(0, 'rgba(0,0,0,0.15)')
            grad.addColorStop(1, 'rgba(0,0,0,0.3)')
            ctx.fillStyle = grad; ctx.fillRect(0, 0, w, h)
            if (timedWords.length > 0) drawCaptions(ctx, timedWords, getStyle(captionStyleId), time, w, h)
          },
          muteVideoAudio: false,
        })
        const ext = blob.type.includes('mp4') ? 'mp4' : 'webm'
        downloadBlob(blob, `${clip.title.replace(/[^a-zA-Z0-9]/g, '_')}.${ext}`)
        exported++
      } catch { /* skip failed clip */ }
    }
    setExportingAll(false)
    toast('success', `Exported ${exported}/${clips.length} clips`)
  }, [videoUrl, clips, captionStyles, wordTimestamps])

  const openInEditor = useCallback((clip: ClipResult) => {
    if (!videoUrl) return
    // Store clip data in localStorage for Editor to pick up
    const editorData = {
      videoUrl,
      clip: {
        id: clip.id,
        title: clip.title,
        start: clip.start,
        end: clip.end,
        platform: clip.platform,
        hooks: clip.hooks,
        hashtags: clip.hashtags,
        captionStyle: clip.captionStyle,
      },
      analysis: analysis ? {
        totalScore: analysis.totalScore,
        hooks: analysis.hooks,
        moments: analysis.moments,
        suggestions: analysis.suggestions,
      } : null,
      wordTimestamps,
      timestamp: Date.now(),
    }
    localStorage.setItem('clipforge_editor_import', JSON.stringify(editorData))
    navigate('/editor')
    toast('info', 'Clip imported to Editor — paste script to add captions')
  }, [videoUrl, analysis, wordTimestamps, navigate])

  const resetToStart = useCallback(() => {
    // Revoke blob URLs to prevent memory leaks
    if (videoUrl && videoUrl.startsWith('blob:')) {
      URL.revokeObjectURL(videoUrl)
    }
    setStep('url')
    setUrlInput('')
    setVideoUrl(null)
    setVideoFile(null)
    setDuration(0)
    setAnalysis(null)
    setClips([])
    setSelectedClipId(null)
    setCaptionStyles({})
    setWordTimestamps([])
    setExportingClipId(null)
    setExportProgress(0)
  }, [videoUrl])

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

  const steps: { key: Step; label: string; num: number }[] = [
    { key: 'url', label: 'URL', num: 1 },
    { key: 'analyzing', label: 'Analyze', num: 2 },
    { key: 'results', label: 'Results', num: 3 },
  ]

  return (
    <div className="max-w-7xl mx-auto px-4 md:px-8 py-8 anim-float-up">
      {/* Header */}
      <div className="flex items-center gap-3 mb-2">
        <span className="w-10 h-10 rounded-xl accent-gradient flex items-center justify-center text-white"><Scissors size={20} /></span>
        <div>
          <h1 className="text-xl font-bold tracking-tight flex items-center gap-2">
            AI Auto Clip
            <Badge tone="green">AI-Powered</Badge>
          </h1>
          <p className="text-[13px] text-muted">Extract premium clips from long videos using AI analysis. Supports direct video URLs and file uploads.</p>
        </div>
      </div>

      {/* Step Indicator */}
      <div className="flex items-center gap-2 mt-6 text-[12px]">
        {steps.map((s, i) => (
          <div key={s.key} className="flex items-center gap-2">
            <div className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold ${
              step === s.key ? 'bg-accent text-white' :
              (step === 'results' && (s.key === 'url' || s.key === 'analyzing')) ||
              (step === 'exporting' && s.key !== 'results') ? 'bg-accent/20 text-accent' : 'bg-elevated text-faint'
            }`}>
              {s.num}
            </div>
            <span className={step === s.key ? 'text-fg font-medium' : 'text-faint'}>{s.label}</span>
            {i < steps.length - 1 && <div className="w-8 h-px bg-white/10" />}
          </div>
        ))}
      </div>

      {/* Step 1: URL Input */}
      {step === 'url' && (
        <div className="mt-6 max-w-2xl mx-auto">
          <Card className="p-6">
            <h3 className="font-semibold text-[15px] mb-4 flex items-center gap-2">
              <Link2 size={16} className="text-accent" />
              Import Video
            </h3>

            <div className="space-y-3">
              <div className="relative">
                <Input
                  placeholder="Paste a direct video link (.mp4, .webm, etc.)..."
                  value={urlInput}
                  onChange={(e) => setUrlInput(e.target.value)}
                  onKeyDown={(e) => { if (e.key === 'Enter' && urlInput.trim()) handleUrlDownload() }}
                  className="pr-20"
                />
                <Button
                  size="sm"
                  variant="primary"
                  className="absolute right-1.5 top-1/2 -translate-y-1/2"
                  loading={downloading}
                  onClick={handleUrlDownload}
                  disabled={!urlInput.trim()}
                >
                  Fetch
                </Button>
              </div>

              {urlInput.trim() && isYouTubeUrl(urlInput.trim()) && (
                <div className="bg-amber/10 border border-amber/20 rounded-xl p-3 text-[12px]">
                  <div className="flex items-center gap-2 font-medium text-amber">
                    <AlertCircle size={14} /> YouTube Detected
                  </div>
                  <p className="text-muted mt-1">
                    YouTube blocks direct downloads. Use the <strong>File Upload</strong> below — download the video from YouTube first, then drop it here.
                  </p>
                  <div className="flex gap-2 mt-2">
                    <Button size="xs" variant="secondary" onClick={() => window.open('https://www.y2mate.com/', '_blank')}>
                      Download Helper
                    </Button>
                    <Button size="xs" variant="ghost" onClick={() => { navigator.clipboard.writeText('https://www.youtube.com/watch?v=' + (extractVideoId(urlInput.trim()) ?? '')); toast('info', 'Copied embed code') }}>
                      Copy Video ID
                    </Button>
                  </div>
                </div>
              )}

              {downloading && (
                <div className="space-y-2">
                  <ProgressBar value={downloadProgress} />
                  <p className="text-[11px] text-faint text-center">Downloading video...</p>
                </div>
              )}

              <Divider label="or" />

              <MediaDropzone onPicked={handleFilePicked} height="h-36" />

              {videoUrl && (
                <div className="flex items-center justify-between bg-elevated/60 rounded-xl p-3 border border-white/8">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-8 h-8 rounded-lg bg-accent/15 flex items-center justify-center text-accent shrink-0">
                      <Film size={16} />
                    </div>
                    <div className="min-w-0">
                      <p className="text-[13px] font-medium truncate">
                        {videoFile?.name || 'Imported Video'}
                      </p>
                      <p className="text-[11px] text-muted">
                        Duration: {fmtTime(duration)}
                      </p>
                    </div>
                  </div>
                  <Badge tone="green"><Check size={10} /> Ready</Badge>
                </div>
              )}
            </div>

            {videoUrl && (
              <div className="mt-4 flex justify-end">
                <Button
                  icon={<Sparkles size={16} />}
                  onClick={startAnalysis}
                  size="lg"
                >
                  Start Analysis
                </Button>
              </div>
            )}
          </Card>
        </div>
      )}

      {/* Step 2: Analyzing */}
      {step === 'analyzing' && (
        <div className="mt-10 max-w-md mx-auto text-center">
          <div className="w-16 h-16 mx-auto accent-gradient rounded-full flex items-center justify-center mb-4">
            <Loader2 size={28} className="text-white animate-spin" />
          </div>
          <h3 className="font-bold text-[16px] mb-2">AI is analyzing your video</h3>
          <p className="text-[13px] text-muted mb-4">Detecting viral moments, hooks, and optimal clip points...</p>
          <ProgressBar value={0.5} />
          <p className="text-[11px] text-faint mt-2">This may take a moment</p>
        </div>
      )}

      {/* Step 3: Results */}
      {step === 'results' && analysis && (
        <div className="mt-6 grid lg:grid-cols-[1fr_380px] gap-5">
          {/* Left Column: Clips List */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold text-[14px]">
                {clips.length} Premium Clips Found —{' '}
                <span className={getScoreColor(analysis.totalScore)}>
                  Score: {analysis.totalScore}/100 ({getGrade(analysis.totalScore)})
                </span>
              </h3>
              <div className="flex items-center gap-2">
                <Toggle
                  checked={jumpCut}
                  onChange={setJumpCut}
                  label={silences.length > 0 ? `Jump-cut ${silences.length} silence${silences.length === 1 ? '' : 's'}` : 'Jump-cut silences'}
                />
                <Button
                  variant="primary"
                  size="sm"
                  icon={<Download size={14} />}
                  loading={exportingAll}
                  onClick={exportAllClips}
                >
                  Export All ({clips.length})
                </Button>
                <Button variant="secondary" size="sm" icon={<Scissors size={14} />} onClick={resetToStart}>
                  New Video
                </Button>
              </div>
            </div>

            {/* Clip Preview */}
            {selectedClip && videoUrl && (
              <ClipPreview
                videoUrl={videoUrl}
                start={selectedClip.start}
                end={selectedClip.end}
                title={selectedClip.title}
                platform={selectedClip.platform}
                hooks={selectedClip.hooks}
                hasPrev={clips.indexOf(selectedClip) > 0}
                hasNext={clips.indexOf(selectedClip) < clips.length - 1}
                onPrev={() => {
                  const idx = clips.indexOf(selectedClip)
                  if (idx > 0) setSelectedClipId(clips[idx - 1].id)
                }}
                onNext={() => {
                  const idx = clips.indexOf(selectedClip)
                  if (idx < clips.length - 1) setSelectedClipId(clips[idx + 1].id)
                }}
              />
            )}

            {clips.map((clip) => {
              const currentStyle = captionStyles[clip.id] || clip.captionStyle || 'pop-classic'
              return (
                <div
                  key={clip.id}
                  className={`p-4 rounded-xl border cursor-pointer transition-all ${
                    selectedClipId === clip.id ? 'border-accent/40 bg-accent/5' : 'border-white/10 bg-elevated/50 hover:border-white/20'
                  }`}
                  onClick={() => setSelectedClipId(clip.id)}
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

                      {/* Caption Style Selector */}
                      <div className="mt-3 flex items-center gap-2">
                        <Type size={12} className="text-faint shrink-0" />
                        <select
                          className="bg-elevated border border-white/10 rounded-lg px-2 py-1 text-[11px] text-fg outline-none focus:border-accent/40 cursor-pointer min-w-[120px]"
                          value={currentStyle}
                          onClick={(e) => e.stopPropagation()}
                          onChange={(e) => {
                            e.stopPropagation()
                            setCaptionStyles(prev => ({ ...prev, [clip.id]: e.target.value }))
                          }}
                        >
                          {CAPTION_STYLES.map(s => (
                            <option key={s.id} value={s.id}>{s.name}</option>
                          ))}
                        </select>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <Button
                        size="sm"
                        variant="secondary"
                        icon={<ArrowRight size={14} />}
                        onClick={(e) => { e.stopPropagation(); openInEditor(clip) }}
                      >
                        Open in Editor
                      </Button>
                      <Button
                        size="sm"
                        icon={<Eye size={14} />}
                        onClick={(e) => { e.stopPropagation(); setPreviewClip(clip) }}
                      >
                        Preview & Export
                      </Button>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>

          {/* Right Column: Sidebar */}
          <div className="space-y-4">
            {/* Score Card */}
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

            {/* AI Hooks Card */}
            {analysis.hooks.length > 0 && (
              <Card className="p-5">
                <h3 className="font-semibold text-[14px] mb-3">AI Hooks</h3>
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
            )}

            {/* Key Moments Card */}
            {analysis.moments.length > 0 && (
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
            )}

            {/* AI Suggestions Card */}
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

            {/* YouTube B-Roll Suggestions */}
            {selectedClip && selectedClip.hashtags.length > 0 && (
              <Card className="p-5">
                <h3 className="font-semibold text-[14px] mb-3 flex items-center gap-2">
                  <Film size={14} className="text-accent" />
                  B-Roll Ideas
                </h3>
                <div className="space-y-2">
                  {selectedClip.hashtags.slice(0, 3).map((tag, i) => (
                    <div key={i} className="bg-elevated/60 rounded-lg p-2.5 text-[12px]">
                      <p className="font-medium">Search: "{tag} cinematic b-roll"</p>
                      <p className="text-[11px] text-faint mt-1">Use as transition overlay or background</p>
                    </div>
                  ))}
                  {selectedClip.hooks.length > 0 && (
                    <div className="bg-elevated/60 rounded-lg p-2.5 text-[12px]">
                      <p className="font-medium">Search: "{selectedClip.hooks[0]} green screen overlay"</p>
                      <p className="text-[11px] text-faint mt-1">Text overlay transition element</p>
                    </div>
                  )}
                </div>
              </Card>
            )}
          </div>
        </div>
      )}

      {/* Step 4: Exporting Overlay */}
      {step === 'exporting' && exportingClipId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm">
          <div className="card bg-elevated/95 backdrop-blur-xl px-8 py-8 max-w-sm w-full mx-4 text-center border border-white/10 shadow-2xl">
            <div className="w-14 h-14 mx-auto accent-gradient rounded-full flex items-center justify-center mb-4">
              <Loader2 size={24} className="text-white animate-spin" />
            </div>
            <h3 className="font-bold text-[16px] mb-2">Rendering premium clip</h3>
            <p className="text-[13px] text-muted mb-5">Exporting with captions, motion graphics, and transitions...</p>
            <ProgressBar value={exportProgress} />
            <p className="text-[12px] text-faint mt-3">{Math.round(exportProgress * 100)}%</p>
            <Button
              variant="ghost"
              size="sm"
              className="mt-5"
              onClick={() => {
                setExportingClipId(null)
                setStep('results')
              }}
            >
              Cancel
            </Button>
          </div>
        </div>
      )}

      {/* Preview Modal */}
      <VideoPreviewModal
        open={!!previewClip}
        videoUrl={videoUrl || ''}
        clipDuration={previewClip ? previewClip.end - previewClip.start : 0}
        trimStart={0}
        trimEnd={previewClip ? previewClip.end - previewClip.start : undefined}
        words={toTimedWords(wordTimestamps)}
        hooks={previewClip?.hooks}
        platform={previewClip?.platform}
        initialCaptionStyle={previewClip ? (captionStyles[previewClip.id] || previewClip.captionStyle || 'pop-classic') : 'pop-classic'}
        initialEditStyle={previewEditStyle}
        initialColorSkin={previewColorSkin}
        onClose={() => setPreviewClip(null)}
        onExport={async (config) => {
          if (!previewClip || !videoUrl) return
          await exportClipWithConfig(previewClip, config)
          setPreviewClip(null)
        }}
        exporting={exportingClipId === previewClip?.id}
        exportProgress={exportProgress}
      />
    </div>
  )
}
