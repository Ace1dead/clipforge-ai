/**
 * Jump-cut planner.
 * Given a clip window and a list of detected silences, derive the ordered list
 * of sub-ranges that survive the cut — the segments a renderer must export and
 * concatenate to produce a silence-free clip.
 */

export interface Silence {
  start: number
  end: number
}

export interface JumpCutPlanOptions {
  /** Padding removed around each silence edge, in seconds. */
  marginSec?: number
  /** Drop surviving sub-cuts shorter than this, in seconds. */
  minCutSec?: number
}

export interface JumpCutSegment {
  start: number
  end: number
}

/** Intersect the clip window with the expanded silence spans, keep the rest. */
export function buildJumpCutPlan(
  clipStart: number,
  clipEnd: number,
  silences: Silence[],
  opts: JumpCutPlanOptions = {}
): JumpCutSegment[] {
  const margin = opts.marginSec ?? 0.1
  const minCut = opts.minCutSec ?? 0.5

  // Silence spans clamped to the clip and expanded by margin.
  const forbidden: Array<{ start: number; end: number }> = silences
    .filter((s) => s.end > clipStart && s.start < clipEnd)
    .map((s) => ({
      start: Math.max(clipStart, s.start - margin),
      end: Math.min(clipEnd, s.end + margin),
    }))
    .sort((a, b) => a.start - b.start)

  const out: JumpCutSegment[] = []
  let cursor = clipStart
  for (const gap of forbidden) {
    if (gap.start > cursor) {
      const len = gap.start - cursor
      if (len >= minCut) out.push({ start: cursor, end: gap.start })
    }
    cursor = Math.max(cursor, gap.end)
  }
  const tail = clipEnd - cursor
  if (tail >= minCut) out.push({ start: cursor, end: clipEnd })
  return out
}