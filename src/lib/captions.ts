export interface CaptionStyle {
  align?: 'left' | 'center'
  id: string
  name: string
  family: 'sans' | 'serif' | 'mono' | 'impact' | 'condensed'
  weight: number
  fontSize: number
  uppercase: boolean
  letterSpacing: number
  pos: 'top' | 'middle' | 'bottom'
  offsetY: number
  fill: string
  gradient?: [string, string]
  stroke?: { color: string; width: number }
  glow?: { color: string; blur: number }
  highlight: string
  bg?: { color: string; radius: number; padX: number; padY: number; opacity: number }
  shadow?: { color: string; blur: number; y: number }
  anim: 'pop' | 'fade' | 'slide' | 'bounce' | 'karaoke' | 'typewriter' | 'glitch' | 'party' | 'none'
}

export const CAPTION_STYLES: CaptionStyle[] = [
  { id: 'pop-classic', name: 'Pop Classic', family: 'sans', weight: 800, fontSize: 0.062, uppercase: true, letterSpacing: 0.01, pos: 'middle', offsetY: 0.02, fill: '#ffffff', stroke: { color: '#000000', width: 0.045 }, highlight: '#5e6ad2', anim: 'pop' },
  { id: 'pop-red', name: 'Pop Red', family: 'sans', weight: 800, fontSize: 0.062, uppercase: true, letterSpacing: 0.01, pos: 'middle', offsetY: 0.02, fill: '#ffffff', stroke: { color: '#000000', width: 0.045 }, highlight: '#f87171', anim: 'pop' },
  { id: 'pop-yellow', name: 'Pop Yellow', family: 'sans', weight: 800, fontSize: 0.062, uppercase: true, letterSpacing: 0.01, pos: 'middle', offsetY: 0.02, fill: '#ffffff', stroke: { color: '#000000', width: 0.045 }, highlight: '#fbbf24', anim: 'pop' },
  { id: 'pop-cyan', name: 'Pop Cyan', family: 'sans', weight: 800, fontSize: 0.062, uppercase: true, letterSpacing: 0.01, pos: 'middle', offsetY: 0.02, fill: '#ffffff', stroke: { color: '#000000', width: 0.045 }, highlight: '#22d3ee', anim: 'pop' },
  { id: 'neon', name: 'Neon Glow', family: 'sans', weight: 800, fontSize: 0.058, uppercase: true, letterSpacing: 0.02, pos: 'middle', offsetY: 0, fill: '#ffffff', glow: { color: '#22d3ee', blur: 0.06 }, highlight: '#ec4899', anim: 'pop' },
  { id: 'gradient', name: 'Gradient', family: 'sans', weight: 800, fontSize: 0.06, uppercase: true, letterSpacing: 0.012, pos: 'middle', offsetY: 0.02, fill: '#ffffff', gradient: ['#5e6ad2', '#ec4899'], stroke: { color: 'rgba(0,0,0,0.6)', width: 0.02 }, highlight: '#ffffff', anim: 'pop' },
  { id: 'impact', name: 'Impact', family: 'impact', weight: 900, fontSize: 0.064, uppercase: true, letterSpacing: 0.005, pos: 'middle', offsetY: 0.02, fill: '#fbbf24', stroke: { color: '#000000', width: 0.05 }, highlight: '#ffffff', anim: 'pop' },
  { id: 'white-box', name: 'White Box', family: 'sans', weight: 800, fontSize: 0.05, uppercase: false, letterSpacing: 0.008, pos: 'bottom', offsetY: -0.06, fill: '#ffffff', bg: { color: 'rgba(0,0,0,0.72)', radius: 0.02, padX: 0.015, padY: 0.006, opacity: 1 }, highlight: '#fbbf24', anim: 'pop' },
  { id: 'comic', name: 'Comic', family: 'sans', weight: 800, fontSize: 0.055, uppercase: true, letterSpacing: 0.005, pos: 'middle', offsetY: 0, fill: '#111111', stroke: { color: '#ffffff', width: 0.05 }, highlight: '#ef4444', anim: 'pop' },
  { id: 'karaoke', name: 'Karaoke', family: 'sans', weight: 800, fontSize: 0.058, uppercase: true, letterSpacing: 0.01, pos: 'middle', offsetY: 0.02, fill: '#9aa1ad', stroke: { color: 'rgba(0,0,0,0.55)', width: 0.02 }, highlight: '#ffffff', anim: 'karaoke' },
  { id: 'typewriter', name: 'Typewriter', family: 'mono', weight: 700, fontSize: 0.052, uppercase: false, letterSpacing: 0.02, pos: 'middle', offsetY: 0.02, fill: '#ffffff', stroke: { color: 'rgba(0,0,0,0.6)', width: 0.02 }, highlight: '#22d3ee', anim: 'typewriter' },
  { id: 'chrome', name: 'Chrome', family: 'impact', weight: 900, fontSize: 0.062, uppercase: true, letterSpacing: 0.01, pos: 'middle', offsetY: 0.02, fill: '#e5e7eb', gradient: ['#f8fafc', '#94a3b8'], highlight: '#ffffff', shadow: { color: 'rgba(0,0,0,0.7)', blur: 0.02, y: 0.02 }, anim: 'pop' },
  { id: 'glitch', name: 'Glitch', family: 'sans', weight: 800, fontSize: 0.058, uppercase: true, letterSpacing: 0.01, pos: 'middle', offsetY: 0.02, fill: '#ffffff', stroke: { color: '#000000', width: 0.03 }, highlight: '#00ffcc', anim: 'glitch' },
  { id: 'minimal', name: 'Minimal', family: 'sans', weight: 500, fontSize: 0.045, uppercase: false, letterSpacing: 0.015, pos: 'bottom', offsetY: -0.05, fill: 'rgba(255,255,255,0.92)', highlight: '#ffffff', anim: 'fade' },
  { id: 'subtitle', name: 'Subtitle', family: 'sans', weight: 600, fontSize: 0.042, uppercase: false, letterSpacing: 0.01, pos: 'bottom', offsetY: -0.04, fill: '#ffffff', stroke: { color: 'rgba(0,0,0,0.85)', width: 0.02 }, highlight: '#ffffff', anim: 'fade' },
  { id: 'bounce', name: 'Bounce', family: 'condensed', weight: 900, fontSize: 0.062, uppercase: true, letterSpacing: 0.008, pos: 'middle', offsetY: 0.02, fill: '#ffffff', stroke: { color: '#000000', width: 0.045 }, highlight: '#fbbf24', anim: 'bounce' },
  { id: 'party', name: 'Party', family: 'sans', weight: 800, fontSize: 0.058, uppercase: true, letterSpacing: 0.012, pos: 'middle', offsetY: 0.02, fill: '#ffffff', stroke: { color: '#000000', width: 0.04 }, highlight: '#22d3ee', anim: 'party' },
  { id: 'reddit', name: 'Reddit', family: 'sans', weight: 800, fontSize: 0.05, uppercase: false, letterSpacing: 0.006, pos: 'middle', offsetY: 0.02, fill: '#ffffff', bg: { color: 'rgba(30,32,40,0.9)', radius: 0.02, padX: 0.018, padY: 0.008, opacity: 1 }, highlight: '#5e6ad2', anim: 'pop' },
]

export const FONT_FAMILIES: Record<CaptionStyle['family'], string> = {
  sans: '"Inter", system-ui, sans-serif',
  serif: 'Georgia, "Times New Roman", serif',
  mono: 'ui-monospace, "Cascadia Code", Consolas, monospace',
  impact: '"Impact", "Arial Narrow Bold", "Haettenschweiler", sans-serif',
  condensed: '"Arial Narrow", "Roboto Condensed", "Helvetica Neue", sans-serif',
}

// ─── Impact Word Detection (kinetic typography) ──────────────

const IMPACT_WORDS = new Set([
  // Emotional
  'never', 'always', 'insane', 'crazy', 'amazing', 'incredible', 'unbelievable',
  'shocking', 'secret', 'hidden', 'truth', 'lie', 'fake', 'real', 'destroy',
  'crush', 'dominate', 'destroy', 'explode', 'fire', 'lit', 'bussin',
  // Action
  'stop', 'watch', 'look', 'listen', 'run', 'go', 'now', 'here', 'this',
  'that', 'what', 'how', 'why', 'when', 'where', 'who',
  // Viral hooks
  'viral', 'trending', 'fyp', 'foryou', 'mindblown', 'gamechanger',
  'levels', 'different', 'another', 'level', 'sigma', 'grindset',
  // Numbers/emphasis
  'one', 'two', 'three', 'first', 'last', 'only', 'best', 'worst',
  'most', 'least', 'every', 'all', 'none', 'zero',
])

export function isImpactWord(word: string): boolean {
  const clean = word.toLowerCase().replace(/[^a-z]/g, '')
  return IMPACT_WORDS.has(clean) || clean.length >= 8 // Long words get emphasis too
}

// Enhanced pop-in with impact word scale boost
export function getWordScale(
  word: string,
  age: number,
  isActive: boolean,
  anim: CaptionStyle['anim'],
  baseBoost = 0.28,
  impactBoost = 0.15,
): number {
  if (!isActive || (anim !== 'pop' && anim !== 'bounce')) return 1
  const isImpact = isImpactWord(word)
  const boost = isImpact ? baseBoost + impactBoost : baseBoost
  const decay = age < 0.16 ? 1 + boost * (1 - age / 0.16) : 1
  return decay
}

export function setStyleSize(id: string, sizePct: number): void {
  const s = CAPTION_STYLES.find((x) => x.id === id)
  if (s) s.fontSize = sizePct / 1000
}

export function getStyle(id: string): CaptionStyle {
  return CAPTION_STYLES.find((s) => s.id === id) ?? CAPTION_STYLES[0]
}

export interface TimedWord { text: string; start: number; end: number }

interface RenderWord extends TimedWord { i: number }

function fontOf(style: CaptionStyle, px: number): string {
  return `${style.weight} ${px}px ${FONT_FAMILIES[style.family]}`
}

function textOf(word: string, style: CaptionStyle): string {
  return style.uppercase ? word.toUpperCase() : word
}

function measureWords(ctx: CanvasRenderingContext2D, words: RenderWord[], style: CaptionStyle, px: number): number[] {
  ctx.font = fontOf(style, px)
  return words.map((w) => ctx.measureText(textOf(w.text, style)).width + px * style.letterSpacing * 0.5)
}

interface Line { words: RenderWord[]; width: number; startIdx: number }

function wrapLines(words: RenderWord[], widths: number[], maxWidth: number): Line[] {
  const lines: Line[] = []
  let cur: RenderWord[] = []
  let curW = 0
  let startIdx = 0
  for (let i = 0; i < words.length; i++) {
    const w = words[i]
    const gap = cur.length ? widths[i] * 0.12 : 0
    const next = curW + gap + widths[i]
    if (cur.length > 0 && next > maxWidth) {
      lines.push({ words: cur, width: curW, startIdx })
      cur = [w]
      curW = widths[i]
      startIdx = i
    } else {
      cur.push(w)
      curW = next
    }
  }
  if (cur.length) lines.push({ words: cur, width: curW, startIdx })
  return lines
}

function activeIndexOf(group: RenderWord[], t: number): number {
  for (let i = 0; i < group.length; i++) {
    if (t >= group[i].start - 0.02 && t <= group[i].end + 0.02) return i
  }
  for (let i = group.length - 1; i >= 0; i--) {
    if (t >= group[i].start) return i
  }
  return -1
}

export function drawCaptions(
  ctx: CanvasRenderingContext2D,
  words: TimedWord[],
  style: CaptionStyle,
  t: number,
  width: number,
  height: number,
): void {
  if (!words.length) return
  const px = Math.round(height * style.fontSize)
  const padX = px * 0.35
  const padY = px * 0.22

  // build visible group: words spoken within last 1.4s or upcoming within 0.3s
  const group: RenderWord[] = []
  words.forEach((w, i) => {
    if (w.start <= t + 0.3 && w.end >= t - 1.4) group.push({ ...w, i })
  })
  if (!group.length) return

  const widths = measureWords(ctx, group, style, px)
  const maxTextW = width * 0.9
  const lines = wrapLines(group, widths, maxTextW)
  const lineH = px * 1.16
  const blockH = lines.length * lineH
  const activeIdx = activeIndexOf(group, t)

  let originY: number
  if (style.pos === 'top') originY = height * (0.12 + style.offsetY)
  else if (style.pos === 'bottom') originY = height - blockH - height * (0.1 - style.offsetY)
  else originY = (height - blockH) / 2 + height * style.offsetY
  originY = Math.max(height * 0.06, Math.min(height * 0.92, originY))

  // background pill (per line)
  if (style.bg) {
    const bg = style.bg
    ctx.save()
    ctx.globalAlpha = bg.opacity
    ctx.fillStyle = bg.color
    for (const line of lines) {
      const y = originY + lineH * lines.indexOf(line)
      const r = Math.max(6, height * bg.radius)
      const bw = line.width + padX * 2
      const bh = lineH * 0.82
      roundRect(ctx, (width - bw) / 2, y + (lineH - bh) / 2, bw, bh, r)
      ctx.fill()
    }
    ctx.restore()
  }

  for (const line of lines) {
    const lineY = originY + lineH * lines.indexOf(line) + px * 0.82
    let x = (width - line.width) / 2
    for (const word of line.words) {
      const isActive = group.indexOf(word) === activeIdx
      const age = t - word.start
      const progress = Math.max(0, Math.min(1, (t - word.start) / Math.max(0.01, word.end - word.start)))
      const wordW = widths[group.indexOf(word)]
      const label = textOf(word.text, style)

      ctx.save()
      // per-word animation transform
      if (style.anim === 'pop' || style.anim === 'bounce') {
        const scale = getWordScale(word.text, age, isActive, style.anim)
        ctx.translate(x + wordW / 2, lineY)
        ctx.scale(scale, scale)
        ctx.translate(-(x + wordW / 2), -lineY)
        if (style.anim === 'bounce' && isActive) {
          ctx.translate(0, Math.abs(Math.sin(age * 12)) * -px * 0.08 * (age < 0.5 ? 1 : 0))
        }
      } else if (style.anim === 'slide') {
        ctx.translate((1 - Math.min(1, progress * 2)) * px * 0.4, 0)
      } else if (style.anim === 'fade') {
        ctx.globalAlpha = Math.min(1, progress * 4)
      }

      ctx.font = fontOf(style, px)
      ctx.textAlign = 'left'
      ctx.textBaseline = 'alphabetic'

      const fw = measureWords(ctx, [word], style, px)[0]
      const fwd = isActive && style.anim === 'typewriter' ? fw * progress : fw
      const wx = style.align === 'center' ? x + (wordW - fw) / 2 : x

      if (style.shadow) {
        ctx.save()
        ctx.shadowColor = style.shadow.color
        ctx.shadowBlur = height * style.shadow.blur
        ctx.shadowOffsetY = height * style.shadow.y
        ctx.fillStyle = style.fill
        ctx.fillText(label, wx, lineY)
        ctx.restore()
      }

      if (style.stroke) {
        ctx.lineWidth = Math.max(2, height * style.stroke.width)
        ctx.lineJoin = 'round'
        ctx.strokeStyle = style.stroke.color
        ctx.strokeText(label, wx, lineY)
      }

      if (isActive && style.glow) {
        ctx.save()
        ctx.shadowColor = style.glow.color
        ctx.shadowBlur = height * style.glow.blur
        ctx.fillStyle = style.highlight
        ctx.fillText(label, wx, lineY)
        ctx.restore()
      } else {
        let fill: string | CanvasGradient = isActive ? style.highlight : style.fill
        if (isActive && style.anim === 'party') {
          fill = `hsl(${(t * 240 + word.i * 37) % 360} 90% 62%)`
        }
        if (!isActive && style.gradient && !style.anim) {
          const g = ctx.createLinearGradient(0, lineY - px, 0, lineY)
          g.addColorStop(0, style.gradient[0])
          g.addColorStop(1, style.gradient[1])
          fill = g
        }
        ctx.fillStyle = fill
        ctx.fillText(label, wx, lineY)
      }

      // karaoke progressive fill on active word
      if (isActive && style.anim === 'karaoke') {
        ctx.save()
        ctx.beginPath()
        ctx.rect(wx, lineY - px, fw * progress, px * 1.2)
        ctx.clip()
        ctx.fillStyle = style.highlight
        ctx.fillText(label, wx, lineY)
        ctx.restore()
      }

      // glitch offset copies on active word
      if (isActive && style.anim === 'glitch') {
        const off = px * 0.025
        ctx.save()
        ctx.fillStyle = 'rgba(255,0,80,0.85)'
        ctx.fillText(label, wx + off, lineY)
        ctx.fillStyle = 'rgba(0,255,255,0.85)'
        ctx.fillText(label, wx - off, lineY)
        ctx.restore()
      }

      ctx.restore()
      x += wordW + wordW * 0.12
    }
  }
}

function roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number): void {
  const rr = Math.min(r, w / 2, h / 2)
  ctx.beginPath()
  ctx.moveTo(x + rr, y)
  ctx.arcTo(x + w, y, x + w, y + h, rr)
  ctx.arcTo(x + w, y + h, x, y + h, rr)
  ctx.arcTo(x, y + h, x, y, rr)
  ctx.arcTo(x, y, x + w, y, rr)
  ctx.closePath()
}

/** Render a static preview thumbnail of a style (used in the style picker). */
export function renderStylePreview(style: CaptionStyle, w: number, h: number): HTMLCanvasElement {
  const canvas = document.createElement('canvas')
  canvas.width = w
  canvas.height = h
  const ctx = canvas.getContext('2d')
  if (!ctx) return canvas
  const words: TimedWord[] = [
    { text: 'This', start: 0, end: 0.45 },
    { text: 'is', start: 0.45, end: 0.65 },
    { text: 'viral', start: 0.65, end: 1.1 },
    { text: 'captions', start: 1.1, end: 1.8 },
  ]
  // simulate mid-play so active word is highlighted
  const t = style.anim === 'karaoke' || style.anim === 'typewriter' ? 0.85 : 1.0
  drawCaptions(ctx, words, style, t, w, h)
  return canvas
}