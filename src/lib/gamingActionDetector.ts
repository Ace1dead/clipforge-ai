/**
 * Gaming Action Detector — Pixel-level analysis for gaming/stream content.
 * Based on Auto-clipper's PixelAnalyzer v3_temporal scoring.
 * Client-side implementation using canvas ImageData.
 */

export interface PixelFrame {
  data: Uint8ClampedArray
  width: number
  height: number
}

export interface FlashResult {
  detected: boolean
  intensity: number
  isCenter: boolean
}

export interface ActionScore {
  brightness: number
  centerBrightness: number
  temporalDelta: number
  flashDetected: boolean
  actionScore: number
}

export interface GamingActionInput {
  temporalDelta: number
  brightnessDelta: number
  centerBrightnessDelta: number
  flashDetected: boolean
  sustainedActivity: boolean
  healthChanged: boolean
  ammoChanged: boolean
  vignetteOnset: boolean
}

// ═══════════════════════════════════════════════════════════════
// BRIGHTNESS COMPUTATION
// ═══════════════════════════════════════════════════════════════

/**
 * Computes average brightness of a frame (0-255).
 */
function computeBrightness(data: Uint8ClampedArray, width: number, height: number): number {
  if (data.length === 0 || width === 0 || height === 0) return 0
  let sum = 0
  let count = 0
  for (let i = 0; i < data.length; i += 4) {
    sum += 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2]
    count++
  }
  return count > 0 ? sum / count : 0
}

/**
 * Computes brightness of the center region (crosshair area).
 */
function computeCenterBrightness(
  data: Uint8ClampedArray,
  width: number,
  height: number,
): number {
  const centerX = Math.floor(width / 2)
  const centerY = Math.floor(height / 2)
  const regionW = Math.floor(width * 0.3)
  const regionH = Math.floor(height * 0.3)
  const startX = centerX - regionW / 2
  const startY = centerY - regionH / 2

  let sum = 0
  let count = 0

  for (let y = startY; y < startY + regionH && y < height; y++) {
    for (let x = startX; x < startX + regionW && x < width; x++) {
      if (x < 0 || y < 0) continue
      const idx = (y * width + x) * 4
      sum += 0.299 * data[idx] + 0.587 * data[idx + 1] + 0.114 * data[idx + 2]
      count++
    }
  }

  return count > 0 ? sum / count : 0
}

// ═══════════════════════════════════════════════════════════════
// FLASH DETECTION (Auto-clipper PixelAnalyzer)
// ═══════════════════════════════════════════════════════════════

/**
 * Detects sudden flash (brightness delta > threshold).
 * Based on Auto-clipper's sudden_flash and localized_flash signals.
 */
export function detectFlash(current: PixelFrame, previous: PixelFrame): FlashResult {
  if (current.data.length !== previous.data.length) {
    return { detected: false, intensity: 0, isCenter: false }
  }

  const currBrightness = computeBrightness(current.data, current.width, current.height)
  const prevBrightness = computeBrightness(previous.data, previous.width, previous.height)
  const delta = currBrightness - prevBrightness

  // Sudden flash: global brightness delta > 15
  if (delta > 15) {
    return { detected: true, intensity: delta, isCenter: false }
  }

  // Localized flash: center delta > 25 AND > 2.5x edge delta
  const currCenter = computeCenterBrightness(current.data, current.width, current.height)
  const prevCenter = computeCenterBrightness(previous.data, previous.width, previous.height)
  const centerDelta = currCenter - prevCenter

  if (centerDelta > 25) {
    const edgeBrightness = computeEdgeBrightness(current.data, current.width, current.height)
    const prevEdgeBrightness = computeEdgeBrightness(previous.data, previous.width, previous.height)
    const edgeDelta = Math.abs(edgeBrightness - prevEdgeBrightness)

    if (edgeDelta === 0 || centerDelta > edgeDelta * 2.5) {
      return { detected: true, intensity: centerDelta, isCenter: true }
    }
  }

  return { detected: false, intensity: 0, isCenter: false }
}

/**
 * Detects muzzle flash specifically (bright pixels in center/crosshair region).
 * Based on Auto-clipper's HSV value > 235 detection.
 */
export function detectMuzzleFlash(frame: PixelFrame): boolean {
  const centerX = Math.floor(frame.width / 2)
  const centerY = Math.floor(frame.height / 2)
  const regionW = Math.floor(frame.width * 0.15)
  const regionH = Math.floor(frame.height * 0.15)

  let brightCount = 0
  let totalCount = 0

  for (let y = centerY - regionH; y < centerY + regionH; y++) {
    for (let x = centerX - regionW; x < centerX + regionW; x++) {
      if (x < 0 || x >= frame.width || y < 0 || y >= frame.height) continue
      const idx = (y * frame.width + x) * 4
      const r = frame.data[idx], g = frame.data[idx + 1], b = frame.data[idx + 2]
      // HSV value > 235 = very bright
      const value = Math.max(r, g, b)
      if (value > 235) brightCount++
      totalCount++
    }
  }

  return totalCount > 0 && brightCount / totalCount > 0.1
}

/**
 * Detects full-screen flash (white screen, death screen, transition).
 */
export function detectScreenFlash(current: PixelFrame, previous: PixelFrame): boolean {
  const currBrightness = computeBrightness(current.data, current.width, current.height)
  const prevBrightness = computeBrightness(previous.data, previous.width, previous.height)
  return Math.abs(currBrightness - prevBrightness) > 40
}

// ═══════════════════════════════════════════════════════════════
// TEMPORAL DELTA (Auto-clipper v3_temporal)
// ═══════════════════════════════════════════════════════════════

/**
 * Computes frame-to-frame temporal delta (0-255).
 * This is the primary signal in Auto-clipper's v3_temporal scoring.
 */
export function computeTemporalDelta(current: PixelFrame, previous: PixelFrame): number {
  if (current.data.length !== previous.data.length) return 0

  let sumDiff = 0
  const step = 4 // Sample every 4th pixel for performance
  for (let i = 0; i < current.data.length; i += step) {
    sumDiff += Math.abs(current.data[i] - previous.data[i])
  }

  return (sumDiff / (current.data.length / step)) * 4 // Scale to 0-255 range
}

// ═══════════════════════════════════════════════════════════════
// EDGE BRIGHTNESS
// ═══════════════════════════════════════════════════════════════

function computeEdgeBrightness(data: Uint8ClampedArray, width: number, height: number): number {
  let sum = 0
  let count = 0

  // Left and right edge strips (10% width)
  const edgeWidth = Math.floor(width * 0.1)

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < edgeWidth; x++) {
      const idx = (y * width + x) * 4
      sum += 0.299 * data[idx] + 0.587 * data[idx + 1] + 0.114 * data[idx + 2]
      count++
    }
    for (let x = width - edgeWidth; x < width; x++) {
      const idx = (y * width + x) * 4
      sum += 0.299 * data[idx] + 0.587 * data[idx + 1] + 0.114 * data[idx + 2]
      count++
    }
  }

  return count > 0 ? sum / count : 0
}

// ═══════════════════════════════════════════════════════════════
// GAMING ACTION SCORING (Auto-clipper v3_temporal weights)
// ═══════════════════════════════════════════════════════════════

/**
 * Scores gaming action based on multiple pixel indicators.
 * Based on Auto-clipper's v3_temporal scoring weights:
 *
 * Temporal signals (primary):
 * - sudden_flash: +25
 * - localized_flash: +20
 * - sustained_combat: +22
 * - health_dropping: +15
 * - ammo_changed: +18
 * - vignette_onset: +12
 * - screen_flash: +28
 *
 * Static signals (secondary, boosted by temporal):
 * - has_muzzle_flash: +18 (with action) / +3 (alone)
 */
export function scoreGamingAction(input: GamingActionInput): number {
  let score = 0

  // Temporal signals (primary)
  if (input.flashDetected && input.brightnessDelta > 15) score += 25
  if (input.centerBrightnessDelta > 15 && input.centerBrightnessDelta > input.brightnessDelta * 2.5) score += 20
  if (input.sustainedActivity) score += 22
  if (input.healthChanged) score += 15
  if (input.ammoChanged) score += 18
  if (input.vignetteOnset) score += 12
  if (input.flashDetected && input.brightnessDelta > 40) score += 28

  // Temporal delta bonus (v3_temporal primary signal)
  if (input.temporalDelta > 10) score += Math.min(15, input.temporalDelta)

  // Static signals (boosted when temporal is active)
  const hasTemporal = input.temporalDelta > 5 || input.flashDetected
  if (input.flashDetected) score += hasTemporal ? 18 : 3

  return Math.min(100, score)
}

// ═══════════════════════════════════════════════════════════════
// FRAME ANALYSIS
// ═══════════════════════════════════════════════════════════════

/**
 * Full frame analysis — computes all metrics.
 */
export function analyzeFrame(
  current: PixelFrame,
  previous: PixelFrame,
): ActionScore {
  const brightness = computeBrightness(current.data, current.width, current.height)
  const centerBrightness = computeCenterBrightness(current.data, current.width, current.height)
  const temporalDelta = computeTemporalDelta(current, previous)
  const flash = detectFlash(current, previous)

  const prevBrightness = computeBrightness(previous.data, previous.width, previous.height)
  const prevCenterBrightness = computeCenterBrightness(previous.data, previous.width, previous.height)

  const actionScore = scoreGamingAction({
    temporalDelta,
    brightnessDelta: brightness - prevBrightness,
    centerBrightnessDelta: centerBrightness - prevCenterBrightness,
    flashDetected: flash.detected,
    sustainedActivity: false, // Requires multi-frame analysis
    healthChanged: false, // Requires HUD detection
    ammoChanged: false, // Requires HUD detection
    vignetteOnset: false, // Requires edge analysis
  })

  return {
    brightness,
    centerBrightness,
    temporalDelta,
    flashDetected: flash.detected,
    actionScore,
  }
}
