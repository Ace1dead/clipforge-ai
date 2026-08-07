import { useState, useRef, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { Upload, Film, Loader2, Scissors, Sparkles, Play, Check, ArrowRight, Clock, FileText, Layers, ChevronDown, ChevronUp } from 'lucide-react'
import { MediaDropzone } from '../components/MediaDropzone'
import type { Picked } from '../components/MediaDropzone'
import { Button, Card, ProgressBar, toast } from '../components/ui'
import { videoMeta } from '../lib/video'
import { decodeAudio } from '../lib/audio'
import { splitAudioIntoChunks, mergeChunkTranscripts, transcribeChunk, type MovieTranscript } from '../lib/editor/movieTranscribe'
import { summarizeChunk, buildMovieOutline, generateCutPlan, type ChunkSummary, type MovieOutline, type CutPlan } from '../lib/editor/movieSummarizer'
import { refineCutBoundaries, type RefinedCutSegment } from '../lib/editor/cutPlanner'
import { buildMovieTimeline, type MovieCutResult } from '../lib/editor/movieTimelineBuilder'
import { fmtTime } from '../lib/format'

type Step = 'upload' | 'transcribing' | 'summarizing' | 'cutting' | 'results'

export function MovieSummarizer() {
  const navigate = useNavigate()
  const [step, setStep] = useState<Step>('upload')
  const [progress, setProgress] = useState(0)
  const [progressLabel, setProgressLabel] = useState('')

  // File state
  const [videoUrl, setVideoUrl] = useState<string | null>(null)
  const [videoFile, setVideoFile] = useState<File | null>(null)
  const [duration, setDuration] = useState(0)

  // Results
  const [transcript, setTranscript] = useState<MovieTranscript | null>(null)
  const [chunkSummaries, setChunkSummaries] = useState<ChunkSummary[]>([])
  const [outline, setOutline] = useState<MovieOutline | null>(null)
  const [cutPlan, setCutPlan] = useState<CutPlan | null>(null)
  const [refinedSegments, setRefinedSegments] = useState<RefinedCutSegment[]>([])
  const [cutResult, setCutResult] = useState<MovieCutResult | null>(null)

  // UI state
  const [targetMinutes, setTargetMinutes] = useState(5)
  const [showSummary, setShowSummary] = useState(false)
  const [showCutPlan, setShowCutPlan] = useState(false)
  const [processing, setProcessing] = useState(false)

  const abortRef = useRef<AbortController | null>(null)

  // ── Step 1: File Import ──────────────────────────────────
  const handleFile = useCallback(async (p: Picked) => {
    setVideoFile(p.file)
    setVideoUrl(p.url)
    const meta = await videoMeta(p.url).catch(() => ({ duration: 0, width: 1080, height: 1920 }))
    setDuration(Math.max(5, meta.duration))
    toast('success', 'Video loaded', `${fmtTime(meta.duration)} — ready to summarize`)
  }, [])

  // ── Step 2: Transcribe ───────────────────────────────────
  const startTranscription = useCallback(async () => {
    if (!videoUrl || !videoFile) return
    setProcessing(true)
    setStep('transcribing')
    setProgress(0)
    setProgressLabel('Decoding audio...')

    try {
      // Decode audio
      const audioCtx = new AudioContext()
      const arrayBuf = await videoFile.arrayBuffer()
      const audioBuf = await audioCtx.decodeAudioData(arrayBuf)

      // Split into chunks
      const chunks = splitAudioIntoChunks(duration, 300, { overlapSec: 10 })
      setProgressLabel(`Transcribing ${chunks.length} chunks...`)

      // Transcribe each chunk
      const transcripts = []
      try {
        for (let i = 0; i < chunks.length; i++) {
          setProgress(((i) / chunks.length) * 40) // 0-40% for transcription
          setProgressLabel(`Transcribing chunk ${i + 1}/${chunks.length}...`)
          const ct = await transcribeChunk(audioCtx, audioBuf, chunks[i], { signal: abortRef.current?.signal })
          transcripts.push(ct)
        }
      } finally {
        audioCtx.close()
      }

      // Merge transcripts
      setProgress(40)
      setProgressLabel('Merging transcripts...')
      const merged = mergeChunkTranscripts(chunks, transcripts)
      setTranscript(merged)

      // Step 3: Summarize
      setStep('summarizing')
      setProgress(40)
      setProgressLabel('AI: Summarizing chunks...')

      const summaries: ChunkSummary[] = []
      for (let i = 0; i < chunks.length; i++) {
        setProgress(40 + ((i / chunks.length) * 20)) // 40-60%
        setProgressLabel(`AI: Summarizing chunk ${i + 1}/${chunks.length}...`)

        const chunkWords = merged.words.filter(w => w.start >= chunks[i].start && w.end <= chunks[i].end)
        const chunkText = chunkWords.map(w => w.word).join(' ')

        if (chunkText.trim().length > 10) {
          const summary = await summarizeChunk({
            chunkIndex: i,
            chunkStart: chunks[i].start,
            chunkEnd: chunks[i].end,
            transcript: chunkText,
            language: merged.language,
          })
          summaries.push(summary)
        }
      }
      setChunkSummaries(summaries)

      // Build outline
      setProgress(60)
      setProgressLabel('AI: Building movie outline...')
      const movieOutline = await buildMovieOutline({
        chunkSummaries: summaries,
        totalDuration: duration,
        title: videoFile?.name.replace(/\.[^.]+$/, '') ?? 'Movie',
      })
      setOutline(movieOutline)

      // Step 4: Generate cut plan
      setStep('cutting')
      setProgress(70)
      setProgressLabel('AI: Generating cut plan...')

      const targetSec = targetMinutes * 60
      const plan = await generateCutPlan({
        outline: movieOutline,
        totalDuration: duration,
        targetDuration: targetSec,
        transcript: merged.words,
      })
      setCutPlan(plan)

      // Refine boundaries
      setProgress(85)
      setProgressLabel('Refining cut boundaries...')
      const refined = refineCutBoundaries(plan.segments, merged.words, duration)
      setRefinedSegments(refined)

      // Build timeline
      setProgress(95)
      setProgressLabel('Building timeline...')
      const result = buildMovieTimeline(refined, videoUrl, duration)
      setCutResult(result)

      setProgress(100)
      setProgressLabel('Done!')
      setStep('results')
      toast('success', 'Movie summarized', `${result.clipCount} clips, ${fmtTime(result.totalKeepDuration)} kept`)
    } catch (e) {
      toast('error', 'Processing failed', e instanceof Error ? e.message : 'Unknown error')
      setStep('upload')
    } finally {
      setProcessing(false)
    }
  }, [videoUrl, videoFile, duration, targetMinutes])

  // ── Send to Editor ───────────────────────────────────────
  const sendToEditor = useCallback(() => {
    if (!cutResult || !videoUrl) return
    try {
      localStorage.setItem('cf_movie_timeline', JSON.stringify({
        timeline: cutResult.timeline,
        sourceUrl: videoUrl,
        outline: outline,
        cutPlan: cutPlan,
      }))
      navigate('/editor/new')
    } catch {
      toast('error', 'Failed to send to editor')
    }
  }, [cutResult, videoUrl, outline, cutPlan, navigate])

  // ── Render ───────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-dark-base p-4 md:p-6 max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <Button variant="ghost" size="sm" onClick={() => navigate(-1)}>← Back</Button>
        <Film size={20} className="text-accent" />
        <h1 className="text-lg font-bold text-primary">Movie Summarizer</h1>
      </div>

      {/* Progress Bar */}
      {(step === 'transcribing' || step === 'summarizing' || step === 'cutting') && (
        <Card className="mb-6">
          <div className="flex items-center gap-3 mb-3">
            <Loader2 size={16} className="animate-spin text-accent" />
            <span className="text-sm font-medium text-primary">{progressLabel}</span>
          </div>
          <ProgressBar value={progress} />
        </Card>
      )}

      {/* Step 1: Upload */}
      {step === 'upload' && (
        <Card className="mb-6">
          <h2 className="text-sm font-semibold text-primary mb-3 flex items-center gap-2">
            <Upload size={14} /> Import Movie
          </h2>
          <MediaDropzone
            type="video"
            label="Upload a movie file (MP4, WebM, MKV)"
            height="h-40"
            onPicked={(p) => void handleFile(p)}
          />

          {videoUrl && (
            <div className="mt-4 space-y-3">
              <div className="flex items-center gap-2 text-xs text-dim">
                <Film size={12} />
                <span>{videoFile?.name}</span>
                <span className="text-faint">·</span>
                <Clock size={12} />
                <span>{fmtTime(duration)}</span>
              </div>

              {/* Target duration */}
              <div className="flex items-center gap-3">
                <label className="text-xs text-dim">Target summary length:</label>
                <select
                  value={targetMinutes}
                  onChange={(e) => setTargetMinutes(Number(e.target.value))}
                  className="bg-dark-elevated border border-white/10 rounded px-2 py-1 text-xs text-primary"
                >
                  <option value={1}>1 minute</option>
                  <option value={2}>2 minutes</option>
                  <option value={3}>3 minutes</option>
                  <option value={5}>5 minutes</option>
                  <option value={10}>10 minutes</option>
                  <option value={15}>15 minutes</option>
                </select>
              </div>

              <Button
                variant="primary"
                onClick={() => void startTranscription()}
                disabled={processing}
                icon={<Scissors size={14} />}
              >
                {processing ? 'Processing...' : 'Summarize Movie'}
              </Button>
            </div>
          )}
        </Card>
      )}

      {/* Step 2-4: Processing (shown via progress bar above) */}

      {/* Step 5: Results */}
      {step === 'results' && cutResult && (
        <div className="space-y-4">
          {/* Stats */}
          <Card>
            <h2 className="text-sm font-semibold text-primary mb-3 flex items-center gap-2">
              <Check size={14} className="text-green-400" /> Summary Complete
            </h2>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-center">
              <div className="bg-dark-elevated rounded-lg p-3">
                <div className="text-lg font-bold text-accent">{cutResult.clipCount}</div>
                <div className="text-[10px] text-dim">Clips</div>
              </div>
              <div className="bg-dark-elevated rounded-lg p-3">
                <div className="text-lg font-bold text-accent">{fmtTime(cutResult.totalKeepDuration)}</div>
                <div className="text-[10px] text-dim">Kept</div>
              </div>
              <div className="bg-dark-elevated rounded-lg p-3">
                <div className="text-lg font-bold text-red-400">{fmtTime(cutResult.totalDiscardDuration)}</div>
                <div className="text-[10px] text-dim">Removed</div>
              </div>
              <div className="bg-dark-elevated rounded-lg p-3">
                <div className="text-lg font-bold text-accent">{Math.round((cutResult.totalKeepDuration / duration) * 100)}%</div>
                <div className="text-[10px] text-dim">Keep ratio</div>
              </div>
            </div>
          </Card>

          {/* Outline Summary */}
          {outline && (
            <Card>
              <button
                className="w-full flex items-center justify-between text-left"
                onClick={() => setShowSummary(!showSummary)}
              >
                <h2 className="text-sm font-semibold text-primary flex items-center gap-2">
                  <FileText size={14} /> Movie Outline
                </h2>
                {showSummary ? <ChevronUp size={14} className="text-dim" /> : <ChevronDown size={14} className="text-dim" />}
              </button>
              {showSummary && (
                <div className="mt-3 space-y-3">
                  <p className="text-xs text-dim">{outline.summary}</p>
                  <div className="space-y-2">
                    {outline.acts.map((act, i) => (
                      <div key={i} className="bg-dark-elevated rounded p-2">
                        <div className="text-xs font-medium text-primary">Act {act.actNumber}: {act.name}</div>
                        <div className="text-[10px] text-dim mt-1">{act.description}</div>
                        <div className="flex flex-wrap gap-1 mt-1">
                          {act.keyEvents.map((ev, j) => (
                            <span key={j} className="text-[9px] bg-white/5 rounded px-1 py-0.5 text-faint">{ev}</span>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                  {outline.keyScenes.length > 0 && (
                    <div>
                      <div className="text-[10px] text-dim mb-1">Key Scenes:</div>
                      <div className="space-y-1">
                        {outline.keyScenes.map((scene, i) => (
                          <div key={i} className="flex items-center gap-2 text-[10px]">
                            <span className={`px-1 rounded text-[8px] font-bold ${
                              scene.importance === 'critical' ? 'bg-red-500/20 text-red-400' :
                              scene.importance === 'high' ? 'bg-orange-500/20 text-orange-400' :
                              'bg-white/5 text-faint'
                            }`}>{scene.importance.toUpperCase()}</span>
                            <span className="text-dim">{scene.description}</span>
                            <span className="text-faint ml-auto">{fmtTime(scene.estimatedTimeRange[0])}-{fmtTime(scene.estimatedTimeRange[1])}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </Card>
          )}

          {/* Cut Plan */}
          {cutPlan && (
            <Card>
              <button
                className="w-full flex items-center justify-between text-left"
                onClick={() => setShowCutPlan(!showCutPlan)}
              >
                <h2 className="text-sm font-semibold text-primary flex items-center gap-2">
                  <Scissors size={14} /> Cut Plan
                </h2>
                {showCutPlan ? <ChevronUp size={14} className="text-dim" /> : <ChevronDown size={14} className="text-dim" />}
              </button>
              {showCutPlan && (
                <div className="mt-3 space-y-1 max-h-60 overflow-y-auto">
                  {refinedSegments.map((seg, i) => (
                    <div key={i} className={`flex items-center gap-2 text-[10px] px-2 py-1 rounded ${
                      seg.action === 'keep' ? 'bg-green-500/10' : 'bg-red-500/10'
                    }`}>
                      <span className={`w-12 text-center font-bold ${
                        seg.action === 'keep' ? 'text-green-400' : 'text-red-400'
                      }`}>{seg.action === 'keep' ? 'KEEP' : 'CUT'}</span>
                      <span className="text-faint w-20">{fmtTime(seg.start)}-{fmtTime(seg.end)}</span>
                      <span className="text-dim flex-1">{seg.reason}</span>
                    </div>
                  ))}
                </div>
              )}
            </Card>
          )}

          {/* Actions */}
          <div className="flex gap-3">
            <Button
              variant="primary"
              onClick={sendToEditor}
              icon={<ArrowRight size={14} />}
              className="flex-1"
            >
              Send to Editor
            </Button>
            <Button
              variant="secondary"
              onClick={() => {
                setStep('upload')
                setVideoUrl(null)
                setVideoFile(null)
                setTranscript(null)
                setChunkSummaries([])
                setOutline(null)
                setCutPlan(null)
                setRefinedSegments([])
                setCutResult(null)
              }}
            >
              Start Over
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}
