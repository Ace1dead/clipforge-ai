import { useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import {
  Clapperboard, Scissors, Columns2, MessagesSquare, Type, Mic, Sparkles, SlidersHorizontal,
  Smile, Boxes, AudioLines, Slice, Crop, Subtitles, Eraser, Download, Scale, Archive, FileMusic,
  Lightbulb, Calculator, CreditCard, Play, Trash2, ArrowRight, Zap, Radar,
} from 'lucide-react'
import type { ReactNode } from 'react'
import { Button, Card, Badge, EmptyState } from '../components/ui'
import { getProjects, deleteProject } from '../lib/store'
import { getApiUser } from '../lib/api'
import { fmtTime } from '../lib/format'

const QUICK: { to: string; label: string; desc: string; icon: ReactNode; accent?: boolean }[] = [
  { to: '/editor', label: 'New Clip', desc: 'Upload, add viral captions, export', icon: <Clapperboard size={20} />, accent: true },
  { to: '/tools/viral-scanner', label: 'Viral Scanner', desc: 'Scan video for viral moments & hooks', icon: <Radar size={20} /> },
  { to: '/tools/auto-clip', label: 'Auto Clip', desc: 'AI finds the highlights', icon: <Scissors size={20} /> },
  { to: '/tools/voiceover', label: 'AI Voiceover', desc: '27 premium voices', icon: <Mic size={20} /> },
  { to: '/tools/split-screen', label: 'Split Screen', desc: '2–4 videos one canvas', icon: <Columns2 size={20} /> },
  { to: '/tools/reddit-story', label: 'Reddit Story', desc: 'Posts → narrated videos', icon: <MessagesSquare size={20} /> },
  { to: '/tools/ai-images', label: 'AI Images', desc: 'Thumbnails & b-roll', icon: <Sparkles size={20} /> },
]

const TOOLS: { to: string; label: string; icon: ReactNode; group: string }[] = [
  { to: '/tools/viral-scanner', label: 'Viral Scanner', icon: <Radar size={15} />, group: 'Create' },
  { to: '/tools/fake-text', label: 'Fake Text', icon: <Type size={15} />, group: 'Create' },
  { to: '/tools/voice-changer', label: 'Voice Changer', icon: <SlidersHorizontal size={15} />, group: 'AI' },
  { to: '/tools/face-swap', label: 'Face Swap', icon: <Smile size={15} />, group: 'AI' },
  { to: '/tools/icon-generator', label: 'Icon Generator', icon: <Boxes size={15} />, group: 'AI' },
  { to: '/tools/speech-enhancer', label: 'Speech Enhancer', icon: <AudioLines size={15} />, group: 'AI' },
  { to: '/tools/video-cutter', label: 'Video Cutter', icon: <Slice size={15} />, group: 'Edit' },
  { to: '/tools/video-crop', label: 'Video Crop', icon: <Crop size={15} />, group: 'Edit' },
  { to: '/tools/subtitle-remover', label: 'Subtitle Remover', icon: <Subtitles size={15} />, group: 'Edit' },
  { to: '/tools/remove-bg', label: 'Background Remover', icon: <Eraser size={15} />, group: 'Edit' },
  { to: '/tools/downloader', label: 'Social Downloader', icon: <Download size={15} />, group: 'Edit' },
  { to: '/tools/audio-balancer', label: 'Audio Balancer', icon: <Scale size={15} />, group: 'Free' },
  { to: '/tools/video-compressor', label: 'Video Compressor', icon: <Archive size={15} />, group: 'Free' },
  { to: '/tools/mp3-converter', label: 'MP3 Converter', icon: <FileMusic size={15} />, group: 'Free' },
  { to: '/tools/brainstorm', label: 'Brainstorm Ideas', icon: <Lightbulb size={15} />, group: 'More' },
  { to: '/calculators', label: 'Calculators', icon: <Calculator size={15} />, group: 'More' },
  { to: '/pricing', label: 'Pricing', icon: <CreditCard size={15} />, group: 'More' },
]

export function Dashboard() {
  const navigate = useNavigate()
  const [projects, setProjects] = useState(getProjects)
  const user = getApiUser()

  useEffect(() => {
    if (!user) navigate('/login')
  }, [user, navigate])

  if (!user) return null

  return (
    <div className="max-w-6xl mx-auto px-4 md:px-8 py-8 anim-float-up">
      <div className="flex flex-wrap items-end justify-between gap-4 mb-8">
        <div>
          <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight">Welcome back, {user.display_name.split(' ')[0]} 👋</h1>
          <p className="text-muted text-[14px] mt-1.5">Your viral clip studio — {user.plan} plan · {user.credits} credits left</p>
        </div>
        <Link to="/editor"><Button size="lg" icon={<Zap size={17} />}>Create new clip</Button></Link>
      </div>

      <h2 className="font-semibold text-[15px] mb-3">Jump back in</h2>
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3 mb-10">
        {QUICK.map((q) => (
          <Link key={q.to} to={q.to}>
            <Card className={`p-4 h-full card-hover ${q.accent ? 'border-accent/30 bg-accent-soft/30' : ''}`}>
              <span className={`w-9 h-9 rounded-xl flex items-center justify-center mb-3 ${q.accent ? 'accent-gradient text-white' : 'bg-elevated text-accent'}`}>{q.icon}</span>
              <p className="text-[13px] font-semibold leading-tight">{q.label}</p>
              <p className="text-[11px] text-faint mt-1 leading-snug">{q.desc}</p>
            </Card>
          </Link>
        ))}
      </div>

      <div className="flex items-center justify-between mb-3">
        <h2 className="font-semibold text-[15px]">Recent projects</h2>
        <span className="text-[12px] text-faint">{projects.length} saved</span>
      </div>

      {projects.length === 0 ? (
        <Card>
          <EmptyState
            icon={<Clapperboard size={24} />}
            title="No projects yet"
            subtitle="Upload a video and add viral captions — your projects save automatically."
            action={<Link to="/editor"><Button icon={<ArrowRight size={15} />}>Start your first clip</Button></Link>}
          />
        </Card>
      ) : (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
          {projects.map((p) => (
            <Card key={p.id} className="overflow-hidden card-hover">
              <div className="aspect-video bg-black/60 relative">
                {p.videoUrl ? <video src={p.videoUrl} className="w-full h-full object-contain" muted /> : <div className="w-full h-full flex items-center justify-center text-faint text-[12px]">No preview</div>}
                <Link to={`/editor/${p.id}`} className="absolute inset-0 flex items-center justify-center bg-black/0 hover:bg-black/30 transition-colors group">
                  <span className="w-12 h-12 rounded-full accent-gradient text-white items-center justify-center hidden group-hover:flex shadow-xl"><Play size={18} /></span>
                </Link>
              </div>
              <div className="p-4">
                <div className="flex items-center justify-between">
                  <p className="font-semibold text-[14px] truncate">{p.name}</p>
                  <Badge>{p.captionStyle}</Badge>
                </div>
                <div className="flex items-center justify-between mt-2">
                  <p className="text-[11px] text-faint">{fmtTime(p.duration)} · {p.updatedAt.slice(0, 10)}</p>
                  <div className="flex gap-1">
                    <Link to={`/editor/${p.id}`}><Button variant="ghost" size="xs">Open</Button></Link>
                    <Button variant="ghost" size="xs" className="text-faint hover:text-red" icon={<Trash2 size={12} />} onClick={() => { deleteProject(p.id); setProjects(getProjects()) }} aria-label="Delete project" />
                  </div>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      <h2 className="font-semibold text-[15px] mb-3 mt-10">All tools</h2>
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2.5">
        {TOOLS.map((t) => (
          <Link key={t.to} to={t.to}>
            <div className="flex items-center gap-2.5 bg-elevated/60 border border-white/10 rounded-xl px-3.5 py-2.5 hover:border-white/25 hover:bg-elevated transition-colors cursor-pointer">
              <span className="text-accent">{t.icon}</span>
              <span className="text-[13px] font-medium">{t.label}</span>
            </div>
          </Link>
        ))}
      </div>
    </div>
  )
}
