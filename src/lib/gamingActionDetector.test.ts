import { describe, it, expect } from 'vitest'
import {
  analyzeFrame,
  detectFlash,
  detectMuzzleFlash,
  detectScreenFlash,
  computeTemporalDelta,
  scoreGamingAction,
  type PixelFrame,
  type ActionScore,
} from './gamingActionDetector'

function makeFrame(width: number, height: number, fill: number): PixelFrame {
  const data = new Uint8ClampedArray(width * height * 4)
  for (let i = 0; i < data.length; i += 4) {
    data[i] = fill
    data[i + 1] = fill
    data[i + 2] = fill
    data[i + 3] = 255
  }
  return { data, width, height }
}

describe('detectFlash', () => {
  it('detects bright center flash', () => {
    const frame = makeFrame(100, 100, 50)
    // Make center bright
    for (let y = 40; y < 60; y++) {
      for (let x = 40; x < 60; x++) {
        const idx = (y * 100 + x) * 4
        frame.data[idx] = 255
        frame.data[idx + 1] = 255
        frame.data[idx + 2] = 255
      }
    }
    const prev = makeFrame(100, 100, 50)
    const result = detectFlash(frame, prev)
    expect(result.detected).toBe(true)
    expect(result.intensity).toBeGreaterThan(0)
  })

  it('no flash on identical frames', () => {
    const frame = makeFrame(100, 100, 100)
    const result = detectFlash(frame, frame)
    expect(result.detected).toBe(false)
  })
})

describe('detectScreenFlash', () => {
  it('detects global brightness spike', () => {
    const prev = makeFrame(100, 100, 50)
    const curr = makeFrame(100, 100, 200)
    const result = detectScreenFlash(curr, prev)
    expect(result).toBe(true)
  })
})

describe('computeTemporalDelta', () => {
  it('returns 0 for identical frames', () => {
    const frame = makeFrame(50, 50, 128)
    const delta = computeTemporalDelta(frame, frame)
    expect(delta).toBe(0)
  })

  it('returns positive for different frames', () => {
    const f1 = makeFrame(50, 50, 50)
    const f2 = makeFrame(50, 50, 200)
    const delta = computeTemporalDelta(f1, f2)
    expect(delta).toBeGreaterThan(0)
  })
})

describe('scoreGamingAction', () => {
  it('returns 0-100 score', () => {
    const score = scoreGamingAction({
      temporalDelta: 15,
      brightnessDelta: 20,
      centerBrightnessDelta: 25,
      flashDetected: true,
      sustainedActivity: false,
      healthChanged: false,
      ammoChanged: false,
      vignetteOnset: false,
    })
    expect(score).toBeGreaterThanOrEqual(0)
    expect(score).toBeLessThanOrEqual(100)
  })

  it('higher score for multiple indicators', () => {
    const low = scoreGamingAction({
      temporalDelta: 5,
      brightnessDelta: 3,
      centerBrightnessDelta: 2,
      flashDetected: false,
      sustainedActivity: false,
      healthChanged: false,
      ammoChanged: false,
      vignetteOnset: false,
    })
    const high = scoreGamingAction({
      temporalDelta: 25,
      brightnessDelta: 30,
      centerBrightnessDelta: 35,
      flashDetected: true,
      sustainedActivity: true,
      healthChanged: true,
      ammoChanged: true,
      vignetteOnset: true,
    })
    expect(high).toBeGreaterThan(low)
  })
})

describe('analyzeFrame', () => {
  it('returns complete analysis', () => {
    const frame = makeFrame(100, 100, 100)
    const prev = makeFrame(100, 100, 120)
    const result = analyzeFrame(frame, prev)
    expect(result).toHaveProperty('brightness')
    expect(result).toHaveProperty('centerBrightness')
    expect(result).toHaveProperty('temporalDelta')
    expect(result).toHaveProperty('actionScore')
  })
})
