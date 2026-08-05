import { useRef, useState, useEffect, useCallback } from 'react'
import { Play, Pause, SkipBack, SkipForward, Volume2, VolumeX, Maximize2, ChevronLeft, ChevronRight } from 'lucide-react'
import { Button, Badge } from './ui'
import { fmtTime } from '../lib/format'

interface ClipPreviewProps {
  videoUrl: string
  start: number
  end: number
  title?: string
  platform?: string
  hooks?: string[]
  onPrev?: () => void
  onNext?: () => void
  hasPrev?: boolean
  hasNext?: boolean
}

export function ClipPreview({ videoUrl, start, end, title, platform, hooks, onPrev, onNext, hasPrev, hasNext }: ClipPreviewProps) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [playing, setPlaying] = useState(false)
  const [currentTime, setCurrentTime] = useState(0)
  const [muted, setMuted] = useState(false)
  const [hookText, setHookText] = useState('')
  const rafRef = useRef<number>(0)

  const duration = end - start

  // Draw loop — renders video frame + overlay effects
  const draw = useCallback(() => {
    const video = videoRef.current
    const canvas = canvasRef.current
    if (!video || !canvas) return

    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const t = video.currentTime - start
    const w = canvas.width
    const h = canvas.height

    // Black fill
    ctx.fillStyle = '#000'
    ctx.fillRect(0, 0, w, h)

    // Draw video frame (cover fit)
    const vw = video.videoWidth || w
    const vh = video.videoHeight || h
    const scale = Math.max(w / vw, h / vh)
    const sw = vw * scale
    const sh = vh * scale
    ctx.drawImage(video, (w - sw) / 2, (h - sh) / 2, sw, sh)

    // Gradient overlay
    const grad = ctx.createLinearGradient(0, 0, 0, h)
    grad.addColorStop(0, 'rgba(0,0,0,0.2)')
    grad.addColorStop(0.3, 'rgba(0,0,0,0)')
    grad.addColorStop(0.7, 'rgba(0,0,0,0)')
    grad.addColorStop(1, 'rgba(0,0,0,0.4)')
    ctx.fillStyle = grad
    ctx.fillRect(0, 0, w, h)

    // Hook text (first 3 seconds)
    if (t < 3 && hooks && hooks[0]) {
      const alpha = t < 0.5 ? t * 2 : t > 2.5 ? (3 - t) * 2 : 1
      const scale2 = t < 0.3 ? 0.5 + t * 1.67 : 1
      ctx.save()
      ctx.globalAlpha = Math.max(0, Math.min(1, alpha))
      ctx.translate(w / 2, h * 0.35)
      ctx.scale(scale2, scale2)
      ctx.font = `bold ${Math.round(w * 0.06)}px "Inter", system-ui, sans-serif`
      const metrics = ctx.measureText(hooks[0])
      const pw = metrics.width + w * 0.06
      const ph = w * 0.09
      ctx.fillStyle = 'rgba(94, 106, 210, 0.85)'
      ctx.beginPath()
      ctx.roundRect(-pw / 2, -ph / 2, pw, ph, w * 0.02)
      ctx.fill()
      ctx.fillStyle = '#ffffff'
      ctx.textAlign = 'center'
      ctx.textBaseline = 'middle'
      ctx.fillText(hooks[0], 0, 0)
      ctx.restore()
    }

    // Platform badge
    if (platform) {
      ctx.save()
      ctx.font = `bold ${Math.round(w * 0.028)}px "Inter", system-ui, sans-serif`
      const badge = platform.toUpperCase()
      const bm = ctx.measureText(badge)
      const bx = w * 0.04
      const by = h - w * 0.06
      ctx.fillStyle = 'rgba(94, 106, 210, 0.8)'
      ctx.beginPath()
      ctx.roundRect(bx - w * 0.01, by - w * 0.02, bm.width + w * 0.02, w * 0.035, w * 0.008)
      ctx.fill()
      ctx.fillStyle = '#ffffff'
      ctx.textAlign = 'left'
      ctx.textBaseline = 'middle'
      ctx.fillText(badge, bx, by)
      ctx.restore()
    }

    // Timecode
    ctx.save()
    ctx.font = `${Math.round(w * 0.025)}px "Inter", system-ui, monospace`
    ctx.fillStyle = 'rgba(255,255,255,0.7)'
    ctx.textAlign = 'right'
    ctx.textBaseline = 'bottom'
    ctx.fillText(`${fmtTime(t)} / ${fmtTime(duration)}`, w - w * 0.02, h - w * 0.02)
    ctx.restore()

    // Fade in/out
    if (t < 0.5) {
      ctx.fillStyle = `rgba(0,0,0,${1 - t * 2})`
      ctx.fillRect(0, 0, w, h)
    } else if (t > duration - 0.5) {
      ctx.fillStyle = `rgba(0,0,0,${(t - (duration - 0.5)) * 2})`
      ctx.fillRect(0, 0, w, h)
    }

    rafRef.current = requestAnimationFrame(draw)
  }, [start, end, duration, hooks, platform])

  // Sync video playback to clip range
  useEffect(() => {
    const video = videoRef.current
    if (!video) return

    const handleTimeUpdate = () => {
      const t = video.currentTime
      setCurrentTime(t - start)
      if (t >= end) {
        video.pause()
        video.currentTime = start
        setPlaying(false)
      }
    }

    video.addEventListener('timeupdate', handleTimeUpdate)
    return () => video.removeEventListener('timeupdate', handleTimeUpdate)
  }, [start, end])

  // Start/stop draw loop
  useEffect(() => {
    const video = videoRef.current
    if (!video) return

    video.src = videoUrl
    video.currentTime = start
    video.load()

    rafRef.current = requestAnimationFrame(draw)
    return () => cancelAnimationFrame(rafRef.current)
  }, [videoUrl, start, draw])

  const togglePlay = useCallback(() => {
    const video = videoRef.current
    if (!video) return

    if (playing) {
      video.pause()
      setPlaying(false)
    } else {
      if (video.currentTime < start || video.currentTime >= end) {
        video.currentTime = start
      }
      video.play()
      setPlaying(true)
    }
  }, [playing, start, end])

  const seek = useCallback((time: number) => {
    const video = videoRef.current
    if (!video) return
    video.currentTime = start + Math.max(0, Math.min(duration, time))
    setCurrentTime(video.currentTime - start)
  }, [start, duration])

  const skipFrames = useCallback((frames: number) => {
    seek(currentTime + frames / 30) // assume 30fps
  }, [currentTime, seek])

  // Resize canvas to match container
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const observer = new ResizeObserver(() => {
      const parent = canvas.parentElement
      if (parent) {
        canvas.width = parent.clientWidth
        canvas.height = parent.clientHeight
      }
    })
    observer.observe(canvas.parentElement || canvas)
    return () => observer.disconnect()
  }, [])

  return (
    <div className="relative rounded-xl overflow-hidden bg-black border border-white/10">
      {/* Canvas preview */}
      <div className="relative aspect-[9/16] max-h-[60vh] mx-auto">
        <canvas ref={canvasRef} className="w-full h-full" />
        <video ref={videoRef} className="hidden" crossOrigin="anonymous" preload="auto" muted={muted} />

        {/* Navigation arrows */}
        {hasPrev && (
          <button onClick={onPrev} className="absolute left-2 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-black/50 flex items-center justify-center text-white hover:bg-black/70 cursor-pointer">
            <ChevronLeft size={18} />
          </button>
        )}
        {hasNext && (
          <button onClick={onNext} className="absolute right-2 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-black/50 flex items-center justify-center text-white hover:bg-black/70 cursor-pointer">
            <ChevronRight size={18} />
          </button>
        )}
      </div>

      {/* Controls */}
      <div className="p-3 space-y-2">
        {/* Title */}
        {title && (
          <div className="flex items-center gap-2">
            <h3 className="text-[13px] font-semibold truncate flex-1">{title}</h3>
            {platform && <Badge tone="accent">{platform}</Badge>}
          </div>
        )}

        {/* Progress bar */}
        <div
          className="relative h-1.5 bg-white/10 rounded-full cursor-pointer group"
          onClick={(e) => {
            const rect = e.currentTarget.getBoundingClientRect()
            const pct = (e.clientX - rect.left) / rect.width
            seek(pct * duration)
          }}
        >
          <div
            className="absolute inset-y-0 left-0 bg-accent rounded-full transition-all"
            style={{ width: `${(currentTime / duration) * 100}%` }}
          />
          <div
            className="absolute top-1/2 -translate-y-1/2 w-3 h-3 bg-white rounded-full shadow opacity-0 group-hover:opacity-100 transition-opacity"
            style={{ left: `calc(${(currentTime / duration) * 100}% - 6px)` }}
          />
        </div>

        {/* Buttons */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1">
            <Button size="xs" variant="ghost" icon={<SkipBack size={12} />} onClick={() => skipFrames(-10)} />
            <Button
              size="sm"
              variant="primary"
              icon={playing ? <Pause size={14} /> : <Play size={14} />}
              onClick={togglePlay}
              className="w-9 h-9 rounded-full"
            />
            <Button size="xs" variant="ghost" icon={<SkipForward size={12} />} onClick={() => skipFrames(10)} />
          </div>

          <span className="text-[11px] text-faint font-mono">
            {fmtTime(currentTime)} / {fmtTime(duration)}
          </span>

          <div className="flex items-center gap-1">
            <Button size="xs" variant="ghost" icon={muted ? <VolumeX size={12} /> : <Volume2 size={12} />} onClick={() => setMuted(!muted)} />
          </div>
        </div>
      </div>
    </div>
  )
}
