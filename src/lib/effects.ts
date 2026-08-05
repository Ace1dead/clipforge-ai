/**
 * Effects Engine — Composable per-frame canvas effects.
 * Each effect is a function that wraps a draw callback, applying visual transformations.
 */

export interface EffectContext {
  ctx: CanvasRenderingContext2D
  time: number
  w: number
  h: number
  beatIntensity: number // 0-1, how close to the nearest beat
  bpm: number
}

export type EffectFn = (ec: EffectContext, draw: () => void) => void

// ─── Screen Shake ──────────────────────────────────────────────

export function screenShake(intensity: number = 1, frequency: number = 30): EffectFn {
  return (ec, draw) => {
    const { ctx, time, w, h, beatIntensity } = ec
    const strength = intensity * beatIntensity
    if (strength < 0.01) { draw(); return }

    const dx = Math.sin(time * frequency) * w * 0.01 * strength
    const dy = Math.cos(time * frequency * 1.3) * h * 0.008 * strength

    ctx.save()
    ctx.translate(dx, dy)
    draw()
    ctx.restore()
  }
}

// ─── Chromatic Aberration ──────────────────────────────────────

export function chromaticAberration(offset: number = 3): EffectFn {
  return (ec, draw) => {
    const { ctx, w, h, beatIntensity } = ec
    const strength = offset * (0.3 + beatIntensity * 0.7)

    // Draw base
    draw()

    // Get image data for RGB split
    const imageData = ctx.getImageData(0, 0, w, h)
    const data = imageData.data
    const copy = new Uint8ClampedArray(data)

    const pxOffset = Math.round(strength)
    if (pxOffset < 1) return

    // Shift red channel left, blue channel right
    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        const i = (y * w + x) * 4
        // Red from left
        const rxSrc = Math.min(w - 1, x + pxOffset)
        data[i] = copy[(y * w + rxSrc) * 4]
        // Blue from right
        const bxSrc = Math.max(0, x - pxOffset)
        data[i + 2] = copy[(y * w + bxSrc) * 4 + 2]
      }
    }
    ctx.putImageData(imageData, 0, 0)
  }
}

// ─── Vignette ──────────────────────────────────────────────────

export function vignette(strength: number = 0.4, radius: number = 0.6): EffectFn {
  return (ec, draw) => {
    const { ctx, w, h } = ec
    draw()

    const cx = w / 2
    const cy = h / 2
    const r = Math.max(w, h) * radius
    const grad = ctx.createRadialGradient(cx, cy, r * 0.3, cx, cy, r)
    grad.addColorStop(0, 'rgba(0,0,0,0)')
    grad.addColorStop(1, `rgba(0,0,0,${strength})`)
    ctx.fillStyle = grad
    ctx.fillRect(0, 0, w, h)
  }
}

// ─── Film Grain ────────────────────────────────────────────────

export function filmGrain(intensity: number = 0.08): EffectFn {
  return (ec, draw) => {
    const { ctx, w, h, time } = ec
    draw()

    const imageData = ctx.getImageData(0, 0, w, h)
    const data = imageData.data
    const grainAmount = intensity * 255

    // Use time-based seed for animated grain
    const seed = (time * 1000) | 0
    for (let i = 0; i < data.length; i += 4) {
      // Fast pseudo-random using bit manipulation
      const noise = (((seed + i * 0.618033988749895) * 16807) % 2147483647) / 2147483647
      const grain = (noise - 0.5) * grainAmount
      data[i] += grain
      data[i + 1] += grain
      data[i + 2] += grain
    }
    ctx.putImageData(imageData, 0, 0)
  }
}

// ─── Exposure Pulse ────────────────────────────────────────────

export function exposurePulse(stops: number = 1.5, decayFrames: number = 4): EffectFn {
  return (ec, draw) => {
    const { ctx, w, h, beatIntensity } = ec
    draw()

    if (beatIntensity < 0.01) return

    const brightness = Math.pow(2, stops * beatIntensity)
    const imageData = ctx.getImageData(0, 0, w, h)
    const data = imageData.data

    for (let i = 0; i < data.length; i += 4) {
      data[i] = Math.min(255, data[i] * brightness)
      data[i + 1] = Math.min(255, data[i + 1] * brightness)
      data[i + 2] = Math.min(255, data[i + 2] * brightness)
    }
    ctx.putImageData(imageData, 0, 0)
  }
}

// ─── Color Grading ─────────────────────────────────────────────

export interface ColorGrade {
  brightness: number  // 0-2
  contrast: number    // 0-2
  saturation: number  // 0-2
  hueShift: number    // degrees
  temperature: number // -1 (cool) to 1 (warm)
  tint: number        // -1 (green) to 1 (magenta)
}

export const COLOR_SKINS: Record<string, ColorGrade> = {
  candy: { brightness: 1.15, contrast: 0.9, saturation: 1.3, hueShift: 10, temperature: 0.2, tint: 0.1 },
  edgy: { brightness: 0.85, contrast: 1.4, saturation: 0.9, hueShift: -15, temperature: -0.3, tint: -0.1 },
  lofi: { brightness: 0.95, contrast: 0.85, saturation: 0.6, hueShift: 5, temperature: 0.4, tint: 0 },
  classic: { brightness: 1.0, contrast: 1.0, saturation: 1.0, hueShift: 0, temperature: 0, tint: 0 },
}

export function colorGrade(grade: ColorGrade): EffectFn {
  return (ec, draw) => {
    const { ctx, w, h } = ec
    // Apply via CSS filter shorthand
    const filters: string[] = []
    if (grade.brightness !== 1) filters.push(`brightness(${grade.brightness})`)
    if (grade.contrast !== 1) filters.push(`contrast(${grade.contrast})`)
    if (grade.saturation !== 1) filters.push(`saturate(${grade.saturation})`)
    if (grade.hueShift !== 0) filters.push(`hue-rotate(${grade.hueShift}deg)`)

    if (filters.length > 0) {
      ctx.save()
      ctx.filter = filters.join(' ')
      draw()
      ctx.restore()
    } else {
      draw()
    }

    // Temperature tint (warm = orange, cool = blue)
    if (Math.abs(grade.temperature) > 0.01) {
      const t = grade.temperature
      ctx.save()
      ctx.globalCompositeOperation = 'overlay'
      ctx.globalAlpha = Math.abs(t) * 0.15
      ctx.fillStyle = t > 0 ? '#ff8844' : '#4488ff'
      ctx.fillRect(0, 0, w, h)
      ctx.restore()
    }

    // Tint (green-magenta)
    if (Math.abs(grade.tint) > 0.01) {
      const t = grade.tint
      ctx.save()
      ctx.globalCompositeOperation = 'overlay'
      ctx.globalAlpha = Math.abs(t) * 0.1
      ctx.fillStyle = t > 0 ? '#ff44ff' : '#44ff44'
      ctx.fillRect(0, 0, w, h)
      ctx.restore()
    }
  }
}

// ─── Scanlines ─────────────────────────────────────────────────

export function scanlines(density: number = 0.5, opacity: number = 0.15): EffectFn {
  return (ec, draw) => {
    const { ctx, w, h } = ec
    draw()

    ctx.save()
    ctx.fillStyle = `rgba(0,0,0,${opacity})`
    const gap = Math.max(2, Math.round(1 / density))
    for (let y = 0; y < h; y += gap * 2) {
      ctx.fillRect(0, y, w, gap)
    }
    ctx.restore()
  }
}

// ─── Glitch Effect (Full Frame) ───────────────────────────────

export function glitchEffect(intensity: number = 1): EffectFn {
  return (ec, draw) => {
    const { ctx, w, h, beatIntensity, time } = ec
    draw()

    const strength = intensity * beatIntensity
    if (strength < 0.1) return

    const imageData = ctx.getImageData(0, 0, w, h)
    const data = imageData.data
    const copy = new Uint8ClampedArray(data)

    // Random horizontal slice displacement
    const numSlices = Math.floor(3 + strength * 8)
    for (let s = 0; s < numSlices; s++) {
      const y = Math.floor(Math.random() * h)
      const sliceH = Math.floor(2 + Math.random() * 15 * strength)
      const offset = Math.floor((Math.random() - 0.5) * 40 * strength)

      for (let dy = 0; dy < sliceH && y + dy < h; dy++) {
        for (let x = 0; x < w; x++) {
          const srcX = Math.max(0, Math.min(w - 1, x + offset))
          const dstIdx = ((y + dy) * w + x) * 4
          const srcIdx = ((y + dy) * w + srcX) * 4
          data[dstIdx] = copy[srcIdx]
          data[dstIdx + 1] = copy[srcIdx + 1]
          data[dstIdx + 2] = copy[srcIdx + 2]
        }
      }
    }
    ctx.putImageData(imageData, 0, 0)
  }
}

// ─── Speed Ramp (time remapping helper) ───────────────────────

export interface SpeedSegment {
  startTime: number
  endTime: number
  speed: number // 0.25-4.0
}

/**
 * Given a list of speed segments and a real time, returns the remapped time.
 * Used for velocity edits (fast between beats, slow on beats).
 */
export function remapTime(segments: SpeedSegment[], realTime: number): number {
  let remapped = 0
  for (const seg of segments) {
    if (realTime <= seg.startTime) break
    const dur = Math.min(realTime, seg.endTime) - seg.startTime
    remapped += dur * seg.speed
  }
  return remapped
}

/**
 * Generate speed ramp segments based on beat times.
 * Fast between beats (3x), slow on beats (0.3x for 0.1s after beat).
 */
export function generateVelocityRamps(beatTimes: number[], bpm: number): SpeedSegment[] {
  const segments: SpeedSegment[] = []
  const slowDuration = 0.1 // seconds of slow-mo after each beat
  const beatInterval = 60 / bpm

  let lastEnd = 0
  for (const bt of beatTimes) {
    // Fast section before beat
    if (bt > lastEnd + 0.05) {
      segments.push({ startTime: lastEnd, endTime: bt, speed: 3.0 })
    }
    // Slow section on/after beat
    segments.push({ startTime: bt, endTime: bt + slowDuration, speed: 0.3 })
    lastEnd = bt + slowDuration
  }
  return segments
}

// ─── Composite Effects ─────────────────────────────────────────

/**
 * Compose multiple effects into a single draw function.
 * Effects are applied in order (first = outermost).
 */
export function composeEffects(...effects: EffectFn[]): EffectFn {
  return (ec, draw) => {
    let current = draw
    // Apply in reverse so first effect is outermost
    for (let i = effects.length - 1; i >= 0; i--) {
      const effect = effects[i]
      const prev = current
      current = () => effect(ec, prev)
    }
    current()
  }
}

/**
 * Create an EffectContext from canvas state and beat info.
 */
export function createEffectContext(
  ctx: CanvasRenderingContext2D,
  time: number,
  w: number,
  h: number,
  beatIntensity: number = 0,
  bpm: number = 120
): EffectContext {
  return { ctx, time, w, h, beatIntensity, bpm }
}
