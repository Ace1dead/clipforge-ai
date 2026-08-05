import { useEffect, useRef, useState } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import type { ReactNode } from 'react'
import {
  Play, Pause, Upload, Captions, Mic, Palette, Clapperboard, Download, Save, SkipBack, SkipForward,
  Volume2, Type, Sparkles, Wand2, Loader2, ArrowLeft, X,
} from 'lucide-react'
import { Button, Card, Tabs, Textarea, Select, Field, Slider, ProgressBar, Badge, toast } from '../components/ui'
import { MediaDropzone } from '../components/MediaDropzone'
import type { Picked } from '../components/MediaDropzone'
import { StylePicker } from '../components/StylePicker'
import { drawCaptions, getStyle } from '../lib/captions'
import { estimateWordTiming, estimateSpeakingTime, STREAMELEMENTS_VOICES, synthesizeStreamElements } from '../lib/tts'
import { renderComposition, videoMeta } from '../lib/video'
import { decodeAudio } from '../lib/audio'
import { upsertProject, getProjects, deleteProject } from '../lib/store'
import type { Project } from '../lib/store'
import { fmtTime, downloadBlob, fmtBytes, uid } from '../lib/format'

const SAMPLE_SCRIPT = 'This is how you go viral. Post daily. Study the trends. Never stop testing. And always — always — keep the captions popping.'

type Res = '9:16' | '16:9' | '1:1'
const OUT: Record<Res, { w: number; h: number }> = { '9:16': { w: 1080, h: 1920 }, '16:9': { w: 1920, h: 1080 }, '1:1': { w: 1080, h: 1080 } }

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
  const [generatingVoice, setGeneratingVoice] = useState(false)
  const [progress, setProgress] = useState(0)
  const [res, setRes] = useState<Res>('9:16')
  const videoRef = useRef<HTMLVideoElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const rafRef = useRef(0)

  const duration = project?.duration ?? 0
  const outDims = OUT[res]
  const words = project?.words ?? []

  useEffect(() => {
    if (project && project.videoUrl) {
      const t = setTimeout(() => upsertProject(project), 800)
      return () => clearTimeout(t)
    }
  }, [project])

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
      }
    } catch { /* ignore */ }
  }, [])

  const update = (patch: Partial<Project>) => setProject((p) => (p ? { ...p, ...patch, updatedAt: new Date().toISOString() } : p))

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

  useEffect(() => {
    if (!project?.videoUrl) return
    const loop = () => {
      const canvas = canvasRef.current
      const video = videoRef.current
      const ctx = canvas?.getContext('2d')
      if (canvas && ctx) {
        const w = canvas.width
        const h = canvas.height
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
        }
      }
      rafRef.current = requestAnimationFrame(loop)
    }
    rafRef.current = requestAnimationFrame(loop)
    return () => cancelAnimationFrame(rafRef.current)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [project?.videoUrl, words, project?.captionStyle, res])

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

  const exportVideo = async () => {
    if (!project?.videoUrl) { toast('error', 'Add a video first'); return }
    setExporting(true)
    setProgress(0)
    try {
      const blob = await renderComposition({
        sources: [{ url: project.videoUrl }],
        outW: outDims.w, outH: outDims.h,
        bitrate: 8_000_000,
        audioLayers: project.voiceoverUrl ? [{ url: project.voiceoverUrl, gain: 1 }] : [],
        draw: (ctx, t, w, h) => drawCaptions(ctx, words, getStyle(project.captionStyle), t, w, h),
        onProgress: setProgress,
      })
      downloadBlob(blob, `${(project.name || 'clip').replace(/\s+/g, '-')}_final.webm`)
      toast('success', 'Export complete', fmtBytes(blob.size))
    } catch (e) {
      toast('error', 'Export failed', e instanceof Error ? e.message : undefined)
    } finally { setExporting(false) }
  }

  const removeProject = () => {
    if (!project?.id) return
    deleteProject(project.id)
    toast('success', 'Project deleted')
    navigate('/dashboard')
  }

  const panelContent: ReactNode = (
    <>
      <Tabs
        tabs={[
          { id: 'media', label: 'Media', icon: <Clapperboard size={13} /> },
          { id: 'captions', label: 'Captions', icon: <Captions size={13} /> },
          { id: 'voice', label: 'Voice', icon: <Mic size={13} /> },
          { id: 'style', label: 'Style', icon: <Palette size={13} /> },
        ]}
        active={tab}
        onChange={setTab}
      />
      <div className="mt-4">
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
              <Field label="Output ratio">
                <Select value={res} onChange={(e) => setRes(e.target.value as Res)}>
                  <option value="9:16">9:16 Vertical (Shorts/TikTok)</option>
                  <option value="16:9">16:9 Widescreen</option>
                  <option value="1:1">1:1 Square</option>
                </Select>
              </Field>
              <p className="text-[11px] text-faint mt-1.5">{outDims.w}×{outDims.h} · WebM export</p>
            </div>
          </div>
        )}

        {tab === 'captions' && (
          <div className="space-y-3">
            {/* AI Script Generator */}
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
                <Button
                  size="sm"
                  icon={<Sparkles size={12} />}
                  loading={generatingScript}
                  onClick={generateScript}
                  disabled={!aiScriptTopic.trim()}
                >
                  Generate
                </Button>
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

        {tab === 'style' && (
          <StylePicker value={project?.captionStyle ?? 'pop-classic'} onChange={(sid) => update({ captionStyle: sid })} />
        )}
      </div>
    </>
  )

  return (
    <div className="flex flex-col h-full">
      {/* top bar */}
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
        </div>
        <Button size="sm" icon={<Download size={14} />} loading={exporting} disabled={!project?.videoUrl} onClick={() => void exportVideo()}>Export</Button>
      </div>

      <div className="flex-1 grid grid-cols-1 lg:grid-cols-[300px_1fr] min-h-0">
        <div className="border-r border-white/8 overflow-y-auto p-4 hidden lg:block">{panelContent}</div>

        <div className="flex flex-col min-h-0 bg-black/40">
          <div className="flex-1 flex items-center justify-center p-4 min-h-0">
            <div className="relative h-full max-h-[calc(100vh-190px)] max-w-full" style={{ aspectRatio: res === '16:9' ? '16/9' : res === '1:1' ? '1/1' : '9/16' }}>
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

          {project?.videoUrl && (
            <div className="px-4 pb-4 shrink-0">
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
      </div>

      {/* mobile tabs */}
      <div className="lg:hidden border-t border-white/8 p-2 flex gap-1.5 shrink-0 bg-bg">
        {[
          { id: 'media', label: 'Media', icon: <Clapperboard size={14} /> },
          { id: 'captions', label: 'Captions', icon: <Captions size={14} /> },
          { id: 'voice', label: 'Voice', icon: <Mic size={14} /> },
          { id: 'style', label: 'Style', icon: <Palette size={14} /> },
        ].map((t) => (
          <button key={t.id} onClick={() => { setTab(t.id); setMobilePanel(true) }} className={`flex-1 flex flex-col items-center gap-0.5 py-1.5 rounded-lg text-[10px] font-medium cursor-pointer ${tab === t.id ? 'bg-accent-soft text-accent' : 'text-muted'}`}>{t.icon}{t.label}</button>
        ))}
      </div>

      {/* mobile panel sheet */}
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

      <video ref={videoRef} className="hidden" playsInline src={project?.videoUrl} onEnded={() => setPlaying(false)} onPlay={() => setPlaying(true)} onPause={() => setPlaying(false)} />

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
    </div>
  )
}