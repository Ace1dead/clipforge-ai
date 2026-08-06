import { describe, it, expect } from 'vitest'
import {
  matchTextToTimestampsAdvanced,
  procTextToTimestamps,
  buildTokenIndex,
  normalizeText,
  computeSpeakerOverlap,
  type SpeakerSegment,
} from './textEditorAdvanced'
import type { WordTimestamp } from './transcript'

function makeWords(texts: string[], startSec = 0): WordTimestamp[] {
  let time = startSec
  return texts.map((w) => {
    const word: WordTimestamp = { word: w, start: time, end: time + 0.3 }
    time += 0.35
    return word
  })
}

describe('normalizeText', () => {
  it('lowercases and strips punctuation', () => {
    expect(normalizeText('Hello, World!')).toBe('hello world')
  })

  it('normalizes unicode', () => {
    expect(normalizeText('café')).toBe('cafe')
  })

  it('collapses whitespace', () => {
    expect(normalizeText('  hello   world  ')).toBe('hello world')
  })
})

describe('buildTokenIndex', () => {
  it('maps character positions to token indices', () => {
    const words = ['hello', 'world', 'foo', 'bar']
    const index = buildTokenIndex(words)
    expect(index[0]).toBe(0)  // 'h' at char 0 → token 0
    expect(index[6]).toBe(1)  // 'w' at char 6 → token 1
    expect(index[12]).toBe(2) // 'f' at char 12 → token 2
  })
})

describe('procTextToTimestamps', () => {
  it('finds exact substring match and returns timestamps', () => {
    const words = makeWords(['this', 'is', 'a', 'test', 'hello', 'world'])
    const timestamps = procTextToTimestamps('this is a test', words)
    expect(timestamps).toHaveLength(1)
    expect(timestamps[0].start).toBeCloseTo(0, 1)
    expect(timestamps[0].end).toBeCloseTo(1.35, 1)
  })

  it('returns empty for no match', () => {
    const words = makeWords(['hello', 'world'])
    const timestamps = procTextToTimestamps('not found', words)
    expect(timestamps).toHaveLength(0)
  })

  it('finds multiple matches', () => {
    const words = makeWords(['hello', 'world', 'hello', 'again'])
    const timestamps = procTextToTimestamps('hello', words)
    expect(timestamps).toHaveLength(2)
  })

  it('is case-insensitive', () => {
    const words = makeWords(['Hello', 'World'])
    const timestamps = procTextToTimestamps('hello world', words)
    expect(timestamps).toHaveLength(1)
  })
})

describe('matchTextToTimestampsAdvanced', () => {
  it('matches with offset support', () => {
    const words = makeWords(['skip', 'this', 'target', 'text', 'end'])
    const timestamps = matchTextToTimestampsAdvanced('target text', words, { startOffset: 0.5 })
    expect(timestamps).toHaveLength(1)
    expect(timestamps[0].start).toBeGreaterThanOrEqual(0.5)
  })

  it('applies fuzzy matching within tolerance', () => {
    const words = makeWords(['hello', 'worl', 'test'])
    const timestamps = matchTextToTimestampsAdvanced('hello world', words, { fuzzyTolerance: 0.5 })
    expect(timestamps).toHaveLength(1)
  })
})

describe('computeSpeakerOverlap', () => {
  it('detects overlapping speaker segments', () => {
    const speakers: SpeakerSegment[] = [
      { speakerId: 'spk0', start: 0, end: 3 },
      { speakerId: 'spk1', start: 2, end: 5 },
    ]
    const overlap = computeSpeakerOverlap(speakers)
    expect(overlap).toBeGreaterThan(0)
  })

  it('returns 0 for non-overlapping segments', () => {
    const speakers: SpeakerSegment[] = [
      { speakerId: 'spk0', start: 0, end: 2 },
      { speakerId: 'spk1', start: 3, end: 5 },
    ]
    const overlap = computeSpeakerOverlap(speakers)
    expect(overlap).toBe(0)
  })
})
