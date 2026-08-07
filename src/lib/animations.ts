/**
 * Animations — General-purpose clip animations (in/out) for any element.
 * Provides slide, zoom, rotate, fade, bounce, glitch, typewriter, and more.
 * Each animation produces transform values at a given progress (0-1).
 */

export type AnimationType =
  | 'none'
  | 'fade_in' | 'fade_out' | 'fade_in_out'
  | 'slide_left' | 'slide_right' | 'slide_up' | 'slide_down'
  | 'zoom_in' | 'zoom_out' | 'zoom_bounce'
  | 'rotate_cw' | 'rotate_ccw'
  | 'bounce_in' | 'bounce_out'
  | 'glitch_in' | 'glitch_out'
  | 'typewriter'
  | 'flip_x' | 'flip_y'
  | 'blur_in' | 'blur_out'
  | 'swing' | 'elastic' | 'bounce'

export interface AnimationConfig {
  type: AnimationType
  duration: number      // seconds
  easing?: 'linear' | 'ease_in' | 'ease_out' | 'ease_in_out' | 'bounce' | 'elastic'
}

export interface AnimationState {
  opacity: number       // 0-1
  x: number             // -1 to 1 (normalized)
  y: number             // -1 to 1
  scale: number         // 0-3
  rotation: number      // degrees
  blur: number          // pixels
  skewX: number         // degrees
  skewY: number         // degrees
}

const DEFAULT_STATE: AnimationState = {
  opacity: 1, x: 0, y: 0, scale: 1, rotation: 0, blur: 0, skewX: 0, skewY: 0,
}

// ── Easing Functions ───────────────────────────────────────────────

function easeIn(t: number): number { return t * t }
function easeOut(t: number): number { return 1 - (1 - t) * (1 - t) }
function easeInOut(t: number): number { return t < 0.5 ? 2 * t * t : 1 - (-2 * t + 2) ** 2 / 2 }

function bounceEase(t: number): number {
  const n1 = 7.5625, d1 = 2.75
  if (t < 1 / d1) return n1 * t * t
  if (t < 2 / d1) return n1 * (t -= 1.5 / d1) * t + 0.75
  if (t < 2.5 / d1) return n1 * (t -= 2.25 / d1) * t + 0.9375
  return n1 * (t -= 2.625 / d1) * t + 0.984375
}

function elasticEase(t: number): number {
  if (t === 0 || t === 1) return t
  return -Math.pow(2, 10 * t - 10) * Math.sin((t * 10 - 10.75) * ((2 * Math.PI) / 3))
}

function applyEasing(t: number, easing: AnimationConfig['easing']): number {
  switch (easing) {
    case 'ease_in': return easeIn(t)
    case 'ease_out': return easeOut(t)
    case 'ease_in_out': return easeInOut(t)
    case 'bounce': return bounceEase(t)
    case 'elastic': return elasticEase(t)
    default: return t
  }
}

// ── Animation Calculators ──────────────────────────────────────────

function computeAnimation(type: AnimationType, progress: number): Partial<AnimationState> {
  const t = Math.max(0, Math.min(1, progress))

  switch (type) {
    case 'none':
      return {}

    case 'fade_in':
      return { opacity: t }

    case 'fade_out':
      return { opacity: 1 - t }

    case 'fade_in_out':
      return { opacity: t < 0.5 ? t * 2 : 2 - t * 2 }

    case 'slide_left':
      return { x: -1 + t, opacity: t }

    case 'slide_right':
      return { x: 1 - t, opacity: t }

    case 'slide_up':
      return { y: -1 + t, opacity: t }

    case 'slide_down':
      return { y: 1 - t, opacity: t }

    case 'zoom_in':
      return { scale: t * 1.2, opacity: t }

    case 'zoom_out':
      return { scale: 1.5 - t * 0.5, opacity: t }

    case 'zoom_bounce':
      return { scale: t < 0.8 ? t / 0.8 * 1.2 : 1.2 - (t - 0.8) / 0.2 * 0.2, opacity: Math.min(1, t * 3) }

    case 'rotate_cw':
      return { rotation: -90 + t * 90, opacity: t, scale: 0.5 + t * 0.5 }

    case 'rotate_ccw':
      return { rotation: 90 - t * 90, opacity: t, scale: 0.5 + t * 0.5 }

    case 'bounce_in':
      return { y: t < 0.6 ? -1 + (t / 0.6) * 1.2 : 0.2 - (t - 0.6) / 0.4 * 0.2, opacity: Math.min(1, t * 2) }

    case 'bounce_out':
      return { y: t < 0.4 ? t / 0.4 * 0.2 : 0.2 - (t - 0.4) / 0.6 * 1.2, opacity: t > 0.8 ? (1 - t) * 5 : 1 }

    case 'glitch_in': {
      const glitchX = t < 0.7 ? (Math.random() - 0.5) * (1 - t) * 0.3 : 0
      const glitchY = t < 0.7 ? (Math.random() - 0.5) * (1 - t) * 0.2 : 0
      return { x: glitchX, y: glitchY, opacity: t, skewX: t < 0.7 ? (Math.random() - 0.5) * 10 * (1 - t) : 0 }
    }

    case 'glitch_out': {
      const g2x = t > 0.3 ? (Math.random() - 0.5) * t * 0.3 : 0
      return { x: g2x, opacity: 1 - t, skewX: t > 0.3 ? (Math.random() - 0.5) * 10 * t : 0 }
    }

    case 'typewriter':
      return { opacity: t }

    case 'flip_x':
      return { rotation: t * 360, opacity: t }

    case 'flip_y':
      return { rotation: t * 360, opacity: t, scale: Math.abs(Math.cos(t * Math.PI)) }

    case 'blur_in':
      return { blur: (1 - t) * 20, opacity: t }

    case 'blur_out':
      return { blur: t * 20, opacity: 1 - t }

    case 'swing':
      return { rotation: Math.sin(t * Math.PI * 4) * 15 * (1 - t), opacity: Math.min(1, t * 3) }

    case 'elastic':
      return { scale: elasticEase(t), opacity: Math.min(1, t * 3) }

    case 'bounce':
      return { scale: bounceEase(t), opacity: Math.min(1, t * 3) }

    default:
      return {}
  }
}

// ── Public API ─────────────────────────────────────────────────────

/**
 * Calculate the animation state at a given time within a clip.
 * @param config - Animation configuration (type, duration, easing)
 * @param time - Current time within the clip (seconds from start)
 * @param clipDuration - Total clip duration (seconds)
 * @param isOut - Whether this is an out animation (plays from end)
 * @returns AnimationState with transform values
 */
export function getAnimationState(
  config: AnimationConfig,
  time: number,
  clipDuration: number,
  isOut: boolean = false,
): AnimationState {
  if (config.type === 'none') return { ...DEFAULT_STATE }

  let progress: number
  if (isOut) {
    const outStart = clipDuration - config.duration
    progress = Math.max(0, Math.min(1, (time - outStart) / config.duration))
  } else {
    progress = Math.max(0, Math.min(1, time / config.duration))
  }

  const eased = applyEasing(progress, config.easing)
  const raw = computeAnimation(config.type, eased)

  return {
    opacity: raw.opacity ?? 1,
    x: raw.x ?? 0,
    y: raw.y ?? 0,
    scale: raw.scale ?? 1,
    rotation: raw.rotation ?? 0,
    blur: raw.blur ?? 0,
    skewX: raw.skewX ?? 0,
    skewY: raw.skewY ?? 0,
  }
}

/**
 * Apply animation state to a canvas context.
 */
export function applyAnimationToCanvas(
  ctx: CanvasRenderingContext2D,
  state: AnimationState,
  w: number,
  h: number,
): void {
  ctx.globalAlpha = state.opacity
  ctx.translate(state.x * w * 0.5, state.y * h * 0.5)
  ctx.translate(w / 2, h / 2)
  ctx.rotate((state.rotation * Math.PI) / 180)
  ctx.scale(state.scale, state.scale)
  ctx.translate(-w / 2, -h / 2)
  if (state.blur > 0) {
    ctx.filter = `blur(${state.blur}px)`
  }
}

/**
 * Apply animation state as CSS transform string.
 */
export function animationToCSS(state: AnimationState, w: number, h: number): React.CSSProperties {
  return {
    opacity: state.opacity,
    transform: [
      `translate(${state.x * 50}%, ${state.y * 50}%)`,
      `rotate(${state.rotation}deg)`,
      `scale(${state.scale})`,
      `skewX(${state.skewX}deg)`,
      `skewY(${state.skewY}deg)`,
    ].join(' '),
    filter: state.blur > 0 ? `blur(${state.blur}px)` : undefined,
  }
}

// ── Animation Presets ──────────────────────────────────────────────

export const ANIMATION_PRESETS: { type: AnimationType; name: string; category: string; icon: string }[] = [
  { type: 'none', name: 'None', category: 'basic', icon: '—' },
  { type: 'fade_in', name: 'Fade In', category: 'basic', icon: 'FI' },
  { type: 'fade_out', name: 'Fade Out', category: 'basic', icon: 'FO' },
  { type: 'fade_in_out', name: 'Fade In/Out', category: 'basic', icon: 'FIO' },
  { type: 'slide_left', name: 'Slide Left', category: 'slide', icon: 'SL' },
  { type: 'slide_right', name: 'Slide Right', category: 'slide', icon: 'SR' },
  { type: 'slide_up', name: 'Slide Up', category: 'slide', icon: 'SU' },
  { type: 'slide_down', name: 'Slide Down', category: 'slide', icon: 'SD' },
  { type: 'zoom_in', name: 'Zoom In', category: 'zoom', icon: 'ZI' },
  { type: 'zoom_out', name: 'Zoom Out', category: 'zoom', icon: 'ZO' },
  { type: 'zoom_bounce', name: 'Zoom Bounce', category: 'zoom', icon: 'ZB' },
  { type: 'rotate_cw', name: 'Rotate CW', category: 'rotate', icon: 'RC' },
  { type: 'rotate_ccw', name: 'Rotate CCW', category: 'rotate', icon: 'RCC' },
  { type: 'bounce_in', name: 'Bounce In', category: 'bounce', icon: 'BI' },
  { type: 'bounce_out', name: 'Bounce Out', category: 'bounce', icon: 'BO' },
  { type: 'bounce', name: 'Bounce', category: 'bounce', icon: 'B' },
  { type: 'elastic', name: 'Elastic', category: 'bounce', icon: 'EL' },
  { type: 'swing', name: 'Swing', category: 'bounce', icon: 'SW' },
  { type: 'glitch_in', name: 'Glitch In', category: 'glitch', icon: 'GI' },
  { type: 'glitch_out', name: 'Glitch Out', category: 'glitch', icon: 'GO' },
  { type: 'flip_x', name: 'Flip X', category: '3d', icon: 'FX' },
  { type: 'flip_y', name: 'Flip Y', category: '3d', icon: 'FY' },
  { type: 'blur_in', name: 'Blur In', category: 'blur', icon: 'BI' },
  { type: 'blur_out', name: 'Blur Out', category: 'blur', icon: 'BO' },
  { type: 'typewriter', name: 'Typewriter', category: 'text', icon: 'TW' },
]

export const ANIMATION_CATEGORIES = [
  { id: 'all', name: 'All' },
  { id: 'basic', name: 'Basic' },
  { id: 'slide', name: 'Slide' },
  { id: 'zoom', name: 'Zoom' },
  { id: 'rotate', name: 'Rotate' },
  { id: 'bounce', name: 'Bounce' },
  { id: 'glitch', name: 'Glitch' },
  { id: '3d', name: '3D' },
  { id: 'blur', name: 'Blur' },
  { id: 'text', name: 'Text' },
]

export function getAnimationsByCategory(category: string) {
  if (category === 'all') return ANIMATION_PRESETS
  return ANIMATION_PRESETS.filter(a => a.category === category)
}

export function createDefaultAnimation(type: AnimationType = 'fade_in', duration: number = 0.5): AnimationConfig {
  return { type, duration, easing: 'ease_out' }
}
