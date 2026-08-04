import type { SpeechSegment } from './audio'

export interface Highlight { start: number; end: number; score: number; viralScore: number }

function computeViralScore(segment: SpeechSegment, allSegments: SpeechSegment[]): number {
  // Factor 1: Energy relative to average (0-40 points)
  const avgEnergy = allSegments.reduce((a, s) => a + s.score, 0) / allSegments.length
  const energyRatio = avgEnergy > 0 ? segment.score / avgEnergy : 1
  const energyScore = Math.min(40, energyRatio * 20)

  // Factor 2: Duration sweet spot — 15-45s clips perform best (0-30 points)
  const dur = segment.end - segment.start
  let durationScore = 0
  if (dur >= 15 && dur <= 45) durationScore = 30
  else if (dur >= 10 && dur <= 60) durationScore = 20
  else if (dur >= 5 && dur <= 90) durationScore = 10
  else durationScore = 5

  // Factor 3: Position — middle segments often have best content (0-20 points)
  const totalDur = allSegments.length > 0
    ? allSegments[allSegments.length - 1].end - allSegments[0].start
    : 1
  const midpoint = totalDur / 2
  const segMid = (segment.start + segment.end) / 2
  const distFromMid = Math.abs(segMid - midpoint) / totalDur
  const positionScore = Math.max(0, 20 * (1 - distFromMid * 2))

  // Factor 4: Variance bonus — segments with energy spikes are more engaging (0-10 points)
  const variance = allSegments.reduce((a, s) => a + (s.score - avgEnergy) ** 2, 0) / allSegments.length
  const varianceScore = Math.min(10, Math.sqrt(variance) * 5)

  return Math.round(energyScore + durationScore + positionScore + varianceScore)
}

/** Pick the top N non-overlapping segments as clip highlights. */
export function pickHighlights(segments: SpeechSegment[], count: number, minDur = 5, maxDur = 90, gap = 2): Highlight[] {
  const sorted = [...segments].sort((a, b) => b.score - a.score)
  const picks: Highlight[] = []
  for (const s of sorted) {
    const dur = s.end - s.start
    if (dur < minDur) continue
    const overlap = picks.some((p) => p.start < s.end + gap && p.end > s.start - gap)
    if (overlap) continue
    const viralScore = computeViralScore(s, segments)
    picks.push({ start: s.start, end: Math.min(s.end, s.start + maxDur), score: s.score, viralScore })
    if (picks.length >= count) break
  }
  return picks.sort((a, b) => b.viralScore - a.viralScore)
}

export function summarizeEnergy(energy: number[]): { avg: number; peak: number; quietRatio: number } {
  if (!energy.length) return { avg: 0, peak: 0, quietRatio: 1 }
  const avg = energy.reduce((a, b) => a + b, 0) / energy.length
  const peak = Math.max(...energy)
  const quietRatio = energy.filter((e) => e < avg * 0.35).length / energy.length
  return { avg, peak, quietRatio }
}