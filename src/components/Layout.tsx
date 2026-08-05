import { useState } from 'react'
import { NavLink, Outlet, Link, useNavigate } from 'react-router-dom'
import type { ReactNode } from 'react'
import {
  Clapperboard, Scissors, Columns2, MessagesSquare, Type, Mic, Sparkles, SlidersHorizontal,
  Smile, Boxes, AudioLines, Slice, Crop, Subtitles, Eraser, Download, Scale, Archive, FileMusic,
  Lightbulb, Calculator, CreditCard, Menu, X, LogOut, Zap, ChevronRight, Settings, Film, Layers,
} from 'lucide-react'
import { Logo, Badge, Button, cx } from './ui'
import { getApiUser, clearAuth } from '../lib/api'

interface NavItem { to: string; label: string; icon: ReactNode; premium?: boolean }
interface NavGroup { title: string; items: NavItem[] }

const NAV: NavGroup[] = [
  {
    title: 'Create',
    items: [
      { to: '/editor', label: 'New Clip', icon: <Clapperboard size={16} /> },
      { to: '/tools/auto-clip', label: 'Auto Clip', icon: <Scissors size={16} /> },
      { to: '/tools/split-screen', label: 'Split Screen', icon: <Columns2 size={16} /> },
      { to: '/tools/reddit-story', label: 'Reddit Story', icon: <MessagesSquare size={16} /> },
      { to: '/tools/fake-text', label: 'Fake Text', icon: <Type size={16} /> },
      { to: '/tools/stock-media', label: 'Stock Media', icon: <Film size={16} /> },
      { to: '/tools/batch', label: 'Batch Process', icon: <Layers size={16} /> },
    ],
  },
  {
    title: 'AI Tools',
    items: [
      { to: '/tools/voiceover', label: 'AI Voiceover', icon: <Mic size={16} />, premium: true },
      { to: '/tools/ai-images', label: 'AI Images', icon: <Sparkles size={16} />, premium: true },
      { to: '/tools/voice-changer', label: 'Voice Changer', icon: <SlidersHorizontal size={16} /> },
      { to: '/tools/face-swap', label: 'Face Swap', icon: <Smile size={16} />, premium: true },
      { to: '/tools/icon-generator', label: 'Icon Generator', icon: <Boxes size={16} /> },
      { to: '/tools/speech-enhancer', label: 'Speech Enhancer', icon: <AudioLines size={16} /> },
    ],
  },
  {
    title: 'Editing Tools',
    items: [
      { to: '/tools/video-cutter', label: 'Video Cutter', icon: <Slice size={16} /> },
      { to: '/tools/video-crop', label: 'Video Crop', icon: <Crop size={16} /> },
      { to: '/tools/subtitle-remover', label: 'Subtitle Remover', icon: <Subtitles size={16} /> },
      { to: '/tools/remove-bg', label: 'Background Remover', icon: <Eraser size={16} />, premium: true },
      { to: '/tools/downloader', label: 'Social Downloader', icon: <Download size={16} /> },
    ],
  },
  {
    title: 'Free Tools',
    items: [
      { to: '/tools/audio-balancer', label: 'Audio Balancer', icon: <Scale size={16} /> },
      { to: '/tools/video-compressor', label: 'Video Compressor', icon: <Archive size={16} /> },
      { to: '/tools/mp3-converter', label: 'MP3 Converter', icon: <FileMusic size={16} /> },
    ],
  },
  {
    title: 'Resources',
    items: [
      { to: '/tools/brainstorm', label: 'Brainstorm Ideas', icon: <Lightbulb size={16} /> },
      { to: '/calculators', label: 'Calculators', icon: <Calculator size={16} /> },
      { to: '/pricing', label: 'Pricing', icon: <CreditCard size={16} /> },
      { to: '/ai-settings', label: 'AI Settings', icon: <Settings size={16} /> },
    ],
  },
]

function SidebarContent({ onNavigate }: { onNavigate?: () => void }) {
  const user = getApiUser()
  const navigate = useNavigate()
  return (
    <div className="flex flex-col h-full">
      <div className="px-5 py-5">
        <Link to="/" onClick={onNavigate}><Logo /></Link>
      </div>
      <nav className="flex-1 overflow-y-auto px-3 pb-4 space-y-5">
        {NAV.map((g) => (
          <div key={g.title}>
            <p className="px-2 text-[10px] font-bold uppercase tracking-[0.14em] text-faint mb-1.5">{g.title}</p>
            {g.items.map((it) => (
              <NavLink
                key={it.to}
                to={it.to}
                onClick={onNavigate}
                className={({ isActive }) => cx(
                  'flex items-center gap-2.5 px-2.5 py-2 rounded-xl text-[13px] font-medium transition-colors mb-0.5',
                  isActive ? 'bg-accent-soft text-accent' : 'text-muted hover:text-fg hover:bg-white/5',
                )}
              >
                {it.icon}
                <span className="flex-1">{it.label}</span>
                {it.premium && <Badge tone="amber">Pro</Badge>}
              </NavLink>
            ))}
          </div>
        ))}
      </nav>
      <div className="p-4 border-t border-white/8">
        {user ? (
          <div className="flex items-center gap-2.5">
            <span className="w-8 h-8 rounded-full accent-gradient flex items-center justify-center text-white text-[13px] font-bold uppercase">{(user.display_name || 'U')[0]}</span>
            <div className="min-w-0 flex-1">
              <p className="text-[13px] font-semibold truncate">{user.display_name}</p>
              <p className="text-[11px] text-faint">{user.plan} · {user.credits} credits</p>
            </div>
            <button
              className="text-faint hover:text-red cursor-pointer"
              onClick={() => { clearAuth(); navigate('/'); }}
              aria-label="Log out"
            >
              <LogOut size={16} />
            </button>
          </div>
        ) : (
          <Button size="sm" className="w-full" onClick={() => navigate('/login')}>Sign in</Button>
        )}
      </div>
    </div>
  )
}

export function ToolLayout({ children, active }: { children?: ReactNode; active?: string }) {
  const [open, setOpen] = useState(false)
  const user = getApiUser()
  const navigate = useNavigate()
  return (
    <div className="flex h-screen overflow-hidden">
      <aside className="hidden lg:block w-[248px] shrink-0 border-r border-white/8 bg-bg/80">
        <SidebarContent />
      </aside>
      {open && (
        <div className="fixed inset-0 z-40 lg:hidden">
          <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={() => setOpen(false)} />
          <aside className="absolute left-0 top-0 bottom-0 w-[280px] bg-bg border-r border-white/10 anim-float-up">
            <button className="absolute right-3 top-4 text-muted hover:text-fg cursor-pointer" onClick={() => setOpen(false)} aria-label="Close menu"><X size={20} /></button>
            <SidebarContent onNavigate={() => setOpen(false)} />
          </aside>
        </div>
      )}
      <div className="flex-1 flex flex-col min-w-0">
        <header className="glass border-b border-white/8 h-14 flex items-center gap-3 px-4 shrink-0">
          <button className="lg:hidden text-muted cursor-pointer" onClick={() => setOpen(true)} aria-label="Open menu"><Menu size={20} /></button>
          <Link to="/dashboard" className="text-[13px] text-muted hover:text-fg hidden sm:inline-flex items-center gap-1">
            Dashboard <ChevronRight size={13} />
          </Link>
          <div className="flex-1" />
          <Link to="/pricing" className="hidden sm:block">
            <Button variant="soft" size="sm" icon={<Zap size={14} />}>
              {user && user.plan !== 'free' ? 'Manage plan' : 'Upgrade'}
            </Button>
          </Link>
          {user ? (
            <button className="flex items-center gap-2 cursor-pointer group" onClick={() => navigate('/dashboard')}>
              <span className="w-7 h-7 rounded-full accent-gradient flex items-center justify-center text-white text-[12px] font-bold uppercase">{(user.display_name || 'U')[0]}</span>
              <span className="hidden md:block text-[13px] font-medium group-hover:text-accent">{user.display_name}</span>
            </button>
          ) : (
            <Button variant="secondary" size="sm" onClick={() => navigate('/login')}>Sign in</Button>
          )}
        </header>
        <main className="flex-1 overflow-y-auto">{children ?? <Outlet />}</main>
      </div>
    </div>
  )
}

export { NAV }