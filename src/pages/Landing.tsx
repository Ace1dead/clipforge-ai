import { Link } from 'react-router-dom'
import type { ReactNode } from 'react'
import {
  Zap, Mic, Captions, Scissors, Sparkles, Columns2, MessagesSquare, Type, SlidersHorizontal,
  Smile, Boxes, AudioLines, Slice, Crop, Subtitles, Eraser, Download, Scale, Archive, FileMusic,
  Lightbulb, Calculator, ChevronRight, Play, ArrowRight, Wand2, Image as ImageIcon, Radar,
} from 'lucide-react'
import { Button, Card, Logo, Badge } from '../components/ui'

interface Tool { name: string; desc: string; icon: ReactNode; to: string; premium?: boolean }

const TOOLS: { group: string; items: Tool[] }[] = [
      {
        group: 'Generate Videos',
        items: [
          { name: 'Viral Scanner', desc: 'Scan for viral moments, hooks & clips', icon: <Radar size={18} />, to: '/tools/viral-scanner' },
          { name: 'Split Screen', desc: 'Combine 2–4 videos into viral layouts', icon: <Columns2 size={18} />, to: '/tools/split-screen' },
      { name: 'Reddit Story', desc: 'Reddit posts → narrated captioned videos', icon: <MessagesSquare size={18} />, to: '/tools/reddit-story' },
      { name: 'Fake Text', desc: 'The brainrot format, one click', icon: <Type size={18} />, to: '/tools/fake-text' },
      { name: 'Auto Clip', desc: 'AI finds your best moments', icon: <Scissors size={18} />, to: '/tools/auto-clip' },
    ],
  },
  {
    group: 'AI Tools',
    items: [
      { name: 'AI Voiceover', desc: '27 premium voices, 12 languages', icon: <Mic size={18} />, to: '/tools/voiceover', premium: true },
      { name: 'AI Images', desc: 'Thumbnails, b-roll, backgrounds', icon: <Sparkles size={18} />, to: '/tools/ai-images', premium: true },
      { name: 'Voice Changer', desc: 'Deep to chipmunk in seconds', icon: <SlidersHorizontal size={18} />, to: '/tools/voice-changer' },
      { name: 'Face Swap', desc: 'Blend faces into any photo', icon: <Smile size={18} />, to: '/tools/face-swap', premium: true },
      { name: 'Icon Generator', desc: 'Brand icons from a prompt', icon: <Boxes size={18} />, to: '/tools/icon-generator' },
      { name: 'Speech Enhancer', desc: 'Broadcast-clean audio, remove noise', icon: <AudioLines size={18} />, to: '/tools/speech-enhancer' },
    ],
  },
  {
    group: 'Editing Tools',
    items: [
      { name: 'Video Cutter', desc: 'Trim to the perfect moment', icon: <Slice size={18} />, to: '/tools/video-cutter' },
      { name: 'Video Crop', desc: 'Every ratio for every platform', icon: <Crop size={18} />, to: '/tools/video-crop' },
      { name: 'Subtitle Remover', desc: 'Clean burned-in subtitles', icon: <Subtitles size={18} />, to: '/tools/subtitle-remover' },
      { name: 'Background Remover', desc: 'Images & video, one click', icon: <Eraser size={18} />, to: '/tools/remove-bg', premium: true },
      { name: 'Social Downloader', desc: 'YouTube, TikTok, direct links', icon: <Download size={18} />, to: '/tools/downloader' },
    ],
  },
  {
    group: 'Free Tools',
    items: [
      { name: 'Audio Balancer', desc: 'Fix quiet videos instantly', icon: <Scale size={18} />, to: '/tools/audio-balancer' },
      { name: 'Video Compressor', desc: 'Smaller files, same quality', icon: <Archive size={18} />, to: '/tools/video-compressor' },
      { name: 'MP3 Converter', desc: 'Any media to MP3', icon: <FileMusic size={18} />, to: '/tools/mp3-converter' },
    ],
  },
  {
    group: 'Creator Tools',
    items: [
      { name: 'Brainstorm Ideas', desc: 'Viral hooks on demand', icon: <Lightbulb size={18} />, to: '/tools/brainstorm' },
      { name: 'Calculators', desc: 'Views → money, clip counts', icon: <Calculator size={18} />, to: '/calculators' },
      { name: 'Icon Generator', desc: 'Channel branding icons', icon: <ImageIcon size={18} />, to: '/tools/icon-generator' },
    ],
  },
]

const STEPS = [
  { n: 1, title: 'Upload your video', desc: 'Any file — or paste a link. Your media never leaves your browser.' },
  { n: 2, title: 'Select subtitle style', desc: '18 viral caption styles — pop, neon, karaoke, glitch and more.' },
  { n: 3, title: 'Generate video', desc: 'Watch it render in seconds, then post to Shorts, Reels or TikTok.' },
]

const FAQS = [
  { q: 'Is it really free?', a: 'Yes — the free plan includes the editor, 18 caption styles, and 3 free credits to try premium AI tools like voiceovers.' },
  { q: 'What is a credit?', a: 'One credit = one premium AI generation (voiceover, AI image batch, background removal).' },
  { q: 'Can I monetize videos?', a: 'Absolutely. Everything you create is yours to publish and monetize on any platform.' },
  { q: 'Does it work in other languages?', a: 'Voiceover supports 12 languages, and captions work with any script.' },
  { q: 'Where does my media go?', a: 'All processing happens in your browser. Nothing is uploaded to any server.' },
]

export function Landing() {
  return (
    <div className="min-h-screen">
      {/* nav */}
      <header className="glass border-b border-white/8 sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 md:px-8 h-16 flex items-center gap-6">
          <Logo />
          <nav className="hidden md:flex gap-5 text-[13px] text-muted">
            <a href="#features" className="hover:text-fg">Features</a>
            <a href="#tools" className="hover:text-fg">Tools</a>
            <a href="#pricing" className="hover:text-fg">Pricing</a>
            <a href="#faq" className="hover:text-fg">FAQ</a>
          </nav>
          <div className="flex-1" />
          <Link to="/login"><Button variant="ghost" size="sm">Sign in</Button></Link>
            <Link to="/login"><Button size="sm" icon={<Zap size={14} />}>Try ClipForge</Button></Link>
        </div>
      </header>

      {/* hero */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 grid-bg opacity-60" />
        <div className="max-w-7xl mx-auto px-4 md:px-8 pt-20 pb-16 text-center relative">
          <Badge tone="accent" className="mb-5">Open-source video editor</Badge>
          <h1 className="text-4xl md:text-6xl font-black tracking-tight leading-[1.05]">
            Edit viral videos <br /> <span className="gradient-text">with AI</span>
          </h1>
          <p className="text-muted text-lg mt-5 max-w-xl mx-auto leading-relaxed">
            All-in-one platform for AI voiceovers, engaging subtitles, auto-clips and optimized gameplay. All processing happens in your browser — nothing leaves your device.
          </p>
          <div className="flex items-center justify-center gap-3 mt-8">
            <Link to="/login"><Button size="lg" icon={<Play size={18} />}>Try it free</Button></Link>
            <Link to="/pricing"><Button variant="secondary" size="lg">See pricing</Button></Link>
          </div>
          <div className="mt-14 grid grid-cols-3 max-w-lg mx-auto gap-4">
            {[['18+', 'caption styles'], ['27', 'AI voices'], ['100%', 'browser-based']].map(([v, l]) => (
              <div key={l}>
                <p className="text-2xl font-extrabold gradient-text">{v}</p>
                <p className="text-[12px] text-muted mt-1">{l}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 3-step workflow */}
      <section className="max-w-7xl mx-auto px-4 md:px-8 py-16">
        <div className="text-center mb-10">
          <p className="text-accent text-[13px] font-bold uppercase tracking-widest">3 step workflow</p>
          <h2 className="text-3xl font-extrabold tracking-tight mt-2">Ways to go viral</h2>
        </div>
        <div className="grid md:grid-cols-3 gap-5">
          {STEPS.map((s) => (
            <Card key={s.n} className="p-6 card-hover relative">
              <span className="w-10 h-10 rounded-xl accent-gradient text-white font-extrabold flex items-center justify-center mb-4">{s.n}</span>
              <h3 className="font-bold text-[16px] mb-2">{s.title}</h3>
              <p className="text-muted text-[13px] leading-relaxed">{s.desc}</p>
            </Card>
          ))}
        </div>
      </section>

      {/* features */}
      <section id="features" className="max-w-7xl mx-auto px-4 md:px-8 py-16">
        <div className="text-center mb-10">
          <p className="text-accent text-[13px] font-bold uppercase tracking-widest">Countless tools</p>
          <h2 className="text-3xl font-extrabold tracking-tight mt-2">Everything you need to go viral</h2>
          <p className="text-muted mt-3 max-w-xl mx-auto">From cutting-edge speech enhancement to downloading videos — we've got you covered.</p>
        </div>
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {TOOLS.flatMap((g) => g.items).map((t, i) => (
            <Link key={`${t.name}-${i}`} to={t.to}>
              <Card className="p-5 card-hover h-full">
                <div className="flex items-center justify-between mb-3">
                  <span className="w-9 h-9 rounded-xl bg-accent-soft text-accent flex items-center justify-center">{t.icon}</span>
                  {t.premium && <Badge tone="amber">Pro</Badge>}
                </div>
                <h3 className="font-bold text-[14px]">{t.name}</h3>
                <p className="text-[12px] text-muted mt-1 leading-relaxed">{t.desc}</p>
              </Card>
            </Link>
          ))}
        </div>
      </section>

      {/* tools grid */}
      <section id="tools" className="max-w-7xl mx-auto px-4 md:px-8 py-16">
        {TOOLS.map((g) => (
          <div key={g.group} className="mb-10">
            <h3 className="font-bold text-[18px] mb-4 flex items-center gap-2"><Wand2 size={17} className="text-accent" /> {g.group}</h3>
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {g.items.map((t, i) => (
                <Link key={i} to={t.to}>
                  <div className="flex items-center gap-3 bg-surface border border-white/8 rounded-xl px-4 py-3 hover:border-white/25 hover:bg-elevated transition-colors">
                    <span className="text-accent">{t.icon}</span>
                    <div className="flex-1 min-w-0">
                      <p className="text-[13px] font-semibold flex items-center gap-1.5">{t.name} {t.premium && <Badge tone="amber">Pro</Badge>}</p>
                      <p className="text-[11px] text-faint truncate">{t.desc}</p>
                    </div>
                    <ChevronRight size={15} className="text-faint" />
                  </div>
                </Link>
              ))}
            </div>
          </div>
        ))}
      </section>

      {/* testimonials removed — no fake endorsements */}

      {/* pricing teaser */}
      <section id="pricing" className="max-w-7xl mx-auto px-4 md:px-8 py-16">
        <Card className="p-10 md:p-14 text-center relative overflow-hidden">
          <div className="absolute -top-24 left-1/2 -translate-x-1/2 w-[600px] h-[300px] accent-gradient opacity-20 blur-3xl rounded-full" />
          <h2 className="text-3xl font-extrabold tracking-tight relative">Start free. Upgrade when you're ready.</h2>
          <p className="text-muted mt-3 max-w-md mx-auto">Every plan includes the editor and caption styles. Premium unlocks voiceovers, AI images and background removal.</p>
          <div className="flex items-center justify-center gap-3 mt-7 relative">
            <Link to="/pricing"><Button size="lg">Compare plans</Button></Link>
            <Link to="/login"><Button variant="secondary" size="lg" icon={<ArrowRight size={16} />}>Start creating</Button></Link>
          </div>
        </Card>
      </section>

      {/* FAQ */}
      <section id="faq" className="max-w-3xl mx-auto px-4 md:px-8 py-16">
        <h2 className="text-3xl font-extrabold tracking-tight text-center mb-8">Frequently asked questions</h2>
        <div className="space-y-3">
          {FAQS.map((f) => (
            <details key={f.q} className="card p-5 group">
              <summary className="font-semibold text-[14px] cursor-pointer list-none flex items-center justify-between">
                {f.q}
                <span className="text-faint group-open:rotate-45 transition-transform">+</span>
              </summary>
              <p className="text-muted text-[13px] mt-3 leading-relaxed">{f.a}</p>
            </details>
          ))}
        </div>
      </section>

      {/* footer */}
      <footer className="border-t border-white/8 py-10">
        <div className="max-w-7xl mx-auto px-4 md:px-8 grid md:grid-cols-4 gap-8">
          <div>
            <Logo />
            <p className="text-[12px] text-faint mt-3 leading-relaxed">Open-source video editor. All processing happens in your browser.</p>
          </div>
          <div>
            <p className="text-[12px] font-bold uppercase tracking-wider text-faint mb-3">Product</p>
            <div className="space-y-2">
              <Link to="/login" className="block text-[13px] text-muted hover:text-fg">Editor</Link>
              <Link to="/pricing" className="block text-[13px] text-muted hover:text-fg">Pricing</Link>
              <Link to="/calculators" className="block text-[13px] text-muted hover:text-fg">Calculators</Link>
            </div>
          </div>
          <div>
            <p className="text-[12px] font-bold uppercase tracking-wider text-faint mb-3">Tools</p>
            <div className="space-y-2">
              <Link to="/tools/voiceover" className="block text-[13px] text-muted hover:text-fg">AI Voiceover</Link>
              <Link to="/tools/ai-images" className="block text-[13px] text-muted hover:text-fg">AI Images</Link>
              <Link to="/tools/auto-clip" className="block text-[13px] text-muted hover:text-fg">Auto Clip</Link>
            </div>
          </div>
          <div>
            <p className="text-[12px] font-bold uppercase tracking-wider text-faint mb-3">Legal</p>
            <div className="space-y-2">
              <Link to="/terms" className="block text-[13px] text-muted hover:text-fg">Terms</Link>
              <Link to="/privacy" className="block text-[13px] text-muted hover:text-fg">Privacy</Link>
            </div>
          </div>
        </div>
      </footer>
    </div>
  )
}