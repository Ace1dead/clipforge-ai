/**
 * VideoPreviewModal — Full-screen preview of video with all overlays before export.
 * Shows: video + captions + effects + hook text + platform badge + fade.
 * User can adjust settings and then confirm export.
 */

import { useState, useRef, useEffect, useMemo } from 'react'
import { X, Play, Pause, SkipBack, SkipForward, Download, Loader2, Volume2, VolumeX, Share2, ExternalLink, Copy, Check, FileDown } from 'lucide-react'
import { Button, Select, Field, Slider, Badge, ProgressBar, Textarea, toast } from './ui'
import { createDrawFrame, renderPreviewFrame, type CompositorConfig } from '../lib/compositor'
import { EDIT_STYLES, type EditStyleId, type ColorSkinId } from '../lib/editStyles'
import { COLOR_SKINS } from '../lib/effects'
import { CAPTION_STYLES } from '../lib/captions'
import { fmtTime } from '../lib/format'
import { generateShareLink, generateHashtags, validateCaption, type PlatformConfig, getPlatformConfig } from '../lib/socialScheduler'
import { generatePremiereXML, generateDaVinciXML, generateFCPXML, type TimelineClip, type TimelineTrack } from '../lib/xmlExport'
import type { TimedWord } from '../lib/tts'

const PLATFORMS = [
  { id: 'tiktok', name: 'TikTok', icon: '♪', color: '#ff0050' },
  { id: 'instagram', name: 'Instagram Reels', icon: '◎', color: '#e1306c' },
  { id: 'youtube', name: 'YouTube Shorts', icon: '▶', color: '#ff0000' },
  { id: 'linkedin', name: 'LinkedIn', icon: 'in', color: '#0a66c2' },
  { id: 'x', name: 'X (Twitter)', icon: '𝕏', color: '#ffffff' },
] as const

interface Props {
  open: boolean
  videoUrl: string
  clipDuration: number
  trimStart?: number
  trimEnd?: number
  words?: TimedWord[]
  hooks?: string[]
  platform?: string
  initialCaptionStyle?: string
  initialEditStyle?: EditStyleId
  initialColorSkin?: ColorSkinId
  onClose: () => void
  onExport: (config: CompositorConfig) => void
  exporting?: boolean
  exportProgress?: number
  exportedBlob?: Blob | null
  clipName?: string
}

export function VideoPreviewModal({
  open,
  videoUrl,
  clipDuration,
  trimStart = 0,
  trimEnd,
  words = [],
  hooks = [],
  platform,
  initialCaptionStyle = 'pop-classic',
  initialEditStyle = 'velocity',
  initialColorSkin = 'candy',
  onClose,
  onExport,
  exporting = false,
  exportProgress = 0,
  exportedBlob = null,
  clipName = 'clip',
}: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const videoRef = useRef<HTMLVideoElement>(null)
  const rafRef = useRef(0)

  const [playing, setPlaying] = useState(false)
  const [time, setTime] = useState(0)
  const [muted, setMuted] = useState(false)
  const [captionStyle, setCaptionStyle] = useState(initialCaptionStyle)
  const [editStyle, setEditStyle] = useState<EditStyleId>(initialEditStyle)
  const [colorSkin, setColorSkin] = useState<ColorSkinId>(initialColorSkin)

  // Share panel state
  const [selectedPlatform, setSelectedPlatform] = useState<string>('tiktok')
  const [shareCaption, setShareCaption] = useState('')
  const [shareHashtags, setShareHashtags] = useState<string[]>([])
  const [copied, setCopied] = useState(false)

  const duration = (trimEnd ?? clipDuration) - trimStart
  const outW = platform === 'tiktok' || platform === 'reels' || platform === 'shorts' ? 1080 : 1920
  const outH = platform === 'tiktok' || platform === 'reels' || platform === 'shorts' ? 1920 : 1080

  // Auto-generate hashtags when export completes
  useEffect(() => {
    if (exportedBlob) {
      const tags = generateHashtags(clipName)
      setShareHashtags(tags)
      setShareCaption(`Check out this clip! ${tags.slice(0, 3).map(t => `#${t}`).join(' ')}`)
    }
  }, [exportedBlob, clipName])

  const sharePlatformConfig = getPlatformConfig(selectedPlatform)
  const captionValidation = shareCaption ? validateCaption(shareCaption, selectedPlatform) : { valid: true }

  const exportXML = (format: 'premiere' | 'davinci' | 'fcp') => {
    const clip: TimelineClip = {
      id: 'clip-1',
      name: clipName,
      start: 0,
      end: duration,
      duration,
      sourceStart: 0,
      sourceEnd: duration,
      filePath: `/${clipName.replace(/\s+/g, '_')}.mp4`,
      trackIndex: 0,
    }
    const tracks: TimelineTrack[] = [{ index: 0, name: 'V1', type: 'video', clips: [clip] }]
    const settings = { width: outW, height: outH, fps: 30 }
    const xml = format === 'premiere' ? generatePremiereXML(tracks, settings)
      : format === 'davinci' ? generateDaVinciXML(tracks, settings)
      : generateFCPXML(tracks, settings)
    const ext = format === 'fcp' ? 'fcpxml' : 'xml'
    const blob = new Blob([xml], { type: 'application/xml' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${clipName.replace(/\s+/g, '_')}_${format}.${ext}`
    document.body.appendChild(a)
    a.click()
    a.remove()
    URL.revokeObjectURL(url)
    toast('success', `${format === 'premiere' ? 'Premiere Pro' : format === 'davinci' ? 'DaVinci Resolve' : 'Final Cut Pro'} timeline exported`)
  }

  // Memoize config so it only changes when settings change, not every render
  const compositorConfig: CompositorConfig = useMemo(() => ({
    clipDuration: duration,
    words,
    captionStyleId: captionStyle,
    editStyle,
    colorSkin,
    hooks,
    platform,
    fadeDuration: 0.5,
    hookDuration: 3,
  }), [captionStyle, editStyle, colorSkin, duration, words, hooks, platform])

  // Create draw function — only recreated when config actually changes
  const drawFrame = useMemo(() => createDrawFrame(compositorConfig), [compositorConfig])

  // Canvas resize
  useEffect(() => {
    const canvas = canvasRef.current
    if (canvas) {
      canvas.width = outW
      canvas.height = outH
    }
  }, [outW, outH])

  // Draw loop — uses stable drawFrame reference
  useEffect(() => {
    if (!open) return

    const video = videoRef.current
    const canvas = canvasRef.current
    if (!video || !canvas) return

    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const tick = () => {
      const t = video.currentTime - trimStart
      if (t >= 0 && t <= duration) {
        renderPreviewFrame(ctx, video, t, canvas.width, canvas.height, drawFrame)
      }
      rafRef.current = requestAnimationFrame(tick)
    }

    rafRef.current = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(rafRef.current)
  }, [open, drawFrame, trimStart, duration])

  // Video playback sync
  useEffect(() => {
    const video = videoRef.current
    if (!video || !open) return

    if (playing) {
      // Use functional state update to get latest time for seeking
      setTime((prevTime) => {
        video.currentTime = trimStart + prevTime
        video.play().catch(() => setPlaying(false))
        return prevTime
      })
    } else {
      video.pause()
    }
  }, [playing, open, trimStart])

  // Time update
  useEffect(() => {
    const video = videoRef.current
    if (!video || !open) return

    const onTime = () => {
      const t = video.currentTime - trimStart
      if (t >= duration) {
        video.pause()
        setPlaying(false)
        setTime(duration)
      } else if (t >= 0) {
        setTime(t)
      }
    }

    video.addEventListener('timeupdate', onTime)
    return () => video.removeEventListener('timeupdate', onTime)
  }, [open, trimStart, duration])

  // Load video
  useEffect(() => {
    const video = videoRef.current
    if (!video || !open) return
    video.src = videoUrl
    video.load()
  }, [videoUrl, open])

  const seek = (t: number) => {
    const video = videoRef.current
    if (!video) return
    const clamped = Math.max(0, Math.min(duration, t))
    video.currentTime = trimStart + clamped
    setTime(clamped)
  }

  const stepFrame = (dir: number) => {
    seek(time + dir / 30)
  }

  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 backdrop-blur-sm">
      {/* Close button */}
      <button onClick={onClose} className="absolute top-4 right-4 z-10 p-2 rounded-full bg-white/10 hover:bg-white/20 text-white cursor-pointer">
        <X size={20} />
      </button>

      <div className="flex flex-col lg:flex-row gap-4 max-w-[95vw] max-h-[95vh]">
        {/* Video preview */}
        <div className="flex flex-col items-center gap-3">
          <div className="relative bg-black rounded-xl overflow-hidden" style={{ maxHeight: '75vh' }}>
            <video ref={videoRef} muted={muted} className="hidden" preload="auto" />
            <canvas
              ref={canvasRef}
              className="max-h-[75vh] w-auto rounded-xl"
              style={{ aspectRatio: `${outW}/${outH}` }}
            />
          </div>

          {/* Playback controls */}
          <div className="flex items-center gap-3 bg-elevated/80 backdrop-blur rounded-xl px-4 py-2">
            <button onClick={() => stepFrame(-1)} className="p-1 text-faint hover:text-fg cursor-pointer">
              <SkipBack size={16} />
            </button>
            <button onClick={() => setPlaying(!playing)} className="p-1.5 rounded-full bg-accent text-white cursor-pointer">
              {playing ? <Pause size={16} /> : <Play size={16} />}
            </button>
            <button onClick={() => stepFrame(1)} className="p-1 text-faint hover:text-fg cursor-pointer">
              <SkipForward size={16} />
            </button>

            {/* Timeline */}
            <div className="flex-1 min-w-[200px]">
              <input
                type="range"
                min={0}
                max={duration * 100}
                value={time * 100}
                onChange={(e) => seek(Number(e.target.value) / 100)}
                className="w-full h-1.5 bg-white/10 rounded-full appearance-none cursor-pointer accent-accent"
              />
            </div>

            <span className="text-[11px] text-faint font-mono min-w-[80px] text-right">
              {fmtTime(time)} / {fmtTime(duration)}
            </span>

            <button onClick={() => setMuted(!muted)} className="p-1 text-faint hover:text-fg cursor-pointer">
              {muted ? <VolumeX size={14} /> : <Volume2 size={14} />}
            </button>
          </div>
        </div>

        {/* Settings sidebar */}
        <div className="w-72 bg-elevated/80 backdrop-blur rounded-xl p-4 flex flex-col gap-4 overflow-y-auto max-h-[80vh]">
          <h3 className="font-semibold text-[14px]">Preview Settings</h3>

          <Field label="Caption Style">
            <Select value={captionStyle} onChange={(e) => setCaptionStyle(e.target.value)}>
              {CAPTION_STYLES.map((s) => (
                <option key={s.id} value={s.id}>{s.name}</option>
              ))}
            </Select>
          </Field>

          <Field label="Edit Style">
            <Select value={editStyle} onChange={(e) => setEditStyle(e.target.value as EditStyleId)}>
              {Object.values(EDIT_STYLES).map((s) => (
                <option key={s.id} value={s.id}>{s.name}</option>
              ))}
            </Select>
          </Field>

          <Field label="Color Skin">
            <Select value={colorSkin} onChange={(e) => setColorSkin(e.target.value as ColorSkinId)}>
              {Object.entries(COLOR_SKINS).map(([id, skin]) => (
                <option key={id} value={id}>{skin.name}</option>
              ))}
            </Select>
          </Field>

          <div className="border-t border-white/10 pt-3 mt-auto">
            <Button
              className="w-full"
              size="lg"
              icon={exporting ? <Loader2 size={16} className="animate-spin" /> : <Download size={16} />}
              loading={exporting}
              disabled={exporting}
              onClick={() => onExport({ ...compositorConfig })}
            >
              {exporting ? `Exporting ${Math.round(exportProgress * 100)}%...` : 'Export Video'}
            </Button>
            {exporting && <ProgressBar value={exportProgress} className="mt-2" />}

            {/* Share Panel — appears after export */}
            {exportedBlob && !exporting && (
              <div className="mt-4 space-y-3 border-t border-white/10 pt-4">
                <div className="flex items-center gap-2">
                  <Share2 size={14} className="text-accent" />
                  <h4 className="text-[13px] font-semibold">Share to Platform</h4>
                </div>

                {/* Platform selector */}
                <div className="grid grid-cols-5 gap-1">
                  {PLATFORMS.map((p) => (
                    <button
                      key={p.id}
                      onClick={() => setSelectedPlatform(p.id)}
                      className={`flex flex-col items-center gap-1 p-2 rounded-lg text-[10px] cursor-pointer transition-all ${
                        selectedPlatform === p.id
                          ? 'bg-accent/20 text-accent ring-1 ring-accent/50'
                          : 'bg-white/5 text-faint hover:bg-white/10'
                      }`}
                    >
                      <span className="text-[14px]" style={{ color: selectedPlatform === p.id ? p.color : undefined }}>{p.icon}</span>
                      <span>{p.name.split(' ')[0]}</span>
                    </button>
                  ))}
                </div>

                {/* Caption input */}
                <Field label={`Caption (${shareCaption.length}/${sharePlatformConfig?.maxCaptionLength ?? 2200})`}>
                  <Textarea
                    value={shareCaption}
                    onChange={(e) => setShareCaption(e.target.value)}
                    rows={3}
                    className="text-[12px]"
                  />
                  {!captionValidation.valid && (
                    <p className="text-[10px] text-red-400 mt-1">{captionValidation.error}</p>
                  )}
                </Field>

                {/* Hashtags */}
                <div className="flex flex-wrap gap-1">
                  {shareHashtags.map((tag) => (
                    <Badge key={tag} className="text-[10px]">#{tag}</Badge>
                  ))}
                </div>

                {/* Share buttons */}
                <div className="flex gap-2">
                  <Button
                    className="flex-1"
                    size="sm"
                    icon={<ExternalLink size={13} />}
                    disabled={!captionValidation.valid}
                    onClick={() => {
                      const link = generateShareLink(selectedPlatform, '', shareCaption)
                      window.open(link, '_blank')
                      toast('info', `Opening ${PLATFORMS.find(p => p.id === selectedPlatform)?.name}...`)
                    }}
                  >
                    Open Upload
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    icon={copied ? <Check size={13} /> : <Copy size={13} />}
                    onClick={() => {
                      navigator.clipboard.writeText(shareCaption)
                      setCopied(true)
                      setTimeout(() => setCopied(false), 2000)
                    }}
                  >
                    {copied ? 'Copied' : 'Copy'}
                  </Button>
                </div>

                <p className="text-[10px] text-faint text-center">
                  Video downloaded. Upload it on the platform.
                </p>

                {/* NLE Timeline Export */}
                <div className="border-t border-white/10 pt-3 mt-2">
                  <div className="flex items-center gap-2 mb-2">
                    <FileDown size={13} className="text-faint" />
                    <span className="text-[11px] font-medium text-faint">Export Timeline for NLE</span>
                  </div>
                  <div className="flex gap-1.5">
                    <Button variant="ghost" size="sm" className="flex-1 text-[10px]" onClick={() => exportXML('premiere')}>Premiere Pro</Button>
                    <Button variant="ghost" size="sm" className="flex-1 text-[10px]" onClick={() => exportXML('davinci')}>DaVinci</Button>
                    <Button variant="ghost" size="sm" className="flex-1 text-[10px]" onClick={() => exportXML('fcp')}>Final Cut</Button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
