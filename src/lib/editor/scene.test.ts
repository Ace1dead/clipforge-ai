import { describe, it, expect } from 'vitest'
import { framesToDifferences, detectSceneBoundaries, segmentScenes, scoreScene, type SceneBoundary, type Scene } from './scene'

describe('detectSceneBoundaries', () => {
  it('marks frames where consecutive difference exceeds threshold', () => {
    const frames = [0.01, 0.01, 0.9, 0.01, 0.02, 0.85, 0.01]
    const boundaries = detectSceneBoundaries(frames, 0.5)
    expect(boundaries).toEqual([2, 5])
  })

  it('returns empty when no frame is above the threshold', () => {
    const boundaries = detectSceneBoundaries([0.01, 0.02, 0.01], 0.5)
    expect(boundaries).toEqual([])
  })
})

describe('framesToDifferences', () => {
  it('computes mean absolute difference between consecutive feature vectors', () => {
    const frames = [
      [1, 1],
      [1, 1],
      [5, 5],
    ]
    const diffs = framesToDifferences(frames)
    expect(diffs).toHaveLength(frames.length)
    expect(diffs[0]).toBeCloseTo(0)
    expect(diffs[1]).toBeCloseTo(4)
    expect(diffs[2]).toBeCloseTo(0) // last frame has no next
  })
})

describe('segmentScenes / scoreScene', () => {
  it('builds Scene ranges from boundaries, last boundary to end of video', () => {
    const boundaries: SceneBoundary[] = [2, 5]
    const scenes = segmentScenes(boundaries, 10, 1)
    expect(scenes).toHaveLength(3)
    expect(scenes[0]).toMatchObject({ start: 0, end: 2 })
    expect(scenes[1]).toMatchObject({ start: 2, end: 5 })
    expect(scenes[2]).toMatchObject({ start: 5, end: 10 })
  })

  it('scores longer scenes higher (cannot be too small to keep)', () => {
    const a = scoreScene({ start: 0, end: 4 } as Scene)
    const b = scoreScene({ start: 0, end: 8 } as Scene)
    expect(a).toBeLessThan(b)
  })
})