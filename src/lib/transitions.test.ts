import { describe, it, expect } from 'vitest'
import {
  createTransitionRenderer,
  getTransitionDuration,
  applyTransitionsToTimeline,
  type TransitionConfig,
} from './transitions'

describe('createTransitionRenderer', () => {
  it('creates a renderer function', () => {
    const renderer = createTransitionRenderer({ type: 'cut', duration: 0.5 })
    expect(typeof renderer).toBe('function')
  })

  it('cut transition shows A then B', () => {
    const renderer = createTransitionRenderer({ type: 'cut', duration: 1 })
    const calls: string[] = []
    const drawA = () => { calls.push('A') }
    const drawB = () => { calls.push('B') }
    const canvas = { save: () => {}, restore: () => {} } as any

    renderer(canvas, 100, 100, 0.3, drawA, drawB)
    expect(calls).toContain('A')

    calls.length = 0
    renderer(canvas, 100, 100, 0.7, drawA, drawB)
    expect(calls).toContain('B')
  })

  it('crossfade draws both with alpha', () => {
    const renderer = createTransitionRenderer({ type: 'crossfade', duration: 1 })
    const calls: string[] = []
    const drawA = () => { calls.push('A') }
    const drawB = () => { calls.push('B') }
    const canvas = { save: () => {}, restore: () => {}, globalAlpha: 1 } as any

    renderer(canvas, 100, 100, 0.5, drawA, drawB)
    expect(calls).toContain('A')
    expect(calls).toContain('B')
  })
})

describe('getTransitionDuration', () => {
  it('returns duration from config', () => {
    expect(getTransitionDuration({ type: 'cut', duration: 0.5 })).toBe(0.5)
  })
})

describe('applyTransitionsToTimeline', () => {
  it('adds transitions between clips', () => {
    const clips = [
      { start: 0, end: 10 },
      { start: 10, end: 20 },
    ]
    const transitions: TransitionConfig[] = [
      { type: 'crossfade', duration: 1 },
    ]
    const result = applyTransitionsToTimeline(clips, transitions)
    expect(result.length).toBeGreaterThanOrEqual(2)
  })

  it('uses cut for clips without transitions', () => {
    const clips = [
      { start: 0, end: 10 },
      { start: 10, end: 20 },
    ]
    const result = applyTransitionsToTimeline(clips, [])
    expect(result.length).toBeGreaterThanOrEqual(2)
  })
})
