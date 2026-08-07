/**
 * Text Layers — Motion graphics text system with presets.
 * Rivals CapCut's text effects and Premiere's Essential Graphics.
 */

import type { AnimatedProperty } from './keyframe'
import { createKeyframe } from './keyframe'

export interface TextLayerConfig {
  id: string
  text: string
  fontFamily: string
  fontSize: number           // px
  fontWeight: number
  color: string
  textAlign: 'left' | 'center' | 'right'
  verticalAlign: 'top' | 'middle' | 'bottom'

  // Position (normalized 0-1)
  x: number
  y: number

  // Style
  letterSpacing: number
  lineHeight: number
  uppercase: boolean
  textTransform: 'none' | 'uppercase' | 'lowercase' | 'titlecase'

  // Background
  backgroundColor?: string
  backgroundRadius?: number
  backgroundPadding?: number

  // Stroke
  stroke?: { color: string; width: number }

  // Shadow
  shadow?: { color: string; blur: number; x: number; y: number }

  // Gradient fill
  gradient?: { colors: string[]; direction: number }  // direction in degrees

  // Animation preset
  animation?: string
  animationDuration: number

  // Keyframed properties
  properties: Record<string, AnimatedProperty>
}

export const FONT_PRESETS: Record<string, { family: string; weight: number; style: string }> = {
  'montserrat-bold': { family: 'Montserrat', weight: 800, style: 'Impact / Bold Headers' },
  'bebas-neue': { family: 'Bebas Neue', weight: 400, style: 'Tall / Condensed' },
  'oswald': { family: 'Oswald', weight: 600, style: 'Semi-condensed / Modern' },
  'anton': { family: 'Anton', weight: 400, style: 'Heavy / Attention' },
  'playfair': { family: 'Playfair Display', weight: 700, style: 'Elegant / Serif' },
  'roboto-mono': { family: 'Roboto Mono', weight: 400, style: 'Code / Technical' },
  'poppins': { family: 'Poppins', weight: 600, style: 'Friendly / Round' },
  'inter': { family: 'Inter', weight: 500, style: 'Clean / UI' },
}

// ═══════════════════════════════════════════════════════════════
// TEXT ANIMATION PRESETS
// ═══════════════════════════════════════════════════════════════

export interface TextAnimationPreset {
  name: string
  description: string
  icon: string
  apply: (config: TextLayerConfig, duration: number) => TextLayerConfig
}

export const TEXT_ANIMATIONS: TextAnimationPreset[] = [
  {
    name: 'Typewriter',
    description: 'Characters appear one by one',
    icon: '⌨',
    apply: (cfg, dur) => ({
      ...cfg,
      animation: 'typewriter',
      animationDuration: dur,
      properties: {
        ...cfg.properties,
        clipPath: {
          name: 'clipPath', defaultValue: 0, min: 0, max: 100,
          keyframes: [createKeyframe(0, 0, 'linear'), createKeyframe(dur, 100, 'linear')],
        },
      },
    }),
  },
  {
    name: 'Pop In',
    description: 'Scale from 0 with bounce',
    icon: '💥',
    apply: (cfg, dur) => ({
      ...cfg,
      animation: 'pop',
      animationDuration: dur,
      properties: {
        ...cfg.properties,
        scale: {
          name: 'scale', defaultValue: 0, min: 0, max: 3,
          keyframes: [createKeyframe(0, 0, 'ease_out'), createKeyframe(dur * 0.6, 1.3, 'ease_out'), createKeyframe(dur, 1, 'ease_in_out')],
        },
        opacity: {
          name: 'opacity', defaultValue: 0, min: 0, max: 1,
          keyframes: [createKeyframe(0, 0, 'linear'), createKeyframe(dur * 0.2, 1, 'linear')],
        },
      },
    }),
  },
  {
    name: 'Slide Up',
    description: 'Rises from below with fade',
    icon: '⬆',
    apply: (cfg, dur) => ({
      ...cfg,
      animation: 'slide-up',
      animationDuration: dur,
      properties: {
        ...cfg.properties,
        y: {
          name: 'y', defaultValue: 30, min: -100, max: 100,
          keyframes: [createKeyframe(0, 30, 'ease_out'), createKeyframe(dur, 0, 'ease_out')],
        },
        opacity: {
          name: 'opacity', defaultValue: 0, min: 0, max: 1,
          keyframes: [createKeyframe(0, 0, 'ease_out'), createKeyframe(dur * 0.5, 1, 'ease_out')],
        },
      },
    }),
  },
  {
    name: 'Slide Down',
    description: 'Drops in from above',
    icon: '⬇',
    apply: (cfg, dur) => ({
      ...cfg,
      animation: 'slide-down',
      animationDuration: dur,
      properties: {
        ...cfg.properties,
        y: {
          name: 'y', defaultValue: -30, min: -100, max: 100,
          keyframes: [createKeyframe(0, -30, 'ease_out'), createKeyframe(dur, 0, 'ease_out')],
        },
        opacity: {
          name: 'opacity', defaultValue: 0, min: 0, max: 1,
          keyframes: [createKeyframe(0, 0, 'ease_out'), createKeyframe(dur * 0.5, 1, 'ease_out')],
        },
      },
    }),
  },
  {
    name: 'Glitch Text',
    description: 'RGB split glitch entrance',
    icon: '⚡',
    apply: (cfg, dur) => ({
      ...cfg,
      animation: 'glitch',
      animationDuration: dur,
      properties: {
        ...cfg.properties,
        opacity: {
          name: 'opacity', defaultValue: 0, min: 0, max: 1,
          keyframes: [createKeyframe(0, 0, 'linear'), createKeyframe(0.05, 1, 'linear'), createKeyframe(0.1, 0, 'linear'), createKeyframe(0.15, 1, 'linear')],
        },
      },
    }),
  },
  {
    name: 'Bounce',
    description: 'Bouncy entrance with overshoot',
    icon: '🏀',
    apply: (cfg, dur) => ({
      ...cfg,
      animation: 'bounce',
      animationDuration: dur,
      properties: {
        ...cfg.properties,
        scale: {
          name: 'scale', defaultValue: 0, min: 0, max: 3,
          keyframes: [createKeyframe(0, 0, 'bounce'), createKeyframe(dur, 1, 'bounce')],
        },
        opacity: {
          name: 'opacity', defaultValue: 0, min: 0, max: 1,
          keyframes: [createKeyframe(0, 0, 'linear'), createKeyframe(dur * 0.15, 1, 'linear')],
        },
      },
    }),
  },
  {
    name: 'Spin In',
    description: 'Rotates in from 360°',
    icon: '🔄',
    apply: (cfg, dur) => ({
      ...cfg,
      animation: 'spin',
      animationDuration: dur,
      properties: {
        ...cfg.properties,
        rotation: {
          name: 'rotation', defaultValue: -180, min: -360, max: 360,
          keyframes: [createKeyframe(0, -180, 'ease_out'), createKeyframe(dur, 0, 'ease_out')],
        },
        opacity: {
          name: 'opacity', defaultValue: 0, min: 0, max: 1,
          keyframes: [createKeyframe(0, 0, 'linear'), createKeyframe(dur * 0.4, 1, 'linear')],
        },
      },
    }),
  },
  {
    name: 'Wave',
    description: 'Per-character wave animation',
    icon: '🌊',
    apply: (cfg, dur) => ({
      ...cfg,
      animation: 'wave',
      animationDuration: dur,
    }),
  },
]

// ═══════════════════════════════════════════════════════════════
// TEXT RENDERING
// ═══════════════════════════════════════════════════════════════

export function drawTextLayer(
  ctx: CanvasRenderingContext2D,
  config: TextLayerConfig,
  w: number,
  h: number,
  time: number,
  animProgress?: number,
): void {
  ctx.save()

  // Resolve text content
  let text = config.text
  if (config.uppercase || config.textTransform === 'uppercase') text = text.toUpperCase()
  else if (config.textTransform === 'lowercase') text = text.toLowerCase()
  else if (config.textTransform === 'titlecase') text = text.replace(/\b\w/g, c => c.toUpperCase())

  // Font
  const fontWeight = config.fontWeight >= 700 ? 'bold' : config.fontWeight >= 500 ? '600' : 'normal'
  ctx.font = `${fontWeight} ${config.fontSize}px "${config.fontFamily}"`
  ctx.textAlign = config.textAlign
  ctx.textBaseline = 'top'

  // Position
  const px = config.x * w
  const py = config.y * h

  // Background
  if (config.backgroundColor) {
    const metrics = ctx.measureText(text)
    const textW = metrics.width
    const textH = config.fontSize * (config.lineHeight || 1.2)
    const pad = config.backgroundPadding || 8
    const radius = config.backgroundRadius || 4

    ctx.fillStyle = config.backgroundColor
    roundRect(ctx, px - textW / 2 - pad, py - pad, textW + pad * 2, textH + pad * 2, radius)
    ctx.fill()
  }

  // Shadow
  if (config.shadow) {
    ctx.shadowColor = config.shadow.color
    ctx.shadowBlur = config.shadow.blur
    ctx.shadowOffsetX = config.shadow.x
    ctx.shadowOffsetY = config.shadow.y
  }

  // Stroke
  if (config.stroke) {
    ctx.strokeStyle = config.stroke.color
    ctx.lineWidth = config.stroke.width
    ctx.strokeText(text, px, py)
  }

  // Fill (solid or gradient)
  if (config.gradient) {
    const metrics = ctx.measureText(text)
    const grad = ctx.createLinearGradient(
      px - metrics.width / 2, py,
      px + metrics.width / 2, py + config.fontSize,
    )
    config.gradient.colors.forEach((color, i) => {
      grad.addColorStop(i / (config.gradient!.colors.length - 1 || 1), color)
    })
    ctx.fillStyle = grad
  } else {
    ctx.fillStyle = config.color
  }

  ctx.fillText(text, px, py)

  // Clip path animation (typewriter effect)
  if (animProgress !== undefined && config.animation === 'typewriter') {
    const totalW = ctx.measureText(text).width
    const clipX = px - (config.textAlign === 'center' ? totalW / 2 : config.textAlign === 'right' ? totalW : 0)
    ctx.clearRect(0, 0, w, h) // This is handled by the caller
  }

  ctx.restore()
}

function roundRect(
  ctx: CanvasRenderingContext2D,
  x: number, y: number,
  w: number, h: number,
  r: number,
): void {
  ctx.beginPath()
  ctx.moveTo(x + r, y)
  ctx.lineTo(x + w - r, y)
  ctx.quadraticCurveTo(x + w, y, x + w, y + r)
  ctx.lineTo(x + w, y + h - r)
  ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h)
  ctx.lineTo(x + r, y + h)
  ctx.quadraticCurveTo(x, y + h, x, y + h - r)
  ctx.lineTo(x, y + r)
  ctx.quadraticCurveTo(x, y, x + r, y)
  ctx.closePath()
}

// ═══════════════════════════════════════════════════════════════
// TEXT STYLE PRESETS
// ═══════════════════════════════════════════════════════════════

export const TEXT_STYLE_PRESETS: Record<string, Partial<TextLayerConfig>> = {
  'default': { fontFamily: 'Montserrat', fontSize: 48, fontWeight: 800, color: '#ffffff', stroke: { color: '#000000', width: 2 }, shadow: { color: 'rgba(0,0,0,0.5)', blur: 8, x: 0, y: 2 } },
  'minimal': { fontFamily: 'Inter', fontSize: 36, fontWeight: 500, color: '#ffffff' },
  'bold-red': { fontFamily: 'Anton', fontSize: 56, fontWeight: 400, color: '#ff0040', stroke: { color: '#000000', width: 3 } },
  'neon-glow': { fontFamily: 'Montserrat', fontSize: 44, fontWeight: 800, color: '#00ff88', shadow: { color: '#00ff88', blur: 20, x: 0, y: 0 } },
  'retro-80s': { fontFamily: 'Bebas Neue', fontSize: 64, fontWeight: 400, color: '#ff6ec7', stroke: { color: '#7b2ff7', width: 2 }, shadow: { color: '#ff6ec7', blur: 15, x: 0, y: 0 } },
  'news-ticker': { fontFamily: 'Roboto Mono', fontSize: 28, fontWeight: 400, color: '#ffffff', backgroundColor: '#cc0000', backgroundRadius: 0, backgroundPadding: 12 },
  'subtitle': { fontFamily: 'Inter', fontSize: 24, fontWeight: 500, color: '#ffffff', backgroundColor: 'rgba(0,0,0,0.6)', backgroundRadius: 6, backgroundPadding: 8 },
  'handwritten': { fontFamily: 'Playfair Display', fontSize: 40, fontWeight: 700, color: '#ffd700', shadow: { color: 'rgba(0,0,0,0.3)', blur: 4, x: 1, y: 1 } },
}

export function createDefaultTextLayer(overrides?: Partial<TextLayerConfig>): TextLayerConfig {
  const defaults = TEXT_STYLE_PRESETS['default']
  return {
    id: `text-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    text: 'Your Text Here',
    fontFamily: defaults.fontFamily!,
    fontSize: defaults.fontSize!,
    fontWeight: defaults.fontWeight!,
    color: defaults.color!,
    textAlign: 'center',
    verticalAlign: 'middle',
    x: 0.5,
    y: 0.5,
    letterSpacing: 0,
    lineHeight: 1.2,
    uppercase: false,
    textTransform: 'none',
    stroke: defaults.stroke,
    shadow: defaults.shadow,
    animation: undefined,
    animationDuration: 0.5,
    properties: {},
    ...overrides,
  }
}
