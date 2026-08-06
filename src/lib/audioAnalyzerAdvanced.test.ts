import { describe, it, expect } from 'vitest'
import {
  detectVolumeSpikes,
  computeMultiIndicatorScore,
  detectVoiceActivity,
  scoreAudioSpike,
  mergeSpikes,
  type AudioChunk,
  type AudioSpike,
  type VADSettings,
} from './audioAnalyzerAdvanced'

function makeChunks(count: number, baseRms = 0.05): AudioChunk[] {
  return Array.from({ length: count }, (_, i) => ({
    time: i * 0.5,
    rms: baseRms + Math.sin(i * 0.5) * 0.02,
    peak: baseRms * 1.5 + Math.random() * 0.01,
    duration: 0.5,
  }))
}

describe('detectVolumeSpikes', () => {
  it('detects spikes above threshold', () => {
    const chunks = makeChunks(20, 0.05)
    // Insert a loud spike
    chunks[10] = { time: 5, rms: 0.3, peak: 0.5, duration: 0.5 }
    const spikes = detectVolumeSpikes(chunks, { thresholdDb: -20, minGapSec: 2 })
    expect(spikes.length).toBeGreaterThanOrEqual(1)
  })

  it('respects minimum gap', () => {
    const chunks = makeChunks(20, 0.05)
    chunks[5] = { time: 2.5, rms: 0.3, peak: 0.5, duration: 0.5 }
    chunks[7] = { time: 3.5, rms: 0.35, peak: 0.55, duration: 0.5 }
    const spikes = detectVolumeSpikes(chunks, { thresholdDb: -10, minGapSec: 2 })
    expect(spikes.length).toBe(1)
  })

  it('returns empty for quiet audio', () => {
    const chunks = makeChunks(20, 0.01)
    const spikes = detectVolumeSpikes(chunks, { thresholdDb: -10, minGapSec: 2 })
    expect(spikes).toHaveLength(0)
  })
})

describe('computeMultiIndicatorScore', () => {
  it('gives high score for voice + threshold + sustained', () => {
    const score = computeMultiIndicatorScore({
      aboveThreshold: true,
      suddenChange: false,
      isTransient: false,
      sustainedEnergy: true,
      wellAboveBaseline: false,
      voiceDetected: true,
    })
    expect(score).toBeGreaterThanOrEqual(50)
  })

  it('gives low score for no indicators', () => {
    const score = computeMultiIndicatorScore({
      aboveThreshold: false,
      suddenChange: false,
      isTransient: false,
      sustainedEnergy: false,
      wellAboveBaseline: false,
      voiceDetected: false,
    })
    expect(score).toBe(0)
  })

  it('voice alone gets 30 points', () => {
    const score = computeMultiIndicatorScore({
      aboveThreshold: false,
      suddenChange: false,
      isTransient: false,
      sustainedEnergy: false,
      wellAboveBaseline: false,
      voiceDetected: true,
    })
    expect(score).toBe(30)
  })
})

describe('scoreAudioSpike', () => {
  it('returns 0-100 score', () => {
    const score = scoreAudioSpike({
      rms: 0.3,
      baseline: 0.05,
      peak: 0.5,
      voiceRatio: 0.8,
      quality: 60,
    })
    expect(score).toBeGreaterThanOrEqual(0)
    expect(score).toBeLessThanOrEqual(100)
  })

  it('higher voice ratio increases score', () => {
    const low = scoreAudioSpike({ rms: 0.2, baseline: 0.05, peak: 0.3, voiceRatio: 0.2, quality: 50 })
    const high = scoreAudioSpike({ rms: 0.2, baseline: 0.05, peak: 0.3, voiceRatio: 0.9, quality: 50 })
    expect(high).toBeGreaterThan(low)
  })
})

describe('detectVoiceActivity', () => {
  it('identifies voice frames', () => {
    const chunks = makeChunks(20, 0.1)
    const vadSettings: VADSettings = { frameSizeMs: 30, mode: 'aggressive', sampleRate: 16000 }
    const result = detectVoiceActivity(chunks, vadSettings)
    expect(result).toHaveLength(20)
    expect(result.every(r => typeof r.hasVoice === 'boolean')).toBe(true)
  })
})

describe('mergeSpikes', () => {
  it('merges overlapping spikes', () => {
    const spikes: AudioSpike[] = [
      { start: 0, end: 2, score: 60, hasVoice: true },
      { start: 1.5, end: 3, score: 70, hasVoice: true },
    ]
    const merged = mergeSpikes(spikes, 0.5)
    expect(merged).toHaveLength(1)
    expect(merged[0].start).toBe(0)
    expect(merged[0].end).toBe(3)
  })

  it('keeps distant spikes separate', () => {
    const spikes: AudioSpike[] = [
      { start: 0, end: 2, score: 60, hasVoice: true },
      { start: 10, end: 12, score: 70, hasVoice: true },
    ]
    const merged = mergeSpikes(spikes, 0.5)
    expect(merged).toHaveLength(2)
  })
})
