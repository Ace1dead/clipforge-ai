/**
 * Movie Timeline Builder — Converts cut plan segments into Editor timeline clips.
 *
 * Takes refined cut segments and creates a multi-track timeline with:
 * - Video clips from "keep" segments (source ranges mapped from original movie)
 * - Crossfade transitions at cut points
 * - Proper sequential timeline positioning
 */

import { createTimeline, createClip, addClipToTrack, type Timeline } from '../timeline'
import type { RefinedCutSegment } from './cutPlanner'

// ─── Types ─────────────────────────────────────────────────

export interface MovieCutResult {
  timeline: Timeline
  totalKeepDuration: number
  totalDiscardDuration: number
  clipCount: number
  sourceUrl: string
}

export interface TransitionSegment {
  type: 'keep' | 'crossfade'
  time: number
  duration: number
}

// ─── Timeline Builder ──────────────────────────────────────

/**
 * Build a timeline from refined cut segments.
 * Keep segments become video clips, packed sequentially with crossfade transitions.
 */
export function buildMovieTimeline(
  segments: RefinedCutSegment[],
  sourceUrl: string,
  originalDuration: number,
  width = 1080,
  height = 1920,
): MovieCutResult {
  const keepSegments = segments
    .filter(s => s.action === 'keep')
    .sort((a, b) => a.start - b.start)

  const totalKeepDuration = keepSegments.reduce((sum, s) => sum + (s.end - s.start), 0)
  const totalDiscardDuration = originalDuration - totalKeepDuration

  // Create timeline with total keep duration
  let timeline = createTimeline({
    name: 'Movie Summary',
    duration: totalKeepDuration,
    width,
    height,
  })

  // Add crossfade transition duration (0.3s default)
  const crossfadeDuration = 0.3

  // Build clips sequentially
  let timelinePosition = 0
  const clips = []

  for (let i = 0; i < keepSegments.length; i++) {
    const seg = keepSegments[i]
    const clipDuration = seg.end - seg.start

    const clip = createClip({
      type: 'video',
      trackId: 'track-v1',
      sourceUrl,
      sourceStart: seg.start,
      sourceEnd: seg.end,
      timelineStart: timelinePosition,
      name: seg.reason || `Segment ${i + 1}`,
    })

    // Add crossfade transition-in for clips after the first
    if (i > 0) {
      clip.transitionIn = {
        type: 'crossfade',
        duration: crossfadeDuration,
      }
    }

    timeline = addClipToTrack(timeline, 'track-v1', clip)
    clips.push(clip)

    // Advance timeline position (with crossfade overlap)
    timelinePosition += clipDuration
    if (i < keepSegments.length - 1) {
      // Overlap by crossfade duration for smooth transitions
      timelinePosition -= crossfadeDuration
    }
  }

  // Recalculate final timeline duration
  const finalDuration = timelinePosition > 0 ? timelinePosition : totalKeepDuration
  timeline = { ...timeline, duration: finalDuration }

  return {
    timeline,
    totalKeepDuration,
    totalDiscardDuration,
    clipCount: clips.length,
    sourceUrl,
  }
}

/**
 * Calculate total keep duration from segments.
 */
export function calculateTotalKeepDuration(segments: RefinedCutSegment[]): number {
  return segments
    .filter(s => s.action === 'keep')
    .reduce((sum, s) => sum + (s.end - s.start), 0)
}

/**
 * Build transition metadata for UI display.
 */
export function buildTransitionSegments(
  segments: RefinedCutSegment[],
  crossfadeDuration = 0.3,
): TransitionSegment[] {
  const keepSegments = segments
    .filter(s => s.action === 'keep')
    .sort((a, b) => a.start - b.start)

  const result: TransitionSegment[] = []

  for (let i = 0; i < keepSegments.length; i++) {
    const seg = keepSegments[i]

    if (i > 0) {
      result.push({
        type: 'crossfade',
        time: seg.start,
        duration: crossfadeDuration,
      })
    }

    result.push({
      type: 'keep',
      time: seg.start,
      duration: seg.end - seg.start,
    })
  }

  return result
}
