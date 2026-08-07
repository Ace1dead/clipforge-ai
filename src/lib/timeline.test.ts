import { describe, it, expect } from 'vitest'
import {
  createTimeline,
  createClip,
  addTrack,
  addClipToTrack,
  removeClip,
  moveClip,
  splitClip,
  getClipsAtTime,
  getTimelineDuration,
  rippleDelete,
} from './timeline'

describe('createTimeline', () => {
  it('creates a timeline with default V1 and A1 tracks', () => {
    const tl = createTimeline({})
    expect(tl.tracks.length).toBe(2)
    expect(tl.tracks[0].type).toBe('video')
    expect(tl.tracks[1].type).toBe('audio')
  })
})

describe('createClip', () => {
  it('creates a clip with correct duration', () => {
    const clip = createClip({ type: 'video', trackId: 'v1', sourceStart: 5, sourceEnd: 15 })
    expect(clip.type).toBe('video')
    expect(clip.sourceStart).toBe(5)
    expect(clip.sourceEnd).toBe(15)
    expect(clip.timelineEnd - clip.timelineStart).toBe(10)
  })
})

describe('addClipToTrack', () => {
  it('adds clip to the specified track', () => {
    let tl = createTimeline({})
    const clip = createClip({ type: 'video', trackId: tl.tracks[0].id })
    tl = addClipToTrack(tl, tl.tracks[0].id, clip)
    expect(tl.tracks[0].clips.length).toBe(1)
  })
})

describe('splitClip', () => {
  it('splits a clip into two at the given time', () => {
    let tl = createTimeline({})
    const clip = createClip({ type: 'video', trackId: tl.tracks[0].id, timelineStart: 0, sourceStart: 0, sourceEnd: 10 })
    tl = addClipToTrack(tl, tl.tracks[0].id, clip)
    tl = splitClip(tl, clip.id, 5)
    const clips = tl.tracks[0].clips
    expect(clips.length).toBe(2)
    expect(clips[0].timelineEnd).toBe(5)
    expect(clips[1].timelineStart).toBe(5)
  })
})

describe('getClipsAtTime', () => {
  it('finds clips at a given time', () => {
    let tl = createTimeline({})
    const clip = createClip({ type: 'video', trackId: tl.tracks[0].id, timelineStart: 2, sourceStart: 0, sourceEnd: 5 })
    tl = addClipToTrack(tl, tl.tracks[0].id, clip)
    expect(getClipsAtTime(tl, 3).length).toBe(1)
    expect(getClipsAtTime(tl, 1).length).toBe(0)
  })
})

describe('rippleDelete', () => {
  it('shifts subsequent clips left after deletion', () => {
    let tl = createTimeline({})
    const clip1 = createClip({ type: 'video', trackId: tl.tracks[0].id, timelineStart: 0, sourceStart: 0, sourceEnd: 5 })
    const clip2 = createClip({ type: 'video', trackId: tl.tracks[0].id, timelineStart: 5, sourceStart: 0, sourceEnd: 5 })
    tl = addClipToTrack(tl, tl.tracks[0].id, clip1)
    tl = addClipToTrack(tl, tl.tracks[0].id, clip2)
    tl = rippleDelete(tl, clip1.id)
    expect(tl.tracks[0].clips.length).toBe(1)
    expect(tl.tracks[0].clips[0].timelineStart).toBe(0)
  })
})
