import { describe, it, expect } from 'vitest'
import { detectSilences, cutBySilences, type Silence, type CutSegment } from './silence'

describe('detectSilences', () => {
  it('finds the quiet gap between two loud windows', () => {
    const energy = [0.5, 0.6, 0.01, 0.01, 0.02, 0.7, 0.6]
    const silences = detectSilences(energy, { windowSec: 0.5, threshold: 0.1, minSilenceSec: 0.4 })
    expect(silences.length).toBe(1)
    expect(silences[0].start).toBeCloseTo(1.0)
    expect(silences[0].end).toBeCloseTo(2.5)
  })

  it('merges adjacent quiet windows into one silence', () => {
    const energy = [0.5, 0.01, 0.02, 0.01, 0.6]
    const silences = detectSilences(energy, { windowSec: 0.5, threshold: 0.1, minSilenceSec: 0.4 })
    expect(silences).toHaveLength(1)
    expect(silences[0].start).toBeCloseTo(0.5)
    expect(silences[0].end).toBeCloseTo(2.0)
  })

  it('drops silences shorter than minSilenceSec', () => {
    const energy = [0.5, 0.01, 0.6, 0.01, 0.5]
    const silences = detectSilences(energy, { windowSec: 0.5, threshold: 0.1, minSilenceSec: 1.5 })
    expect(silences).toHaveLength(0)
  })

  it('applies auto threshold from quiet tail proportion when threshold omitted', () => {
    const energy = [0.5, 0.6, 0.05, 0.03, 0.7, 0.01, 0.6]
    const silences = detectSilences(energy, { windowSec: 0.5, minSilenceSec: 0.4 })
    expect(silences.length).toBeGreaterThan(0)
  })
})

describe('cutBySilences', () => {
  it('returns the full range when there are no silences', () => {
    const cuts = cutBySilences(10, [], { marginSec: 0.1, minCutSec: 0.5 })
    expect(cuts).toEqual([{ start: 0, end: 10 }])
  })

  it('splits around the silence, applying margin inside kept segments', () => {
    const silences: Silence[] = [{ start: 4, end: 6 }]
    const cuts = cutBySilences(10, silences, { marginSec: 0.2, minCutSec: 0.5 })
    expect(cuts).toEqual([
      { start: 0, end: 3.8 },
      { start: 6.2, end: 10 },
    ])
  })

  it('drops kept segments shorter than minCutSec', () => {
    const silences: Silence[] = [{ start: 1, end: 8 }]
    const cuts = cutBySilences(10, silences, { marginSec: 0, minCutSec: 2 })
    expect(cuts.length).toBeLessThanOrEqual(1)
    const kept = cuts as CutSegment[]
    for (const seg of kept) {
      expect(seg.end - seg.start).toBeGreaterThanOrEqual(2)
    }
  })
})
