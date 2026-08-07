import { describe, it, expect } from 'vitest'
import {
  buildMovieTimeline,
  calculateTotalKeepDuration,
  buildTransitionSegments,
} from './movieTimelineBuilder'
import type { RefinedCutSegment } from './cutPlanner'

describe('buildMovieTimeline', () => {
  it('creates a timeline with video clips from keep segments', () => {
    const segments: RefinedCutSegment[] = [
      { start: 0, end: 30, action: 'keep', reason: 'intro', confidence: 0.9 },
      { start: 30, end: 45, action: 'discard', reason: 'filler', confidence: 0.7 },
      { start: 45, end: 90, action: 'keep', reason: 'climax', confidence: 0.9 },
    ]
    const result = buildMovieTimeline(segments, 'http://example.com/movie.mp4', 90, 1080, 1920)
    expect(result.timeline.tracks.length).toBeGreaterThanOrEqual(1)
    const videoTrack = result.timeline.tracks.find(t => t.type === 'video')
    expect(videoTrack).toBeDefined()
    expect(videoTrack!.clips.length).toBe(2) // Two keep segments
  })

  it('assigns correct source ranges to clips', () => {
    const segments: RefinedCutSegment[] = [
      { start: 10, end: 30, action: 'keep', reason: 'scene', confidence: 0.9 },
      { start: 50, end: 80, action: 'keep', reason: 'scene 2', confidence: 0.9 },
    ]
    const result = buildMovieTimeline(segments, 'http://example.com/movie.mp4', 90, 1080, 1920)
    const videoTrack = result.timeline.tracks.find(t => t.type === 'video')
    const clips = videoTrack!.clips
    expect(clips[0].sourceStart).toBe(10)
    expect(clips[0].sourceEnd).toBe(30)
    expect(clips[1].sourceStart).toBe(50)
    expect(clips[1].sourceEnd).toBe(80)
  })

  it('packs clips sequentially with crossfade overlap', () => {
    const segments: RefinedCutSegment[] = [
      { start: 0, end: 20, action: 'keep', reason: 'a', confidence: 0.9 },
      { start: 40, end: 60, action: 'keep', reason: 'b', confidence: 0.9 },
      { start: 80, end: 100, action: 'keep', reason: 'c', confidence: 0.9 },
    ]
    const result = buildMovieTimeline(segments, 'url', 100, 1080, 1920)
    const videoTrack = result.timeline.tracks.find(t => t.type === 'video')
    const clips = videoTrack!.clips
    // First clip: 0-20
    expect(clips[0].timelineStart).toBe(0)
    expect(clips[0].timelineEnd).toBe(20)
    // Second clip: starts at 20 - 0.3 crossfade = 19.7
    expect(clips[1].timelineStart).toBeCloseTo(19.7, 1)
    expect(clips[1].timelineEnd).toBeCloseTo(39.7, 1)
  })

  it('adds crossfade transitions between adjacent clips', () => {
    const segments: RefinedCutSegment[] = [
      { start: 0, end: 20, action: 'keep', reason: 'a', confidence: 0.9 },
      { start: 40, end: 60, action: 'keep', reason: 'b', confidence: 0.9 },
    ]
    const result = buildMovieTimeline(segments, 'url', 60, 1080, 1920)
    const videoTrack = result.timeline.tracks.find(t => t.type === 'video')
    const clips = videoTrack!.clips
    expect(clips[1].transitionIn).toBeDefined()
    expect(clips[1].transitionIn!.type).toBe('crossfade')
  })

  it('returns total duration accounting for crossfade overlap', () => {
    const segments: RefinedCutSegment[] = [
      { start: 0, end: 30, action: 'keep', reason: 'a', confidence: 0.9 },
      { start: 60, end: 90, action: 'keep', reason: 'b', confidence: 0.9 },
    ]
    const result = buildMovieTimeline(segments, 'url', 90, 1080, 1920)
    // 30 + 30 - 0.3 crossfade = 59.7
    expect(result.timeline.duration).toBeCloseTo(59.7, 1)
  })

  it('returns correct stats', () => {
    const segments: RefinedCutSegment[] = [
      { start: 0, end: 30, action: 'keep', reason: 'a', confidence: 0.9 },
      { start: 30, end: 60, action: 'discard', reason: 'b', confidence: 0.7 },
      { start: 60, end: 90, action: 'keep', reason: 'c', confidence: 0.9 },
    ]
    const result = buildMovieTimeline(segments, 'url', 90, 1080, 1920)
    expect(result.totalKeepDuration).toBe(60)
    expect(result.totalDiscardDuration).toBe(30)
    expect(result.clipCount).toBe(2)
  })
})

describe('calculateTotalKeepDuration', () => {
  it('sums keep segment durations', () => {
    const segments: RefinedCutSegment[] = [
      { start: 0, end: 30, action: 'keep', reason: '', confidence: 1 },
      { start: 30, end: 60, action: 'discard', reason: '', confidence: 1 },
      { start: 60, end: 100, action: 'keep', reason: '', confidence: 1 },
    ]
    expect(calculateTotalKeepDuration(segments)).toBe(70)
  })
})

describe('buildTransitionSegments', () => {
  it('creates keep + crossfade entries for each transition', () => {
    const segments: RefinedCutSegment[] = [
      { start: 0, end: 20, action: 'keep', reason: 'a', confidence: 0.9 },
      { start: 40, end: 60, action: 'keep', reason: 'b', confidence: 0.9 },
    ]
    const transitions = buildTransitionSegments(segments, 0.5)
    // crossfade(0.5) + keep(20) + crossfade(0.5) + keep(20) = 4 entries? No:
    // keep(0-20) + crossfade(at 40) + keep(40-60) = 3 entries
    expect(transitions.length).toBeGreaterThanOrEqual(2)
    expect(transitions[0].type).toBe('keep')
  })
})
