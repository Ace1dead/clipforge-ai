import { describe, it, expect } from 'vitest'
import {
  createCursorTracker,
  type CursorPosition,
} from './cursorTracking'

describe('createCursorTracker', () => {
  it('tracks positions', () => {
    const tracker = createCursorTracker({ smoothingFactor: 0 })
    tracker.addPosition(100, 200, 0)
    tracker.addPosition(150, 250, 0.1)

    const pos = tracker.getCurrentPosition()
    expect(pos).not.toBeNull()
    expect(pos!.x).toBeCloseTo(150, 0)
    expect(pos!.y).toBeCloseTo(250, 0)
  })

  it('smooths positions', () => {
    const tracker = createCursorTracker({ smoothingFactor: 0.5 })
    tracker.addPosition(0, 0, 0)
    tracker.addPosition(100, 100, 0.1)

    const pos = tracker.getCurrentPosition()
    expect(pos!.x).toBeGreaterThan(0)
    expect(pos!.x).toBeLessThan(100)
  })

  it('returns trail history', () => {
    const tracker = createCursorTracker()
    tracker.addPosition(10, 20, 0)
    tracker.addPosition(30, 40, 0.1)
    tracker.addPosition(50, 60, 0.2)

    const trail = tracker.getTrail()
    expect(trail).toHaveLength(3)
    expect(trail[0].x).toBeCloseTo(10, 0)
  })

  it('limits trail length', () => {
    const tracker = createCursorTracker({ trailLength: 5 })
    for (let i = 0; i < 10; i++) {
      tracker.addPosition(i * 10, i * 10, i * 0.1)
    }
    expect(tracker.getTrail().length).toBeLessThanOrEqual(5)
  })

  it('detects zoom targets from dwell time', () => {
    const tracker = createCursorTracker({ trailLength: 50 })
    for (let i = 0; i < 20; i++) {
      tracker.addPosition(100, 100, i * 0.1)
    }
    const zooms = tracker.detectZoomTargets(800, 600, 0.5)
    expect(zooms.length).toBeGreaterThanOrEqual(1)
    expect(zooms[0].zoomLevel).toBeGreaterThan(1)
  })

  it('clears trail', () => {
    const tracker = createCursorTracker()
    tracker.addPosition(10, 20, 0)
    tracker.clear()
    expect(tracker.getTrail()).toHaveLength(0)
    expect(tracker.getCurrentPosition()).toBeNull()
  })

  it('interpolates position at time', () => {
    const tracker = createCursorTracker({ smoothingFactor: 0 })
    tracker.addPosition(0, 0, 0)
    tracker.addPosition(100, 100, 1)

    const pos = tracker.getPositionAtTime(0.5)
    expect(pos).not.toBeNull()
    expect(pos!.x).toBeCloseTo(50, 0)
    expect(pos!.y).toBeCloseTo(50, 0)
  })

  it('clamps to nearest position for out-of-range time', () => {
    const tracker = createCursorTracker({ smoothingFactor: 0 })
    tracker.addPosition(0, 0, 0)
    tracker.addPosition(100, 100, 1)

    expect(tracker.getPositionAtTime(-1)!.x).toBe(0)
    expect(tracker.getPositionAtTime(5)!.x).toBe(100)
  })
})
