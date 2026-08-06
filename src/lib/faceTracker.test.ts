import { describe, it, expect } from 'vitest'
import {
  detectFaces,
  SmoothedCameraman,
  SpeakerTracker,
  computeCropBox,
  computeDeadzoneOffset,
  type FaceCandidate,
  type CameraState,
} from './faceTracker'

describe('computeDeadzoneOffset', () => {
  it('returns 0 when target is within deadzone', () => {
    const offset = computeDeadzoneOffset(500, 540, 1080, 0.25)
    expect(offset).toBe(0)
  })

  it('returns offset when target is outside deadzone', () => {
    const offset = computeDeadzoneOffset(200, 540, 1080, 0.25)
    expect(offset).not.toBe(0)
  })

  it('returns 0 when cropWidth is 0', () => {
    const offset = computeDeadzoneOffset(500, 540, 0, 0.25)
    expect(offset).toBe(0)
  })
})

describe('computeCropBox', () => {
  it('returns valid crop box within frame bounds', () => {
    const box = computeCropBox(1920, 1080, 540, 500, 960)
    expect(box.x).toBeGreaterThanOrEqual(0)
    expect(box.x + box.w).toBeLessThanOrEqual(1920)
    expect(box.h).toBeGreaterThan(0)
  })

  it('clamps to frame edges', () => {
    const box = computeCropBox(1920, 1080, -500, 500, 960)
    expect(box.x).toBe(0)
  })

  it('maintains aspect ratio', () => {
    const box = computeCropBox(1920, 1080, 540, 500, 960)
    const ratio = box.w / box.h
    expect(ratio).toBeCloseTo(9 / 16, 1)
  })
})

describe('SmoothedCameraman', () => {
  it('does not move when target is in deadzone', () => {
    const cam = new SmoothedCameraman({ cropWidth: 608, frameWidth: 1920, deadzone: 0.25, normalSpeed: 3, fastSpeed: 15 })
    cam.update(960)
    expect(cam.getState().cropX).toBeCloseTo(960, 0)
  })

  it('moves toward target when outside deadzone', () => {
    const cam = new SmoothedCameraman({ cropWidth: 608, frameWidth: 1920, deadzone: 0.25, normalSpeed: 3, fastSpeed: 15 })
    cam.update(1500)
    const state = cam.getState()
    expect(state.cropX).toBeGreaterThan(960)
  })

  it('uses fast speed for large displacements', () => {
    const cam = new SmoothedCameraman({ cropWidth: 608, frameWidth: 1920, deadzone: 0.25, normalSpeed: 3, fastSpeed: 15 })
    cam.update(1800)
    const state1 = cam.getState()
    cam.update(1800)
    const state2 = cam.getState()
    // Large displacement → fast speed
    expect(Math.abs(state2.cropX - state1.cropX)).toBeGreaterThan(0)
  })
})

describe('SpeakerTracker', () => {
  it('assigns face IDs by proximity', () => {
    const tracker = new SpeakerTracker({ cooldownFrames: 10, stickyBonus: 3 })
    const faces: FaceCandidate[] = [
      { x: 400, y: 300, width: 100, height: 100, confidence: 0.9 },
    ]
    const id1 = tracker.assignSpeaker(faces)
    expect(id1).toBe(0)
  })

  it('maintains sticky speaker', () => {
    const tracker = new SpeakerTracker({ cooldownFrames: 10, stickyBonus: 3 })
    const faces1: FaceCandidate[] = [
      { x: 400, y: 300, width: 100, height: 100, confidence: 0.9 },
    ]
    tracker.assignSpeaker(faces1)
    // Similar position → same speaker
    const faces2: FaceCandidate[] = [
      { x: 410, y: 310, width: 100, height: 100, confidence: 0.88 },
    ]
    const id2 = tracker.assignSpeaker(faces2)
    expect(id2).toBe(0)
  })

  it('switches speaker after cooldown', () => {
    const tracker = new SpeakerTracker({ cooldownFrames: 3, stickyBonus: 3 })
    const faces1: FaceCandidate[] = [
      { x: 200, y: 300, width: 100, height: 100, confidence: 0.9 },
    ]
    tracker.assignSpeaker(faces1)
    // Different position far away
    const faces2: FaceCandidate[] = [
      { x: 1500, y: 300, width: 100, height: 100, confidence: 0.9 },
    ]
    // Must exceed cooldown
    for (let i = 0; i < 5; i++) tracker.assignSpeaker(faces1)
    const id = tracker.assignSpeaker(faces2)
    expect(id).toBe(1)
  })
})

describe('detectFaces', () => {
  it('returns empty array for null/undefined input', () => {
    const result = detectFaces(null as any)
    expect(result).toEqual([])
  })

  it('returns empty array for zero-size input', () => {
    const result = detectFaces(new Uint8ClampedArray(0))
    expect(result).toEqual([])
  })
})
