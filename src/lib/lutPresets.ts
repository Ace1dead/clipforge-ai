/**
 * LUT Presets — Built-in 3D LUT presets for color grading.
 * Shared between LutPicker UI and compositor for per-clip LUT application.
 *
 * Each preset procedurally generates a 17×17×17 identity LUT and
 * applies a color transform to create the look.
 */

import { generateIdentityLUT, applyLUT3D, type LUT3D } from './lutGenerator'

// ── Types ──────────────────────────────────────────────────────────

export interface LUTPreset {
  id: string
  name: string
  category: 'basic' | 'cinematic' | 'vintage' | 'cool' | 'bw' | 'artistic' | 'dramatic'
  thumbnail: string  // CSS gradient for UI preview
  generate: () => LUT3D
}

// ── Preset Definitions ─────────────────────────────────────────────

export const LUT_PRESETS: LUTPreset[] = [
  {
    id: 'identity', name: 'None', category: 'basic',
    thumbnail: 'linear-gradient(135deg, #888 0%, #ccc 50%, #888 100%)',
    generate: () => generateIdentityLUT(17),
  },
  {
    id: 'teal-orange', name: 'Teal & Orange', category: 'cinematic',
    thumbnail: 'linear-gradient(135deg, #0d9488 0%, #f97316 100%)',
    generate: () => {
      const lut = generateIdentityLUT(17)
      for (let i = 0; i < lut.data.length; i += 3) {
        const r = lut.data[i], g = lut.data[i + 1], b = lut.data[i + 2]
        const lum = 0.299 * r + 0.587 * g + 0.114 * b
        if (lum < 0.5) {
          lut.data[i] = r * 0.85
          lut.data[i + 1] = g * 1.05
          lut.data[i + 2] = b * 1.15
        } else {
          lut.data[i] = r * 1.1 + 0.05
          lut.data[i + 1] = g * 0.95
          lut.data[i + 2] = b * 0.85
        }
      }
      return lut
    },
  },
  {
    id: 'vintage-warm', name: 'Vintage Warm', category: 'vintage',
    thumbnail: 'linear-gradient(135deg, #f5e6d3 0%, #d4a574 100%)',
    generate: () => {
      const lut = generateIdentityLUT(17)
      for (let i = 0; i < lut.data.length; i += 3) {
        lut.data[i] = Math.min(1, lut.data[i] * 1.05 + 0.03)
        lut.data[i + 1] = lut.data[i + 1] * 0.98 + 0.02
        lut.data[i + 2] = lut.data[i + 2] * 0.88
      }
      return lut
    },
  },
  {
    id: 'cool-blue', name: 'Cool Blue', category: 'cool',
    thumbnail: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
    generate: () => {
      const lut = generateIdentityLUT(17)
      for (let i = 0; i < lut.data.length; i += 3) {
        lut.data[i] = lut.data[i] * 0.9
        lut.data[i + 1] = lut.data[i + 1] * 0.98
        lut.data[i + 2] = Math.min(1, lut.data[i + 2] * 1.12 + 0.03)
      }
      return lut
    },
  },
  {
    id: 'noir', name: 'Noir B&W', category: 'bw',
    thumbnail: 'linear-gradient(135deg, #1a1a1a 0%, #ffffff 100%)',
    generate: () => {
      const lut = generateIdentityLUT(17)
      for (let i = 0; i < lut.data.length; i += 3) {
        const r = lut.data[i], g = lut.data[i + 1], b = lut.data[i + 2]
        const gray = 0.299 * r + 0.587 * g + 0.114 * b
        const contrast = ((gray - 0.5) * 1.3) + 0.5
        const val = Math.max(0, Math.min(1, contrast))
        lut.data[i] = val
        lut.data[i + 1] = val
        lut.data[i + 2] = val
      }
      return lut
    },
  },
  {
    id: 'cyberpunk', name: 'Cyberpunk', category: 'artistic',
    thumbnail: 'linear-gradient(135deg, #ff00ff 0%, #00ffff 100%)',
    generate: () => {
      const lut = generateIdentityLUT(17)
      for (let i = 0; i < lut.data.length; i += 3) {
        const r = lut.data[i], g = lut.data[i + 1], b = lut.data[i + 2]
        const lum = 0.299 * r + 0.587 * g + 0.114 * b
        if (lum < 0.3) {
          lut.data[i] = r * 0.7
          lut.data[i + 1] = g * 0.6
          lut.data[i + 2] = Math.min(1, b * 1.4)
        } else {
          lut.data[i] = Math.min(1, r * 1.2 + 0.05)
          lut.data[i + 1] = g * 0.8
          lut.data[i + 2] = Math.min(1, b * 1.3)
        }
      }
      return lut
    },
  },
  {
    id: 'pastel', name: 'Pastel Dream', category: 'artistic',
    thumbnail: 'linear-gradient(135deg, #ffecd2 0%, #fcb69f 50%, #a18cd1 100%)',
    generate: () => {
      const lut = generateIdentityLUT(17)
      for (let i = 0; i < lut.data.length; i += 3) {
        lut.data[i] = lut.data[i] * 0.7 + 0.2 + 0.03
        lut.data[i + 1] = lut.data[i + 1] * 0.7 + 0.18
        lut.data[i + 2] = lut.data[i + 2] * 0.7 + 0.22
      }
      return lut
    },
  },
  {
    id: 'high-contrast', name: 'High Contrast', category: 'dramatic',
    thumbnail: 'linear-gradient(135deg, #000 0%, #fff 100%)',
    generate: () => {
      const lut = generateIdentityLUT(17)
      for (let i = 0; i < lut.data.length; i += 3) {
        lut.data[i] = Math.max(0, Math.min(1, ((lut.data[i] - 0.5) * 1.5) + 0.5))
        lut.data[i + 1] = Math.max(0, Math.min(1, ((lut.data[i + 1] - 0.5) * 1.5) + 0.5))
        lut.data[i + 2] = Math.max(0, Math.min(1, ((lut.data[i + 2] - 0.5) * 1.5) + 0.5))
      }
      return lut
    },
  },
]

// ── Lookup helpers ─────────────────────────────────────────────────

/** Get a LUT preset by ID. Returns undefined if not found. */
export function getLUTPresetById(id: string): LUTPreset | undefined {
  return LUT_PRESETS.find(p => p.id === id)
}

/** Get a LUT3D by preset ID. Returns undefined if not found. */
export function getLUTById(id: string): LUT3D | undefined {
  return getLUTPresetById(id)?.generate()
}

/** Get all LUT presets in a category. */
export function getLUTsByCategory(category: string): LUTPreset[] {
  if (category === 'all') return LUT_PRESETS
  return LUT_PRESETS.filter(p => p.category === category)
}

/** Get all unique categories. */
export function getLUTCategories(): string[] {
  return [...new Set(LUT_PRESETS.map(p => p.category))]
}

/** Generate a LUT with memoization (cached per preset ID). */
const _lutCache = new Map<string, LUT3D>()
export function getLUTCached(id: string): LUT3D | undefined {
  if (_lutCache.has(id)) return _lutCache.get(id)!
  const lut = getLUTById(id)
  if (lut) _lutCache.set(id, lut)
  return lut
}

/** Apply a LUT preset to a canvas context at a given strength. */
export function applyLUTPreset(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  presetId: string,
  strength: number = 1,
): boolean {
  const lut = getLUTCached(presetId)
  if (!lut || presetId === 'identity') return false
  applyLUT3D(ctx, w, h, lut, strength)
  return true
}
