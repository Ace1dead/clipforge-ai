import { describe, it, expect } from 'vitest'
import {
  scoreWindow,
  scoreAllWindows,
  rankHighlightsByVirality,
  getScoreColor,
} from './viralityScorer'
import type { AudioAnalysisWindow } from './audioAnalyzer'

function makeWindows(count: number, baseScore = 0.5): AudioAnalysisWindow[] {
  return Array.from({ length: count }, (_, i) => ({
    time: i * 0.5,
    rms: baseScore,
    peak: baseScore * 1.5,
    motionScore: 0,
    sceneChangeScore: 0,
    hybridScore: baseScore + (i % 3 === 0 ? 0.3 : 0),
    quality: baseScore,
    voiceDetected: i % 5 === 0,
  }))
}

describe('scoreWindow', () => {
  it('returns higher score for above-baseline windows', () => {
    const windows = makeWindows(10, 0.3)
    const high = scoreWindow(windows, 0, 0.2, 0.1)
    const low = scoreWindow(windows, 5, 0.8, 0.1)
    expect(high.total).toBeGreaterThan(low.total)
  })

  it('includes voice detection bonus', () => {
    const windows = makeWindows(10, 0.3)
    const withVoice = scoreWindow(windows, 0, 0.2, 0.1)
    const noVoice = scoreWindow(windows, 1, 0.2, 0.1)
    expect(withVoice.total).toBeGreaterThanOrEqual(noVoice.total)
  })

  it('returns valid tier', () => {
    const windows = makeWindows(10, 0.3)
    const score = scoreWindow(windows, 0, 0.2, 0.1)
    expect(['viral', 'high', 'medium', 'low']).toContain(score.tier)
  })

  it('has factors array', () => {
    const windows = makeWindows(10)
    const score = scoreWindow(windows, 0, 0.5, 0.1)
    expect(score.factors.length).toBeGreaterThan(0)
    score.factors.forEach(f => {
      expect(f.name).toBeTruthy()
      expect(f.score).toBeGreaterThanOrEqual(0)
      expect(f.maxScore).toBeGreaterThan(0)
    })
  })
})

describe('scoreAllWindows', () => {
  it('returns one score per window', () => {
    const windows = makeWindows(5)
    const scores = scoreAllWindows(windows)
    expect(scores).toHaveLength(5)
  })

  it('returns empty for empty input', () => {
    expect(scoreAllWindows([])).toHaveLength(0)
  })
})

describe('rankHighlightsByVirality', () => {
  it('scores a time range based on peak window', () => {
    const windows = makeWindows(20, 0.3)
    const score = rankHighlightsByVirality(windows, 0, 5)
    expect(score.total).toBeGreaterThanOrEqual(0)
    expect(score.total).toBeLessThanOrEqual(100)
  })
})

describe('getScoreColor', () => {
  it('returns red for viral', () => {
    expect(getScoreColor(90)).toBe('#ef4444')
  })
  it('returns amber for high', () => {
    expect(getScoreColor(70)).toBe('#f59e0b')
  })
  it('returns blue for medium', () => {
    expect(getScoreColor(50)).toBe('#3b82f6')
  })
  it('returns gray for low', () => {
    expect(getScoreColor(20)).toBe('#6b7280')
  })
})
