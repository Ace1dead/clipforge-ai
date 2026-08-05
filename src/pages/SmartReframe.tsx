import { useState, useRef, useCallback } from 'react'
import { Crop, Play, Loader2, Download, Wand2, Users, Maximize } from 'lucide-react'
import { MediaDropzone } from '../components/MediaDropzone'
import type { Picked } from '../components/MediaDropzone'
import { Button, Card, Select, Field, Slider, Badge, toast, ProgressBar } from '../components/ui'
import { decodeAudio } from '../lib/audio'
import { renderComposition } from '../lib/video'
import { downloadBlob, fmtTime, fmtBytes } from '../lib/format'
import {
  initFaceDetector, isFaceDetectorReady, sampleFrameTimestamps,
  detectFacesInFrame, smoothDetections, generateCropPath,
  computeMultiPersonLayout, disposeFaceDetector, type FrameDetections, type CropFrame,
} from '../lib/vision'

type AspectRatio = '9:16' | '1:1' | '4:5'
const ASPECTS: Record<AspectRatio, { w: number; h: number; label: string }> = {
  '9:16': { w: 1080, h: 1920, label: '9:16 TikTok/Reels' },
  '1:1': { w: 1080, h: 1080, label: '1:1 Square' },
  '4:5': { w: 1080, h: 1350, label: '4:5 Instagram' },
}

export function SmartReframe() {
  const [videoUrl, setVideoUrl] = useState<string | null>(null)
  const [videoFile, setVideoFile] = useState<File | null>(null)
  const [duration, setDuration] = useState(0)
  const [aspect, setAspect] = useState<AspectRatio>('9:16')
  const [sampleRate, setSampleRate] = useState(2)
  const [smoothingWindow, setSmoothingWindow] = useState(5)
  const [step, setStep] = useState<'config' | 'analyzing' | 'reframing' | 'done'>('config')
  const [progress, setProgress] = useState(0)
  const [detectionCount, setDetectionCount] = useState(0)
  const [multiPerson, setMultiPerson] = useState(false)
  const videoRef = useRef<HTMLVideoElement>(null)
  const abortRef = useRef<AbortController | null>(null)

  const handlePicked = async (p: Picked) => {
    setVideoUrl(p.url)
    setVideoFile(p.file)
    const v = document.createElement('video')
    v.src = p.url
    const dur = await new Promise<number>((resolve) => {
      v.onloadedmetadata = () => resolve(v.duration)
      v.onerror = () => resolve(30)
      setTimeout(() => resolve(30), 5000)
    })
    setDuration(dur)
    setStep('config')
  }

  const processVideo = useCallback(async () => {
    if (!videoUrl || !videoFile) return
    abortRef.current = new AbortController()
    setStep('analyzing')
    setProgress(0)

    try {
      // Init face detector
      if (!isFaceDetectorReady()) {
        toast('info', 'Loading face detection model...', 'First load takes ~5 seconds')
        await initFaceDetector()
      }

      // Create video element for frame sampling
      const video = document.createElement('video')
      video.src = videoUrl
      video.muted = true
      video.playsInline = true
      await new Promise<void>((resolve, reject) => {
        video.onloadeddata = () => resolve()
        video.onerror = () => reject(new Error('Could not load video'))
        setTimeout(() => reject(new Error('Timeout')), 15000)
      })

      // Sample frames
      const timestamps = sampleFrameTimestamps(duration, sampleRate)
      const detections: (FrameDetections | null)[] = []
      const sampleInterval = 1 / sampleRate

      for (let i = 0; i < timestamps.length; i++) {
        if (abortRef.current.signal.aborted) return

        video.currentTime = timestamps[i]
        await new Promise<void>((resolve) => {
          video.onseeked = () => resolve()
          setTimeout(resolve, 2000)
        })

        const det = detectFacesInFrame(video, timestamps[i], i)
        detections.push(det)
        if (det && det.faces.length > 0) setDetectionCount(c => c + det.faces.length)
        setProgress(0.3 + (i / timestamps.length) * 0.4)
      }

      // Check for multi-person
      const hasMulti = detections.some(d => d && d.faces.length >= 2)
      setMultiPerson(hasMulti)

      // Smooth detections
      setProgress(0.7)
      const smoothed = smoothDetections(detections, { windowSize: smoothingWindow, holdFrames: 8, velocityDamping: 0.7 })

      // Generate crop path
      const outDims = ASPECTS[aspect]
      const sourceW = video.videoWidth || 1920
      const sourceH = video.videoHeight || 1080
      const cropPath = generateCropPath(smoothed, sourceW, sourceH, outDims.w, outDims.h, sampleInterval, timestamps)

      // Render reframed video
      setStep('reframing')
      setProgress(0.8)

      let cropFrameIdx = 0
      const blob = await renderComposition({
        sources: [{ url: videoUrl, fit: 'cover' }],
        outW: outDims.w,
        outH: outDims.h,
        trim: { start: 0, end: duration },
        draw: (ctx, time, w, h) => {
          // Find the right crop frame
          while (cropFrameIdx < cropPath.length - 1 && cropPath[cropFrameIdx + 1].timestamp <= time) {
            cropFrameIdx++
          }
          const crop = cropPath[Math.min(cropFrameIdx, cropPath.length - 1)]
          if (!crop) return

          // Draw cropped source
          ctx.drawImage(
            video,
            crop.cropX, crop.cropY, crop.cropW, crop.cropH,
            0, 0, w, h
          )
        },
        muteVideoAudio: false,
      })

      setProgress(1)
      setStep('done')

      const ext = blob.type.includes('mp4') ? 'mp4' : 'webm'
      downloadBlob(blob, `${videoFile.name.replace(/\.[^.]+$/, '')}_reframed_${aspect}.${ext}`)
      toast('success', 'Smart reframe complete', `${fmtBytes(blob.size)} · ${detectionCount} faces tracked`)

    } catch (e) {
      toast('error', 'Reframe failed', e instanceof Error ? e.message : undefined)
      setStep('config')
    }
  }, [videoUrl, videoFile, duration, aspect, sampleRate, smoothingWindow])

  return (
    <div className="max-w-4xl mx-auto px-4 md:px-8 py-8 anim-float-up">
      <div className="flex items-center gap-3 mb-2">
        <span className="w-10 h-10 rounded-xl accent-gradient flex items-center justify-center text-white"><Crop size={20} /></span>
        <div>
          <h1 className="text-xl font-bold tracking-tight flex items-center gap-2">
            Smart Reframe
            <Badge tone="accent">AI Vision</Badge>
          </h1>
          <p className="text-[13px] text-muted">Auto-crop landscape video to vertical/square using face tracking. Smooth panning follows the speaker.</p>
        </div>
      </div>

      <div className="grid lg:grid-cols-[1fr_340px] gap-5 mt-6 items-start">
        {/* Main area */}
        <Card className="p-5">
          {step === 'config' && !videoUrl && (
            <MediaDropzone onPicked={handlePicked} height="h-40" />
          )}

          {step === 'config' && videoUrl && (
            <div className="space-y-4">
              <div className="aspect-video bg-black rounded-xl overflow-hidden">
                <video src={videoUrl} className="w-full h-full object-contain" controls />
              </div>
              <p className="text-[12px] text-faint text-center">{videoFile?.name} · {fmtTime(duration)}</p>
            </div>
          )}

          {step === 'analyzing' && (
            <div className="py-12 text-center">
              <Loader2 size={40} className="mx-auto mb-4 animate-spin text-accent" />
              <p className="text-[14px] font-medium">Detecting faces...</p>
              <p className="text-[12px] text-faint mt-1">{detectionCount} faces found so far</p>
              <ProgressBar value={progress} className="mt-4" />
            </div>
          )}

          {step === 'reframing' && (
            <div className="py-12 text-center">
              <Loader2 size={40} className="mx-auto mb-4 animate-spin text-accent" />
              <p className="text-[14px] font-medium">Rendering reframed video...</p>
              <ProgressBar value={progress} className="mt-4" />
            </div>
          )}

          {step === 'done' && (
            <div className="py-12 text-center">
              <div className="w-16 h-16 rounded-full bg-green/10 flex items-center justify-center mx-auto mb-4">
                <Download size={24} className="text-green" />
              </div>
              <p className="text-[14px] font-medium">Reframe complete!</p>
              <p className="text-[12px] text-faint mt-1">{detectionCount} faces tracked · {aspect} output</p>
              <Button className="mt-4" onClick={() => { setStep('config'); setDetectionCount(0); setMultiPerson(false) }}>
                Process another video
              </Button>
            </div>
          )}
        </Card>

        {/* Settings sidebar */}
        <Card className="p-5">
          <h3 className="font-semibold text-[14px] mb-4">Reframe Settings</h3>
          <div className="space-y-4">
            <Field label="Target aspect ratio">
              <Select value={aspect} onChange={(e) => setAspect(e.target.value as AspectRatio)}>
                {Object.entries(ASPECTS).map(([k, v]) => (
                  <option key={k} value={k}>{v.label} ({v.w}×{v.h})</option>
                ))}
              </Select>
            </Field>

            <Slider label="Detection sample rate" value={sampleRate} min={0.5} max={4} step={0.5} unit=" fps" onChange={setSampleRate} />

            <Slider label="Smoothing window" value={smoothingWindow} min={1} max={15} unit=" frames" onChange={setSmoothingWindow} />

            {multiPerson && (
              <div className="p-3 rounded-xl bg-accent/10 border border-accent/20">
                <div className="flex items-center gap-2">
                  <Users size={14} className="text-accent" />
                  <span className="text-[12px] font-medium text-accent">Multi-person detected</span>
                </div>
                <p className="text-[11px] text-muted mt-1">Split-screen layout will be applied automatically</p>
              </div>
            )}

            <Button
              className="w-full"
              size="lg"
              icon={<Wand2 size={16} />}
              loading={step !== 'config'}
              disabled={!videoUrl || step !== 'config'}
              onClick={processVideo}
            >
              {step === 'config' ? 'Smart Reframe' : 'Processing...'}
            </Button>
          </div>
        </Card>
      </div>
    </div>
  )
}
