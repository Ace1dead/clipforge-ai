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
  anim: 'pop' | 'fade' | 'slide' | 'bounce' | 'karaoke' | 'typewriter' | 'glitch' | 'party' | 'wave' | 'scale_fill' | 'none'
  lineHeight?: number
  textTransform?: 'uppercase' | 'lowercase' | 'titlecase' | 'none'
}

export const CAPTION_STYLES: CaptionStyle[] = [
  // === POP STYLES (CapCut-style word pop) ===
  { id: 'pop-classic', name: 'Pop Classic', family: 'sans', weight: 800, fontSize: 0.062, uppercase: true, letterSpacing: 0.01, pos: 'middle', offsetY: 0.02, fill: '#ffffff', stroke: { color: '#000000', width: 0.045 }, highlight: '#5e6ad2', anim: 'pop', lineHeight: 1.3 },
  { id: 'pop-red', name: 'Pop Red', family: 'sans', weight: 800, fontSize: 0.062, uppercase: true, letterSpacing: 0.01, pos: 'middle', offsetY: 0.02, fill: '#ffffff', stroke: { color: '#000000', width: 0.045 }, highlight: '#f87171', anim: 'pop', lineHeight: 1.3 },
  { id: 'pop-yellow', name: 'Pop Yellow', family: 'sans', weight: 800, fontSize: 0.062, uppercase: true, letterSpacing: 0.01, pos: 'middle', offsetY: 0.02, fill: '#ffffff', stroke: { color: '#000000', width: 0.045 }, highlight: '#fbbf24', anim: 'pop', lineHeight: 1.3 },
  { id: 'pop-cyan', name: 'Pop Cyan', family: 'sans', weight: 800, fontSize: 0.062, uppercase: true, letterSpacing: 0.01, pos: 'middle', offsetY: 0.02, fill: '#ffffff', stroke: { color: '#000000', width: 0.045 }, highlight: '#22d3ee', anim: 'pop', lineHeight: 1.3 },
  { id: 'pop-neon', name: 'Pop Neon', family: 'sans', weight: 900, fontSize: 0.065, uppercase: true, letterSpacing: 0.015, pos: 'middle', offsetY: 0.02, fill: '#ffffff', stroke: { color: '#000000', width: 0.05 }, highlight: '#00ff88', glow: { color: '#00ff88', blur: 0.08 }, anim: 'pop', lineHeight: 1.3 },

  // === NEON GLOW ===
  { id: 'neon', name: 'Neon Glow', family: 'sans', weight: 800, fontSize: 0.058, uppercase: true, letterSpacing: 0.02, pos: 'middle', offsetY: 0, fill: '#ffffff', glow: { color: '#22d3ee', blur: 0.06 }, highlight: '#ec4899', anim: 'pop', lineHeight: 1.4 },

  // === GRADIENT ===
  { id: 'gradient', name: 'Gradient', family: 'sans', weight: 800, fontSize: 0.06, uppercase: true, letterSpacing: 0.012, pos: 'middle', offsetY: 0.02, fill: '#ffffff', gradient: ['#5e6ad2', '#ec4899'], stroke: { color: 'rgba(0,0,0,0.6)', width: 0.02 }, highlight: '#ffffff', anim: 'pop', lineHeight: 1.3 },

  // === IMPACT / BEAST MODE ===
  { id: 'impact', name: 'Impact', family: 'impact', weight: 900, fontSize: 0.064, uppercase: true, letterSpacing: 0.005, pos: 'middle', offsetY: 0.02, fill: '#fbbf24', stroke: { color: '#000000', width: 0.05 }, highlight: '#ffffff', anim: 'pop', lineHeight: 1.15 },
  { id: 'beast', name: 'Beast Mode', family: 'impact', weight: 900, fontSize: 0.075, uppercase: true, letterSpacing: 0.003, pos: 'middle', offsetY: 0, fill: '#ffffff', stroke: { color: '#000000', width: 0.06 }, highlight: '#ef4444', glow: { color: '#ef4444', blur: 0.04 }, anim: 'scale_fill', lineHeight: 1.1 },

  // === BOX STYLES ===
  { id: 'white-box', name: 'White Box', family: 'sans', weight: 800, fontSize: 0.05, uppercase: false, letterSpacing: 0.008, pos: 'bottom', offsetY: -0.06, fill: '#ffffff', bg: { color: 'rgba(0,0,0,0.72)', radius: 0.02, padX: 0.015, padY: 0.006, opacity: 1 }, highlight: '#fbbf24', anim: 'pop', lineHeight: 1.4 },
  { id: 'reddit', name: 'Reddit', family: 'sans', weight: 800, fontSize: 0.05, uppercase: false, letterSpacing: 0.006, pos: 'middle', offsetY: 0.02, fill: '#ffffff', bg: { color: 'rgba(30,32,40,0.9)', radius: 0.02, padX: 0.018, padY: 0.008, opacity: 1 }, highlight: '#5e6ad2', anim: 'pop', lineHeight: 1.4 },
  { id: 'hormozi', name: 'Hormozi', family: 'sans', weight: 900, fontSize: 0.055, uppercase: true, letterSpacing: 0.005, pos: 'middle', offsetY: 0.02, fill: '#ffffff', bg: { color: 'rgba(250,204,21,0.95)', radius: 0.01, padX: 0.012, padY: 0.005, opacity: 1 }, highlight: '#000000', anim: 'pop', lineHeight: 1.3 },

  // === COMIC ===
  { id: 'comic', name: 'Comic', family: 'sans', weight: 800, fontSize: 0.055, uppercase: true, letterSpacing: 0.005, pos: 'middle', offsetY: 0, fill: '#111111', stroke: { color: '#ffffff', width: 0.05 }, highlight: '#ef4444', anim: 'pop', lineHeight: 1.3 },

  // === KARAOKE (left-to-right fill) ===
  { id: 'karaoke', name: 'Karaoke', family: 'sans', weight: 800, fontSize: 0.058, uppercase: true, letterSpacing: 0.01, pos: 'middle', offsetY: 0.02, fill: '#9aa1ad', stroke: { color: 'rgba(0,0,0,0.55)', width: 0.02 }, highlight: '#ffffff', anim: 'karaoke', lineHeight: 1.3 },
  { id: 'karaoke-yellow', name: 'Karaoke Yellow', family: 'sans', weight: 800, fontSize: 0.06, uppercase: true, letterSpacing: 0.01, pos: 'middle', offsetY: 0.02, fill: 'rgba(255,255,255,0.4)', stroke: { color: 'rgba(0,0,0,0.7)', width: 0.025 }, highlight: '#fbbf24', anim: 'karaoke', lineHeight: 1.3 },

  // === TYPEWRITER ===
  { id: 'typewriter', name: 'Typewriter', family: 'mono', weight: 700, fontSize: 0.052, uppercase: false, letterSpacing: 0.02, pos: 'middle', offsetY: 0.02, fill: '#ffffff', stroke: { color: 'rgba(0,0,0,0.6)', width: 0.02 }, highlight: '#22d3ee', anim: 'typewriter', lineHeight: 1.5 },

  // === CHROME / METALLIC ===
  { id: 'chrome', name: 'Chrome', family: 'impact', weight: 900, fontSize: 0.062, uppercase: true, letterSpacing: 0.01, pos: 'middle', offsetY: 0.02, fill: '#e5e7eb', gradient: ['#f8fafc', '#94a3b8'], highlight: '#ffffff', shadow: { color: 'rgba(0,0,0,0.7)', blur: 0.02, y: 0.02 }, anim: 'pop', lineHeight: 1.2 },

  // === GLITCH ===
  { id: 'glitch', name: 'Glitch', family: 'sans', weight: 800, fontSize: 0.058, uppercase: true, letterSpacing: 0.01, pos: 'middle', offsetY: 0.02, fill: '#ffffff', stroke: { color: '#000000', width: 0.03 }, highlight: '#00ffcc', anim: 'glitch', lineHeight: 1.3 },

  // === MINIMAL / SUBTITLE ===
  { id: 'minimal', name: 'Minimal', family: 'sans', weight: 500, fontSize: 0.045, uppercase: false, letterSpacing: 0.015, pos: 'bottom', offsetY: -0.05, fill: 'rgba(255,255,255,0.92)', highlight: '#ffffff', anim: 'fade', lineHeight: 1.5 },
  { id: 'subtitle', name: 'Subtitle', family: 'sans', weight: 600, fontSize: 0.042, uppercase: false, letterSpacing: 0.01, pos: 'bottom', offsetY: -0.04, fill: '#ffffff', stroke: { color: 'rgba(0,0,0,0.85)', width: 0.02 }, highlight: '#ffffff', anim: 'fade', lineHeight: 1.5 },

  // === BOUNCE ===
  { id: 'bounce', name: 'Bounce', family: 'condensed', weight: 900, fontSize: 0.062, uppercase: true, letterSpacing: 0.008, pos: 'middle', offsetY: 0.02, fill: '#ffffff', stroke: { color: '#000000', width: 0.045 }, highlight: '#fbbf24', anim: 'bounce', lineHeight: 1.2 },

  // === WAVE (organic sine movement) ===
  { id: 'wave', name: 'Wave', family: 'sans', weight: 800, fontSize: 0.058, uppercase: true, letterSpacing: 0.01, pos: 'middle', offsetY: 0.02, fill: '#ffffff', stroke: { color: 'rgba(0,0,0,0.6)', width: 0.03 }, highlight: '#22d3ee', anim: 'wave', lineHeight: 1.3 },

  // === PARTY (rainbow cycling) ===
  { id: 'party', name: 'Party', family: 'sans', weight: 800, fontSize: 0.058, uppercase: true, letterSpacing: 0.012, pos: 'middle', offsetY: 0.02, fill: '#ffffff', stroke: { color: '#000000', width: 0.04 }, highlight: '#22d3ee', anim: 'party', lineHeight: 1.3 },

  // === SCALE FILL (CapCut-style scale + color fill) ===
  { id: 'scale-fill', name: 'Scale Fill', family: 'sans', weight: 900, fontSize: 0.065, uppercase: true, letterSpacing: 0.008, pos: 'middle', offsetY: 0.02, fill: 'rgba(255,255,255,0.35)', stroke: { color: 'rgba(0,0,0,0.5)', width: 0.025 }, highlight: '#ffffff', anim: 'scale_fill', lineHeight: 1.2 },
]

export const FONT_FAMILIES: Record<CaptionStyle['family'], string> = {
  sans: '"Inter", system-ui, sans-serif',
  serif: 'Georgia, "Times New Roman", serif',
  mono: 'ui-monospace, "Cascadia Code", Consolas, monospace',
  impact: '"Impact", "Arial Narrow Bold", "Haettenschweiler", sans-serif',
  condensed: '"Arial Narrow", "Roboto Condensed", "Helvetica Neue", sans-serif',
}

// ─── Impact Word Detection ─────────────────────────────────────

const IMPACT_WORDS = new Set([
  'never', 'always', 'insane', 'crazy', 'amazing', 'incredible', 'unbelievable',
  'shocking', 'secret', 'hidden', 'truth', 'lie', 'fake', 'real', 'destroy',
  'crush', 'dominate', 'explode', 'fire', 'lit', 'bussin',
  'stop', 'watch', 'look', 'listen', 'run', 'go', 'now', 'here', 'this',
  'that', 'what', 'how', 'why', 'when', 'where', 'who',
  'viral', 'trending', 'fyp', 'foryou', 'mindblown', 'gamechanger',
  'levels', 'different', 'another', 'level', 'sigma', 'grindset',
  'one', 'two', 'three', 'first', 'last', 'only', 'best', 'worst',
  'most', 'least', 'every', 'all', 'none', 'zero',
])

export function isImpactWord(word: string): boolean {
  const clean = word.toLowerCase().replace(/[^a-z]/g, '')
  return IMPACT_WORDS.has(clean) || clean.length >= 8
}

export function getWordScale(
  word: string,
  age: number,
  isActive: boolean,
  anim: CaptionStyle['anim'],
  baseBoost = 0.28,
  impactBoost = 0.15,
): number {
  if (!isActive) return 1
  if (anim !== 'pop' && anim !== 'bounce' && anim !== 'scale_fill') return 1
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
  const transform = style.textTransform || (style.uppercase ? 'uppercase' : 'none')
  switch (transform) {
    case 'uppercase': return word.toUpperCase()
    case 'lowercase': return word.toLowerCase()
    case 'titlecase': return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()
    default: return word
  }
}

function measureWords(ctx: CanvasRenderingContext2D, words: RenderWord[], style: CaptionStyle, px: number): number[] {
  ctx.font = fontOf(style, px)
  return words.map((w) => ctx.measureText(textOf(w.text, style)).width + px * style.letterSpacing * 0.5)
}

interface Line { words: RenderWord[]; width: number; startIdx: number }

function wrapLines(words: RenderWord[], widths: number[], maxWidth: number, px: number): Line[] {
  const lines: Line[] = []
  let cur: RenderWord[] = []
  let curW = 0
  let startIdx = 0
  for (let i = 0; i < words.length; i++) {
    const w = words[i]
    const gap = cur.length ? px * 0.12 : 0
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
  const lineH = px * (style.lineHeight || 1.3)

  // Visible words: spoken within last 1.4s or upcoming within 0.3s
  const group: RenderWord[] = []
  words.forEach((w, i) => {
    if (w.start <= t + 0.3 && w.end >= t - 1.4) group.push({ ...w, i })
  })
  if (!group.length) return

  const widths = measureWords(ctx, group, style, px)
  const maxTextW = width * 0.88
  const lines = wrapLines(group, widths, maxTextW, px)
  const blockH = lines.length * lineH
  const activeIdx = activeIndexOf(group, t)

  let originY: number
  if (style.pos === 'top') originY = height * (0.12 + style.offsetY)
  else if (style.pos === 'bottom') originY = height - blockH - height * (0.1 - style.offsetY)
  else originY = (height - blockH) / 2 + height * style.offsetY
  originY = Math.max(height * 0.06, Math.min(height * 0.92, originY))

  // Background pill (per line)
  if (style.bg) {
    const bg = style.bg
    ctx.save()
    ctx.globalAlpha = bg.opacity
    ctx.fillStyle = bg.color
    for (let li = 0; li < lines.length; li++) {
      const y = originY + lineH * li
      const r = Math.max(6, height * bg.radius)
      const bw = lines[li].width + padX * 2
      const bh = lineH * 0.85
      roundRect(ctx, (width - bw) / 2, y + (lineH - bh) / 2, bw, bh, r)
      ctx.fill()
    }
    ctx.restore()
  }

  for (let li = 0; li < lines.length; li++) {
    const line = lines[li]
    const lineY = originY + lineH * li + px * 0.82
    let x = (width - line.width) / 2
    for (const word of line.words) {
      const globalIdx = group.indexOf(word)
      const isActive = globalIdx === activeIdx
      const age = t - word.start
      const progress = Math.max(0, Math.min(1, (t - word.start) / Math.max(0.01, word.end - word.start)))
      const wordW = widths[globalIdx]
      const label = textOf(word.text, style)

      ctx.save()
      // Per-word animation
      if (style.anim === 'pop' || style.anim === 'bounce' || style.anim === 'scale_fill') {
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
      } else if (style.anim === 'wave') {
        const waveY = Math.sin(age * 8 + globalIdx * 0.5) * px * 0.04 * (isActive ? 1.5 : 0.5)
        ctx.translate(0, waveY)
      }

      ctx.font = fontOf(style, px)
      ctx.textAlign = 'left'
      ctx.textBaseline = 'alphabetic'

      const fw = measureWords(ctx, [word], style, px)[0]
      const fwd = isActive && style.anim === 'typewriter' ? fw * progress : fw
      const wx = style.align === 'center' ? x + (wordW - fw) / 2 : x

      // Shadow
      if (style.shadow) {
        ctx.save()
        ctx.shadowColor = style.shadow.color
        ctx.shadowBlur = height * style.shadow.blur
        ctx.shadowOffsetY = height * style.shadow.y
        ctx.fillStyle = style.fill
        ctx.fillText(label, wx, lineY)
        ctx.restore()
      }

      // Stroke (outline)
      if (style.stroke) {
        ctx.lineWidth = Math.max(2, height * style.stroke.width)
        ctx.lineJoin = 'round'
        ctx.strokeStyle = style.stroke.color
        ctx.strokeText(label, wx, lineY)
      }

      // Glow on active
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
          fill = `hsl(${(t * 240 + globalIdx * 37) % 360} 90% 62%)`
        }
        // Gradient fill on non-active words
        if (!isActive && style.gradient) {
          const g = ctx.createLinearGradient(0, lineY - px, 0, lineY)
          g.addColorStop(0, style.gradient[0])
          g.addColorStop(1, style.gradient[1])
          fill = g
        }
        ctx.fillStyle = fill
        ctx.fillText(label, wx, lineY)
      }

      // Karaoke progressive fill
      if (isActive && style.anim === 'karaoke') {
        ctx.save()
        ctx.beginPath()
        ctx.rect(wx, lineY - px, fw * progress, px * 1.2)
        ctx.clip()
        ctx.fillStyle = style.highlight
        ctx.fillText(label, wx, lineY)
        ctx.restore()
      }

      // Scale fill: inactive words are transparent, active scale up + fill
      if (isActive && style.anim === 'scale_fill') {
        ctx.save()
        ctx.fillStyle = style.highlight
        ctx.fillText(label, wx, lineY)
        ctx.restore()
      }

      // Glitch RGB offset
      if (isActive && style.anim === 'glitch') {
        const off = px * 0.03
        ctx.save()
        ctx.fillStyle = 'rgba(255,0,80,0.8)'
        ctx.fillText(label, wx + off, lineY)
        ctx.fillStyle = 'rgba(0,255,255,0.8)'
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
  const t = style.anim === 'karaoke' || style.anim === 'typewriter' ? 0.85 : 1.0
  drawCaptions(ctx, words, style, t, w, h)
  return canvas
}
