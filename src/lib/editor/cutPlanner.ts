/**
 * Cut Planner — Refines AI-generated cut plans with transcript-aware boundary detection.
 *
 * Takes the raw cut plan from the summarizer and:
 * 1. Snaps cut points to nearest word boundaries (avoid mid-word cuts)
 * 2. Ensures sentence boundaries (avoids cutting mid-sentence)
 * 3. Optionally snaps to silence gaps for cleaner cuts
 * 4. Validates coverage and fills gaps
 */

import type { WordTimestamp } from '../stt'
import type { CutSegment } from './movieSummarizer'

// ─── Types ─────────────────────────────────────────────────

export interface RefinedCutSegment extends CutSegment {
  confidence: number  // 0-1, how confident we are in this cut point
}

export interface Silence {
  start: number
  end: number
}

export interface CutPlannerOptions {
  sentenceMargin?: number      // seconds to extend for sentence completion (default 0.3)
  silenceSnapTolerance?: number // max seconds to snap to silence (default 1.5)
  minKeepDuration?: number     // minimum keep segment duration in seconds (default 2)
  minDiscardDuration?: number  // minimum discard segment duration in seconds (default 0.5)
}

// ─── Boundary Refinement ───────────────────────────────────

/**
 * Refine cut boundaries by snapping to word and sentence boundaries.
 * Prevents mid-word or mid-sentence cuts that feel jarring.
 */
export function refineCutBoundaries(
  segments: CutSegment[],
  words: WordTimestamp[],
  totalDuration: number,
  opts?: CutPlannerOptions,
): RefinedCutSegment[] {
  if (segments.length === 0) return []

  const sorted = [...segments].sort((a, b) => a.start - b.start)
  const refined: RefinedCutSegment[] = []

  for (const seg of sorted) {
    let start = seg.start
    let end = seg.end

    if (words.length > 0) {
      // Snap start to nearest word boundary
      start = snapToWordBoundary(start, words, 'start')
      // Snap end to nearest word boundary
      end = snapToWordBoundary(end, words, 'end')

      // Ensure sentence boundaries for keep segments
      if (seg.action === 'keep') {
        const sentence = ensureSentenceBoundaries(start, end, words, opts?.sentenceMargin)
        start = sentence.start
        end = sentence.end
      }
    }

    // Clamp to valid range
    start = Math.max(0, Math.min(start, totalDuration))
    end = Math.max(start, Math.min(end, totalDuration))

    refined.push({
      start,
      end,
      action: seg.action,
      reason: seg.reason,
      confidence: seg.action === 'keep' ? 0.9 : 0.7,
    })
  }

  return refined
}

/**
 * Snap a time value to the nearest word boundary.
 * 'start' mode: snap to the start of the nearest word.
 * 'end' mode: snap to the end of the nearest word.
 */
function snapToWordBoundary(
  time: number,
  words: WordTimestamp[],
  mode: 'start' | 'end',
): number {
  if (words.length === 0) return time

  let closest = time
  let minDist = Infinity

  for (const word of words) {
    const target = mode === 'start' ? word.start : word.end
    const dist = Math.abs(target - time)
    if (dist < minDist) {
      minDist = dist
      closest = target
    }
  }

  return closest
}

// ─── Silence Snapping ──────────────────────────────────────

/**
 * Snap a time value to the nearest silence boundary.
 * Useful for finding clean cut points in dialogue.
 */
export function snapToNearestSilence(
  time: number,
  silences: Silence[],
  toleranceSec = 1.5,
): number {
  let closest = time
  let minDist = Infinity

  for (const silence of silences) {
    // Check start of silence
    const distStart = Math.abs(silence.start - time)
    if (distStart < minDist && distStart <= toleranceSec) {
      minDist = distStart
      closest = silence.start
    }
    // Check end of silence
    const distEnd = Math.abs(silence.end - time)
    if (distEnd < minDist && distEnd <= toleranceSec) {
      minDist = distEnd
      closest = silence.end
    }
    // Check if time is inside the silence
    if (time >= silence.start && time <= silence.end) {
      return time // Already in silence, no snap needed
    }
  }

  return closest
}

// ─── Sentence Boundary Detection ───────────────────────────

/**
 * Extend a segment to include complete sentences.
 * Looks for sentence-ending punctuation (., !, ?) in the transcript.
 */
export function ensureSentenceBoundaries(
  start: number,
  end: number,
  words: WordTimestamp[],
  marginSec = 0.3,
): { start: number; end: number } {
  if (words.length === 0) return { start, end }

  // Find words within the segment
  const segmentWords = words.filter(w => w.start >= start - marginSec && w.end <= end + marginSec)
  if (segmentWords.length === 0) return { start, end }

  // Look for sentence boundaries
  const sentenceEnders = /[.!?]$/
  let extendedStart = start
  let extendedEnd = end

  // Extend start backward to find sentence start
  for (let i = 0; i < words.length; i++) {
    const w = words[i]
    if (w.start > start) break
    // If previous word ends a sentence, this is a good start point
    if (i > 0 && sentenceEnders.test(words[i - 1].word)) {
      extendedStart = w.start
    }
  }

  // Extend end forward to find sentence end
  for (const w of words) {
    if (w.start < end - marginSec) continue
    if (sentenceEnders.test(w.word)) {
      extendedEnd = Math.max(extendedEnd, w.end + marginSec)
      break
    }
  }

  return { start: extendedStart, end: extendedEnd }
}

// ─── Utilities ─────────────────────────────────────────────

/**
 * Calculate total keep duration from refined segments.
 */
export function calculateKeepDuration(segments: RefinedCutSegment[]): number {
  return segments
    .filter(s => s.action === 'keep')
    .reduce((sum, s) => sum + (s.end - s.start), 0)
}

/**
 * Fill small gaps between segments with keep actions.
 * If a gap is shorter than minDiscardDuration, it gets merged into adjacent keep segments.
 */
export function fillSmallGaps(
  segments: RefinedCutSegment[],
  minDiscardDuration = 0.5,
): RefinedCutSegment[] {
  if (segments.length <= 1) return segments

  const sorted = [...segments].sort((a, b) => a.start - b.start)
  const result: RefinedCutSegment[] = [sorted[0]]

  for (let i = 1; i < sorted.length; i++) {
    const prev = result[result.length - 1]
    const curr = sorted[i]
    const gap = curr.start - prev.end

    if (gap > 0 && gap < minDiscardDuration && prev.action === 'keep' && curr.action === 'keep') {
      // Merge: extend previous segment to cover the gap
      prev.end = curr.end
      prev.reason += '; ' + curr.reason
    } else {
      result.push({ ...curr })
    }
  }

  return result
}
