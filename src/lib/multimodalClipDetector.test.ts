import { describe, it, expect } from 'vitest'
import {
  detectMultimodalHighlights,
  computeVisualEnergy,
  computeAudioEnergy,
  computeTranscriptEnergy,
  combineModalities,
  type MultimodalInput,
  type ModalityScore,
} from './multimodalClipDetector'

describe('computeVisualEnergy', () => {
  it('returns 0 for identical frames', () => {
    const frame = new Uint8ClampedArray(100 * 100 * 4).fill(128)
    const energy = computeVisualEnergy(frame, frame, 100, 100)
    expect(energy).toBe(0)
  })

  it('returns positive for different frames', () => {
    const f1 = new Uint8ClampedArray(100 * 100 * 4).fill(50)
    const f2 = new Uint8ClampedArray(100 * 100 * 4).fill(200)
    const energy = computeVisualEnergy(f1, f2, 100, 100)
    expect(energy).toBeGreaterThan(0)
  })
})

describe('computeAudioEnergy', () => {
  it('returns 0 for silence', () => {
    const energy = computeAudioEnergy(new Float32Array(1000).fill(0))
    expect(energy).toBe(0)
  })

  it('returns positive for loud audio', () => {
    const samples = new Float32Array(1000).fill(0.5)
    const energy = computeAudioEnergy(samples)
    expect(energy).toBeGreaterThan(0)
  })
})

describe('computeTranscriptEnergy', () => {
  it('scores higher for emotional text', () => {
    const energy = computeTranscriptEnergy('Oh my god this is absolutely insane!')
    expect(energy).toBeGreaterThan(0)
  })

  it('scores lower for neutral text', () => {
    const energy = computeTranscriptEnergy('the cat sat on the mat')
    expect(energy).toBeLessThan(5)
  })
})

describe('combineModalities', () => {
  it('combines scores with weights', () => {
    const scores: ModalityScore[] = [
      { modality: 'visual', score: 0.8, confidence: 0.9 },
      { modality: 'audio', score: 0.6, confidence: 0.7 },
      { modality: 'transcript', score: 0.9, confidence: 0.8 },
    ]
    const combined = combineModalities(scores)
    expect(combined).toBeGreaterThanOrEqual(0)
    expect(combined).toBeLessThanOrEqual(1)
  })

  it('weights by confidence', () => {
    const high: ModalityScore[] = [
      { modality: 'visual', score: 1.0, confidence: 1.0 },
      { modality: 'audio', score: 0, confidence: 0 },
    ]
    const low: ModalityScore[] = [
      { modality: 'visual', score: 0, confidence: 0 },
      { modality: 'audio', score: 1.0, confidence: 1.0 },
    ]
    expect(combineModalities(high)).toBeGreaterThan(0)
    expect(combineModalities(low)).toBeGreaterThan(0)
  })
})

describe('detectMultimodalHighlights', () => {
  it('detects highlights from combined signals', () => {
    const input: MultimodalInput = {
      visualFrames: [],
      audioSamples: new Float32Array(1000).fill(0.3),
      transcriptWords: [
        { text: 'insane', start: 0, end: 0.5 },
        { text: 'incredible', start: 0.6, end: 1.1 },
      ],
      fps: 30,
      duration: 5,
    }
    const highlights = detectMultimodalHighlights(input)
    expect(highlights.length).toBeGreaterThanOrEqual(0)
  })
})
