import { describe, it, expect } from 'vitest'
import {
  detectCurseWords,
  censorText,
  generateBleepTimings,
  type CensorResult,
} from './autoCensor'

describe('detectCurseWords', () => {
  it('detects common curse words', () => {
    const result = detectCurseWords('what the hell is this damn thing')
    expect(result.length).toBeGreaterThan(0)
  })

  it('returns empty for clean text', () => {
    const result = detectCurseWords('hello world how are you today')
    expect(result).toHaveLength(0)
  })

  it('is case-insensitive', () => {
    const result = detectCurseWords('DAMN that was bad')
    expect(result.length).toBeGreaterThan(0)
  })
})

describe('censorText', () => {
  it('replaces curse words with asterisks', () => {
    const result = censorText('what the hell is this', { method: 'asterisk' })
    expect(result).not.toContain('hell')
    expect(result).toMatch(/\*+/)
  })

  it('replaces with [CENSORED]', () => {
    const result = censorText('what the hell', { method: 'replace' })
    expect(result).not.toContain('hell')
    expect(result).toContain('[CENSORED]')
  })

  it('preserves non-curse words', () => {
    const result = censorText('hello world', { method: 'asterisk' })
    expect(result).toBe('hello world')
  })
})

describe('generateBleepTimings', () => {
  it('generates bleep timestamps for curse words', () => {
    const words = [
      { text: 'what', start: 0, end: 0.3 },
      { text: 'the', start: 0.3, end: 0.5 },
      { text: 'hell', start: 0.5, end: 0.9 },
      { text: 'is', start: 1.0, end: 1.2 },
    ]
    const bleeps = generateBleepTimings(words)
    expect(bleeps.length).toBeGreaterThan(0)
    expect(bleeps[0]).toHaveProperty('start')
    expect(bleeps[0]).toHaveProperty('end')
    expect(bleeps[0]).toHaveProperty('frequency')
  })
})
