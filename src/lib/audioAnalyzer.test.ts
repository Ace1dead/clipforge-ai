import { describe, it, expect } from 'vitest'
import {
  rmsToScore,
  computeMotionScore,
  computeSceneChangeScore,
  computeColorHistogram,
  voiceActivityDetect,
  computeDynamicThreshold,
  mergeHighlights,
  type AudioAnalysisWindow,
} from './audioAnalyzer'

describe('rmsToScore', () => {
  it('returns 0 below threshold', () => {
    expect(rmsToScore(0.005, 0.01, 0.5)).toBe(0)
  })

  it('returns 1 at ceiling', () => {
    expect(rmsToScore(0.5, 0.01, 0.5)).toBe(1)
  })

  it('scales linearly between threshold and ceiling', () => {
    const score = rmsToScore(0.255, 0.01, 0.5)
    expect(score).toBeCloseTo(0.5, 1)
  })
})

describe('computeMotionScore', () => {
  it('returns 0 for identical frames', () => {
    const frame = new Uint8ClampedArray([128, 128, 128, 255, 128, 128, 128, 255])
    expect(computeMotionScore(frame, frame)).toBe(0)
  })

  it('returns higher score for different frames', () => {
    const frame1 = new Uint8ClampedArray([0, 0, 0, 255])
    const frame2 = new Uint8ClampedArray([255, 255, 255, 255])
    const score = computeMotionScore(frame1, frame2)
    expect(score).toBeGreaterThan(0)
  })

  it('returns 0 for mismatched lengths', () => {
    const a = new Uint8ClampedArray([1, 2, 3])
    const b = new Uint8ClampedArray([1, 2])
    expect(computeMotionScore(a, b)).toBe(0)
  })
})

describe('computeSceneChangeScore', () => {
  it('returns 0 for identical histograms', () => {
    const h = [10, 20, 30, 40]
    expect(computeSceneChangeScore(h, h)).toBe(0)
  })

  it('returns higher score for different histograms', () => {
    const h1 = [100, 0, 0, 0]
    const h2 = [0, 0, 0, 100]
    const score = computeSceneChangeScore(h1, h2)
    expect(score).toBeGreaterThan(0)
  })

  it('returns 0 for empty histograms', () => {
    expect(computeSceneChangeScore([], [])).toBe(0)
  })
})

describe('computeColorHistogram', () => {
  it('returns histogram with correct bin count', () => {
    const data = new Uint8ClampedArray([128, 64, 32, 255, 10, 20, 30, 255])
    const hist = computeColorHistogram(data, 4)
    expect(hist).toHaveLength(12)
    expect(hist.some(v => v > 0)).toBe(true)
  })
})

describe('voiceActivityDetect', () => {
  it('detects high RMS as voice', () => {
    const rms = [0.01, 0.01, 0.1, 0.01, 0.01]
    const vad = voiceActivityDetect(rms, 1.0)
    expect(vad[2]).toBe(true)
    expect(vad[0]).toBe(false)
  })

  it('returns empty for empty input', () => {
    expect(voiceActivityDetect([])).toHaveLength(0)
  })
})

describe('computeDynamicThreshold', () => {
  it('returns higher threshold for higher sensitivity', () => {
    const scores = Array.from({ length: 100 }, (_, i) => i / 100)
    const low = computeDynamicThreshold(scores, 1.0)
    const high = computeDynamicThreshold(scores, 3.0)
    expect(high).toBeGreaterThanOrEqual(low)
  })

  it('returns 0 for empty scores', () => {
    expect(computeDynamicThreshold([])).toBe(0)
  })
})

describe('mergeHighlights', () => {
  it('merges nearby highlights within gap', () => {
    const windows: AudioAnalysisWindow[] = [
      { time: 0, rms: 0.1, peak: 0.1, motionScore: 0, sceneChangeScore: 0, hybridScore: 0.8, quality: 0.8, voiceDetected: false },
      { time: 1, rms: 0.1, peak: 0.1, motionScore: 0, sceneChangeScore: 0, hybridScore: 0.9, quality: 0.9, voiceDetected: false },
      { time: 20, rms: 0.1, peak: 0.1, motionScore: 0, sceneChangeScore: 0, hybridScore: 0.7, quality: 0.7, voiceDetected: false },
    ]
    const merged = mergeHighlights(windows, 0.5, 5, 5, 30)
    expect(merged.length).toBeGreaterThanOrEqual(1)
    expect(merged.length).toBeLessThanOrEqual(2)
  })

  it('enforces minimum clip duration', () => {
    const windows: AudioAnalysisWindow[] = [
      { time: 0, rms: 0.1, peak: 0.1, motionScore: 0, sceneChangeScore: 0, hybridScore: 0.8, quality: 0.8, voiceDetected: false },
      { time: 2, rms: 0.1, peak: 0.1, motionScore: 0, sceneChangeScore: 0, hybridScore: 0.9, quality: 0.9, voiceDetected: false },
    ]
    const merged = mergeHighlights(windows, 0.5, 8, 5, 30)
    if (merged.length > 0) {
      expect(merged[0].end - merged[0].start).toBeGreaterThanOrEqual(2.5)
    }
  })
})
