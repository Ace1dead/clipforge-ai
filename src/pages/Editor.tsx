import { useEffect, useRef, useState, useCallback } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import type { ReactNode } from 'react'
import {
  Play, Pause, Upload, Captions, Mic, Palette, Clapperboard, Download, Save, SkipBack, SkipForward,
  Volume2, Type, Sparkles, Wand2, Loader2, ArrowLeft, X, Globe, Scissors, Layers, Sliders,
} from 'lucide-react'
import { Button, Card, Tabs, Textarea, Select, Field, Slider, ProgressBar, Badge, toast } from '../components/ui'
import { MediaDropzone } from '../components/MediaDropzone'
import type { Picked } from '../components/MediaDropzone'
import { StylePicker } from '../components/StylePicker'
import { VideoPreviewModal } from '../components/VideoPreviewModal'
import TimelineComponent from '../components/Timeline'
import KeyframeEditor from '../components/KeyframeEditor'
import FilterPicker from '../components/FilterPicker'
import LutPicker from '../components/LutPicker'
import { drawCaptions, getStyle } from '../lib/captions'
import { estimateWordTiming, estimateSpeakingTime, STREAMELEMENTS_VOICES, synthesizeStreamElements } from '../lib/tts'
import { renderComposition, videoMeta } from '../lib/video'
import { decodeAudio } from '../lib/audio'
import { upsertProject, getProjects, deleteProject } from '../lib/store'
import type { Project } from '../lib/store'
import { fmtTime, downloadBlob, fmtBytes, uid } from '../lib/format'
import { createDrawFrame, createTimelineDrawFrame } from '../lib/compositor'
import type { CompositorConfig } from '../lib/compositor'
import type { EditStyleId, ColorSkinId } from '../lib/editStyles'
import { getSupportedLanguages, detectLanguage, generateDubScript, type DubScript } from '../lib/multiLanguageDubbing'
import {
  createTimeline,
  createClip,
  addTrack,
  addClipToTrack,
  removeClip,
  moveClip,
  splitClip,
  getClipsAtTime,
  getTimelineDuration,
} from '../lib/timeline'
import type { Timeline, Clip, Track, TrackType, ChromaKeyConfig, MaskConfig, ColorGradeConfig } from '../lib/timeline'
import type { KeyframedLayer } from '../lib/keyframe'
import {
  ANIMATION_PRESETS,
  ANIMATION_CATEGORIES,
  getAnimationsByCategory,
  createDefaultAnimation,
  getAnimationState,
  animationToCSS,
  type AnimationType,
  type AnimationConfig,
} from '../lib/animations'
import {
  TEXT_ANIMATIONS,
  TEXT_STYLE_PRESETS,
  createDefaultTextLayer,
  type TextAnimationPreset,
} from '../lib/textLayers'
import { getFilterById, applyFilter as applyFilterFn, type FilterPreset } from '../lib/filters'
import { applyLUT3D, type LUT3D } from '../lib/lutGenerator'

const SAMPLE_SCRIPT = 'This is how you go viral. Post daily. Study the trends. Never stop testing. And always — always — keep the captions popping.'

type Res = '9:16' | '16:9' | '1:1' | '4k-9:16' | '4k-16:9' | '4k-1:1' | '1080p120'
const OUT: Record<Res, { w: number; h: number; label: string }> = {
  '9:16': { w: 1080, h: 1920, label: '1080p 9:16' },
  '16:9': { w: 1920, h: 1080, label: '1080p 16:9' },
  '1:1': { w: 1080, h: 1080, label: '1080p 1:1' },
  '4k-9:16': { w: 2160, h: 3840, label: '4K 9:16' },
  '4k-16:9': { w: 3840, h: 2160, label: '4K 16:9' },
  '4k-1:1': { w: 2160, h: 2160, label: '4K 1:1' },
  '1080p120': { w: 1920, h: 1080, label: '1080p 120fps' },
}

export function Editor() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [project, setProject] = useState<Project | null>(() => {
    if (id) return getProjects().find((p) => p.id === id) ?? null
    return null
  })
  const [tab, setTab] = useState('media')
  const [mobilePanel, setMobilePanel] = useState(false)
  const [script, setScript] = useState(SAMPLE_SCRIPT)
  const [aiScriptTopic, setAiScriptTopic] = useState('')
  const [generatingScript, setGeneratingScript] = useState(false)
  const [voice, setVoice] = useState('Brian')
  const [time, setTime] = useState(0)
  const [playing, setPlaying] = useState(false)
  const [exporting, setExporting] = useState(false)
  const [previewOpen, setPreviewOpen] = useState(false)
  const [previewEditStyle, setPreviewEditStyle] = useState<EditStyleId>('velocity')
  const [previewColorSkin, setPreviewColorSkin] = useState<ColorSkinId>('candy')
  const [generatingVoice, setGeneratingVoice] = useState(false)
  const [progress, setProgress] = useState(0)
  const [res, setRes] = useState<Res>('9:16')
  const [exportedBlob, setExportedBlob] = useState<Blob | null>(null)

  // NLE state
  const [timeline, setTimeline] = useState<Timeline>(() => createTimeline({}))
  const [selectedClipId, setSelectedClipId] = useState<string | null>(null)
  const [selectedKeyframeLayer, setSelectedKeyframeLayer] = useState<KeyframedLayer | null>(null)
  const [videoSources] = useState<Map<string, HTMLVideoElement>>(new Map())

  // Filter state
  const [activeFilterId, setActiveFilterId] = useState<string | null>(null)
  const [filterStrength, setFilterStrength] = useState(1)

  // LUT state
  const [activeLutId, setActiveLutId] = useState<string | null>(null)
  const [activeLut, setActiveLut] = useState<LUT3D | null>(null)
  const [lutStrength, setLutStrength] = useState(1)

  // Animation state
  const [clipAnimationIn, setClipAnimationIn] = useState<AnimationConfig>({ type: 'none', duration: 0.5 })
  const [clipAnimationOut, setClipAnimationOut] = useState<AnimationConfig>({ type: 'none', duration: 0.5 })
  const [textAnimationType, setTextAnimationType] = useState<string>('pop')

  // Color grading state
  const [colorGrade, setColorGrade] = useState<ColorGradeConfig>({
    enabled: false,
    brightness: 0,
    contrast: 1,
    saturation: 1,
    hueShift: 0,
    temperature: 0,
    tint: 0,
    shadows: '#000000',
    highlights: '#ffffff',
    gammaValue: 1,
  })

  // Chroma key state
  const [chromaKey, setChromaKey] = useState<ChromaKeyConfig>({
    enabled: false,
    color: '#00ff00',
    similarity: 0.35,
    smoothness: 0.15,
    spillReduction: 0.5,
  })

  // Mask state
  const [mask, setMask] = useState<MaskConfig>({
    enabled: false,
    type: 'ellipse',
  })

  // Dubbing state
  const [dubTargetLang, setDubTargetLang] = useState('es')
  const [dubScript, setDubScript] = useState<DubScript[]>([])
  const [dubSourceLang, setDubSourceLang] = useState('')
  const videoRef = useRef<HTMLVideoElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const rafRef = useRef(0)

  const duration = project?.duration ?? 0
  const outDims = OUT[res]
  const words = project?.words ?? []
  const platform = res === '9:16' ? 'tiktok' : 'youtube'

  // Auto-save
  useEffect(() => {
    if (project && project.videoUrl) {
      const t = setTimeout(() => upsertProject(project), 800)
      return () => clearTimeout(t)
    }
  }, [project])

  // Canvas size
  useEffect(() => {
    const canvas = canvasRef.current
    if (canvas) { canvas.width = outDims.w; canvas.height = outDims.h }
  }, [res])

  // Read template config from Templates page
  useEffect(() => {
    try {
      const raw = localStorage.getItem('cf_template_config')
      if (raw) {
        const cfg = JSON.parse(raw)
        localStorage.removeItem('cf_template_config')
        if (cfg.name) {
          toast('info', `Template loaded: ${cfg.name}`, 'Upload a video to start editing')
        }
        if (cfg.presetId) {
          import('../lib/viralPresets').then(({ getPresetById }) => {
            const preset = getPresetById(cfg.presetId)
            if (preset) {
              setPreviewEditStyle(preset.editStyle as EditStyleId)
              setPreviewColorSkin(preset.color.skin as ColorSkinId)
              if (preset.captions.style) {
                update({ captionStyle: preset.captions.style })
              }
            }
          })
        }
      }
    } catch { /* ignore */ }
  }, [])

  const update = (patch: Partial<Project>) => setProject((p) => (p ? { ...p, ...patch, updatedAt: new Date().toISOString() } : p))

  // ── Timeline auto-populate when video loads ──────────────────────
  useEffect(() => {
    if (!project?.videoUrl) return
    const videoTrack = timeline.tracks.find(t => t.type === 'video')
    if (!videoTrack || videoTrack.clips.length > 0) return

    const clip = createClip({
      type: 'video',
      trackId: videoTrack.id,
      sourceStart: 0,
      sourceEnd: duration,
      timelineStart: 0,
    })
    clip.sourceUrl = project.videoUrl
    clip.name = project.name || 'Video'

    // Create a video element for this source
    const videoEl = document.createElement('video')
    videoEl.src = project.videoUrl
    videoEl.crossOrigin = 'anonymous'
    videoEl.preload = 'auto'
    videoEl.muted = true
    videoSources.set(project.videoUrl, videoEl)

    const tl = addClipToTrack(timeline, videoTrack.id, clip)
    setTimeline(tl)
  }, [project?.videoUrl, duration])

  // ── Sync video playback with timeline ────────────────────────────
  useEffect(() => {
    if (!project?.videoUrl) return
    const loop = () => {
      const canvas = canvasRef.current
      const video = videoRef.current
      const ctx = canvas?.getContext('2d')
      if (canvas && ctx) {
        const w = canvas.width
        const h = canvas.height

        // Use timeline compositor if timeline has clips
        const hasClips = timeline.tracks.some(t => t.clips.length > 0)

        if (hasClips) {
          const drawFrame = createTimelineDrawFrame({
            clipDuration: duration,
            words,
            captionStyleId: project.captionStyle ?? 'pop-classic',
            editStyle: previewEditStyle,
            colorSkin: previewColorSkin,
            hooks: [],
            platform,
            fadeDuration: 0.5,
            hookDuration: 3,
            timeline,
            videoSources,
          })
          drawFrame({ ctx, time, w, h, video: video ?? undefined })

          // Apply filter if active
          if (activeFilterId) {
            const filter = getFilterById(activeFilterId)
            if (filter) {
              applyFilterFn(ctx, w, h, filter, filterStrength)
            }
          }

          // Apply LUT if active
          if (activeLut) {
            applyLUT3D(ctx, w, h, activeLut, lutStrength)
          }
        } else {
          // Fallback: single video + captions
          ctx.fillStyle = '#000'
          ctx.fillRect(0, 0, w, h)
          if (video && video.videoWidth > 0) {
            const vw = video.videoWidth
            const vh = video.videoHeight
            const scale = Math.max(w / vw, h / vh)
            const dw = vw * scale
            const dh = vh * scale
            ctx.drawImage(video, (w - dw) / 2, (h - dh) / 2, dw, dh)
            const t = video.currentTime
            setTime((prev) => (Math.abs(prev - t) > 0.04 ? t : prev))
            if (words.length && project.captionStyle) drawCaptions(ctx, words, getStyle(project.captionStyle), t, w, h)
            // Apply filter if active
            if (activeFilterId) {
              const filter = getFilterById(activeFilterId)
              if (filter) applyFilterFn(ctx, w, h, filter, filterStrength)
            }
            // Apply LUT if active
            if (activeLut) {
              applyLUT3D(ctx, w, h, activeLut, lutStrength)
            }
          }
        }
      }
      rafRef.current = requestAnimationFrame(loop)
    }
    rafRef.current = requestAnimationFrame(loop)
    return () => cancelAnimationFrame(rafRef.current)
  }, [project?.videoUrl, words, project?.captionStyle, res, timeline, time, videoSources, duration, previewEditStyle, previewColorSkin, platform, activeLut, lutStrength, activeFilterId, filterStrength])

  const togglePlay = () => {
    const v = videoRef.current
    if (!v || !project?.videoUrl) return
    if (v.paused) { void v.play(); setPlaying(true) }
    else { v.pause(); setPlaying(false) }
  }

  const seek = (t: number) => {
    const v = videoRef.current
    if (!v || !project?.videoUrl) return
    v.currentTime = Math.max(0, Math.min(duration, t))
    setTime(v.currentTime)
  }

  const generateScript = async () => {
    if (!aiScriptTopic.trim()) return
    setGeneratingScript(true)
    try {
      const { generateScriptAI } = await import('../lib/aiEngine')
      const result = await generateScriptAI({
        topic: aiScriptTopic.trim(),
        platform: res === '9:16' ? 'tiktok' : 'youtube',
        style: 'viral',
        duration: project?.duration || 30,
      })
      setScript(result.fullText)
      if (result.lines.length > 0) {
        autoCaption(project?.duration || 30, result.fullText)
      }
      toast('success', 'Script generated', `${result.lines.length} lines, ${result.hashtags.length} hashtags`)
    } catch (e) {
      toast('error', 'Script generation failed', e instanceof Error ? e.message : undefined)
    } finally {
      setGeneratingScript(false)
    }
  }

  const autoCaption = (dur: number, text: string) => {
    const timed = estimateWordTiming(text || SAMPLE_SCRIPT, dur)
    setScript(text || SAMPLE_SCRIPT)
    update({ words: timed, duration: dur })
  }

  const handleFile = async (p: Picked) => {
    const meta = await videoMeta(p.url).catch(() => ({ duration: 30, width: 1080, height: 1920 }))
    const dur = Math.max(5, meta.duration)
    setProject((prev) => {
      const proj: Project = {
        id: prev?.id ?? uid('proj'),
        name: prev?.name ?? p.file.name.replace(/\.[^.]+$/, ''),
        createdAt: prev?.createdAt ?? new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        videoUrl: p.url,
        duration: dur,
        resolution: { w: meta.width || 1080, h: meta.height || 1920 },
        captionStyle: prev?.captionStyle ?? 'pop-classic',
        words: prev?.words?.length ? prev.words : estimateWordTiming(SAMPLE_SCRIPT, dur),
        musicGain: 0.3,
        videoGain: 1,
        layout: 'single',
      }
      return proj
    })
    toast('success', 'Video loaded', `${dur.toFixed(0)}s clip ready`)
  }

  const genVoiceover = async () => {
    if (!project || generatingVoice) return
    setGeneratingVoice(true)
    try {
      const text = script.slice(0, 1800)
      const blob = await synthesizeStreamElements(text, voice)
      const url = URL.createObjectURL(blob)
      const audio = await decodeAudio(url)
      const dur = Math.max(audio.duration, estimateSpeakingTime(text) * 0.85)
      update({ voiceoverUrl: url, voiceoverScript: text, voiceName: voice, words: estimateWordTiming(text, dur), duration: Math.max(project.duration, dur) })
      toast('success', 'Voiceover ready', `${voice} · ${dur.toFixed(1)}s · captions re-timed`)
    } catch (e) {
      toast('error', 'Voiceover failed', e instanceof Error ? e.message : 'Network or service unavailable')
    } finally {
      setGeneratingVoice(false)
    }
  }

  const exportVideo = async (): Promise<Blob | null> => {
    if (!project?.videoUrl) { toast('error', 'Add a video first'); return null }
    setExporting(true)
    setProgress(0)
    try {
      const drawFrame = createDrawFrame({
        clipDuration: duration,
        words,
        captionStyleId: project.captionStyle ?? 'pop-classic',
        editStyle: previewEditStyle,
        colorSkin: previewColorSkin,
        hooks: [],
        platform,
        fadeDuration: 0.5,
        hookDuration: 3,
      })
      const blob = await renderComposition({
        sources: [{ url: project.videoUrl }],
        outW: outDims.w, outH: outDims.h,
        bitrate: 8_000_000,
        audioLayers: project.voiceoverUrl ? [{ url: project.voiceoverUrl, gain: 1 }] : [],
        draw: (ctx, t, w, h) => {
          drawFrame({ ctx, time: t, w, h })
          // Apply filter if active
          if (activeFilterId) {
            const filter = getFilterById(activeFilterId)
            if (filter) applyFilterFn(ctx, w, h, filter, filterStrength)
          }
          // Apply LUT if active
          if (activeLut) {
            applyLUT3D(ctx, w, h, activeLut, lutStrength)
          }
        },
        onProgress: setProgress,
      })
      downloadBlob(blob, `${(project.name || 'clip').replace(/\s+/g, '-')}_final.webm`)
      setExportedBlob(blob)
      toast('success', 'Export complete', fmtBytes(blob.size))
      return blob
    } catch (e) {
      toast('error', 'Export failed', e instanceof Error ? e.message : undefined)
      return null
    } finally { setExporting(false) }
  }

  const removeProject = () => {
    if (!project?.id) return
    deleteProject(project.id)
    toast('success', 'Project deleted')
    navigate('/dashboard')
  }

  // ── Timeline actions ─────────────────────────────────────────────
  const addTimelineTrack = (type: TrackType) => {
    const tl = addTrack(timeline, type)
    setTimeline(tl)
    toast('info', `Added ${type} track`)
  }

  // ── Get selected clip ────────────────────────────────────────────
  const selectedClip = selectedClipId
    ? timeline.tracks.flatMap(t => t.clips).find(c => c.id === selectedClipId)
    : null

  // ── Apply chroma key/mask/color to selected clip ─────────────────
  const updateSelectedClip = (patch: Partial<Clip>) => {
    if (!selectedClipId) return
    const tl = { ...timeline }
    for (const track of tl.tracks) {
      for (let i = 0; i < track.clips.length; i++) {
        if (track.clips[i].id === selectedClipId) {
          track.clips[i] = { ...track.clips[i], ...patch }
          setTimeline(tl)
          return
        }
      }
    }
  }

  const panelContent: ReactNode = (
    <>
      <Tabs
        tabs={[
          { id: 'media', label: 'Media', icon: <Clapperboard size={13} /> },
          { id: 'captions', label: 'Captions', icon: <Captions size={13} /> },
          { id: 'voice', label: 'Voice', icon: <Mic size={13} /> },
          { id: 'style', label: 'Style', icon: <Palette size={13} /> },
          { id: 'lut', label: 'LUT', icon: <Wand2 size={13} /> },
          { id: 'color', label: 'Color', icon: <Sliders size={13} /> },
          { id: 'effects', label: 'Effects', icon: <Sparkles size={13} /> },
          { id: 'keyframe', label: 'Keyframe', icon: <Layers size={13} /> },
          { id: 'dub', label: 'Dub', icon: <Globe size={13} /> },
        ]}
        active={tab}
        onChange={setTab}
      />
      <div className="mt-4">
        {/* ── Media Tab ──────────────────────────────────────────── */}
        {tab === 'media' && (
          <div className="space-y-4">
            {project?.videoUrl ? (
              <div className="space-y-3">
                <div className="rounded-xl overflow-hidden bg-black/60"><video src={project.videoUrl} muted className="w-full max-h-40" /></div>
                <div className="flex gap-2">
                  <Button variant="secondary" size="sm" className="flex-1" icon={<Upload size={13} />} onClick={() => { setProject((p) => (p ? { ...p, videoUrl: undefined } : p)); setPlaying(false) }}>Change</Button>
                  {project.id && <Button variant="danger" size="sm" onClick={removeProject}>Delete</Button>}
                </div>
              </div>
            ) : (
              <MediaDropzone type="video" label="Upload your video" height="h-40" onPicked={(p) => void handleFile(p)} />
            )}
            <div className="pt-3 border-t border-white/8">
              <Field label="Output & Quality">
                <Select value={res} onChange={(e) => setRes(e.target.value as Res)}>
                  <optgroup label="1080p Standard">
                    <option value="9:16">9:16 Vertical (TikTok/Shorts)</option>
                    <option value="16:9">16:9 Widescreen (YouTube)</option>
                    <option value="1:1">1:1 Square (Instagram)</option>
                  </optgroup>
                  <optgroup label="4K Ultra HD">
                    <option value="4k-9:16">4K 9:16 Vertical</option>
                    <option value="4k-16:9">4K 16:9 Widescreen</option>
                    <option value="4k-1:1">4K 1:1 Square</option>
                  </optgroup>
                  <optgroup label="High Frame Rate">
                    <option value="1080p120">1080p 120fps</option>
                  </optgroup>
                </Select>
              </Field>
              <p className="text-[11px] text-faint mt-1.5">{outDims.w}×{outDims.h} · {outDims.label} · WebM export</p>
            </div>
          </div>
        )}

        {/* ── Captions Tab ───────────────────────────────────────── */}
        {tab === 'captions' && (
          <div className="space-y-3">
            <div className="bg-accent/5 border border-accent/20 rounded-xl p-3">
              <div className="flex items-center gap-2 mb-2">
                <Sparkles size={14} className="text-accent" />
                <span className="text-[12px] font-semibold text-accent">AI Script Generator</span>
              </div>
              <div className="flex gap-2">
                <input
                  value={aiScriptTopic}
                  onChange={(e) => setAiScriptTopic(e.target.value)}
                  onKeyDown={(e) => { if (e.key === 'Enter' && aiScriptTopic.trim()) generateScript() }}
                  placeholder="Enter topic (e.g., 'cooking tips')"
                  className="flex-1 bg-elevated border border-white/10 rounded-lg px-3 py-1.5 text-[12px] outline-none focus:border-accent/40"
                />
                <Button size="sm" icon={<Sparkles size={12} />} loading={generatingScript} onClick={generateScript} disabled={!aiScriptTopic.trim()}>Generate</Button>
              </div>
            </div>
            <Field label="Script">
              <Textarea rows={7} value={script} onChange={(e) => setScript(e.target.value)} />
            </Field>
            <Button className="w-full" icon={<Wand2 size={14} />} onClick={() => project && autoCaption(project.duration, script)}>Auto-time captions</Button>
            <div className="pt-1">
              <Slider label="Clip duration" value={Math.round(duration)} min={5} max={Math.max(30, Math.round(duration))} unit="s" onChange={(v) => autoCaption(v, script)} />
            </div>
            <div className="bg-elevated/60 border border-white/10 rounded-xl p-3 max-h-40 overflow-y-auto">
              {words.length === 0 ? (
                <p className="text-[12px] text-faint text-center py-3">No captions yet — paste a script and hit auto-time.</p>
              ) : (
                words.map((w, i) => (
                  <div key={i} className="flex items-center gap-2 py-1 border-b border-white/5 last:border-0 text-[12px]">
                    <span className="text-faint tabular-nums w-14 shrink-0">{fmtTime(w.start)}</span>
                    <span className="truncate">{w.text}</span>
                  </div>
                ))
              )}
            </div>
            <p className="text-[11px] text-faint">{words.length} words · {duration.toFixed(1)}s</p>
          </div>
        )}

        {/* ── Voice Tab ──────────────────────────────────────────── */}
        {tab === 'voice' && (
          <div className="space-y-3">
            <Field label="Voice">
              <Select value={voice} onChange={(e) => setVoice(e.target.value)}>
                {STREAMELEMENTS_VOICES.filter((v) => v.lang.startsWith('en')).map((v) => <option key={v.id} value={v.id}>{v.name} · {v.gender}</option>)}
              </Select>
            </Field>
            <Button className="w-full" icon={<Mic size={14} />} loading={generatingVoice} onClick={() => void genVoiceover()}>Generate voiceover</Button>
            {project?.voiceoverUrl && (
              <div className="space-y-2">
                <audio src={project.voiceoverUrl} controls className="w-full" />
                <p className="text-[11px] text-faint">{project.voiceName} · captions re-timed to narration</p>
              </div>
            )}
          </div>
        )}

        {/* ── Style Tab ──────────────────────────────────────────── */}
        {tab === 'style' && (
          <div className="space-y-4">
            <StylePicker value={project?.captionStyle ?? 'pop-classic'} onChange={(sid) => update({ captionStyle: sid })} />
            <div className="border-t border-white/8 pt-3">
              <FilterPicker
                activeFilterId={activeFilterId}
                filterStrength={filterStrength}
                onFilterSelect={setActiveFilterId}
                onStrengthChange={setFilterStrength}
              />
            </div>
          </div>
        )}

        {/* ── LUT Tab ──────────────────────────────────── */}
        {tab === 'lut' && (
          <div className="space-y-3">
            <LutPicker
              activeLutId={activeLutId}
              lutStrength={lutStrength}
              onLutSelect={(id, lut) => {
                setActiveLutId(id)
                setActiveLut(lut ?? null)
              }}
              onStrengthChange={setLutStrength}
            />
          </div>
        )}

        {/* ── Color Grading Tab ──────────────────────────────────── */}
        {tab === 'color' && (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-[12px] font-semibold text-gray-300">Color Grading</span>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={colorGrade.enabled}
                  onChange={(e) => {
                    const next = { ...colorGrade, enabled: e.target.checked }
                    setColorGrade(next)
                    if (selectedClipId) updateSelectedClip({ colorGrade: next })
                  }}
                  className="w-4 h-4 rounded"
                />
                <span className="text-[11px] text-gray-400">Enabled</span>
              </label>
            </div>

            <Field label={`Brightness: ${colorGrade.brightness.toFixed(2)}`}>
              <input type="range" min="-1" max="1" step="0.05" value={colorGrade.brightness}
                onChange={(e) => {
                  const next = { ...colorGrade, brightness: parseFloat(e.target.value) }
                  setColorGrade(next)
                  if (selectedClipId) updateSelectedClip({ colorGrade: next })
                }}
                className="w-full"
              />
            </Field>

            <Field label={`Contrast: ${colorGrade.contrast.toFixed(2)}`}>
              <input type="range" min="0" max="3" step="0.05" value={colorGrade.contrast}
                onChange={(e) => {
                  const next = { ...colorGrade, contrast: parseFloat(e.target.value) }
                  setColorGrade(next)
                  if (selectedClipId) updateSelectedClip({ colorGrade: next })
                }}
                className="w-full"
              />
            </Field>

            <Field label={`Saturation: ${colorGrade.saturation.toFixed(2)}`}>
              <input type="range" min="0" max="3" step="0.05" value={colorGrade.saturation}
                onChange={(e) => {
                  const next = { ...colorGrade, saturation: parseFloat(e.target.value) }
                  setColorGrade(next)
                  if (selectedClipId) updateSelectedClip({ colorGrade: next })
                }}
                className="w-full"
              />
            </Field>

            <Field label={`Hue Shift: ${colorGrade.hueShift}°`}>
              <input type="range" min="-180" max="180" step="5" value={colorGrade.hueShift}
                onChange={(e) => {
                  const next = { ...colorGrade, hueShift: parseFloat(e.target.value) }
                  setColorGrade(next)
                  if (selectedClipId) updateSelectedClip({ colorGrade: next })
                }}
                className="w-full"
              />
            </Field>

            <Field label={`Temperature: ${colorGrade.temperature.toFixed(2)}`}>
              <input type="range" min="-1" max="1" step="0.05" value={colorGrade.temperature}
                onChange={(e) => {
                  const next = { ...colorGrade, temperature: parseFloat(e.target.value) }
                  setColorGrade(next)
                  if (selectedClipId) updateSelectedClip({ colorGrade: next })
                }}
                className="w-full"
              />
            </Field>

            <Field label={`Tint: ${colorGrade.tint.toFixed(2)}`}>
              <input type="range" min="-1" max="1" step="0.05" value={colorGrade.tint}
                onChange={(e) => {
                  const next = { ...colorGrade, tint: parseFloat(e.target.value) }
                  setColorGrade(next)
                  if (selectedClipId) updateSelectedClip({ colorGrade: next })
                }}
                className="w-full"
              />
            </Field>

            <div className="flex gap-2 pt-2">
              <Button size="sm" variant="secondary" className="flex-1" onClick={() => {
                const reset: ColorGradeConfig = { enabled: false, brightness: 0, contrast: 1, saturation: 1, hueShift: 0, temperature: 0, tint: 0, shadows: '#000000', highlights: '#ffffff', gammaValue: 1 }
                setColorGrade(reset)
                if (selectedClipId) updateSelectedClip({ colorGrade: reset })
              }}>Reset</Button>
            </div>
          </div>
        )}

        {/* ── Effects Tab ────────────────────────────────────────── */}
        {tab === 'effects' && (
          <div className="space-y-4">
            {/* Chroma Key */}
            <div className="bg-gray-800/50 rounded-xl p-3">
              <div className="flex items-center justify-between mb-2">
                <span className="text-[12px] font-semibold text-green-400">Chroma Key</span>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input type="checkbox" checked={chromaKey.enabled}
                    onChange={(e) => {
                      const next = { ...chromaKey, enabled: e.target.checked }
                      setChromaKey(next)
                      if (selectedClipId) updateSelectedClip({ chromaKey: next })
                    }}
                    className="w-4 h-4 rounded"
                  />
                  <span className="text-[11px] text-gray-400">On</span>
                </label>
              </div>
              {chromaKey.enabled && (
                <div className="space-y-2">
                  <Field label="Key Color">
                    <input type="color" value={chromaKey.color}
                      onChange={(e) => {
                        const next = { ...chromaKey, color: e.target.value }
                        setChromaKey(next)
                        if (selectedClipId) updateSelectedClip({ chromaKey: next })
                      }}
                      className="w-full h-8 rounded cursor-pointer"
                    />
                  </Field>
                  <Field label={`Similarity: ${(chromaKey.similarity * 100).toFixed(0)}%`}>
                    <input type="range" min="0" max="1" step="0.05" value={chromaKey.similarity}
                      onChange={(e) => {
                        const next = { ...chromaKey, similarity: parseFloat(e.target.value) }
                        setChromaKey(next)
                        if (selectedClipId) updateSelectedClip({ chromaKey: next })
                      }}
                      className="w-full"
                    />
                  </Field>
                  <Field label={`Spill: ${(chromaKey.spillReduction * 100).toFixed(0)}%`}>
                    <input type="range" min="0" max="1" step="0.05" value={chromaKey.spillReduction}
                      onChange={(e) => {
                        const next = { ...chromaKey, spillReduction: parseFloat(e.target.value) }
                        setChromaKey(next)
                        if (selectedClipId) updateSelectedClip({ chromaKey: next })
                      }}
                      className="w-full"
                    />
                  </Field>
                </div>
              )}
            </div>

            {/* Mask */}
            <div className="bg-gray-800/50 rounded-xl p-3">
              <div className="flex items-center justify-between mb-2">
                <span className="text-[12px] font-semibold text-purple-400">Mask</span>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input type="checkbox" checked={mask.enabled}
                    onChange={(e) => {
                      const next = { ...mask, enabled: e.target.checked }
                      setMask(next)
                      if (selectedClipId) updateSelectedClip({ mask: next })
                    }}
                    className="w-4 h-4 rounded"
                  />
                  <span className="text-[11px] text-gray-400">On</span>
                </label>
              </div>
              {mask.enabled && (
                <div className="space-y-2">
                  <Field label="Shape">
                    <Select value={mask.type} onChange={(e) => {
                      const next = { ...mask, type: e.target.value as MaskConfig['type'] }
                      setMask(next)
                      if (selectedClipId) updateSelectedClip({ mask: next })
                    }}>
                      <option value="ellipse">Ellipse</option>
                      <option value="rect">Rectangle</option>
                      <option value="linear">Linear Gradient</option>
                      <option value="free">Freeform</option>
                    </Select>
                  </Field>
                </div>
              )}
            </div>

            {/* Clip Animations */}
            <div className="bg-gray-800/50 rounded-xl p-3">
              <span className="text-[12px] font-semibold text-cyan-400 mb-2 block">Clip Animations</span>
              <div className="space-y-2">
                <Field label="Animate In">
                  <Select value={clipAnimationIn.type} onChange={(e) => {
                    const next = { ...clipAnimationIn, type: e.target.value as AnimationType }
                    setClipAnimationIn(next)
                    if (selectedClipId) updateSelectedClip({ animationIn: next })
                  }}>
                    {ANIMATION_PRESETS.map(a => (
                      <option key={a.type} value={a.type}>{a.icon} {a.name}</option>
                    ))}
                  </Select>
                </Field>
                {clipAnimationIn.type !== 'none' && (
                  <Field label={`In Duration: ${clipAnimationIn.duration.toFixed(1)}s`}>
                    <input type="range" min="0.1" max="3" step="0.1" value={clipAnimationIn.duration}
                      onChange={(e) => {
                        const next = { ...clipAnimationIn, duration: parseFloat(e.target.value) }
                        setClipAnimationIn(next)
                        if (selectedClipId) updateSelectedClip({ animationIn: next })
                      }}
                      className="w-full"
                    />
                  </Field>
                )}
                <Field label="Animate Out">
                  <Select value={clipAnimationOut.type} onChange={(e) => {
                    const next = { ...clipAnimationOut, type: e.target.value as AnimationType }
                    setClipAnimationOut(next)
                    if (selectedClipId) updateSelectedClip({ animationOut: next })
                  }}>
                    {ANIMATION_PRESETS.map(a => (
                      <option key={a.type} value={a.type}>{a.icon} {a.name}</option>
                    ))}
                  </Select>
                </Field>
                {clipAnimationOut.type !== 'none' && (
                  <Field label={`Out Duration: ${clipAnimationOut.duration.toFixed(1)}s`}>
                    <input type="range" min="0.1" max="3" step="0.1" value={clipAnimationOut.duration}
                      onChange={(e) => {
                        const next = { ...clipAnimationOut, duration: parseFloat(e.target.value) }
                        setClipAnimationOut(next)
                        if (selectedClipId) updateSelectedClip({ animationOut: next })
                      }}
                      className="w-full"
                    />
                  </Field>
                )}
              </div>
            </div>

            {/* Text Animations */}
            <div className="bg-gray-800/50 rounded-xl p-3">
              <span className="text-[12px] font-semibold text-yellow-400 mb-2 block">Text Animations</span>
              <div className="grid grid-cols-2 gap-1.5">
                {TEXT_ANIMATIONS.map(anim => (
                  <button
                    key={anim.name}
                    onClick={() => {
                      setTextAnimationType(anim.name)
                      if (selectedClipId) updateSelectedClip({ textAnimation: anim.name })
                    }}
                    className={`text-[10px] px-2 py-1.5 rounded-lg text-left ${
                      textAnimationType === anim.name
                        ? 'bg-yellow-600/30 ring-1 ring-yellow-500 text-yellow-300'
                        : 'bg-gray-700/50 text-gray-400 hover:bg-gray-600/50'
                    }`}
                  >
                    {anim.icon} {anim.name}
                  </button>
                ))}
              </div>
            </div>

            <p className="text-[11px] text-faint text-center">Select a clip on the timeline to apply effects</p>
          </div>
        )}

        {/* ── Keyframe Tab ───────────────────────────────────────── */}
        {tab === 'keyframe' && (
          <div className="space-y-3">
            {selectedKeyframeLayer ? (
              <KeyframeEditor
                layer={selectedKeyframeLayer}
                onLayerChange={setSelectedKeyframeLayer}
                currentTime={time}
                duration={duration}
                onTimeChange={seek}
              />
            ) : (
              <div className="text-center py-8">
                <Layers size={24} className="mx-auto text-gray-500 mb-2" />
                <p className="text-[12px] text-gray-400">Select a clip to edit keyframes</p>
                <p className="text-[10px] text-gray-500 mt-1">Click a clip on the timeline, then use this panel to add keyframe animations</p>
              </div>
            )}
          </div>
        )}

        {/* ── Dub Tab ────────────────────────────────────────────── */}
        {tab === 'dub' && (
          <div className="space-y-3">
            <p className="text-[12px] text-faint">Translate your captions to 30+ languages.</p>
            <Field label="Detected source language">
              <div className="bg-elevated/60 rounded-lg px-3 py-2 text-[12px]">
                {words.length > 0 ? detectLanguage(words.map(w => w.text).join(' ')) : '—'}
              </div>
            </Field>
            <Field label="Target language">
              <Select value={dubTargetLang} onChange={(e) => setDubTargetLang(e.target.value)}>
                {getSupportedLanguages().map((l) => (
                  <option key={l.code} value={l.code}>{l.name} ({l.nativeName})</option>
                ))}
              </Select>
            </Field>
            <Button
              className="w-full"
              icon={<Globe size={14} />}
              disabled={words.length === 0}
              onClick={() => {
                const script = generateDubScript(words, dubTargetLang)
                setDubScript(script)
                const src = detectLanguage(words.map(w => w.text).join(' '))
                setDubSourceLang(src)
                toast('success', `Generated ${script.length} dubbing phrases → ${dubTargetLang}`)
              }}
            >
              Generate Dub Script
            </Button>
            {dubScript.length > 0 && (
              <div className="bg-elevated/60 border border-white/10 rounded-xl p-3 max-h-60 overflow-y-auto space-y-1.5">
                <p className="text-[11px] text-faint mb-2">{dubSourceLang} → {dubTargetLang} · {dubScript.length} phrases</p>
                {dubScript.map((phrase, i) => (
                  <div key={i} className="text-[11px] border-b border-white/5 pb-1.5 last:border-0">
                    <div className="flex items-center gap-2">
                      <span className="text-faint tabular-nums">{fmtTime(phrase.start)}</span>
                      <span className="font-medium">{phrase.original}</span>
                    </div>
                    <p className="text-accent/80 ml-10 mt-0.5">{phrase.translated || '(translate with API key)'}</p>
                  </div>
                ))}
              </div>
            )}
            <p className="text-[10px] text-faint">Add your Google Translate API key in Settings for live translation.</p>
          </div>
        )}
      </div>
    </>
  )

  return (
    <div className="flex flex-col h-full">
      {/* ── Top Bar ─────────────────────────────────────────────── */}
      <div className="flex items-center gap-3 px-4 py-2.5 border-b border-white/8 glass shrink-0">
        <Link to="/dashboard" className="text-muted hover:text-fg" aria-label="Back to dashboard"><ArrowLeft size={18} /></Link>
        <input
          value={project?.name ?? 'Untitled clip'}
          onChange={(e) => update({ name: e.target.value })}
          className="bg-transparent text-[14px] font-semibold outline-none focus:bg-elevated rounded-lg px-2 py-1 w-40 md:w-56"
          aria-label="Project name"
        />
        <Badge>{project ? fmtTime(duration) : 'New'}</Badge>
        <div className="flex-1" />
        <Button variant="ghost" size="sm" icon={<Save size={14} />} onClick={() => { if (project?.videoUrl) { upsertProject(project); toast('success', 'Project saved') } }}>Save</Button>
        <div className="flex items-center gap-1">
          <Button variant="ghost" size="sm" className={`text-[11px] ${res === '9:16' ? 'text-accent' : ''}`} onClick={() => setRes('9:16')}>TikTok</Button>
          <Button variant="ghost" size="sm" className={`text-[11px] ${res === '1:1' ? 'text-accent' : ''}`} onClick={() => setRes('1:1')}>Instagram</Button>
          <Button variant="ghost" size="sm" className={`text-[11px] ${res === '16:9' ? 'text-accent' : ''}`} onClick={() => setRes('16:9')}>YouTube</Button>
          <Button variant="ghost" size="sm" className={`text-[11px] ${res.startsWith('4k') ? 'text-accent' : ''}`} onClick={() => setRes('4k-16:9')}>4K</Button>
        </div>
        <Button size="sm" icon={<Download size={14} />} disabled={!project?.videoUrl} onClick={() => setPreviewOpen(true)}>Preview & Export</Button>
      </div>

      {/* ── Main Layout ─────────────────────────────────────────── */}
      <div className="flex-1 grid grid-cols-1 lg:grid-cols-[300px_1fr] min-h-0">
        {/* Left Panel */}
        <div className="border-r border-white/8 overflow-y-auto p-4 hidden lg:block">{panelContent}</div>

        {/* Center: Canvas + Transport */}
        <div className="flex flex-col min-h-0 bg-black/40">
          <div className="flex-1 flex items-center justify-center p-4 min-h-0">
            <div className="relative h-full max-h-[calc(100vh-280px)] max-w-full" style={{ aspectRatio: res === '16:9' ? '16/9' : res === '1:1' ? '1/1' : '9/16' }}>
              <canvas ref={canvasRef} className="w-full h-full rounded-2xl border border-white/10 bg-black shadow-2xl" />
              {!project?.videoUrl && (
                <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-black/60 rounded-2xl">
                  <Type size={28} className="text-faint" />
                  <p className="text-[13px] text-faint text-center max-w-[220px]">Upload a video to start building your viral clip</p>
                  <Button size="sm" variant="secondary" onClick={() => setTab('media')}>Upload media</Button>
                </div>
              )}
            </div>
          </div>

          {/* Transport Controls */}
          {project?.videoUrl && (
            <div className="px-4 pb-2 shrink-0">
              <div className="card p-3 flex items-center gap-3">
                <button onClick={() => seek(Math.max(0, time - 5))} className="text-muted hover:text-fg cursor-pointer" aria-label="Back 5 seconds"><SkipBack size={17} /></button>
                <button onClick={togglePlay} className="w-9 h-9 rounded-full accent-gradient text-white flex items-center justify-center cursor-pointer hover:brightness-110" aria-label={playing ? 'Pause' : 'Play'}>
                  {playing ? <Pause size={16} /> : <Play size={16} className="ml-0.5" />}
                </button>
                <button onClick={() => seek(Math.min(duration, time + 5))} className="text-muted hover:text-fg cursor-pointer" aria-label="Forward 5 seconds"><SkipForward size={17} /></button>
                <span className="text-[12px] text-muted tabular-nums w-20 text-right">{fmtTime(time)} / {fmtTime(duration)}</span>
                <input
                  type="range" min={0} max={Math.max(0.1, duration)} step={0.05} value={time}
                  onChange={(e) => seek(Number(e.target.value))}
                  className="flex-1 range-accent cursor-pointer"
                  style={{ ['--fill' as string]: `${(time / Math.max(duration, 0.1)) * 100}%` }}
                  aria-label="Seek"
                />
                <Volume2 size={16} className="text-faint shrink-0" />
              </div>
            </div>
          )}
        </div>

        {/* Right Panel: Keyframe Editor (when clip selected) */}
        {selectedClipId && (
          <div className="hidden xl:block border-l border-white/8 overflow-y-auto p-4" style={{ width: 300 }}>
            <div className="flex items-center justify-between mb-3">
              <span className="text-[12px] font-semibold text-gray-300">Clip Properties</span>
              <button onClick={() => setSelectedClipId(null)} className="text-gray-500 hover:text-white"><X size={14} /></button>
            </div>

            {/* Clip info */}
            {selectedClip && (
              <div className="space-y-3">
                <div className="bg-gray-800/50 rounded-lg p-2">
                  <p className="text-[11px] text-gray-400">{selectedClip.name}</p>
                  <p className="text-[10px] text-gray-500">{selectedClip.timelineStart.toFixed(1)}s – {selectedClip.timelineEnd.toFixed(1)}s · {selectedClip.type}</p>
                </div>

                {/* Speed */}
                <Field label={`Speed: ${selectedClip.speed.toFixed(2)}×`}>
                  <input type="range" min="0.25" max="4" step="0.05" value={selectedClip.speed}
                    onChange={(e) => updateSelectedClip({ speed: parseFloat(e.target.value) })}
                    className="w-full"
                  />
                </Field>

                {/* Opacity */}
                <Field label={`Opacity: ${(selectedClip.opacity * 100).toFixed(0)}%`}>
                  <input type="range" min="0" max="1" step="0.05" value={selectedClip.opacity}
                    onChange={(e) => updateSelectedClip({ opacity: parseFloat(e.target.value) })}
                    className="w-full"
                  />
                </Field>

                {/* Mute */}
                <label className="flex items-center gap-2 cursor-pointer">
                  <input type="checkbox" checked={selectedClip.muted}
                    onChange={(e) => updateSelectedClip({ muted: e.target.checked })}
                    className="w-4 h-4 rounded"
                  />
                  <span className="text-[11px] text-gray-400">Muted</span>
                </label>

                {/* Transitions */}
                <div className="bg-gray-800/50 rounded-lg p-2">
                  <p className="text-[11px] text-gray-400 mb-2">Transitions</p>
                  <div className="flex gap-2">
                    <Button size="sm" variant="secondary" className="flex-1"
                      onClick={() => updateSelectedClip({
                        transitionIn: selectedClip.transitionIn
                          ? undefined
                          : { type: 'crossfade', duration: 0.5 }
                      })}
                    >
                      {selectedClip.transitionIn ? '✓ In' : '+ In'}
                    </Button>
                    <Button size="sm" variant="secondary" className="flex-1"
                      onClick={() => updateSelectedClip({
                        transitionOut: selectedClip.transitionOut
                          ? undefined
                          : { type: 'crossfade', duration: 0.5 }
                      })}
                    >
                      {selectedClip.transitionOut ? '✓ Out' : '+ Out'}
                    </Button>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex gap-2 pt-2">
                  <Button size="sm" variant="secondary" className="flex-1"
                    icon={<Scissors size={12} />}
                    onClick={() => {
                      const tl = splitClip(timeline, selectedClipId, time)
                      setTimeline(tl)
                      toast('info', 'Clip split')
                    }}
                  >
                    Split
                  </Button>
                  <Button size="sm" variant="danger" className="flex-1"
                    onClick={() => {
                      const tl = removeClip(timeline, selectedClipId)
                      setTimeline(tl)
                      setSelectedClipId(null)
                      toast('info', 'Clip removed')
                    }}
                  >
                    Delete
                  </Button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* ── Timeline (Bottom) ───────────────────────────────────── */}
      <div className="h-[200px] shrink-0 border-t border-white/8">
        <TimelineComponent
          timeline={timeline}
          onTimelineChange={setTimeline}
          currentTime={time}
          onTimeChange={(t) => {
            seek(t)
          }}
          duration={duration}
          selectedClipId={selectedClipId}
          onClipSelect={(id) => {
            setSelectedClipId(id)
            // Create a keyframe layer for the selected clip
            if (id) {
              const clip = timeline.tracks.flatMap(t => t.clips).find(c => c.id === id)
              if (clip) {
                setSelectedKeyframeLayer(clip.keyframes)
              }
            }
          }}
          pixelsPerSecond={60}
          onAddTrack={addTimelineTrack}
        />
      </div>

      {/* ── Mobile Tabs ─────────────────────────────────────────── */}
      <div className="lg:hidden border-t border-white/8 p-2 flex gap-1.5 shrink-0 bg-bg">
        {[
          { id: 'media', label: 'Media', icon: <Clapperboard size={14} /> },
          { id: 'captions', label: 'Captions', icon: <Captions size={14} /> },
          { id: 'voice', label: 'Voice', icon: <Mic size={14} /> },
          { id: 'style', label: 'Style', icon: <Palette size={14} /> },
          { id: 'color', label: 'Color', icon: <Sliders size={14} /> },
          { id: 'effects', label: 'FX', icon: <Sparkles size={14} /> },
        ].map((t) => (
          <button key={t.id} onClick={() => { setTab(t.id); setMobilePanel(true) }} className={`flex-1 flex flex-col items-center gap-0.5 py-1.5 rounded-lg text-[10px] font-medium cursor-pointer ${tab === t.id ? 'bg-accent-soft text-accent' : 'text-muted'}`}>{t.icon}{t.label}</button>
        ))}
      </div>

      {/* ── Mobile Panel Sheet ───────────────────────────────────── */}
      {mobilePanel && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={() => setMobilePanel(false)} />
          <div className="absolute bottom-0 left-0 right-0 max-h-[75vh] overflow-y-auto bg-surface border-t border-white/10 rounded-t-2xl p-4 anim-float-up">
            <div className="flex items-center justify-between mb-3">
              <p className="font-semibold text-[14px] capitalize">{tab} settings</p>
              <button onClick={() => setMobilePanel(false)} className="text-muted hover:text-fg cursor-pointer" aria-label="Close panel"><X size={18} /></button>
            </div>
            {panelContent}
          </div>
        </div>
      )}

      {/* ── Hidden Video Element ─────────────────────────────────── */}
      <video ref={videoRef} className="hidden" playsInline src={project?.videoUrl} onEnded={() => setPlaying(false)} onPlay={() => setPlaying(true)} onPause={() => setPlaying(false)} />

      {/* ── Export Progress ──────────────────────────────────────── */}
      {exporting && (
        <div className="fixed bottom-5 left-1/2 -translate-x-1/2 z-50 card bg-elevated/95 backdrop-blur-xl px-5 py-3.5 w-[320px]">
          <div className="flex items-center gap-2 mb-2">
            <Loader2 size={15} className="animate-spin text-accent" />
            <p className="text-[13px] font-semibold">Rendering in real-time…</p>
          </div>
          <ProgressBar value={progress} />
          <p className="text-[11px] text-faint mt-1.5">{Math.round(progress * 100)}% · {Math.round(duration)}s clip</p>
        </div>
      )}

      {/* ── Preview Modal ────────────────────────────────────────── */}
      <VideoPreviewModal
        open={previewOpen}
        videoUrl={project?.videoUrl || ''}
        clipDuration={duration}
        trimStart={0}
        trimEnd={duration}
        words={words}
        hooks={[]}
        platform={res === '9:16' ? 'tiktok' : 'youtube'}
        initialCaptionStyle={project?.captionStyle ?? 'pop-classic'}
        initialEditStyle={previewEditStyle}
        initialColorSkin={previewColorSkin}
        onClose={() => { setPreviewOpen(false); setExportedBlob(null) }}
        onExport={async (config) => {
          await exportVideo()
        }}
        exporting={exporting}
        exportProgress={progress}
        exportedBlob={exportedBlob}
        clipName={project?.name || 'clip'}
      />
    </div>
  )
}
