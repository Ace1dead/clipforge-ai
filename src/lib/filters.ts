/**
 * Filters — Instagram/TikTok-style color filters with custom filter creator.
 * Each filter is a set of CSS-like adjustments applied via canvas pixel manipulation.
 * Rivals CapCut's filter library with 30+ presets and a full custom filter editor.
 */

export interface FilterPreset {
  id: string
  name: string
  category: 'vintage' | 'cinematic' | 'warm' | 'cool' | 'dramatic' | 'artistic' | 'bw' | 'food' | 'nature' | 'retro' | 'custom'
  brightness: number      // -1 to 1
  contrast: number        // 0 to 3 (1 = normal)
  saturation: number      // 0 to 3 (1 = normal)
  vibrance: number        // 0 to 2 (1 = normal)
  hueShift: number        // -180 to 180
  temperature: number     // -1 to 1
  tint: number            // -1 to 1
  highlights: number      // -1 to 1
  shadows: number         // -1 to 1
  fade: number            // 0 to 1 (lifted blacks)
  vignette: number        // 0 to 1
  grain: number           // 0 to 1
  sharpen: number         // 0 to 1
  // Tone curve (simplified)
  curve?: { shadows: number; midtones: number; highlights: number }
  // Color overlay (subtle tint)
  overlay?: { r: number; g: number; b: number; opacity: number }
  thumbnail?: string      // CSS gradient for preview thumbnail
}

export interface CustomFilter extends FilterPreset {
  category: 'custom'
  createdAt: number
}

// ── Filter Presets ─────────────────────────────────────────────────

export const FILTER_PRESETS: FilterPreset[] = [
  // ── Vintage ─────────────────────────────────────────────────────
  {
    id: 'vintage-1', name: 'Nostalgia', category: 'vintage',
    brightness: 0.05, contrast: 0.9, saturation: 0.7, vibrance: 0.9,
    hueShift: 5, temperature: 0.15, tint: 0.05,
    highlights: 0.1, shadows: 0.15, fade: 0.25, vignette: 0.3, grain: 0.15,
    sharpen: 0, overlay: { r: 255, g: 230, b: 180, opacity: 0.08 },
    thumbnail: 'linear-gradient(135deg, #f5e6d3 0%, #d4a574 100%)',
  },
  {
    id: 'vintage-2', name: 'Film Roll', category: 'vintage',
    brightness: 0.02, contrast: 1.05, saturation: 0.65, vibrance: 0.85,
    hueShift: 8, temperature: 0.2, tint: 0.1,
    highlights: 0.15, shadows: 0.2, fade: 0.3, vignette: 0.4, grain: 0.25,
    sharpen: 0.1, overlay: { r: 240, g: 200, b: 150, opacity: 0.1 },
    thumbnail: 'linear-gradient(135deg, #e8d5b7 0%, #b8956a 100%)',
  },
  {
    id: 'vintage-3', name: 'Polaroid', category: 'vintage',
    brightness: 0.1, contrast: 0.85, saturation: 0.8, vibrance: 0.9,
    hueShift: 3, temperature: 0.1, tint: -0.05,
    highlights: 0.2, shadows: 0.1, fade: 0.15, vignette: 0.2, grain: 0.1,
    sharpen: 0, overlay: { r: 255, g: 245, b: 230, opacity: 0.05 },
    thumbnail: 'linear-gradient(135deg, #fff8f0 0%, #f0d9b5 100%)',
  },
  {
    id: 'vintage-4', name: '70s Film', category: 'vintage',
    brightness: 0.03, contrast: 1.1, saturation: 0.6, vibrance: 0.8,
    hueShift: 15, temperature: 0.3, tint: 0.15,
    highlights: 0.1, shadows: 0.25, fade: 0.35, vignette: 0.35, grain: 0.3,
    sharpen: 0, overlay: { r: 255, g: 200, b: 100, opacity: 0.12 },
    thumbnail: 'linear-gradient(135deg, #ffecd2 0%, #fcb69f 100%)',
  },

  // ── Cinematic ───────────────────────────────────────────────────
  {
    id: 'cinema-1', name: 'Teal & Orange', category: 'cinematic',
    brightness: -0.02, contrast: 1.15, saturation: 1.1, vibrance: 1.05,
    hueShift: 0, temperature: 0.1, tint: 0,
    highlights: -0.1, shadows: 0.1, fade: 0.05, vignette: 0.3, grain: 0.05,
    sharpen: 0.2, overlay: { r: 0, g: 180, b: 200, opacity: 0.05 },
    thumbnail: 'linear-gradient(135deg, #0d9488 0%, #f97316 100%)',
  },
  {
    id: 'cinema-2', name: 'Blockbuster', category: 'cinematic',
    brightness: -0.05, contrast: 1.2, saturation: 0.95, vibrance: 1.0,
    hueShift: -5, temperature: -0.05, tint: 0,
    highlights: -0.15, shadows: 0.2, fade: 0.08, vignette: 0.4, grain: 0.03,
    sharpen: 0.3, curve: { shadows: 0.1, midtones: 0, highlights: -0.1 },
    thumbnail: 'linear-gradient(135deg, #1e3a5f 0%, #2d1b4e 100%)',
  },
  {
    id: 'cinema-3', name: 'Indie Film', category: 'cinematic',
    brightness: 0.02, contrast: 1.05, saturation: 0.85, vibrance: 0.95,
    hueShift: 2, temperature: 0.05, tint: 0.02,
    highlights: 0.05, shadows: 0.15, fade: 0.12, vignette: 0.25, grain: 0.12,
    sharpen: 0.15, overlay: { r: 200, g: 220, b: 240, opacity: 0.04 },
    thumbnail: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
  },
  {
    id: 'cinema-4', name: 'Hollywood', category: 'cinematic',
    brightness: 0, contrast: 1.25, saturation: 1.05, vibrance: 1.1,
    hueShift: 0, temperature: 0, tint: 0,
    highlights: -0.1, shadows: 0.15, fade: 0.03, vignette: 0.35, grain: 0.02,
    sharpen: 0.25, curve: { shadows: 0.15, midtones: 0.05, highlights: -0.05 },
    thumbnail: 'linear-gradient(135deg, #0c0c0c 0%, #1a1a2e 100%)',
  },

  // ── Warm ────────────────────────────────────────────────────────
  {
    id: 'warm-1', name: 'Golden Hour', category: 'warm',
    brightness: 0.08, contrast: 1.0, saturation: 1.15, vibrance: 1.1,
    hueShift: 5, temperature: 0.35, tint: 0.1,
    highlights: 0.15, shadows: 0.05, fade: 0.05, vignette: 0.15, grain: 0.05,
    sharpen: 0.1, overlay: { r: 255, g: 200, b: 100, opacity: 0.1 },
    thumbnail: 'linear-gradient(135deg, #f6d365 0%, #fda085 100%)',
  },
  {
    id: 'warm-2', name: 'Sunset Glow', category: 'warm',
    brightness: 0.05, contrast: 1.05, saturation: 1.2, vibrance: 1.15,
    hueShift: 8, temperature: 0.4, tint: 0.15,
    highlights: 0.2, shadows: 0.1, fade: 0.08, vignette: 0.2, grain: 0.08,
    sharpen: 0.1, overlay: { r: 255, g: 150, b: 50, opacity: 0.12 },
    thumbnail: 'linear-gradient(135deg, #fa709a 0%, #fee140 100%)',
  },
  {
    id: 'warm-3', name: 'Candlelight', category: 'warm',
    brightness: -0.05, contrast: 1.1, saturation: 1.0, vibrance: 1.0,
    hueShift: 10, temperature: 0.5, tint: 0.2,
    highlights: 0.1, shadows: 0.2, fade: 0.15, vignette: 0.4, grain: 0.1,
    sharpen: 0.05, overlay: { r: 255, g: 180, b: 80, opacity: 0.15 },
    thumbnail: 'linear-gradient(135deg, #ff9a56 0%, #ff6a3d 100%)',
  },
  {
    id: 'warm-4', name: 'Honey', category: 'warm',
    brightness: 0.06, contrast: 0.95, saturation: 1.1, vibrance: 1.05,
    hueShift: 3, temperature: 0.25, tint: 0.08,
    highlights: 0.1, shadows: 0.08, fade: 0.1, vignette: 0.15, grain: 0.06,
    sharpen: 0.08, overlay: { r: 240, g: 200, b: 120, opacity: 0.08 },
    thumbnail: 'linear-gradient(135deg, #f0c27f 0%, #4b1248 100%)',
  },

  // ── Cool ────────────────────────────────────────────────────────
  {
    id: 'cool-1', name: 'Arctic', category: 'cool',
    brightness: 0.05, contrast: 1.05, saturation: 0.85, vibrance: 0.9,
    hueShift: -5, temperature: -0.3, tint: -0.05,
    highlights: 0.1, shadows: -0.1, fade: 0.08, vignette: 0.2, grain: 0.05,
    sharpen: 0.15, overlay: { r: 100, g: 180, b: 255, opacity: 0.06 },
    thumbnail: 'linear-gradient(135deg, #a8edea 0%, #fed6e3 100%)',
  },
  {
    id: 'cool-2', name: 'Frost', category: 'cool',
    brightness: 0.08, contrast: 0.95, saturation: 0.7, vibrance: 0.85,
    hueShift: -8, temperature: -0.4, tint: -0.1,
    highlights: 0.15, shadows: -0.05, fade: 0.15, vignette: 0.15, grain: 0.08,
    sharpen: 0.1, overlay: { r: 150, g: 200, b: 255, opacity: 0.08 },
    thumbnail: 'linear-gradient(135deg, #e0c3fc 0%, #8ec5fc 100%)',
  },
  {
    id: 'cool-3', name: 'Midnight', category: 'cool',
    brightness: -0.1, contrast: 1.15, saturation: 0.9, vibrance: 0.95,
    hueShift: -10, temperature: -0.35, tint: -0.08,
    highlights: -0.1, shadows: 0.15, fade: 0.1, vignette: 0.45, grain: 0.06,
    sharpen: 0.2, overlay: { r: 30, g: 50, b: 120, opacity: 0.1 },
    thumbnail: 'linear-gradient(135deg, #0f0c29 0%, #302b63 50%, #24243e 100%)',
  },
  {
    id: 'cool-4', name: 'Ocean', category: 'cool',
    brightness: 0.02, contrast: 1.05, saturation: 1.0, vibrance: 1.0,
    hueShift: -3, temperature: -0.2, tint: -0.05,
    highlights: 0.05, shadows: 0.05, fade: 0.05, vignette: 0.2, grain: 0.04,
    sharpen: 0.12, overlay: { r: 50, g: 150, b: 200, opacity: 0.05 },
    thumbnail: 'linear-gradient(135deg, #667db6 0%, #0082c8 50%, #667db6 100%)',
  },

  // ── Dramatic ────────────────────────────────────────────────────
  {
    id: 'drama-1', name: 'Noir', category: 'dramatic',
    brightness: -0.08, contrast: 1.35, saturation: 0, vibrance: 0,
    hueShift: 0, temperature: 0, tint: 0,
    highlights: -0.15, shadows: 0.3, fade: 0.1, vignette: 0.5, grain: 0.2,
    sharpen: 0.3, curve: { shadows: 0.2, midtones: 0, highlights: -0.15 },
    thumbnail: 'linear-gradient(135deg, #000000 0%, #434343 100%)',
  },
  {
    id: 'drama-2', name: 'High Contrast', category: 'dramatic',
    brightness: 0, contrast: 1.5, saturation: 1.1, vibrance: 1.1,
    hueShift: 0, temperature: 0, tint: 0,
    highlights: -0.2, shadows: 0.25, fade: 0, vignette: 0.3, grain: 0.02,
    sharpen: 0.35, curve: { shadows: 0.25, midtones: 0, highlights: -0.2 },
    thumbnail: 'linear-gradient(135deg, #1a1a1a 0%, #ffffff 100%)',
  },
  {
    id: 'drama-3', name: 'Bleach Bypass', category: 'dramatic',
    brightness: -0.03, contrast: 1.3, saturation: 0.5, vibrance: 0.7,
    hueShift: 0, temperature: 0.05, tint: 0,
    highlights: -0.1, shadows: 0.2, fade: 0.05, vignette: 0.35, grain: 0.1,
    sharpen: 0.25, overlay: { r: 200, g: 210, b: 220, opacity: 0.05 },
    thumbnail: 'linear-gradient(135deg, #373b44 0%, #4286f4 100%)',
  },
  {
    id: 'drama-4', name: 'Dark & Moody', category: 'dramatic',
    brightness: -0.12, contrast: 1.2, saturation: 0.8, vibrance: 0.9,
    hueShift: -5, temperature: -0.1, tint: 0.05,
    highlights: -0.15, shadows: 0.3, fade: 0.12, vignette: 0.5, grain: 0.15,
    sharpen: 0.2, overlay: { r: 40, g: 30, b: 50, opacity: 0.1 },
    thumbnail: 'linear-gradient(135deg, #0f0c29 0%, #302b63 100%)',
  },

  // ── Artistic ────────────────────────────────────────────────────
  {
    id: 'art-1', name: 'Lomo', category: 'artistic',
    brightness: 0.03, contrast: 1.2, saturation: 1.3, vibrance: 1.2,
    hueShift: 5, temperature: 0.1, tint: 0.05,
    highlights: 0.1, shadows: 0.15, fade: 0.05, vignette: 0.5, grain: 0.15,
    sharpen: 0.1, overlay: { r: 255, g: 200, b: 150, opacity: 0.06 },
    thumbnail: 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)',
  },
  {
    id: 'art-2', name: 'Cross Process', category: 'artistic',
    brightness: 0.05, contrast: 1.15, saturation: 1.2, vibrance: 1.1,
    hueShift: 20, temperature: 0.15, tint: -0.1,
    highlights: 0.1, shadows: 0.1, fade: 0.08, vignette: 0.3, grain: 0.1,
    sharpen: 0.15, overlay: { r: 200, g: 255, b: 150, opacity: 0.06 },
    thumbnail: 'linear-gradient(135deg, #a8e063 0%, #56ab2f 100%)',
  },
  {
    id: 'art-3', name: 'Pop Art', category: 'artistic',
    brightness: 0.1, contrast: 1.4, saturation: 1.5, vibrance: 1.3,
    hueShift: 0, temperature: 0, tint: 0,
    highlights: 0.1, shadows: 0.1, fade: 0, vignette: 0.1, grain: 0,
    sharpen: 0.3, overlay: { r: 255, g: 255, b: 100, opacity: 0.04 },
    thumbnail: 'linear-gradient(135deg, #f7971e 0%, #ffd200 100%)',
  },
  {
    id: 'art-4', name: 'Infrared', category: 'artistic',
    brightness: 0.05, contrast: 1.1, saturation: 1.4, vibrance: 1.3,
    hueShift: 30, temperature: 0.2, tint: -0.15,
    highlights: 0.1, shadows: 0.1, fade: 0.05, vignette: 0.2, grain: 0.08,
    sharpen: 0.2, overlay: { r: 255, g: 100, b: 150, opacity: 0.06 },
    thumbnail: 'linear-gradient(135deg, #ff758c 0%, #ff7eb3 100%)',
  },

  // ── B&W ─────────────────────────────────────────────────────────
  {
    id: 'bw-1', name: 'Classic B&W', category: 'bw',
    brightness: 0, contrast: 1.1, saturation: 0, vibrance: 0,
    hueShift: 0, temperature: 0, tint: 0,
    highlights: 0, shadows: 0, fade: 0, vignette: 0.1, grain: 0.1,
    sharpen: 0.2, curve: { shadows: 0.1, midtones: 0, highlights: -0.05 },
    thumbnail: 'linear-gradient(135deg, #3a3a3a 0%, #b0b0b0 100%)',
  },
  {
    id: 'bw-2', name: 'Silver Gelatin', category: 'bw',
    brightness: 0.02, contrast: 1.2, saturation: 0, vibrance: 0,
    hueShift: 0, temperature: 0, tint: 0,
    highlights: -0.05, shadows: 0.15, fade: 0.05, vignette: 0.25, grain: 0.2,
    sharpen: 0.25, curve: { shadows: 0.15, midtones: 0.05, highlights: -0.1 },
    thumbnail: 'linear-gradient(135deg, #232526 0%, #414345 100%)',
  },

  // ── Food ────────────────────────────────────────────────────────
  {
    id: 'food-1', name: 'Fresh', category: 'food',
    brightness: 0.08, contrast: 1.05, saturation: 1.2, vibrance: 1.15,
    hueShift: 0, temperature: 0.1, tint: 0.05,
    highlights: 0.1, shadows: 0.05, fade: 0.03, vignette: 0.1, grain: 0.03,
    sharpen: 0.2, overlay: { r: 255, g: 255, b: 220, opacity: 0.04 },
    thumbnail: 'linear-gradient(135deg, #11998e 0%, #38ef7d 100%)',
  },
  {
    id: 'food-2', name: 'Warm Plate', category: 'food',
    brightness: 0.05, contrast: 1.1, saturation: 1.15, vibrance: 1.1,
    hueShift: 3, temperature: 0.2, tint: 0.08,
    highlights: 0.08, shadows: 0.08, fade: 0.05, vignette: 0.15, grain: 0.05,
    sharpen: 0.15, overlay: { r: 255, g: 220, b: 180, opacity: 0.06 },
    thumbnail: 'linear-gradient(135deg, #f2994a 0%, #f2c94c 100%)',
  },

  // ── Nature ──────────────────────────────────────────────────────
  {
    id: 'nature-1', name: 'Lush', category: 'nature',
    brightness: 0.03, contrast: 1.1, saturation: 1.25, vibrance: 1.2,
    hueShift: -5, temperature: -0.05, tint: -0.05,
    highlights: 0.05, shadows: 0.08, fade: 0.03, vignette: 0.15, grain: 0.03,
    sharpen: 0.2, overlay: { r: 100, g: 200, b: 100, opacity: 0.04 },
    thumbnail: 'linear-gradient(135deg, #134e5e 0%, #71b280 100%)',
  },
  {
    id: 'nature-2', name: 'Autumn', category: 'nature',
    brightness: 0.05, contrast: 1.05, saturation: 1.15, vibrance: 1.1,
    hueShift: 15, temperature: 0.2, tint: 0.1,
    highlights: 0.08, shadows: 0.1, fade: 0.05, vignette: 0.2, grain: 0.06,
    sharpen: 0.15, overlay: { r: 200, g: 150, b: 50, opacity: 0.06 },
    thumbnail: 'linear-gradient(135deg, #e65c00 0%, #f9d423 100%)',
  },

  // ── Retro ───────────────────────────────────────────────────────
  {
    id: 'retro-1', name: 'VHS', category: 'retro',
    brightness: 0.03, contrast: 1.1, saturation: 0.9, vibrance: 0.95,
    hueShift: 3, temperature: 0.1, tint: 0.05,
    highlights: 0.05, shadows: 0.12, fade: 0.2, vignette: 0.3, grain: 0.2,
    sharpen: 0.05, overlay: { r: 255, g: 200, b: 200, opacity: 0.06 },
    thumbnail: 'linear-gradient(135deg, #fc466b 0%, #3f5efb 100%)',
  },
  {
    id: 'retro-2', name: 'Dreamy', category: 'retro',
    brightness: 0.12, contrast: 0.85, saturation: 0.8, vibrance: 0.9,
    hueShift: 5, temperature: 0.15, tint: 0.1,
    highlights: 0.25, shadows: 0.1, fade: 0.2, vignette: 0.2, grain: 0.1,
    sharpen: 0, overlay: { r: 255, g: 200, b: 255, opacity: 0.08 },
    thumbnail: 'linear-gradient(135deg, #ffecd2 0%, #fcb69f 100%)',
  },
]

// ── Filter Categories ──────────────────────────────────────────────

export const FILTER_CATEGORIES = [
  { id: 'all', name: 'All' },
  { id: 'vintage', name: 'Vintage' },
  { id: 'cinematic', name: 'Cinematic' },
  { id: 'warm', name: 'Warm' },
  { id: 'cool', name: 'Cool' },
  { id: 'dramatic', name: 'Dramatic' },
  { id: 'artistic', name: 'Artistic' },
  { id: 'bw', name: 'B&W' },
  { id: 'food', name: 'Food' },
  { id: 'nature', name: 'Nature' },
  { id: 'retro', name: 'Retro' },
  { id: 'custom', name: 'Custom' },
] as const

// ── Apply Filter to Canvas ─────────────────────────────────────────

export function applyFilter(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  filter: FilterPreset,
  strength: number = 1,
): void {
  const imageData = ctx.getImageData(0, 0, w, h)
  const data = imageData.data

  const s = strength
  const b = filter.brightness * s
  const c = 1 + (filter.contrast - 1) * s
  const sat = 1 + (filter.saturation - 1) * s
  const temp = filter.temperature * s
  const tint = filter.tint * s
  const fade = filter.fade * s
  const hue = filter.hueShift * s

  for (let i = 0; i < data.length; i += 4) {
    let r = data[i]
    let g = data[i + 1]
    let bVal = data[i + 2]

    // Brightness
    r += b * 255
    g += b * 255
    bVal += b * 255

    // Contrast
    r = ((r / 255 - 0.5) * c + 0.5) * 255
    g = ((g / 255 - 0.5) * c + 0.5) * 255
    bVal = ((bVal / 255 - 0.5) * c + 0.5) * 255

    // Saturation
    const gray = 0.2989 * r + 0.587 * g + 0.114 * bVal
    r = gray + (r - gray) * sat
    g = gray + (g - gray) * sat
    bVal = gray + (bVal - gray) * sat

    // Temperature (warm = more red/yellow, cool = more blue)
    r += temp * 30
    g += temp * 10
    bVal -= temp * 20

    // Tint (green/magenta)
    g += tint * 20

    // Fade (lift blacks)
    const fadeAmount = fade * 40
    r = r + (fadeAmount - r) * fade * 0.3
    g = g + (fadeAmount - g) * fade * 0.3
    bVal = bVal + (fadeAmount + 10 - bVal) * fade * 0.3

    // Hue shift (simplified — rotate around red/green/blue)
    if (Math.abs(hue) > 0.5) {
      const angle = (hue * Math.PI) / 180
      const cos = Math.cos(angle)
      const sin = Math.sin(angle)
      const nr = r * (cos + (1 - cos) / 3) + g * ((1 - cos) / 3 - Math.sqrt(1 / 3) * sin) + bVal * ((1 - cos) / 3 + Math.sqrt(1 / 3) * sin)
      const ng = r * ((1 - cos) / 3 + Math.sqrt(1 / 3) * sin) + g * (cos + (1 - cos) / 3) + bVal * ((1 - cos) / 3 - Math.sqrt(1 / 3) * sin)
      const nb = r * ((1 - cos) / 3 - Math.sqrt(1 / 3) * sin) + g * ((1 - cos) / 3 + Math.sqrt(1 / 3) * sin) + bVal * (cos + (1 - cos) / 3)
      r = nr; g = ng; bVal = nb
    }

    // Color overlay
    if (filter.overlay) {
      const o = filter.overlay
      r = r + (o.r - r) * o.opacity * s
      g = g + (o.g - g) * o.opacity * s
      bVal = bVal + (o.b - bVal) * o.opacity * s
    }

    data[i] = Math.max(0, Math.min(255, r))
    data[i + 1] = Math.max(0, Math.min(255, g))
    data[i + 2] = Math.max(0, Math.min(255, bVal))
  }

  ctx.putImageData(imageData, 0, 0)

  // Vignette (post-process)
  if (filter.vignette > 0 && s > 0) {
    const vig = filter.vignette * s
    const gradient = ctx.createRadialGradient(w / 2, h / 2, w * 0.3, w / 2, h / 2, w * 0.8)
    gradient.addColorStop(0, 'rgba(0,0,0,0)')
    gradient.addColorStop(1, `rgba(0,0,0,${vig})`)
    ctx.fillStyle = gradient
    ctx.fillRect(0, 0, w, h)
  }

  // Film grain (post-process)
  if (filter.grain > 0 && s > 0) {
    const grainAmount = filter.grain * s * 30
    const grainData = ctx.getImageData(0, 0, w, h)
    const gd = grainData.data
    for (let i = 0; i < gd.length; i += 4) {
      const noise = (Math.random() - 0.5) * grainAmount
      gd[i] = Math.max(0, Math.min(255, gd[i] + noise))
      gd[i + 1] = Math.max(0, Math.min(255, gd[i + 1] + noise))
      gd[i + 2] = Math.max(0, Math.min(255, gd[i + 2] + noise))
    }
    ctx.putImageData(grainData, 0, 0)
  }
}

// ── Custom Filter Storage ──────────────────────────────────────────

const STORAGE_KEY = 'clipforge_custom_filters'

export function getCustomFilters(): CustomFilter[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    return raw ? JSON.parse(raw) : []
  } catch {
    return []
  }
}

export function saveCustomFilter(filter: CustomFilter): void {
  const filters = getCustomFilters()
  const existing = filters.findIndex(f => f.id === filter.id)
  if (existing >= 0) {
    filters[existing] = filter
  } else {
    filters.push(filter)
  }
  localStorage.setItem(STORAGE_KEY, JSON.stringify(filters))
}

export function deleteCustomFilter(id: string): void {
  const filters = getCustomFilters().filter(f => f.id !== id)
  localStorage.setItem(STORAGE_KEY, JSON.stringify(filters))
}

export function createCustomFilter(base: Partial<FilterPreset> & { name: string }): CustomFilter {
  return {
    id: `custom-${Date.now()}`,
    name: base.name,
    category: 'custom',
    brightness: base.brightness ?? 0,
    contrast: base.contrast ?? 1,
    saturation: base.saturation ?? 1,
    vibrance: base.vibrance ?? 1,
    hueShift: base.hueShift ?? 0,
    temperature: base.temperature ?? 0,
    tint: base.tint ?? 0,
    highlights: base.highlights ?? 0,
    shadows: base.shadows ?? 0,
    fade: base.fade ?? 0,
    vignette: base.vignette ?? 0,
    grain: base.grain ?? 0,
    sharpen: base.sharpen ?? 0,
    curve: base.curve,
    overlay: base.overlay,
    createdAt: Date.now(),
  }
}

// ── Get all filters (presets + custom) ─────────────────────────────

export function getAllFilters(): FilterPreset[] {
  return [...FILTER_PRESETS, ...getCustomFilters()]
}

export function getFiltersByCategory(category: string): FilterPreset[] {
  if (category === 'all') return getAllFilters()
  return getAllFilters().filter(f => f.category === category)
}

export function getFilterById(id: string): FilterPreset | undefined {
  return getAllFilters().find(f => f.id === id)
}
