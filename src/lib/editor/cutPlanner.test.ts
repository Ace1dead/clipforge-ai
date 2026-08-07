import { describe, it, expect } from 'vitest'
import {
  refineCutBoundaries,
  snapToNearestSilence,
  ensureSentenceBoundaries,
  calculateKeepDuration,
  type RefinedCutSegment,
} from './cutPlanner'
import type { CutSegment } from './movieSummarizer'

describe('refineCutBoundaries', () => {
  it('snaps cut points to nearest transcript word boundaries', () => {
    const segments: CutSegment[] = [
      { start: 1.3, end: 5.7, action: 'keep', reason: 'scene' },
      { start: 5.7, end: 10.2, action: 'discard', reason: 'filler' },
      { start: 10.2, end: 15.8, action: 'keep', reason: 'climax' },
    ]
    const words = [
      { word: 'hello', start: 1.0, end: 1.4 },
      { word: 'world', start: 1.5, end: 2.0 },
      { word: 'this', start: 5.5, end: 5.9 },
      { word: 'is', start: 6.0, end: 6.3 },
      { word: 'the', start: 10.0, end: 10.3 },
      { word: 'climax', start: 10.4, end: 10.9 },
      { word: 'end', start: 15.5, end: 16.0 },
    ]
    const refined = refineCutBoundaries(segments, words, 20)
    // Cut points should snap to word boundaries
    expect(refined[0].start).toBeGreaterThanOrEqual(1.0)
    expect(refined[0].start).toBeLessThanOrEqual(1.5)
    expect(refined[0].end).toBeGreaterThanOrEqual(5.5)
    expect(refined[0].end).toBeLessThanOrEqual(6.0)
  })

  it('preserves action and reason from original segments', () => {
    const segments: CutSegment[] = [
      { start: 0, end: 5, action: 'keep', reason: 'intro' },
    ]
    const refined = refineCutBoundaries(segments, [], 10)
    expect(refined[0].action).toBe('keep')
    expect(refined[0].reason).toContain('intro')
  })

  it('handles empty segments', () => {
    expect(refineCutBoundaries([], [], 10)).toHaveLength(0)
  })
})

describe('snapToNearestSilence', () => {
  it('snaps to nearest silence boundary within tolerance', () => {
    const silences = [
      { start: 4.8, end: 5.2 },
      { start: 9.5, end: 10.0 },
    ]
    const result = snapToNearestSilence(5.0, silences, 1.0)
    expect(result).toBeGreaterThanOrEqual(4.8)
    expect(result).toBeLessThanOrEqual(5.2)
  })

  it('returns original time if no silence nearby', () => {
    const silences = [{ start: 50, end: 51 }]
    const result = snapToNearestSilence(5.0, silences, 1.0)
    expect(result).toBe(5.0)
  })
})

describe('ensureSentenceBoundaries', () => {
  it('extends segment to include complete sentences', () => {
    const words = [
      { word: 'the', start: 1.0, end: 1.2 },
      { word: 'hero', start: 1.3, end: 1.6 },
      { word: 'fights', start: 1.7, end: 2.1 },
      { word: 'the', start: 2.2, end: 2.4 },
      { word: 'villain', start: 2.5, end: 2.9 },
      { word: 'and', start: 3.0, end: 3.2 },
      { word: 'wins', start: 3.3, end: 3.6 },
      { word: 'then', start: 4.0, end: 4.2 },
      { word: 'celebrates', start: 4.3, end: 4.8 },
    ]
    const result = ensureSentenceBoundaries(1.5, 3.0, words)
    // Should extend to include the full sentence
    expect(result.start).toBeLessThanOrEqual(1.5)
    expect(result.end).toBeGreaterThanOrEqual(3.0)
  })

  it('handles no words gracefully', () => {
    const result = ensureSentenceBoundaries(5, 10, [])
    expect(result.start).toBe(5)
    expect(result.end).toBe(10)
  })
})

describe('calculateKeepDuration', () => {
  it('sums durations of keep segments', () => {
    const segments: RefinedCutSegment[] = [
      { start: 0, end: 30, action: 'keep', reason: 'a', confidence: 1 },
      { start: 30, end: 60, action: 'discard', reason: 'b', confidence: 1 },
      { start: 60, end: 100, action: 'keep', reason: 'c', confidence: 1 },
    ]
    expect(calculateKeepDuration(segments)).toBe(70)
  })

  it('returns 0 for empty segments', () => {
    expect(calculateKeepDuration([])).toBe(0)
  })
})
