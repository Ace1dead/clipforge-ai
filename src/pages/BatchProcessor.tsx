import { useState, useCallback, useRef } from 'react'
import { Upload, Play, Pause, Trash2, Download, Loader2, Check, AlertCircle, Film, X, Wand2, Sparkles } from 'lucide-react'
import { MediaDropzone } from '../components/MediaDropzone'
import type { Picked } from '../components/MediaDropzone'
import { Button, Card, ProgressBar, Badge, toast, Select } from '../components/ui'
import { decodeAudio, detectBeats } from '../lib/audio'
import { renderComposition } from '../lib/video'
import { fmtTime, downloadBlob, fmtBytes } from '../lib/format'
import { analyzeVideo, extractClips, type VideoAnalysis, type ClipResult } from '../lib/aiEngine'
import { drawCaptions, getStyle, CAPTION_STYLES, type TimedWord } from '../lib/captions'
import { EDIT_STYLES, type EditStyleId, type ColorSkinId } from '../lib/editStyles'
import { composeEffects, screenShake, chromaticAberration, vignette, filmGrain, createEffectContext, COLOR_SKINS } from '../lib/effects'

type JobStatus = 'queued' | 'analyzing' | 'clips' | 'exporting' | 'done' | 'error'

interface BatchJob {
  id: string
  file: File
  url: string
  status: JobStatus
  progress: number
  duration: number
  analysis: VideoAnalysis | null
  clips: ClipResult[]
  exportedClips: number
  error: string | null
}

export function BatchProcessor() {
  const [jobs, setJobs] = useState<BatchJob[]>([])
  const [processing, setProcessing] = useState(false)
  const [editStyle, setEditStyle] = useState<EditStyleId>('velocity')
  const [colorSkin, setColorSkin] = useState<ColorSkinId>('candy')
  const abortRef = useRef<AbortController | null>(null)

  const addFiles = useCallback((picked: Picked) => {
    const job: BatchJob = {
      id: crypto.randomUUID(),
      file: picked.file,
      url: picked.url,
      status: 'queued',
      progress: 0,
      duration: 0,
      analysis: null,
      clips: [],
      exportedClips: 0,
      error: null,
    }
    setJobs(prev => [...prev, job])
    toast('info', `Added: ${picked.file.name}`)
  }, [])

  const removeJob = (id: string) => {
    setJobs(prev => prev.filter(j => j.id !== id))
  }

  const updateJob = (id: string, update: Partial<BatchJob>) => {
    setJobs(prev => prev.map(j => j.id === id ? { ...j, ...update } : j))
  }

  const processQueue = useCallback(async () => {
    setProcessing(true)
    abortRef.current = new AbortController()

    const queuedJobs = jobs.filter(j => j.status === 'queued' || j.status === 'error')
    for (const job of queuedJobs) {
      if (abortRef.current.signal.aborted) break

      try {
        // Step 1: Get duration
        updateJob(job.id, { status: 'analyzing', progress: 0.1 })
        const v = document.createElement('video')
        v.src = job.url
        const duration = await new Promise<number>((resolve, reject) => {
          v.onloadedmetadata = () => resolve(v.duration)
          v.onerror = () => reject(new Error('Could not load video'))
          setTimeout(() => reject(new Error('Timeout')), 15000)
        })
        updateJob(job.id, { duration })

        // Step 2: AI analysis + beat detection
        updateJob(job.id, { progress: 0.3 })
        let energyProfile: number[] = []
        let beatData: { bpm: number; beatTimes: number[]; confidence: number } | null = null
        try {
          const audioBuffer = await decodeAudio(job.url)
          const rawEnergy = audioBuffer.getChannelData(0)
          const samplesPerSec = audioBuffer.sampleRate
          for (let i = 0; i < audioBuffer.duration; i++) {
            const slice = rawEnergy.slice(i * samplesPerSec, (i + 1) * samplesPerSec)
            const rms = Math.sqrt(slice.reduce((s, v) => s + v * v, 0) / Math.max(slice.length, 1))
            energyProfile.push(rms)
          }
          beatData = detectBeats(audioBuffer)
        } catch { /* audio optional */ }

        const analysis = await analyzeVideo({
          duration,
          audioEnergyProfile: energyProfile.length > 0 ? energyProfile : undefined,
          title: job.file.name,
        })
        updateJob(job.id, { analysis, progress: 0.5 })

        // Step 3: Extract clips
        const clips = await extractClips({
          duration,
          analysis,
          targetPlatforms: ['tiktok', 'reels', 'shorts'],
          clipCount: 5,
          maxDuration: 60,
        })
        updateJob(job.id, { clips, status: 'clips', progress: 0.6 })

        // Step 4: Auto-export top 3 clips
        let exported = 0
        const topClips = clips.slice(0, 3)
        for (const clip of topClips) {
          if (abortRef.current.signal.aborted) break
          updateJob(job.id, { progress: 0.6 + (exported / topClips.length) * 0.4 })

          try {
            const style = EDIT_STYLES[editStyle]
            const skin = COLOR_SKINS[colorSkin]
            const clipDuration = clip.end - clip.start

            // Build effects pipeline
            const effects = []
            if (style.screenShake.enabled) effects.push(screenShake(style.screenShake.intensity, style.screenShake.frequency))
            if (style.chromaticAberration.enabled) effects.push(chromaticAberration(style.chromaticAberration.offset))
            if (style.vignette.enabled) effects.push(vignette(style.vignette.strength, style.vignette.radius))
            if (style.filmGrain.enabled) effects.push(filmGrain(style.filmGrain.intensity))
            const composedEffects = effects.length > 0 ? composeEffects(...effects) : null

            const blob = await renderComposition({
              sources: [{ url: job.url, fit: 'cover' }],
              outW: clip.platform === 'tiktok' || clip.platform === 'reels' ? 1080 : 1920,
              outH: clip.platform === 'tiktok' || clip.platform === 'reels' ? 1920 : 1080,
              trim: { start: clip.start, end: clip.end },
              draw: (ctx, time, w, h) => {
                // Fade in/out
                if (time < 0.5) { ctx.fillStyle = `rgba(0,0,0,${1 - time * 2})`; ctx.fillRect(0, 0, w, h) }
                else if (time > clipDuration - 0.5) { ctx.fillStyle = `rgba(0,0,0,${(time - (clipDuration - 0.5)) * 2})`; ctx.fillRect(0, 0, w, h) }

                // Apply edit style effects
                if (composedEffects) {
                  const ec = createEffectContext(ctx, time, w, h, 0, beatData?.bpm ?? 120)
                  composedEffects(ec, () => {
                    // Inner draw: gradient overlay
                    const grad = ctx.createLinearGradient(0, 0, 0, h)
                    grad.addColorStop(0, 'rgba(0,0,0,0.15)')
                    grad.addColorStop(1, 'rgba(0,0,0,0.3)')
                    ctx.fillStyle = grad
                    ctx.fillRect(0, 0, w, h)
                    // Color skin overlay
                    if (skin) {
                      ctx.globalAlpha = 0.08
                      ctx.fillStyle = skin.shadows
                      ctx.fillRect(0, 0, w, h)
                      ctx.globalAlpha = 1
                    }
                  })
                } else {
                  // No effects - just draw directly
                  const grad = ctx.createLinearGradient(0, 0, 0, h)
                  grad.addColorStop(0, 'rgba(0,0,0,0.15)')
                  grad.addColorStop(1, 'rgba(0,0,0,0.3)')
                  ctx.fillStyle = grad
                  ctx.fillRect(0, 0, w, h)
                  if (skin) {
                    ctx.globalAlpha = 0.08
                    ctx.fillStyle = skin.shadows
                    ctx.fillRect(0, 0, w, h)
                    ctx.globalAlpha = 1
                  }
                }
              },
              muteVideoAudio: false,
            })
            const ext = blob.type.includes('mp4') ? 'mp4' : 'webm'
            downloadBlob(blob, `${clip.title.replace(/[^a-zA-Z0-9]/g, '_')}.${ext}`)
            exported++
            updateJob(job.id, { exportedClips: exported })
          } catch { /* skip failed clip */ }
        }

        updateJob(job.id, { status: 'done', progress: 1 })
        toast('success', `Done: ${job.file.name} — ${exported} clips exported`)
      } catch (e) {
        updateJob(job.id, { status: 'error', error: e instanceof Error ? e.message : 'Unknown error' })
        toast('error', `Failed: ${job.file.name}`, e instanceof Error ? e.message : undefined)
      }
    }

    setProcessing(false)
  }, [jobs])

  const stopProcessing = () => {
    abortRef.current?.abort()
    setProcessing(false)
  }

  const clearCompleted = () => {
    setJobs(prev => prev.filter(j => j.status !== 'done'))
  }

  const statusIcon = (status: JobStatus) => {
    switch (status) {
      case 'queued': return <div className="w-5 h-5 rounded-full border-2 border-faint/40" />
      case 'analyzing': return <Loader2 size={16} className="animate-spin text-accent" />
      case 'clips': return <Sparkles size={16} className="text-accent" />
      case 'exporting': return <Download size={16} className="text-accent" />
      case 'done': return <Check size={16} className="text-green" />
      case 'error': return <AlertCircle size={16} className="text-red" />
    }
  }

  const statusLabel = (status: JobStatus) => {
    switch (status) {
      case 'queued': return 'Queued'
      case 'analyzing': return 'Analyzing...'
      case 'clips': return 'Clips found'
      case 'exporting': return 'Exporting...'
      case 'done': return 'Done'
      case 'error': return 'Failed'
    }
  }

  const queued = jobs.filter(j => j.status === 'queued').length
  const done = jobs.filter(j => j.status === 'done').length
  const errors = jobs.filter(j => j.status === 'error').length

  return (
    <div className="max-w-5xl mx-auto px-4 md:px-8 py-8 anim-float-up">
      <div className="flex items-center gap-3 mb-2">
        <span className="w-10 h-10 rounded-xl accent-gradient flex items-center justify-center text-white"><Film size={20} /></span>
        <div>
          <h1 className="text-xl font-bold tracking-tight flex items-center gap-2">
            Batch Processor
            <Badge tone="accent">{jobs.length} videos</Badge>
          </h1>
          <p className="text-[13px] text-muted">Add multiple videos, let AI analyze them all, and auto-export the best clips.</p>
        </div>
      </div>

      {/* Upload Zone */}
      <Card className="p-4 mt-6">
        <MediaDropzone onPicked={addFiles} height="h-28" />
        <p className="text-[11px] text-faint mt-2 text-center">Drop files to add to batch queue — all processing happens in your browser</p>
      </Card>

      {/* Edit Style Selection */}
      <div className="flex items-center gap-3 mt-4">
        <div className="flex items-center gap-2">
          <Wand2 size={14} className="text-accent" />
          <span className="text-[12px] font-medium text-muted">Edit Style:</span>
        </div>
        <Select value={editStyle} onChange={e => setEditStyle(e.target.value as EditStyleId)}>
          {Object.values(EDIT_STYLES).map(s => (
            <option key={s.id} value={s.id}>{s.name}</option>
          ))}
        </Select>
        <span className="text-[12px] font-medium text-muted ml-2">Color:</span>
        <Select value={colorSkin} onChange={e => setColorSkin(e.target.value as ColorSkinId)}>
          {Object.entries(COLOR_SKINS).map(([id, s]) => (
            <option key={id} value={id}>{s.name}</option>
          ))}
        </Select>
      </div>

      {/* Queue Stats */}
      {jobs.length > 0 && (
        <div className="flex items-center gap-4 mt-4 text-[12px]">
          <span className="text-muted"><strong className="text-fg">{jobs.length}</strong> total</span>
          <span className="text-muted"><strong className="text-fg">{queued}</strong> queued</span>
          {done > 0 && <span className="text-green"><strong>{done}</strong> completed</span>}
          {errors > 0 && <span className="text-red"><strong>{errors}</strong> failed</span>}
          <div className="flex-1" />
          {processing ? (
            <Button size="sm" variant="danger" icon={<Pause size={14} />} onClick={stopProcessing}>Stop</Button>
          ) : (
            <Button size="sm" variant="primary" icon={<Play size={14} />} onClick={processQueue} disabled={queued === 0}>
              Process {queued} videos
            </Button>
          )}
          {done > 0 && (
            <Button size="sm" variant="ghost" icon={<Trash2 size={14} />} onClick={clearCompleted}>Clear done</Button>
          )}
        </div>
      )}

      {/* Job List */}
      <div className="space-y-2 mt-4">
        {jobs.map(job => (
          <Card key={job.id} className="p-4">
            <div className="flex items-center gap-3">
              <div className="shrink-0">{statusIcon(job.status)}</div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <p className="text-[13px] font-medium truncate">{job.file.name}</p>
                  <Badge tone={job.status === 'done' ? 'green' : job.status === 'error' ? 'red' : 'neutral'}>
                    {statusLabel(job.status)}
                  </Badge>
                </div>
                {job.duration > 0 && <p className="text-[11px] text-faint">{fmtTime(job.duration)} · {fmtBytes(job.file.size)}</p>}
                {job.status === 'error' && job.error && <p className="text-[11px] text-red mt-1">{job.error}</p>}
                {job.status === 'done' && <p className="text-[11px] text-green mt-1">{job.exportedClips} clips exported</p>}
              </div>
              <div className="shrink-0 flex items-center gap-1">
                {job.clips.length > 0 && job.status === 'done' && (
                  <Badge tone="accent">{job.clips.length} clips</Badge>
                )}
                {(job.status === 'queued' || job.status === 'error') && (
                  <button onClick={() => removeJob(job.id)} className="p-1 text-faint hover:text-red cursor-pointer">
                    <X size={14} />
                  </button>
                )}
              </div>
            </div>
            {(job.status === 'analyzing' || job.status === 'clips' || job.status === 'exporting') && (
              <ProgressBar value={job.progress} className="mt-2" />
            )}
          </Card>
        ))}
      </div>

      {jobs.length === 0 && (
        <div className="mt-12 text-center text-muted">
          <Film size={40} className="mx-auto mb-3 text-faint/50" />
          <p className="text-[14px] font-medium">No videos in queue</p>
          <p className="text-[12px] text-faint mt-1">Drop files above to start batch processing</p>
        </div>
      )}
    </div>
  )
}
