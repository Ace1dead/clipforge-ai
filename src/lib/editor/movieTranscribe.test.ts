import { describe, it, expect } from 'vitest'
import {
  splitAudioIntoChunks,
  mergeChunkTranscripts,
  estimateMovieDuration,
  type MovieChunk,
  type ChunkTranscript,
} from './movieTranscribe'

describe('splitAudioIntoChunks', () => {
  it('splits audio into chunks without overlap', () => {
    const chunks = splitAudioIntoChunks(600, 300, { overlapSec: 0 })
    expect(chunks).toHaveLength(2)
    expect(chunks[0].start).toBe(0)
    expect(chunks[0].end).toBe(300)
    expect(chunks[1].start).toBe(300)
    expect(chunks[1].end).toBe(600)
  })

  it('handles audio shorter than chunk duration', () => {
    const chunks = splitAudioIntoChunks(120, 300)
    expect(chunks).toHaveLength(1)
    expect(chunks[0].start).toBe(0)
    expect(chunks[0].end).toBe(120)
  })

  it('handles exact multiple of chunk duration (no overlap)', () => {
    const chunks = splitAudioIntoChunks(600, 300, { overlapSec: 0 })
    expect(chunks).toHaveLength(2)
    expect(chunks[1].end).toBe(600)
  })

  it('creates overlapping chunks for context continuity', () => {
    const chunks = splitAudioIntoChunks(900, 300, { overlapSec: 10 })
    expect(chunks[0].start).toBe(0)
    expect(chunks[0].end).toBe(300)
    expect(chunks[1].start).toBe(290)
    expect(chunks[1].end).toBe(590)
    expect(chunks[2].start).toBe(580)
    expect(chunks[2].end).toBe(880)
    expect(chunks[3].start).toBe(870)
    expect(chunks[3].end).toBe(900)
  })

  it('numbers chunks sequentially', () => {
    const chunks = splitAudioIntoChunks(1200, 300, { overlapSec: 0 })
    chunks.forEach((c, i) => expect(c.index).toBe(i))
  })
})

describe('mergeChunkTranscripts', () => {
  it('merges overlapping transcripts by deduplicating shared words', () => {
    const chunks: MovieChunk[] = [
      { index: 0, start: 0, end: 300 },
      { index: 1, start: 290, end: 600 },
    ]
    const transcripts: ChunkTranscript[] = [
      {
        words: [
          { word: 'hello', start: 0, end: 0.5 },
          { word: 'world', start: 0.6, end: 1.0 },
          { word: 'this', start: 295, end: 295.3 },
          { word: 'is', start: 295.4, end: 295.6 },
        ],
        fullText: 'hello world this is',
        language: 'en',
        engine: 'deepgram',
      },
      {
        words: [
          { word: 'this', start: 295, end: 295.3 },
          { word: 'is', start: 295.4, end: 295.6 },
          { word: 'a', start: 296, end: 296.2 },
          { word: 'test', start: 296.3, end: 296.7 },
        ],
        fullText: 'this is a test',
        language: 'en',
        engine: 'deepgram',
      },
    ]
    const merged = mergeChunkTranscripts(chunks, transcripts)
    // "this is" deduplicated → 4 + 4 - 2 = 6 unique words
    expect(merged.words).toHaveLength(6)
    expect(merged.fullText).toContain('hello world')
    expect(merged.fullText).toContain('a test')
  })

  it('preserves word timestamps from source chunks', () => {
    const chunks: MovieChunk[] = [
      { index: 0, start: 0, end: 300 },
    ]
    const transcripts: ChunkTranscript[] = [
      {
        words: [
          { word: 'hello', start: 10, end: 10.5 },
          { word: 'world', start: 11, end: 11.5 },
        ],
        fullText: 'hello world',
        language: 'en',
        engine: 'deepgram',
      },
    ]
    const merged = mergeChunkTranscripts(chunks, transcripts)
    expect(merged.words[0].start).toBe(10)
    expect(merged.words[1].start).toBe(11)
  })

  it('returns empty result for empty input', () => {
    const merged = mergeChunkTranscripts([], [])
    expect(merged.words).toHaveLength(0)
    expect(merged.fullText).toBe('')
  })

  it('sorts merged words by start time', () => {
    const chunks: MovieChunk[] = [
      { index: 0, start: 0, end: 300 },
      { index: 1, start: 290, end: 600 },
    ]
    const transcripts: ChunkTranscript[] = [
      {
        words: [{ word: 'second', start: 400, end: 400.5 }],
        fullText: 'second',
        language: 'en',
        engine: 'deepgram',
      },
      {
        words: [{ word: 'first', start: 5, end: 5.5 }],
        fullText: 'first',
        language: 'en',
        engine: 'deepgram',
      },
    ]
    const merged = mergeChunkTranscripts(chunks, transcripts)
    expect(merged.words[0].start).toBeLessThan(merged.words[1].start)
  })
})

describe('estimateMovieDuration', () => {
  it('returns duration from video metadata', () => {
    expect(estimateMovieDuration({ duration: 7200 })).toBe(7200)
  })

  it('clamps negative values to 0', () => {
    expect(estimateMovieDuration({ duration: -1 })).toBe(0)
  })

  it('handles zero duration', () => {
    expect(estimateMovieDuration({ duration: 0 })).toBe(0)
  })
})
