/**
 * Keyframe Animation System — Property animation with interpolation.
 * Rivals CapCut/Premiere keyframing. Supports position, scale, rotation,
 * opacity, and any custom numeric property with easing curves.
 */

// ═══════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════

export type EasingFn = (t: number) => number

export type InterpolationType = 'linear' | 'bezier' | 'step' | 'ease_in' | 'ease_out' | 'ease_in_out' | 'elastic' | 'bounce' | 'spring'

export interface Keyframe {
  id: string
  time: number          // seconds
  value: number
  interpolation: InterpolationType
  bezier?: { p1: number; p2: number; p3: number; p4: number }
  easeIn?: number       // 0-1 intensity
  easeOut?: number      // 0-1 intensity
}

export interface AnimatedProperty {
  name: string
  keyframes: Keyframe[]
  defaultValue: number
  min?: number
  max?: number
}

export interface KeyframedLayer {
  id: string
  name: string
  startTime: number
  endTime: number
  properties: Record<string, AnimatedProperty>
}

// ═══════════════════════════════════════════════════════════════
// EASING FUNCTIONS
// ═══════════════════════════════════════════════════════════════

const easings: Record<InterpolationType, EasingFn> = {
  linear: (t) => t,
  step: (t) => t < 1 ? 0 : 1,
  ease_in: (t) => t * t * t,
  ease_out: (t) => 1 - Math.pow(1 - t, 3),
  ease_in_out: (t) => t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2,
  elastic: (t) => {
    if (t === 0 || t === 1) return t
    return -Math.pow(2, 10 * t - 10) * Math.sin((t * 10 - 10.75) * (2 * Math.PI) / 3)
  },
  bounce: (t) => {
    const n1 = 7.5625, d1 = 2.75
    if (t < 1 / d1) return n1 * t * t
    if (t < 2 / d1) return n1 * (t -= 1.5 / d1) * t + 0.75
    if (t < 2.5 / d1) return n1 * (t -= 2.25 / d1) * t + 0.9375
    return n1 * (t -= 2.625 / d1) * t + 0.984375
  },
  spring: (t) => {
    const c4 = (2 * Math.PI) / 3
    return t === 0 ? 0 : t === 1 ? 1
      : Math.pow(2, -10 * t) * Math.sin((t * 10 - 0.75) * c4) + 1
  },
  bezier: (t) => t, // overridden per-keyframe
}

// ═══════════════════════════════════════════════════════════════
// KEYFRAME INTERPOLATION
// ═══════════════════════════════════════════════════════════════

function cubicBezier(p1: number, p2: number, p3: number, p4: number): EasingFn {
  // Approximate cubic bezier with sample table for performance
  const samples = 64
  const table: number[] = []
  for (let i = 0; i <= samples; i++) {
    const t = i / samples
    // Simplified bezier: we approximate as a smooth curve
    const u = 1 - t
    table.push(u * u * u * 0 + 3 * u * u * t * p1 + 3 * u * t * t * p2 + t * t * t * 1)
  }
  return (x: number) => {
    const idx = Math.min(Math.floor(x * samples), samples - 1)
    const frac = x * samples - idx
    const a = table[idx], b = table[Math.min(idx + 1, samples)]
    return a + (b - a) * frac
  }
}

export function interpolateKeyframes(
  keyframes: Keyframe[],
  time: number,
  defaultValue: number,
): number {
  if (keyframes.length === 0) return defaultValue
  if (keyframes.length === 1) return keyframes[0].value

  // Sort by time
  const sorted = [...keyframes].sort((a, b) => a.time - b.time)

  // Before first keyframe
  if (time <= sorted[0].time) return sorted[0].value

  // After last keyframe
  if (time >= sorted[sorted.length - 1].time) return sorted[sorted.length - 1].value

  // Find surrounding keyframes
  for (let i = 0; i < sorted.length - 1; i++) {
    const kfA = sorted[i]
    const kfB = sorted[i + 1]
    if (time >= kfA.time && time <= kfB.time) {
      const range = kfB.time - kfA.time
      const t = range > 0 ? (time - kfA.time) / range : 0

      // Get easing function
      let easedT: number
      if (kfB.interpolation === 'bezier' && kfB.bezier) {
        const fn = cubicBezier(kfB.bezier.p1, kfB.bezier.p2, kfB.bezier.p3, kfB.bezier.p4)
        easedT = fn(t)
      } else {
        easedT = easings[kfB.interpolation](t)
      }

      return kfA.value + (kfB.value - kfA.value) * easedT
    }
  }

  return defaultValue
}

// ═══════════════════════════════════════════════════════════════
// LAYER PROPERTY RESOLUTION
// ═══════════════════════════════════════════════════════════════

export function resolveLayerProperties(
  layer: KeyframedLayer,
  time: number,
): Record<string, number> {
  const result: Record<string, number> = {}
  for (const [propName, prop] of Object.entries(layer.properties)) {
    result[propName] = interpolateKeyframes(prop.keyframes, time, prop.defaultValue)
  }
  return result
}

export function isLayerVisible(layer: KeyframedLayer, time: number): boolean {
  return time >= layer.startTime && time <= layer.endTime
}

// ═══════════════════════════════════════════════════════════════
// KEYFRAME MANIPULATION
// ═══════════════════════════════════════════════════════════════

let _kfId = 0
export function createKeyframe(
  time: number,
  value: number,
  interpolation: InterpolationType = 'ease_in_out',
): Keyframe {
  return {
    id: `kf-${Date.now()}-${_kfId++}`,
    time,
    value,
    interpolation,
  }
}

export function addKeyframe(
  property: AnimatedProperty,
  keyframe: Keyframe,
): AnimatedProperty {
  const kfs = [...property.keyframes, keyframe].sort((a, b) => a.time - b.time)
  return { ...property, keyframes: kfs }
}

export function removeKeyframe(
  property: AnimatedProperty,
  keyframeId: string,
): AnimatedProperty {
  return { ...property, keyframes: property.keyframes.filter(kf => kf.id !== keyframeId) }
}

export function updateKeyframe(
  property: AnimatedProperty,
  keyframeId: string,
  updates: Partial<Pick<Keyframe, 'time' | 'value' | 'interpolation' | 'bezier'>>,
): AnimatedProperty {
  return {
    ...property,
    keyframes: property.keyframes.map(kf =>
      kf.id === keyframeId ? { ...kf, ...updates } : kf
    ).sort((a, b) => a.time - b.time),
  }
}

// ═══════════════════════════════════════════════════════════════
// PRESET ANIMATIONS
// ═══════════════════════════════════════════════════════════════

export const ANIMATION_PRESETS: Record<string, (duration: number) => Record<string, AnimatedProperty>> = {
  'fade-in': (dur) => ({
    opacity: {
      name: 'opacity', defaultValue: 0, min: 0, max: 1,
      keyframes: [createKeyframe(0, 0, 'ease_out'), createKeyframe(dur, 1, 'ease_out')],
    },
  }),
  'fade-out': (dur) => ({
    opacity: {
      name: 'opacity', defaultValue: 1, min: 0, max: 1,
      keyframes: [createKeyframe(0, 1, 'ease_in'), createKeyframe(dur, 0, 'ease_in')],
    },
  }),
  'slide-in-left': (dur) => ({
    x: {
      name: 'x', defaultValue: -100, min: -100, max: 100,
      keyframes: [createKeyframe(0, -100, 'ease_out'), createKeyframe(dur, 0, 'ease_out')],
    },
    opacity: {
      name: 'opacity', defaultValue: 0, min: 0, max: 1,
      keyframes: [createKeyframe(0, 0, 'ease_out'), createKeyframe(dur * 0.5, 1, 'ease_out')],
    },
  }),
  'slide-in-right': (dur) => ({
    x: {
      name: 'x', defaultValue: 100, min: -100, max: 100,
      keyframes: [createKeyframe(0, 100, 'ease_out'), createKeyframe(dur, 0, 'ease_out')],
    },
    opacity: {
      name: 'opacity', defaultValue: 0, min: 0, max: 1,
      keyframes: [createKeyframe(0, 0, 'ease_out'), createKeyframe(dur * 0.5, 1, 'ease_out')],
    },
  }),
  'scale-pop': (dur) => ({
    scale: {
      name: 'scale', defaultValue: 0, min: 0, max: 3,
      keyframes: [createKeyframe(0, 0, 'ease_out'), createKeyframe(dur * 0.6, 1.2, 'ease_out'), createKeyframe(dur, 1, 'ease_in_out')],
    },
    opacity: {
      name: 'opacity', defaultValue: 0, min: 0, max: 1,
      keyframes: [createKeyframe(0, 0, 'ease_out'), createKeyframe(dur * 0.3, 1, 'ease_out')],
    },
  }),
  'bounce-in': (dur) => ({
    scale: {
      name: 'scale', defaultValue: 0, min: 0, max: 3,
      keyframes: [createKeyframe(0, 0, 'bounce'), createKeyframe(dur, 1, 'bounce')],
    },
    opacity: {
      name: 'opacity', defaultValue: 0, min: 0, max: 1,
      keyframes: [createKeyframe(0, 0, 'ease_out'), createKeyframe(dur * 0.2, 1, 'ease_out')],
    },
  }),
  'typewriter': (dur) => ({
    clipPath: {
      name: 'clipPath', defaultValue: 0, min: 0, max: 100,
      keyframes: [createKeyframe(0, 0, 'linear'), createKeyframe(dur, 100, 'linear')],
    },
  }),
  'shake': (dur) => ({
    x: {
      name: 'x', defaultValue: 0, min: -20, max: 20,
      keyframes: Array.from({ length: Math.floor(dur * 15) }, (_, i) => {
        const t = i / 15
        const val = (i % 2 === 0 ? 1 : -1) * (10 - i * 0.5)
        return createKeyframe(t, Math.max(-20, Math.min(20, val)), 'linear')
      }),
    },
  }),
  'spin-in': (dur) => ({
    rotation: {
      name: 'rotation', defaultValue: -180, min: -360, max: 360,
      keyframes: [createKeyframe(0, -180, 'ease_out'), createKeyframe(dur, 0, 'ease_out')],
    },
    opacity: {
      name: 'opacity', defaultValue: 0, min: 0, max: 1,
      keyframes: [createKeyframe(0, 0, 'ease_out'), createKeyframe(dur * 0.5, 1, 'ease_out')],
    },
  }),
}

// ═══════════════════════════════════════════════════════════════
// TRANSFORM COMPOSITION (for canvas rendering)
// ═══════════════════════════════════════════════════════════════

export interface Transform2D {
  x: number
  y: number
  scale: number
  rotation: number
  opacity: number
  anchorX: number
  anchorY: number
}

export const DEFAULT_TRANSFORM: Transform2D = {
  x: 0, y: 0, scale: 1, rotation: 0, opacity: 1, anchorX: 0.5, anchorY: 0.5,
}

export function applyTransformToCanvas(
  ctx: CanvasRenderingContext2D,
  transform: Transform2D,
  w: number,
  h: number,
  draw: () => void,
): void {
  ctx.save()
  ctx.globalAlpha = transform.opacity
  ctx.translate(w * transform.anchorX, h * transform.anchorY)
  ctx.rotate((transform.rotation * Math.PI) / 180)
  ctx.scale(transform.scale, transform.scale)
  ctx.translate(-w * transform.anchorX + transform.x, -h * transform.anchorY + transform.y)
  draw()
  ctx.restore()
}

export function resolveTransform(
  layer: KeyframedLayer,
  time: number,
): Transform2D {
  const props = resolveLayerProperties(layer, time)
  return {
    x: props.x ?? DEFAULT_TRANSFORM.x,
    y: props.y ?? DEFAULT_TRANSFORM.y,
    scale: props.scale ?? DEFAULT_TRANSFORM.scale,
    rotation: props.rotation ?? DEFAULT_TRANSFORM.rotation,
    opacity: props.opacity ?? DEFAULT_TRANSFORM.opacity,
    anchorX: props.anchorX ?? DEFAULT_TRANSFORM.anchorX,
    anchorY: props.anchorY ?? DEFAULT_TRANSFORM.anchorY,
  }
}
