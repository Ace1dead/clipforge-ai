import { describe, it, expect } from 'vitest'
import {
  matchTextToTimestamps,
  selectTranscriptRange,
  buildTranscriptFromWords,
  highlightWordsInTranscript,
  formatTimestamp,
  parseTimestamp,
  type WordTimestamp,
  type Transcript,
} from './transcript'

function makeWords(texts: string[], startSec = 0): WordTimestamp[] {
  let time = startSec
  return texts.map(word => {
    const w: WordTimestamp = { word, start: time, end: time + 0.3 }
    time += 0.35
    return w
  })
}

function makeTranscript(words: WordTimestamp[]): Transcript {
  return {
    fullText: words.map(w => w.word).join(' '),
    segments: [{
      text: words.map(w => w.word).join(' '),
      start: words[0].start,
      end: words[words.length - 1].end,
      words,
    }],
    words,
    language: 'en',
    duration: words[words.length - 1].end,
  }
}

describe('matchTextToTimestamps', () => {
  it('finds exact word sequence and returns clip range', () => {
    const words = makeWords(['hello', 'world', 'foo', 'bar', 'baz'])
    const transcript = makeTranscript(words)
    const ranges = matchTextToTimestamps(transcript, 'foo bar')
    expect(ranges).toHaveLength(1)
    expect(ranges[0].start).toBeCloseTo(words[2].start)
    expect(ranges[0].end).toBeCloseTo(words[3].end)
  })

  it('returns empty for no match', () => {
    const words = makeWords(['hello', 'world'])
    const transcript = makeTranscript(words)
    const ranges = matchTextToTimestamps(transcript, 'xyz')
    expect(ranges).toHaveLength(0)
  })

  it('finds multiple occurrences', () => {
    const words = makeWords(['the', 'cat', 'sat', 'the', 'cat', 'ran'])
    const transcript = makeTranscript(words)
    const ranges = matchTextToTimestamps(transcript, 'the cat')
    expect(ranges).toHaveLength(2)
  })

  it('handles empty search', () => {
    const words = makeWords(['hello'])
    const transcript = makeTranscript(words)
    expect(matchTextToTimestamps(transcript, '')).toHaveLength(0)
  })

  it('is case insensitive', () => {
    const words = makeWords(['Hello', 'World'])
    const transcript = makeTranscript(words)
    const ranges = matchTextToTimestamps(transcript, 'hello world')
    expect(ranges).toHaveLength(1)
  })

  it('handles punctuation in search text', () => {
    const words = makeWords(['hello', 'world'])
    const transcript = makeTranscript(words)
    const ranges = matchTextToTimestamps(transcript, 'hello, world!')
    expect(ranges).toHaveLength(1)
  })
})

describe('selectTranscriptRange', () => {
  it('returns clip range for valid word indices', () => {
    const words = makeWords(['a', 'b', 'c', 'd'])
    const range = selectTranscriptRange(words, 1, 2)
    expect(range).not.toBeNull()
    expect(range!.start).toBeCloseTo(words[1].start)
    expect(range!.end).toBeCloseTo(words[2].end)
  })

  it('returns null for out-of-bounds indices', () => {
    const words = makeWords(['a', 'b'])
    expect(selectTranscriptRange(words, -1, 1)).toBeNull()
    expect(selectTranscriptRange(words, 0, 5)).toBeNull()
  })

  it('returns null when start > end', () => {
    const words = makeWords(['a', 'b', 'c'])
    expect(selectTranscriptRange(words, 2, 1)).toBeNull()
  })
})

describe('buildTranscriptFromWords', () => {
  it('splits into segments on large gaps', () => {
    const words: WordTimestamp[] = [
      { word: 'a', start: 0, end: 0.3 },
      { word: 'b', start: 0.35, end: 0.65 },
      { word: 'c', start: 3, end: 3.3 },
      { word: 'd', start: 3.35, end: 3.65 },
    ]
    const transcript = buildTranscriptFromWords(words, 1.5)
    expect(transcript.segments).toHaveLength(2)
    expect(transcript.segments[0].text).toBe('a b')
    expect(transcript.segments[1].text).toBe('c d')
  })

  it('returns empty transcript for empty words', () => {
    const transcript = buildTranscriptFromWords([])
    expect(transcript.segments).toHaveLength(0)
    expect(transcript.fullText).toBe('')
  })
})

describe('highlightWordsInTranscript', () => {
  it('returns indices of words overlapping clip range', () => {
    const words = makeWords(['a', 'b', 'c', 'd', 'e'])
    const indices = highlightWordsInTranscript(words, { start: 0.5, end: 1.2 })
    expect(indices).toContain(1)
    expect(indices).toContain(2)
    expect(indices).not.toContain(0)
    expect(indices).not.toContain(4)
  })
})

describe('formatTimestamp / parseTimestamp', () => {
  it('formats seconds to MM:SS.ms', () => {
    expect(formatTimestamp(0)).toBe('00:00.00')
    expect(formatTimestamp(65.5)).toBe('01:05.50')
    expect(formatTimestamp(3723.12)).toMatch(/^62:03\.1[0-9]$/)
  })

  it('parses MM:SS.ms back to seconds', () => {
    expect(parseTimestamp('00:00.00')).toBeCloseTo(0)
    expect(parseTimestamp('01:05.50')).toBeCloseTo(65.5)
  })

  it('roundtrips format→parse→format', () => {
    const original = 125.75
    const formatted = formatTimestamp(original)
    const parsed = parseTimestamp(formatted)
    expect(parsed).toBeCloseTo(Math.floor(original * 100) / 100, 1)
  })
})
