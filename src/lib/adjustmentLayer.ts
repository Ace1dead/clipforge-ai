/**
 * Adjustment Layer — Apply effects/color grading to all layers below.
 * Rivals Premiere Pro's adjustment layers and CapCut's overlay effects.
 */

import type { ClipEffect, ColorGradeConfig, MaskConfig } from './timeline'
import { applyColorGrading, DEFAULT_COLOR_GRADING, type ColorGradingState } from './colorGrading'

export interface AdjustmentLayer {
  id: string
  name: string
  startTime: number
  endTime: number
  opacity: number           // 0-1

  // Effects applied to all tracks below
  effects: ClipEffect[]

  // Color grading
  colorGrade: ColorGradingState

  // Optional mask (limits where the adjustment applies)
  mask?: MaskConfig

  // Blend mode
  blendMode: 'normal' | 'multiply' | 'screen' | 'overlay' | 'soft-light' | 'hard-light'
}

export function createAdjustmentLayer(opts: {
  name?: string
  startTime?: number
  endTime?: number
  opacity?: number
}): AdjustmentLayer {
  return {
    id: `adj-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    name: opts.name ?? 'Adjustment Layer',
    startTime: opts.startTime ?? 0,
    endTime: opts.endTime ?? 10,
    opacity: opts.opacity ?? 1,
    effects: [],
    colorGrade: { ...DEFAULT_COLOR_GRADING },
    blendMode: 'normal',
  }
}

/**
 * Apply an adjustment layer to a canvas.
 * Renders the adjustment effects on an offscreen canvas, then composites.
 */
export function applyAdjustmentLayer(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  layer: AdjustmentLayer,
): void {
  if (layer.opacity <= 0) return

  ctx.save()
  ctx.globalAlpha = layer.opacity
  ctx.globalCompositeOperation = layer.blendMode === 'normal' ? 'source-over' : layer.blendMode

  // Apply color grading if any non-default values
  const cg = layer.colorGrade
  const hasGrading = cg.brightness !== 0 || cg.contrast !== 1 || cg.saturation !== 1
    || cg.hueShift !== 0 || cg.temperature !== 0 || cg.tint !== 0
    || cg.vignetteStrength > 0

  if (hasGrading) {
    applyColorGrading(ctx, w, h, cg)
  }

  ctx.restore()
}

// ═══════════════════════════════════════════════════════════════
// ADJUSTMENT LAYER PRESETS
// ═══════════════════════════════════════════════════════════════

export const ADJUSTMENT_PRESETS: Record<string, Partial<AdjustmentLayer>> = {
  'cinematic-warm': {
    name: 'Cinematic Warm',
    colorGrade: { ...DEFAULT_COLOR_GRADING, temperature: 0.3, saturation: 1.1, contrast: 1.1, vignetteStrength: 0.2 },
  },
  'cinematic-cold': {
    name: 'Cinematic Cold',
    colorGrade: { ...DEFAULT_COLOR_GRADING, temperature: -0.3, saturation: 0.9, contrast: 1.15 },
  },
  'vintage-fade': {
    name: 'Vintage Fade',
    colorGrade: { ...DEFAULT_COLOR_GRADING, brightness: 0.05, contrast: 0.85, saturation: 0.6, temperature: 0.2, shadows: 0.1 },
  },
  'high-contrast': {
    name: 'High Contrast',
    colorGrade: { ...DEFAULT_COLOR_GRADING, contrast: 1.5, saturation: 1.2, blacks: -0.15 },
  },
  'dreamy': {
    name: 'Dreamy',
    colorGrade: { ...DEFAULT_COLOR_GRADING, brightness: 0.08, contrast: 0.9, saturation: 0.8, vignetteStrength: 0.15, vignetteRadius: 1.5 },
  },
  'dramatic': {
    name: 'Dramatic',
    colorGrade: { ...DEFAULT_COLOR_GRADING, contrast: 1.3, saturation: 0.7, shadows: -0.2, highlights: 0.15, vignetteStrength: 0.4 },
  },
  'bleach-bypass': {
    name: 'Bleach Bypass',
    colorGrade: { ...DEFAULT_COLOR_GRADING, saturation: 0.35, contrast: 1.5, brightness: -0.03 },
  },
  'noir': {
    name: 'Noir',
    colorGrade: { ...DEFAULT_COLOR_GRADING, saturation: 0, contrast: 1.6, vignetteStrength: 0.6 },
  },
}
