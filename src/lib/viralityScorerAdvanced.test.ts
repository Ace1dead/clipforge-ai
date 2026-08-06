import { describe, it, expect } from 'vitest'
import {
  scoreClipVirality,
  detectHookStrength,
  computeEmotionalFlow,
  rankClips,
  type TranscriptSegment,
  type ViralityScore,
} from './viralityScorerAdvanced'

describe('detectHookStrength', () => {
  it('detects number hooks', () => {
    const score = detectHookStrength('7 things you need to know')
    expect(score).toBeGreaterThan(0)
  })

  it('detects question hooks', () => {
    const score = detectHookStrength('Did you know this?')
    expect(score).toBeGreaterThan(0)
  })

  it('detects urgency hooks', () => {
    const score = detectHookStrength('Stop doing this right now')
    expect(score).toBeGreaterThan(0)
  })

  it('returns 0 for weak hooks', () => {
    const score = detectHookStrength('the weather is nice today')
    expect(score).toBe(0)
  })
})

describe('computeEmotionalFlow', () => {
  it('scores higher for varied emotional content', () => {
    const segments: TranscriptSegment[] = [
      { text: 'Oh my god this is insane!', start: 0, end: 3, words: [] },
      { text: 'Let me explain what happened', start: 3, end: 6, words: [] },
      { text: 'And then the most crazy thing happened', start: 6, end: 9, words: [] },
    ]
    const score = computeEmotionalFlow(segments)
    expect(score).toBeGreaterThan(0)
  })

  it('scores lower for flat content', () => {
    const segments: TranscriptSegment[] = [
      { text: 'the cat sat on the mat', start: 0, end: 3, words: [] },
      { text: 'the dog lay on the rug', start: 3, end: 6, words: [] },
      { text: 'the bird flew in the sky', start: 6, end: 9, words: [] },
    ]
    const score = computeEmotionalFlow(segments)
    expect(score).toBeLessThanOrEqual(5)
  })
})

describe('scoreClipVirality', () => {
  it('returns 0-100 score', () => {
    const score = scoreClipVirality({
      hookText: '7 things you NEED to know',
      transcriptText: 'This will change everything you thought you knew about the world',
      duration: 30,
      wordCount: 12,
      hasQuestion: false,
      exclamationCount: 1,
    })
    expect(score.total).toBeGreaterThanOrEqual(0)
    expect(score.total).toBeLessThanOrEqual(100)
  })

  it('higher hook score increases total', () => {
    const low = scoreClipVirality({
      hookText: 'the thing',
      transcriptText: 'boring content',
      duration: 30,
      wordCount: 3,
      hasQuestion: false,
      exclamationCount: 0,
    })
    const high = scoreClipVirality({
      hookText: '7 SHocking secrets they don\'t want you to know!!',
      transcriptText: 'This changes everything about how you think about money',
      duration: 30,
      wordCount: 12,
      hasQuestion: true,
      exclamationCount: 2,
    })
    expect(high.total).toBeGreaterThan(low.total)
  })
})

describe('rankClips', () => {
  it('sorts clips by virality score descending', () => {
    const clips = [
      { id: 'c1', score: scoreClipVirality({ hookText: 'hi', transcriptText: 'ok', duration: 10, wordCount: 1, hasQuestion: false, exclamationCount: 0 }) },
      { id: 'c2', score: scoreClipVirality({ hookText: '7 SHocking secrets!!', transcriptText: 'This changes everything you know about money and success', duration: 30, wordCount: 15, hasQuestion: true, exclamationCount: 2 }) },
      { id: 'c3', score: scoreClipVirality({ hookText: 'watch this', transcriptText: 'something interesting happened today that I want to share', duration: 20, wordCount: 10, hasQuestion: false, exclamationCount: 1 }) },
    ]
    const ranked = rankClips(clips)
    expect(ranked[0].id).toBe('c2')
  })
})
