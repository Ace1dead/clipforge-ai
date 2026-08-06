/**
 * Effects Engine — Composable per-frame canvas effects.
 * Each effect is a function that wraps a draw callback, applying visual transformations.
 * Upgraded to match CapCut/Premiere Pro/After Effects quality.
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

// ─── Seedable PRNG (xorshift32) ─────────────────────────────────

function xorshift32(seed: number): () => number {
  let s = seed | 0 || 1
  return () => {
    s ^= s << 13
    s ^= s >> 17
    s ^= s << 5
    return ((s >>> 0) / 4294967296)
  }
}

// ─── Screen Shake (trauma-based, game-industry standard) ────────

export function screenShake(intensity: number = 1, frequency: number = 30): EffectFn {
  return (ec, draw) => {
    const { ctx, w, h, beatIntensity } = ec
    const strength = intensity * beatIntensity
    if (strength < 0.01) { draw(); return }

    // Trauma-based: squared for perceptual scaling
    const shake = strength * strength
    const t = ec.time * frequency

    // Perlin-like noise via sin combination
    const dx = Math.sin(t * 12.9898) * w * 0.016 * shake
      + Math.sin(t * 7.2341) * w * 0.008 * shake
    const dy = Math.cos(t * 15.1234) * h * 0.012 * shake
      + Math.cos(t * 9.8765) * h * 0.006 * shake
    const angle = Math.sin(t * 5.4321) * 0.02 * shake

    ctx.save()
    ctx.translate(w / 2, h / 2)
    ctx.rotate(angle)
    ctx.translate(-w / 2 + dx, -h / 2 + dy)
    draw()
    ctx.restore()
  }
}

// ─── Chromatic Aberration (lens-model radial) ───────────────────

export function chromaticAberration(offset: number = 3): EffectFn {
  return (ec, draw) => {
    const { ctx, w, h, beatIntensity } = ec
    const strength = offset * (0.3 + beatIntensity * 0.7)

    draw()

    const pxOffset = Math.round(strength)
    if (pxOffset < 1) return

    const imageData = ctx.getImageData(0, 0, w, h)
    const data = imageData.data
    const copy = new Uint8ClampedArray(data)
    const cx = w / 2
    const cy = h / 2
    const maxDist = Math.sqrt(cx * cx + cy * cy)

    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        const i = (y * w + x) * 4
        // Radial offset — increases toward edges (lens model)
        const dx = (x - cx) / cx
        const dy = (y - cy) / cy
        const dist = Math.sqrt(dx * dx + dy * dy)
        const radialOffset = Math.round(pxOffset * dist)

        // Red channel shifts outward
        const rxSrc = Math.min(w - 1, x + radialOffset)
        data[i] = copy[(y * w + rxSrc) * 4]

        // Green stays centered
        // data[i + 1] already correct

        // Blue shifts inward
        const bxSrc = Math.max(0, x - radialOffset)
        data[i + 2] = copy[(y * w + bxSrc) * 4 + 2]
      }
    }
    ctx.putImageData(imageData, 0, 0)
  }
}

// ─── Vignette (smooth radial) ──────────────────────────────────

export function vignette(strength: number = 0.4, radius: number = 0.6): EffectFn {
  return (ec, draw) => {
    const { ctx, w, h } = ec
    draw()

    const cx = w / 2
    const cy = h / 2
    const r = Math.max(w, h) * radius
    const grad = ctx.createRadialGradient(cx, cy, r * 0.2, cx, cy, r)
    grad.addColorStop(0, 'rgba(0,0,0,0)')
    grad.addColorStop(0.5, `rgba(0,0,0,${strength * 0.3})`)
    grad.addColorStop(1, `rgba(0,0,0,${strength})`)
    ctx.fillStyle = grad
    ctx.fillRect(0, 0, w, h)
  }
}

// ─── Film Grain (xorshift32 PRNG, offscreen compositing) ───────

export function filmGrain(intensity: number = 0.08): EffectFn {
  let grainCanvas: HTMLCanvasElement | null = null
  let lastFrame = -1

  return (ec, draw) => {
    const { ctx, w, h, time } = ec
    draw()

    const frame = (time * 24) | 0
    if (!grainCanvas || grainCanvas.width !== w || grainCanvas.height !== h) {
      grainCanvas = document.createElement('canvas')
      grainCanvas.width = w
      grainCanvas.height = h
    }

    if (frame !== lastFrame) {
      lastFrame = frame
      const gctx = grainCanvas.getContext('2d')!
      const imgData = gctx.createImageData(w, h)
      const data = imgData.data
      const rng = xorshift32(frame * 2654435761)
      const grainAmount = intensity * 255

      for (let i = 0; i < data.length; i += 4) {
        const noise = (rng() - 0.5) * grainAmount
        data[i] = 128 + noise
        data[i + 1] = 128 + noise
        data[i + 2] = 128 + noise
        data[i + 3] = 255
      }
      gctx.putImageData(imgData, 0, 0)
    }

    ctx.save()
    ctx.globalCompositeOperation = 'overlay'
    ctx.globalAlpha = intensity * 2
    ctx.drawImage(grainCanvas!, 0, 0)
    ctx.restore()
  }
}

// ─── Exposure Pulse (with decay) ───────────────────────────────

export function exposurePulse(stops: number = 1.5, decayFrames: number = 4): EffectFn {
  return (ec, draw) => {
    const { ctx, w, h, beatIntensity } = ec
    draw()

    if (beatIntensity < 0.01) return

    const brightness = Math.pow(2, stops * beatIntensity)
    ctx.save()
    ctx.globalCompositeOperation = 'screen'
    ctx.globalAlpha = Math.min(0.5, beatIntensity * 0.6)
    ctx.fillStyle = `rgb(${Math.round(brightness * 80)}, ${Math.round(brightness * 70)}, ${Math.round(brightness * 50)})`
    ctx.fillRect(0, 0, w, h)
    ctx.restore()
  }
}

// ─── Color Grading (CSS filter + overlay compositing) ───────────

export interface ColorGrade {
  name: string
  shadows: string
  highlights: string
  brightness: number  // 0-2
  contrast: number    // 0-2
  saturation: number  // 0-2
  hueShift: number    // degrees
  temperature: number // -1 (cool) to 1 (warm)
  tint: number        // -1 (green) to 1 (magenta)
}

export const COLOR_SKINS: Record<string, ColorGrade> = {
  candy: { name: 'Candy', shadows: '#ff6b9d', highlights: '#c084fc', brightness: 1.15, contrast: 0.9, saturation: 1.3, hueShift: 10, temperature: 0.2, tint: 0.1 },
  edgy: { name: 'Edgy', shadows: '#ef4444', highlights: '#fbbf24', brightness: 0.85, contrast: 1.4, saturation: 0.9, hueShift: -15, temperature: -0.3, tint: -0.1 },
  lofi: { name: 'LoFi', shadows: '#f59e0b', highlights: '#8b5cf6', brightness: 0.95, contrast: 0.85, saturation: 0.6, hueShift: 5, temperature: 0.4, tint: 0 },
  classic: { name: 'Classic', shadows: '#374151', highlights: '#d1d5db', brightness: 1.0, contrast: 1.0, saturation: 1.0, hueShift: 0, temperature: 0, tint: 0 },
  teal_orange: { name: 'Teal & Orange', shadows: '#0d9488', highlights: '#f97316', brightness: 1.05, contrast: 1.15, saturation: 1.1, hueShift: 0, temperature: 0.1, tint: 0 },
  noir: { name: 'Noir', shadows: '#111827', highlights: '#9ca3af', brightness: 0.9, contrast: 1.5, saturation: 0.1, hueShift: 0, temperature: -0.1, tint: 0 },
  bleach: { name: 'Bleach Bypass', shadows: '#1f2937', highlights: '#e5e7eb', brightness: 1.0, contrast: 1.6, saturation: 0.4, hueShift: 5, temperature: 0, tint: 0.05 },
  vintage: { name: 'Vintage', shadows: '#92400e', highlights: '#fef3c7', brightness: 1.05, contrast: 0.9, saturation: 0.7, hueShift: 15, temperature: 0.3, tint: 0.1 },
  cinematic: { name: 'Cinematic', shadows: '#1e3a5f', highlights: '#fde68a', brightness: 0.95, contrast: 1.2, saturation: 0.85, hueShift: -5, temperature: -0.15, tint: 0 },
  moody: { name: 'Moody', shadows: '#1e1b4b', highlights: '#a78bfa', brightness: 0.85, contrast: 1.3, saturation: 0.7, hueShift: -10, temperature: -0.2, tint: -0.05 },
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

// ─── Glitch Effect (industry standard: RGB split + blocks + scanlines) ─

export function glitchEffect(intensity: number = 1): EffectFn {
  return (ec, draw) => {
    const { ctx, w, h, beatIntensity, time } = ec
    draw()

    const strength = intensity * (0.3 + beatIntensity * 0.7)
    if (strength < 0.05) return

    const imageData = ctx.getImageData(0, 0, w, h)
    const data = imageData.data
    const copy = new Uint8ClampedArray(data)
    const rng = xorshift32((time * 1000) | 0)

    // Block displacement (random rectangular regions)
    const numSlices = Math.floor(3 + strength * 10)
    for (let s = 0; s < numSlices; s++) {
      const y = Math.floor(rng() * h)
      const sliceH = Math.floor(2 + rng() * 20 * strength)
      const offset = Math.floor((rng() - 0.5) * 50 * strength)

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

    // RGB channel split
    const rgbOffset = Math.round(strength * 4)
    if (rgbOffset > 0) {
      for (let y = 0; y < h; y++) {
        for (let x = 0; x < w; x++) {
          const i = (y * w + x) * 4
          const rxSrc = Math.min(w - 1, x + rgbOffset)
          data[i] = copy[(y * w + rxSrc) * 4] // Red shifted right
          const bxSrc = Math.max(0, x - rgbOffset)
          data[i + 2] = copy[(y * w + bxSrc) * 4 + 2] // Blue shifted left
        }
      }
    }

    ctx.putImageData(imageData, 0, 0)

    // Scanline overlay
    ctx.save()
    ctx.globalAlpha = strength * 0.3
    ctx.fillStyle = '#000'
    for (let y = 0; y < h; y += 4) {
      ctx.fillRect(0, y, w, 1)
    }
    ctx.restore()
  }
}

// ─── Light Leak (warm overlay for transitions) ──────────────────

export function lightLeak(color: string = '#ff6b35', position: 'left' | 'right' | 'top' = 'right'): EffectFn {
  return (ec, draw) => {
    const { ctx, w, h, time, beatIntensity } = ec
    draw()

    const alpha = beatIntensity * 0.4
    if (alpha < 0.01) return

    ctx.save()
    ctx.globalCompositeOperation = 'screen'
    ctx.globalAlpha = alpha

    const grad = position === 'right'
      ? ctx.createLinearGradient(w, 0, 0, 0)
      : position === 'left'
        ? ctx.createLinearGradient(0, 0, w, 0)
        : ctx.createLinearGradient(0, 0, 0, h)

    grad.addColorStop(0, color)
    grad.addColorStop(0.3, 'rgba(255,200,100,0.5)')
    grad.addColorStop(1, 'rgba(0,0,0,0)')
    ctx.fillStyle = grad
    ctx.fillRect(0, 0, w, h)
    ctx.restore()
  }
}

// ─── Speed Ramp (time remapping helper) ───────────────────────

export interface SpeedSegment {
  startTime: number
  endTime: number
  speed: number // 0.25-4.0
}

export function remapTime(segments: SpeedSegment[], realTime: number): number {
  let remapped = 0
  for (const seg of segments) {
    if (realTime <= seg.startTime) break
    const dur = Math.min(realTime, seg.endTime) - seg.startTime
    remapped += dur * seg.speed
  }
  return remapped
}

export function generateVelocityRamps(beatTimes: number[], bpm: number): SpeedSegment[] {
  const segments: SpeedSegment[] = []
  const slowDuration = 0.12
  const beatInterval = 60 / bpm

  let lastEnd = 0
  for (const bt of beatTimes) {
    if (bt > lastEnd + 0.05) {
      segments.push({ startTime: lastEnd, endTime: bt, speed: 3.5 })
    }
    segments.push({ startTime: bt, endTime: bt + slowDuration, speed: 0.25 })
    lastEnd = bt + slowDuration
  }
  return segments
}

// ─── Composite Effects ─────────────────────────────────────────

export function composeEffects(...effects: EffectFn[]): EffectFn {
  return (ec, draw) => {
    let current = draw
    for (let i = effects.length - 1; i >= 0; i--) {
      const effect = effects[i]
      const prev = current
      current = () => effect(ec, prev)
    }
    current()
  }
}

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
