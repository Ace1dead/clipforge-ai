/**
 * Tests for compositor timeline rendering: animations, opacity, filters, textAnimation.
 */
import { describe, it, expect } from 'vitest'
import {
  createTimeline,
  createClip,
  addClipToTrack,
  type Timeline,
  type Clip,
} from './timeline'

describe('Clip animation/filter/speed fields', () => {
  it('can set animationIn and animationOut on a clip', () => {
    const clip = createClip({
      type: 'video',
      trackId: 'track-v1',
      sourceStart: 0,
      sourceEnd: 5,
    })

    const updated: Clip = {
      ...clip,
      animationIn: { type: 'fade_in', duration: 0.5 },
      animationOut: { type: 'fade_out', duration: 0.3 },
    }

    expect(updated.animationIn?.type).toBe('fade_in')
    expect(updated.animationIn?.duration).toBe(0.5)
    expect(updated.animationOut?.type).toBe('fade_out')
    expect(updated.animationOut?.duration).toBe(0.3)
  })

  it('can set textAnimation on a text clip', () => {
    const clip = createClip({
      type: 'text',
      trackId: 'track-v1',
      sourceStart: 0,
      sourceEnd: 3,
    })

    const updated: Clip = {
      ...clip,
      textAnimation: 'bounce',
      textConfig: {
        text: 'Hello',
        fontFamily: 'Inter',
        fontSize: 48,
        fontWeight: 800,
        color: '#fff',
        align: 'center',
        valign: 'middle',
      },
    }

    expect(updated.textAnimation).toBe('bounce')
    expect(updated.textConfig?.text).toBe('Hello')
  })

  it('can set filter on a clip', () => {
    const clip = createClip({
      type: 'video',
      trackId: 'track-v1',
      sourceStart: 0,
      sourceEnd: 5,
    })

    const updated: Clip = {
      ...clip,
      filter: 'vintage-1',
      filterStrength: 0.7,
    }

    expect(updated.filter).toBe('vintage-1')
    expect(updated.filterStrength).toBe(0.7)
  })

  it('can set speedRamp on a clip', () => {
    const clip = createClip({
      type: 'video',
      trackId: 'track-v1',
      sourceStart: 0,
      sourceEnd: 10,
    })

    const updated: Clip = {
      ...clip,
      speedRamp: [
        { start: 0, end: 0.3, speed: 0.5 },
        { start: 0.3, end: 0.7, speed: 2.0 },
        { start: 0.7, end: 1.0, speed: 1.0 },
      ],
    }

    expect(updated.speedRamp).toHaveLength(3)
    expect(updated.speedRamp![0].speed).toBe(0.5)
    expect(updated.speedRamp![1].speed).toBe(2.0)
    expect(updated.speedRamp![2].speed).toBe(1.0)
  })

  it('clip opacity defaults to 1', () => {
    const clip = createClip({
      type: 'video',
      trackId: 'track-v1',
      sourceStart: 0,
      sourceEnd: 5,
    })

    expect(clip.opacity).toBe(1)
  })

  it('animationIn can have easing', () => {
    const clip = createClip({
      type: 'video',
      trackId: 'track-v1',
      sourceStart: 0,
      sourceEnd: 5,
    })

    const updated: Clip = {
      ...clip,
      animationIn: { type: 'slide_up', duration: 0.3, easing: 'bounce' },
    }

    expect(updated.animationIn?.easing).toBe('bounce')
  })

  it('text clip supports all animation types', () => {
    const animTypes = [
      'fade_in', 'slide_left', 'slide_right', 'slide_up', 'slide_down',
      'zoom_in', 'zoom_out', 'bounce_in', 'bounce_out', 'glitch_in',
      'typewriter', 'flip_x', 'blur_in', 'swing', 'elastic', 'bounce',
    ]

    for (const type of animTypes) {
      const clip = createClip({
        type: 'text',
        trackId: 'track-v1',
        sourceStart: 0,
        sourceEnd: 3,
      })
      const updated: Clip = { ...clip, textAnimation: type }
      expect(updated.textAnimation).toBe(type)
    }
  })

  it('timeline preserves clip animation fields through operations', () => {
    let tl = createTimeline({ duration: 10 })
    const clip = createClip({
      type: 'video',
      trackId: 'track-v1',
      sourceStart: 0,
      sourceEnd: 5,
      timelineStart: 0,
    })

    const animated: Clip = {
      ...clip,
      animationIn: { type: 'fade_in', duration: 0.5 },
      animationOut: { type: 'fade_out', duration: 0.3 },
      textAnimation: 'bounce',
      filter: 'vintage-1',
      filterStrength: 0.8,
    }

    tl = addClipToTrack(tl, 'track-v1', animated)

    const found = tl.tracks[0].clips[0]
    expect(found.animationIn?.type).toBe('fade_in')
    expect(found.animationOut?.type).toBe('fade_out')
    expect(found.textAnimation).toBe('bounce')
    expect(found.filter).toBe('vintage-1')
    expect(found.filterStrength).toBe(0.8)
  })
})
