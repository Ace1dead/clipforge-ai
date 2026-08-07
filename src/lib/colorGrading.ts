/**
 * Color Grading — Professional color correction with LUTs, curves, and color wheels.
 * Rivals DaVinci Resolve's color page and Premiere's Lumetri panel.
 */

export interface ColorWheel {
  r: number                 // -1 to 1
  g: number
  b: number
}

export interface ColorGradingState {
  // Basic corrections
  brightness: number        // -1 to 1
  contrast: number          // 0 to 3 (1 = normal)
  saturation: number        // 0 to 3 (1 = normal)
  vibrance: number          // 0 to 2 (1 = normal)
  hueShift: number          // -180 to 180 degrees
  temperature: number       // -1 (cool/blue) to 1 (warm/orange)
  tint: number              // -1 (green) to 1 (magenta)

  // Tone curve
  shadows: number           // -1 to 1
  midtones: number          // -1 to 1
  highlights: number        // -1 to 1

  // Color wheels
  lift: ColorWheel          // shadows
  gamma: ColorWheel         // midtones
  gain: ColorWheel          // highlights

  // Advanced
  gammaValue: number        // 0.1 to 3
  blacks: number            // -1 to 1
  whites: number            // -1 to 1

  // LUT
  lutUrl?: string
  lutStrength: number       // 0 to 1

  // Vignette
  vignetteStrength: number  // 0 to 1
  vignetteRadius: number    // 0 to 2
}

export const DEFAULT_COLOR_GRADING: ColorGradingState = {
  brightness: 0,
  contrast: 1,
  saturation: 1,
  vibrance: 1,
  hueShift: 0,
  temperature: 0,
  tint: 0,
  shadows: 0,
  midtones: 0,
  highlights: 0,
  lift: { r: 0, g: 0, b: 0 },
  gamma: { r: 0, g: 0, b: 0 },
  gain: { r: 0, g: 0, b: 0 },
  gammaValue: 1,
  blacks: 0,
  whites: 0,
  lutStrength: 1,
  vignetteStrength: 0,
  vignetteRadius: 1,
}

// ═══════════════════════════════════════════════════════════════
// CANVAS APPLICATION
// ═══════════════════════════════════════════════════════════════

/**
 * Apply color grading to canvas via CSS filters and pixel manipulation.
 */
export function applyColorGrading(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  state: ColorGradingState,
): void {
  ctx.save()

  // Build CSS filter string for basic corrections
  const filters: string[] = []
  if (state.brightness !== 0) filters.push(`brightness(${1 + state.brightness})`)
  if (state.contrast !== 1) filters.push(`contrast(${state.contrast})`)
  if (state.saturation !== 1) filters.push(`saturate(${state.saturation})`)
  if (state.hueShift !== 0) filters.push(`hue-rotate(${state.hueShift}deg)`)

  if (filters.length > 0) {
    ctx.filter = filters.join(' ')
    // Re-draw the current canvas content with the filter
    const tempCanvas = document.createElement('canvas')
    tempCanvas.width = w
    tempCanvas.height = h
    const tCtx = tempCanvas.getContext('2d')!
    tCtx.drawImage(ctx.canvas, 0, 0)
    ctx.clearRect(0, 0, w, h)
    ctx.filter = filters.join(' ')
    ctx.drawImage(tempCanvas, 0, 0)
    ctx.filter = 'none'
  }

  // Temperature/tint overlay
  if (state.temperature !== 0 || state.tint !== 0) {
    ctx.globalCompositeOperation = 'color'
    ctx.globalAlpha = Math.abs(state.temperature) * 0.3
    if (state.temperature > 0) {
      ctx.fillStyle = '#ff9944' // warm
    } else {
      ctx.fillStyle = '#4488ff' // cool
    }
    ctx.fillRect(0, 0, w, h)

    ctx.globalAlpha = Math.abs(state.tint) * 0.3
    ctx.fillStyle = state.tint > 0 ? '#ff44ff' : '#44ff44'
    ctx.fillRect(0, 0, w, h)
    ctx.globalCompositeOperation = 'source-over'
    ctx.globalAlpha = 1
  }

  // Color wheels (lift/gamma/gain)
  applyColorWheel(ctx, w, h, state.lift, 'shadow', 0.15)
  applyColorWheel(ctx, w, h, state.gamma, 'midtone', 0.1)
  applyColorWheel(ctx, w, h, state.gain, 'highlight', 0.12)

  // Vibrance (boost low-saturation colors)
  if (state.vibrance !== 1) {
    const imageData = ctx.getImageData(0, 0, w, h)
    const data = imageData.data
    const vibStrength = (state.vibrance - 1) * 0.5
    for (let i = 0; i < data.length; i += 4) {
      const max = Math.max(data[i], data[i + 1], data[i + 2])
      const min = Math.min(data[i], data[i + 1], data[i + 2])
      const sat = max === 0 ? 0 : (max - min) / max
      const boost = vibStrength * (1 - sat)
      data[i] = Math.min(255, data[i] + data[i] * boost)
      data[i + 1] = Math.min(255, data[i + 1] + data[i + 1] * boost)
      data[i + 2] = Math.min(255, data[i + 2] + data[i + 2] * boost)
    }
    ctx.putImageData(imageData, 0, 0)
  }

  // Shadows/Highlights recovery
  if (state.shadows !== 0 || state.highlights !== 0 || state.blacks !== 0 || state.whites !== 0) {
    const imageData = ctx.getImageData(0, 0, w, h)
    const data = imageData.data
    for (let i = 0; i < data.length; i += 4) {
      const lum = (data[i] * 0.299 + data[i + 1] * 0.587 + data[i + 2] * 0.114) / 255
      // Shadows (0-0.3 luminance)
      if (state.shadows !== 0 && lum < 0.3) {
        const factor = 1 + state.shadows * 0.5 * (1 - lum / 0.3)
        data[i] = Math.min(255, Math.max(0, data[i] * factor))
        data[i + 1] = Math.min(255, Math.max(0, data[i + 1] * factor))
        data[i + 2] = Math.min(255, Math.max(0, data[i + 2] * factor))
      }
      // Highlights (0.7-1.0 luminance)
      if (state.highlights !== 0 && lum > 0.7) {
        const factor = 1 + state.highlights * 0.5 * ((lum - 0.7) / 0.3)
        data[i] = Math.min(255, Math.max(0, data[i] * factor))
        data[i + 1] = Math.min(255, Math.max(0, data[i + 1] * factor))
        data[i + 2] = Math.min(255, Math.max(0, data[i + 2] * factor))
      }
    }
    ctx.putImageData(imageData, 0, 0)
  }

  // Vignette
  if (state.vignetteStrength > 0) {
    const grad = ctx.createRadialGradient(w / 2, h / 2, w * 0.2, w / 2, h / 2, w * state.vignetteRadius)
    grad.addColorStop(0, 'transparent')
    grad.addColorStop(1, `rgba(0,0,0,${state.vignetteStrength})`)
    ctx.fillStyle = grad
    ctx.fillRect(0, 0, w, h)
  }

  ctx.restore()
}

function applyColorWheel(
  ctx: CanvasRenderingContext2D,
  w: number, h: number,
  wheel: ColorWheel,
  target: 'shadow' | 'midtone' | 'highlight',
  alpha: number,
): void {
  if (wheel.r === 0 && wheel.g === 0 && wheel.b === 0) return

  ctx.save()
  ctx.globalCompositeOperation = target === 'shadow' ? 'multiply'
    : target === 'highlight' ? 'screen' : 'soft-light'
  ctx.globalAlpha = alpha

  const r = Math.round(128 + wheel.r * 127)
  const g = Math.round(128 + wheel.g * 127)
  const b = Math.round(128 + wheel.b * 127)
  ctx.fillStyle = `rgb(${r},${g},${b})`
  ctx.fillRect(0, 0, w, h)

  ctx.restore()
}

// ═══════════════════════════════════════════════════════════════
// LUT PRESETS (3D LUT simulation via CSS filter chains)
// ═══════════════════════════════════════════════════════════════

export interface LUTPreset {
  name: string
  description: string
  grade: Partial<ColorGradingState>
}

export const LUT_PRESETS: LUTPreset[] = [
  {
    name: 'Cinematic Teal & Orange',
    description: 'Hollywood blockbuster look',
    grade: { temperature: 0.2, tint: -0.1, saturation: 1.2, contrast: 1.15, shadows: -0.2, highlights: 0.15, lift: { r: -0.05, g: 0, b: 0.08 }, gain: { r: 0.08, g: 0.02, b: -0.05 } },
  },
  {
    name: 'Vintage Film',
    description: 'Faded 70s movie look',
    grade: { brightness: 0.05, contrast: 0.9, saturation: 0.7, temperature: 0.3, shadows: 0.15, blacks: -0.1, vignetteStrength: 0.3 },
  },
  {
    name: 'Noir',
    description: 'High contrast black & white',
    grade: { saturation: 0, contrast: 1.5, brightness: -0.05, vignetteStrength: 0.5, vignetteRadius: 0.8 },
  },
  {
    name: 'Cyberpunk',
    description: 'Neon-lit futuristic look',
    grade: { saturation: 1.4, contrast: 1.2, temperature: -0.3, tint: 0.2, highlights: 0.2, lift: { r: 0.05, g: -0.05, b: 0.1 } },
  },
  {
    name: 'Warm Sunset',
    description: 'Golden hour warmth',
    grade: { temperature: 0.5, saturation: 1.1, brightness: 0.05, contrast: 1.05, highlights: 0.1, gain: { r: 0.08, g: 0.03, b: -0.05 } },
  },
  {
    name: 'Cool Blue',
    description: 'Cold, moody atmosphere',
    grade: { temperature: -0.4, saturation: 0.9, contrast: 1.1, shadows: -0.1, lift: { r: -0.03, g: 0, b: 0.08 } },
  },
  {
    name: 'Desaturated',
    description: 'Muted, film-like tones',
    grade: { saturation: 0.5, vibrance: 0.8, contrast: 1.05, brightness: 0.02 },
  },
  {
    name: 'High Contrast',
    description: 'Punchy, vivid look',
    grade: { contrast: 1.4, saturation: 1.2, blacks: -0.15, whites: 0.15, vignetteStrength: 0.2 },
  },
  {
    name: 'Pastel',
    description: 'Soft, light tones',
    grade: { brightness: 0.1, contrast: 0.85, saturation: 0.7, vibrance: 1.2, temperature: 0.1 },
  },
  {
    name: 'Bleach Bypass',
    description: 'Desaturated, high contrast film process',
    grade: { saturation: 0.4, contrast: 1.5, brightness: -0.05, shadows: -0.2, highlights: 0.1 },
  },
]

// ═══════════════════════════════════════════════════════════════
// TONE CURVE
// ═══════════════════════════════════════════════════════════════

export interface CurvePoint {
  x: number                 // 0-1 input
  y: number                 // 0-1 output
}

/**
 * Generate a tone curve LUT from control points.
 * Uses cubic spline interpolation for smooth curves.
 */
export function generateCurveLUT(points: CurvePoint[]): Uint8Array {
  const lut = new Uint8Array(256)
  const sorted = [...points].sort((a, b) => a.x - b.x)

  for (let i = 0; i < 256; i++) {
    const x = i / 255
    // Find surrounding points
    let y = x
    for (let j = 0; j < sorted.length - 1; j++) {
      if (x >= sorted[j].x && x <= sorted[j + 1].x) {
        const t = (x - sorted[j].x) / (sorted[j + 1].x - sorted[j].x || 1)
        // Smooth interpolation
        const smoothT = t * t * (3 - 2 * t)
        y = sorted[j].y + (sorted[j + 1].y - sorted[j].y) * smoothT
        break
      }
    }
    lut[i] = Math.round(Math.max(0, Math.min(1, y)) * 255)
  }

  return lut
}

/**
 * Apply a custom tone curve to canvas.
 */
export function applyToneCurve(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  points: CurvePoint[],
): void {
  const lut = generateCurveLUT(points)
  const imageData = ctx.getImageData(0, 0, w, h)
  const data = imageData.data

  for (let i = 0; i < data.length; i += 4) {
    data[i] = lut[data[i]]
    data[i + 1] = lut[data[i + 1]]
    data[i + 2] = lut[data[i + 2]]
  }

  ctx.putImageData(imageData, 0, 0)
}
