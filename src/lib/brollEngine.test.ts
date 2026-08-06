import { describe, it, expect } from 'vitest'
import {
  detectPausePoints,
  suggestBRoll,
  matchBRollToTopic,
  type BRollAsset,
  type PausePoint,
} from './brollEngine'

describe('detectPausePoints', () => {
  it('detects silence gaps as pause points', () => {
    const words = [
      { text: 'hello', start: 0, end: 0.5 },
      { text: 'world', start: 0.6, end: 1.0 },
      // 2 second pause
      { text: 'again', start: 3.0, end: 3.5 },
    ]
    const pauses = detectPausePoints(words, 5, { minPauseDuration: 0.5 })
    expect(pauses.length).toBeGreaterThanOrEqual(1)
  })

  it('returns empty for continuous speech', () => {
    const words = Array.from({ length: 20 }, (_, i) => ({
      text: `word${i}`,
      start: i * 0.3,
      end: i * 0.3 + 0.25,
    }))
    const lastEnd = 19 * 0.3 + 0.25
    const pauses = detectPausePoints(words, lastEnd + 0.1, { minPauseDuration: 1.0 })
    expect(pauses).toHaveLength(0)
  })
})

describe('suggestBRoll', () => {
  it('suggests B-roll for pause points', () => {
    const pauses: PausePoint[] = [
      { start: 2, end: 4, duration: 2, context: 'talking about technology' },
    ]
    const suggestions = suggestBRoll(pauses, 'This AI technology changes everything')
    expect(suggestions.length).toBeGreaterThan(0)
    expect(suggestions[0]).toHaveProperty('query')
    expect(suggestions[0]).toHaveProperty('startTime')
  })
})

describe('matchBRollToTopic', () => {
  it('matches technology topics', () => {
    const asset = matchBRollToTopic('AI robot coding algorithm')
    expect(asset).toBeDefined()
    expect(asset?.category).toBe('technology')
  })

  it('matches nature topics', () => {
    const asset = matchBRollToTopic('beautiful sunset mountain landscape')
    expect(asset).toBeDefined()
    expect(asset?.category).toBe('nature')
  })

  it('returns null for unmatched topics', () => {
    const asset = matchBRollToTopic('xyz')
    expect(asset).toBeNull()
  })
})
