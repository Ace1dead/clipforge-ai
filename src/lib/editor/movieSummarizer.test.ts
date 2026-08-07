import { describe, it, expect } from 'vitest'
import {
  type ChunkSummary,
  type MovieOutline,
  type CutPlan,
  type CutSegment,
  summarizeChunk,
  buildMovieOutline,
  generateCutPlan,
  mergeOverlappingSegments,
  validateCutPlan,
} from './movieSummarizer'

describe('summarizeChunk', () => {
  it('returns a chunk summary with required fields', async () => {
    const result = await summarizeChunk({
      chunkIndex: 0,
      chunkStart: 0,
      chunkEnd: 300,
      transcript: 'The movie opens with a sweeping shot of the ocean. A young woman stands at the edge of a cliff, staring down at the waves crashing below. She whispers something inaudible, then turns and walks back toward a small village. The narrator begins to tell the story of her ancestors.',
      language: 'en',
    })
    expect(result).toHaveProperty('summary')
    expect(result).toHaveProperty('keyPhrases')
    expect(result).toHaveProperty('sceneCount')
    expect(result).toHaveProperty('mood')
    expect(result.chunkIndex).toBe(0)
    expect(typeof result.summary).toBe('string')
    expect(result.summary.length).toBeGreaterThan(0)
  })
})

describe('buildMovieOutline', () => {
  it('returns an outline with acts and key scenes', async () => {
    const result = await buildMovieOutline({
      chunkSummaries: [
        { chunkIndex: 0, chunkStart: 0, chunkEnd: 300, summary: 'Opening scene introduces the protagonist in a coastal village.', keyPhrases: ['protagonist', 'coastal village'], sceneCount: 3, mood: 'mysterious' },
        { chunkIndex: 1, chunkStart: 300, chunkEnd: 600, summary: 'The protagonist discovers a hidden map leading to a treasure.', keyPhrases: ['hidden map', 'treasure'], sceneCount: 4, mood: 'adventurous' },
        { chunkIndex: 2, chunkStart: 600, chunkEnd: 900, summary: 'A rival crew appears and pursues the protagonist across the sea.', keyPhrases: ['rival crew', 'pursuit'], sceneCount: 5, mood: 'tense' },
      ],
      totalDuration: 900,
      title: 'The Lost Treasure',
    })
    expect(result).toHaveProperty('title')
    expect(result).toHaveProperty('acts')
    expect(result).toHaveProperty('keyScenes')
    expect(result).toHaveProperty('characters')
    expect(result.acts.length).toBeGreaterThan(0)
    expect(result.keyScenes.length).toBeGreaterThan(0)
    expect(result.title).toBe('The Lost Treasure')
  })
})

describe('generateCutPlan', () => {
  it('returns a cut plan with keep/discard segments', async () => {
    const outline: MovieOutline = {
      title: 'Test Movie',
      acts: [
        { actNumber: 1, name: 'Setup', description: 'Introduction', startChunk: 0, endChunk: 0, keyEvents: ['Character intro'] },
        { actNumber: 2, name: 'Confrontation', description: 'Conflict', startChunk: 1, endChunk: 2, keyEvents: ['Villain appears', 'Battle'] },
      ],
      keyScenes: [
        { description: 'Character introduction', estimatedTimeRange: [0, 60], importance: 'high' },
        { description: 'Villain reveal', estimatedTimeRange: [350, 420], importance: 'critical' },
        { description: 'Final battle', estimatedTimeRange: [700, 850], importance: 'high' },
      ],
      characters: ['Hero', 'Villain'],
      mood: 'adventurous',
      summary: 'A hero faces a villain in an adventurous tale.',
    }

    const result = await generateCutPlan({
      outline,
      totalDuration: 900,
      targetDuration: 120, // 2-minute summary
      transcript: [
        { word: 'Once', start: 0, end: 0.3 },
        { word: 'upon', start: 0.4, end: 0.7 },
        { word: 'a', start: 0.8, end: 0.9 },
        { word: 'time', start: 1.0, end: 1.3 },
      ],
    })
    expect(result).toHaveProperty('segments')
    expect(result).toHaveProperty('estimatedDuration')
    expect(result).toHaveProperty('keepRatio')
    expect(result.segments.length).toBeGreaterThan(0)
    expect(result.segments.every(s => s.action === 'keep' || s.action === 'discard')).toBe(true)
  })
})

describe('mergeOverlappingSegments', () => {
  it('merges adjacent keep segments', () => {
    const segments: CutSegment[] = [
      { start: 0, end: 30, action: 'keep', reason: 'intro' },
      { start: 30, end: 60, action: 'keep', reason: 'scene 2' },
      { start: 60, end: 90, action: 'discard', reason: 'boring' },
    ]
    const merged = mergeOverlappingSegments(segments)
    expect(merged).toHaveLength(2)
    expect(merged[0].end).toBe(60)
    expect(merged[0].reason).toContain('intro')
  })

  it('does not merge discard segments', () => {
    const segments: CutSegment[] = [
      { start: 0, end: 30, action: 'discard', reason: 'silence' },
      { start: 30, end: 60, action: 'discard', reason: 'silence' },
    ]
    const merged = mergeOverlappingSegments(segments)
    expect(merged).toHaveLength(2)
  })

  it('returns empty array for empty input', () => {
    expect(mergeOverlappingSegments([])).toHaveLength(0)
  })
})

describe('validateCutPlan', () => {
  it('validates a correct cut plan', () => {
    const segments: CutSegment[] = [
      { start: 0, end: 30, action: 'keep', reason: 'intro' },
      { start: 30, end: 60, action: 'discard', reason: 'skip' },
      { start: 60, end: 90, action: 'keep', reason: 'climax' },
    ]
    const result = validateCutPlan(segments, 90)
    expect(result.valid).toBe(true)
    expect(result.errors).toHaveLength(0)
  })

  it('detects gaps between segments', () => {
    const segments: CutSegment[] = [
      { start: 0, end: 30, action: 'keep', reason: 'intro' },
      { start: 35, end: 60, action: 'keep', reason: 'scene 2' },
    ]
    const result = validateCutPlan(segments, 60)
    expect(result.valid).toBe(false)
    expect(result.errors.length).toBeGreaterThan(0)
  })

  it('detects overlapping segments', () => {
    const segments: CutSegment[] = [
      { start: 0, end: 40, action: 'keep', reason: 'intro' },
      { start: 30, end: 60, action: 'keep', reason: 'scene 2' },
    ]
    const result = validateCutPlan(segments, 60)
    expect(result.valid).toBe(false)
  })

  it('detects segments exceeding total duration', () => {
    const segments: CutSegment[] = [
      { start: 0, end: 100, action: 'keep', reason: 'too long' },
    ]
    const result = validateCutPlan(segments, 60)
    expect(result.valid).toBe(false)
  })
})
