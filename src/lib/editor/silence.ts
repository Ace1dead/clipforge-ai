/**
 * Silence & jump-cut engine.
 * Pure, dependency-free helpers for detecting low-energy gaps in an audio
 * energy curve (as produced by `analyzeEnergy`) and for deriving a list of
 * keepable segments that remove those gaps. Works for any "clipping engine"
 * cut pipeline (client-side WASM or server-side ffmpeg).
 */

export interface Silence {
  /** Start of the silence, in seconds. */
  start: number
  /** End of the silent region, in seconds (exclusive). */
  end: number
}

export interface CutSegment {
  /** Keep-in start, in seconds. */
  start: number
  /** Keep-in end, in seconds (exclusive). */
  end: number
}

export interface DetectSilenceOptions {
  /** Length of each energy window, in seconds (must match curve). */
  windowSec?: number
  /** Absolute RMS threshold below which a window is "silent". */
  threshold?: number
  /** Minimum silence length (seconds) to report; shorter gaps are ignored. */
  minSilenceSec?: number
}

/** Pick an adaptive noise floor from the quietest 25% of an energy curve. */
export function autoThreshold(energy: number[], quietRatio = 0.25): number {
  if (energy.length === 0) return 0
  const sorted = [...energy].sort((a, b) => a - b)
  const idx = Math.min(sorted.length - 1, Math.max(0, Math.floor(sorted.length * quietRatio)))
  const quiet = sorted[idx]
  const peak = sorted[sorted.length - 1]
  // Below-noise floor relative to the quiet tail, but never absurdly low.
  return Math.max(quiet * 1.5, peak * 0.05)
}

/** Detect silent regions from an energy curve (pure). */
export function detectSilences(
  energy: number[],
  opts: DetectSilenceOptions = {}
): Silence[] {
  const windowSec = opts.windowSec ?? 0.5
  const threshold = opts.threshold ?? autoThreshold(energy)
  const minSilenceSec = opts.minSilenceSec ?? 0.4
  const silences: Silence[] = []
  let start: number | null = null

  for (let i = 0; i < energy.length; i++) {
    const t = i * windowSec
    const silent = energy[i] <= threshold
    if (silent && start === null) {
      start = t
    } else if (!silent && start !== null) {
      const len = t - start
      if (len >= minSilenceSec) silences.push({ start, end: t })
      start = null
    }
  }
  if (start !== null) {
    const len = energy.length * windowSec - start
    if (len >= minSilenceSec) silences.push({ start, end: energy.length * windowSec })
  }
  return silences
}

export interface CutOptions {
  /** Padding removed around each silence edge, in seconds. */
  marginSec?: number
  /** Drop kept segments shorter than this (seconds). */
  minCutSec?: number
}

/**
 * Build a concrete cut list (kept segments) from video duration + detected
 * silences. Every silence region is removed, expanded by `marginSec`, and any
 * resulting kept slice shorter than `minCutSec` is discarded.
 */
export function cutBySilences(
  totalDuration: number,
  silences: Silence[],
  opts: CutOptions = {}
): CutSegment[] {
  const margin = opts.marginSec ?? 0.1
  const minCut = opts.minCutSec ?? 0.5

  const forbidden: Array<{ start: number; end: number }> = silences.map((s) => ({
    start: Math.max(0, s.start - margin),
    end: s.end + margin,
  }))

  const cuts: CutSegment[] = []
  let cursor = 0
  for (const gap of forbidden) {
    if (gap.start > cursor) {
      const idxLen = gap.start - cursor
      if (idxLen >= minCut) cuts.push({ start: cursor, end: gap.start })
    }
    cursor = Math.max(cursor, gap.end)
  }
  if (totalDuration - cursor >= minCut) cuts.push({ start: cursor, end: totalDuration })
  return cuts
}