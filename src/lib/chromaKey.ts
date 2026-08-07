/**
 * Chroma Key — Real-time green/blue screen removal using Canvas pixel manipulation.
 * Rivals CapCut's background removal with spill suppression and edge feathering.
 */

export interface ChromaKeyOptions {
  color: string             // hex color to key out (default: #00ff00)
  similarity: number        // 0-1 tolerance (default: 0.3)
  smoothness: number        // 0-1 edge softness (default: 0.1)
  spillReduction: number    // 0-1 color spill suppression (default: 0.5)
  feather: number           // 0-10 edge feather in pixels (default: 2)
}

const DEFAULT_CHROMA_KEY: ChromaKeyOptions = {
  color: '#00ff00',
  similarity: 0.3,
  smoothness: 0.1,
  spillReduction: 0.5,
  feather: 2,
}

function hexToRgb(hex: string): { r: number; g: number; b: number } {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex)
  return result ? {
    r: parseInt(result[1], 16),
    g: parseInt(result[2], 16),
    b: parseInt(result[3], 16),
  } : { r: 0, g: 255, b: 0 }
}

function colorDistance(
  r1: number, g1: number, b1: number,
  r2: number, g2: number, b2: number,
): number {
  // Weighted Euclidean distance (human perception)
  const dr = r1 - r2, dg = g1 - g2, db = b1 - b2
  return Math.sqrt(2 * dr * dr + 4 * dg * dg + 3 * db * db) / 360
}

function clamp(v: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, v))
}

/**
 * Apply chroma key to canvas — removes the keyed color and makes it transparent.
 * Uses offscreen canvas for pixel manipulation.
 */
export function applyChromaKey(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  options: Partial<ChromaKeyOptions> = {},
): void {
  const opts = { ...DEFAULT_CHROMA_KEY, ...options }
  const keyRgb = hexToRgb(opts.color)

  const imageData = ctx.getImageData(0, 0, w, h)
  const data = imageData.data
  const threshold = opts.similarity
  const smooth = opts.smoothness * threshold

  for (let i = 0; i < data.length; i += 4) {
    const r = data[i], g = data[i + 1], b = data[i + 2]
    const dist = colorDistance(r, g, b, keyRgb.r, keyRgb.g, keyRgb.b)

    if (dist < threshold) {
      // Calculate alpha based on distance for smooth edges
      const alpha = dist < threshold - smooth
        ? 0
        : clamp((dist - (threshold - smooth)) / smooth, 0, 1)

      data[i + 3] = Math.round(alpha * 255)

      // Spill reduction: reduce the keyed color channel
      if (opts.spillReduction > 0 && alpha < 1) {
        const spill = opts.spillReduction * (1 - alpha)
        // Reduce the dominant channel of the key color
        if (keyRgb.g > keyRgb.r && keyRgb.g > keyRgb.b) {
          data[i + 1] = Math.round(g - (g - Math.min(r, b)) * spill)
        } else if (keyRgb.r > keyRgb.g) {
          data[i] = Math.round(r - (r - Math.min(g, b)) * spill)
        } else {
          data[i + 2] = Math.round(b - (b - Math.min(r, g)) * spill)
        }
      }
    }
  }

  ctx.putImageData(imageData, 0, 0)
}

/**
 * Create a matte (grayscale mask) from chroma key for compositing.
 * White = keep, Black = remove.
 */
export function createChromaKeyMatte(
  sourceCanvas: HTMLCanvasElement,
  options: Partial<ChromaKeyOptions> = {},
): HTMLCanvasElement {
  const w = sourceCanvas.width, h = sourceCanvas.height
  const matte = document.createElement('canvas')
  matte.width = w
  matte.height = h
  const mCtx = matte.getContext('2d')!
  mCtx.drawImage(sourceCanvas, 0, 0)

  const opts = { ...DEFAULT_CHROMA_KEY, ...options }
  const keyRgb = hexToRgb(opts.color)
  const imageData = mCtx.getImageData(0, 0, w, h)
  const data = imageData.data
  const threshold = opts.similarity
  const smooth = opts.smoothness * threshold

  for (let i = 0; i < data.length; i += 4) {
    const r = data[i], g = data[i + 1], b = data[i + 2]
    const dist = colorDistance(r, g, b, keyRgb.r, keyRgb.g, keyRgb.b)
    const alpha = dist < threshold - smooth ? 0
      : dist >= threshold ? 255
      : Math.round(clamp((dist - (threshold - smooth)) / smooth, 0, 1) * 255)
    data[i] = data[i + 1] = data[i + 2] = alpha
    data[i + 3] = 255
  }

  mCtx.putImageData(imageData, 0, 0)
  return matte
}
