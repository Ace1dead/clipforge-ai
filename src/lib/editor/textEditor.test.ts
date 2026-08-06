import { describe, it, expect } from 'vitest'
import {
  applyTextEdit,
  generateEditSegments,
  segmentsToClipRanges,
  findWordAtTime,
  findWordBySearch,
  type WordTimestamp,
  type TextEditCommand,
} from './textEditor'

function makeWords(count: number, startSec = 0): WordTimestamp[] {
  let time = startSec
  return Array.from({ length: count }, (_, i) => {
    const w: WordTimestamp = { word: `word${i}`, start: time, end: time + 0.3 }
    time += 0.35
    return w
  })
}

describe('applyTextEdit', () => {
  it('deletes a word range', () => {
    const words = makeWords(5)
    const result = applyTextEdit(words, [{ type: 'delete', wordRange: [1, 3] }])
    expect(result).toHaveLength(2)
    expect(result[0].word).toBe('word0')
    expect(result[1].word).toBe('word4')
  })

  it('duplicates a word range', () => {
    const words = makeWords(3)
    const result = applyTextEdit(words, [{ type: 'duplicate', wordRange: [0, 1] }])
    expect(result).toHaveLength(5)
    expect(result[2].word).toBe('word0')
    expect(result[3].word).toBe('word1')
  })

  it('inserts text at position', () => {
    const words = makeWords(3)
    const result = applyTextEdit(words, [{ type: 'insert', wordRange: [1, 1], insertText: 'new word' }])
    expect(result.length).toBeGreaterThan(3)
    expect(result.some(w => w.word === 'new')).toBe(true)
  })

  it('recomputes timestamps after edit', () => {
    const words = makeWords(3)
    const result = applyTextEdit(words, [{ type: 'delete', wordRange: [1, 1] }])
    expect(result[0].start).toBe(0)
    expect(result[1].start).toBeGreaterThan(result[0].end)
  })

  it('handles empty words array', () => {
    const result = applyTextEdit([], [{ type: 'delete', wordRange: [0, 0] }])
    expect(result).toHaveLength(0)
  })
})

describe('generateEditSegments', () => {
  it('generates contiguous segments from words', () => {
    const words = makeWords(3)
    const segments = generateEditSegments(words, [])
    expect(segments.length).toBeGreaterThanOrEqual(1)
    segments.forEach(s => expect(s.keep).toBe(true))
  })
})

describe('segmentsToClipRanges', () => {
  it('extracts clip ranges from kept segments', () => {
    const ranges = segmentsToClipRanges([
      { start: 0, end: 1, keep: true },
      { start: 2, end: 3, keep: false },
      { start: 4, end: 5, keep: true },
    ])
    expect(ranges).toHaveLength(2)
    expect(ranges[0]).toEqual({ start: 0, end: 1 })
    expect(ranges[1]).toEqual({ start: 4, end: 5 })
  })
})

describe('findWordAtTime', () => {
  it('returns index of word at given time', () => {
    const words = makeWords(5)
    expect(findWordAtTime(words, 0.1)).toBe(0)
    expect(findWordAtTime(words, 0.5)).toBe(1)
  })

  it('returns nearest word for out-of-range time', () => {
    const words = makeWords(3)
    expect(findWordAtTime(words, -1)).toBe(0)
    expect(findWordAtTime(words, 100)).toBe(2)
  })
})

describe('findWordBySearch', () => {
  it('finds words matching search text', () => {
    const words: WordTimestamp[] = [
      { word: 'hello', start: 0, end: 0.3 },
      { word: 'world', start: 0.35, end: 0.65 },
      { word: 'hello', start: 0.7, end: 1.0 },
    ]
    const indices = findWordBySearch(words, 'hello')
    expect(indices).toEqual([0, 2])
  })

  it('returns empty for no match', () => {
    const words = makeWords(3)
    expect(findWordBySearch(words, 'xyz')).toHaveLength(0)
  })
})
