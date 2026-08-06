import type { AudioAnalysisWindow } from './audioAnalyzer'

export interface ViralityScore {
  total: number
  factors: ViralityFactor[]
  tier: 'viral' | 'high' | 'medium' | 'low'
  label: string
}

export interface ViralityFactor {
  name: string
  score: number
  maxScore: number
  weight: number
  detail: string
}

export interface ScoringWeights {
  aboveThreshold: number
  suddenChange: number
  transient: number
  sustained: number
  wellAboveBaseline: number
  voiceDetected: number
}

const DEFAULT_WEIGHTS: ScoringWeights = {
  aboveThreshold: 20,
  suddenChange: 15,
  transient: 10,
  sustained: 15,
  wellAboveBaseline: 10,
  voiceDetected: 30,
}

function computeSuddenChange(
  windows: AudioAnalysisWindow[],
  index: number,
): number {
  if (index < 2) return 0

  const deltas: number[] = []
  for (let i = Math.max(0, index - 5); i < index; i++) {
    deltas.push(Math.abs(windows[i + 1].hybridScore - windows[i].hybridScore))
  }
  const avgDelta = deltas.length > 0 ? deltas.reduce((a, b) => a + b, 0) / deltas.length : 0
  const currentDelta = Math.abs(windows[index].hybridScore - windows[index - 1].hybridScore)

  return currentDelta > avgDelta * 1.5 ? 1 : 0
}

function computeTransientScore(
  windows: AudioAnalysisWindow[],
  index: number,
): number {
  const rms = windows[index].rms
  if (rms === 0) return 0

  const peak = windows[index].peak
  const crestFactor = peak / rms
  return crestFactor > 2.0 ? 1 : 0
}

function computeSustainedEnergy(
  windows: AudioAnalysisWindow[],
  index: number,
  baseline: number,
): number {
  if (index >= windows.length - 1) return 0

  const currentAbove = windows[index].hybridScore > baseline * 1.2
  const nextAbove = windows[index + 1].hybridScore > baseline * 1.2
  return currentAbove && nextAbove ? 1 : 0
}

function computeWellAboveBaseline(
  score: number,
  baseline: number,
  stdDev: number,
): number {
  return score > baseline + 1.5 * stdDev ? 1 : 0
}

function computeSuddenChangeScore(
  windows: AudioAnalysisWindow[],
  index: number,
): number {
  if (index < 2) return 0
  const deltas: number[] = []
  for (let i = Math.max(0, index - 5); i < index; i++) {
    deltas.push(Math.abs(windows[i + 1].hybridScore - windows[i].hybridScore))
  }
  const avgDelta = deltas.length > 0 ? deltas.reduce((a, b) => a + b, 0) / deltas.length : 0
  const currentDelta = Math.abs(windows[index].hybridScore - windows[index - 1].hybridScore)
  return currentDelta > avgDelta * 1.5 ? 1 : 0
}

export function scoreWindow(
  windows: AudioAnalysisWindow[],
  index: number,
  baseline: number,
  stdDev: number,
  weights: ScoringWeights = DEFAULT_WEIGHTS,
): ViralityScore {
  const w = windows[index]
  const factors: ViralityFactor[] = []

  const aboveThreshold = w.hybridScore > baseline ? 1 : 0
  factors.push({
    name: 'above_threshold',
    score: aboveThreshold * weights.aboveThreshold,
    maxScore: weights.aboveThreshold,
    weight: 1,
    detail: `Score ${w.hybridScore.toFixed(3)} vs baseline ${baseline.toFixed(3)}`,
  })

  const sudden = computeSuddenChangeScore(windows, index) * weights.suddenChange
  factors.push({
    name: 'sudden_change',
    score: sudden,
    maxScore: weights.suddenChange,
    weight: 1,
    detail: 'Large delta vs recent average',
  })

  const transient = computeTransientScore(windows, index) * weights.transient
  factors.push({
    name: 'transient',
    score: transient,
    maxScore: weights.transient,
    weight: 1,
    detail: 'High crest factor (peak/rms)',
  })

  const sustained = computeSustainedEnergy(windows, index, baseline) * weights.sustained
  factors.push({
    name: 'sustained',
    score: sustained,
    maxScore: weights.sustained,
    weight: 1,
    detail: 'Energy maintained into next window',
  })

  const wellAbove = computeWellAboveBaseline(w.hybridScore, baseline, stdDev) * weights.wellAboveBaseline
  factors.push({
    name: 'well_above_baseline',
    score: wellAbove,
    maxScore: weights.wellAboveBaseline,
    weight: 1,
    detail: `Score > baseline + 1.5σ`,
  })

  const voice = w.voiceDetected ? weights.voiceDetected : 0
  factors.push({
    name: 'voice_detected',
    score: voice,
    maxScore: weights.voiceDetected,
    weight: 1,
    detail: w.voiceDetected ? 'Voice activity detected' : 'No voice',
  })

  const total = factors.reduce((sum, f) => sum + f.score, 0)
  const maxTotal = factors.reduce((sum, f) => sum + f.maxScore, 0)
  const normalized = maxTotal > 0 ? (total / maxTotal) * 100 : 0

  let tier: ViralityScore['tier']
  let label: string
  if (normalized >= 80) { tier = 'viral'; label = '🔥 Viral Potential' }
  else if (normalized >= 60) { tier = 'high'; label = '⚡ High Engagement' }
  else if (normalized >= 40) { tier = 'medium'; label = '📊 Moderate' }
  else { tier = 'low'; label = '📉 Low Energy' }

  return { total: Math.round(normalized), factors, tier, label }
}

export function scoreAllWindows(
  windows: AudioAnalysisWindow[],
  weights: ScoringWeights = DEFAULT_WEIGHTS,
): ViralityScore[] {
  if (windows.length === 0) return []

  const scores = windows.map(w => w.hybridScore)
  const mean = scores.reduce((a, b) => a + b, 0) / scores.length
  const variance = scores.reduce((sum, s) => sum + Math.pow(s - mean, 2), 0) / scores.length
  const stdDev = Math.sqrt(variance)

  return windows.map((_, i) => scoreWindow(windows, i, mean, stdDev, weights))
}

export function rankHighlightsByVirality(
  windows: AudioAnalysisWindow[],
  highlightStart: number,
  highlightEnd: number,
  weights: ScoringWeights = DEFAULT_WEIGHTS,
): ViralityScore {
  const inRange = windows.filter(w => w.time >= highlightStart && w.time <= highlightEnd)
  if (inRange.length === 0) {
    return { total: 0, factors: [], tier: 'low', label: 'No data' }
  }

  const allScores = windows.map(w => w.hybridScore)
  const mean = allScores.reduce((a, b) => a + b, 0) / allScores.length
  const variance = allScores.reduce((sum, s) => sum + Math.pow(s - mean, 2), 0) / allScores.length
  const stdDev = Math.sqrt(variance)

  const maxScore = inRange.reduce<{ total: number; factors: ViralityFactor[]; tier: ViralityScore['tier']; label: string }>((best, w, i) => {
    const idx = windows.indexOf(w)
    const scored = scoreWindow(windows, idx, mean, stdDev, weights)
    return scored.total > best.total ? scored : best
  }, { total: 0, factors: [], tier: 'low', label: '' })

  return maxScore as ViralityScore
}

export function getScoreColor(score: number): string {
  if (score >= 80) return '#ef4444'
  if (score >= 60) return '#f59e0b'
  if (score >= 40) return '#3b82f6'
  return '#6b7280'
}

export function getScoreGradient(scores: ViralityScore[]): string[] {
  return scores.map(s => getScoreColor(s.total))
}
