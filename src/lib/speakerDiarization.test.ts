import { describe, it, expect } from 'vitest'
import {
  assignSpeakerColors,
  detectSpeakerChanges,
  computeSpeakerDominance,
  mergeSpeakerSegments,
  type SpeakerSegment,
  type SpeakerColorMap,
} from './speakerDiarization'

describe('assignSpeakerColors', () => {
  it('assigns distinct colors to each speaker', () => {
    const segments: SpeakerSegment[] = [
      { speakerId: 'spk0', start: 0, end: 3, confidence: 0.9 },
      { speakerId: 'spk1', start: 3, end: 6, confidence: 0.85 },
      { speakerId: 'spk0', start: 6, end: 9, confidence: 0.92 },
    ]
    const colors = assignSpeakerColors(segments)
    expect(Object.keys(colors)).toHaveLength(2)
    expect(colors['spk0']).toBeDefined()
    expect(colors['spk1']).toBeDefined()
    expect(colors['spk0']).not.toBe(colors['spk1'])
  })

  it('returns empty map for empty input', () => {
    const colors = assignSpeakerColors([])
    expect(Object.keys(colors)).toHaveLength(0)
  })

  it('assigns max 8 distinct colors then cycles', () => {
    const segments: SpeakerSegment[] = Array.from({ length: 10 }, (_, i) => ({
      speakerId: `spk${i}`,
      start: i,
      end: i + 1,
      confidence: 0.9,
    }))
    const colors = assignSpeakerColors(segments)
    expect(Object.keys(colors)).toHaveLength(10)
    // Colors 0-7 are distinct, 8+ cycle
    expect(colors['spk0']).not.toBe(colors['spk8'])
  })
})

describe('detectSpeakerChanges', () => {
  it('detects speaker transitions', () => {
    const segments: SpeakerSegment[] = [
      { speakerId: 'spk0', start: 0, end: 3, confidence: 0.9 },
      { speakerId: 'spk1', start: 3, end: 6, confidence: 0.85 },
      { speakerId: 'spk0', start: 6, end: 9, confidence: 0.92 },
    ]
    const changes = detectSpeakerChanges(segments)
    expect(changes).toHaveLength(2)
    expect(changes[0].from).toBe('spk0')
    expect(changes[0].to).toBe('spk1')
    expect(changes[0].time).toBeCloseTo(3, 1)
  })

  it('returns empty for single speaker', () => {
    const segments: SpeakerSegment[] = [
      { speakerId: 'spk0', start: 0, end: 5, confidence: 0.9 },
      { speakerId: 'spk0', start: 5, end: 10, confidence: 0.88 },
    ]
    const changes = detectSpeakerChanges(segments)
    expect(changes).toHaveLength(0)
  })
})

describe('computeSpeakerDominance', () => {
  it('calculates time dominance per speaker', () => {
    const segments: SpeakerSegment[] = [
      { speakerId: 'spk0', start: 0, end: 6, confidence: 0.9 },
      { speakerId: 'spk1', start: 6, end: 10, confidence: 0.85 },
    ]
    const dominance = computeSpeakerDominance(segments)
    expect(dominance['spk0']).toBeCloseTo(0.6, 1)
    expect(dominance['spk1']).toBeCloseTo(0.4, 1)
  })
})

describe('mergeSpeakerSegments', () => {
  it('merges adjacent same-speaker segments', () => {
    const segments: SpeakerSegment[] = [
      { speakerId: 'spk0', start: 0, end: 3, confidence: 0.9 },
      { speakerId: 'spk0', start: 3, end: 5, confidence: 0.88 },
      { speakerId: 'spk1', start: 5, end: 8, confidence: 0.85 },
    ]
    const merged = mergeSpeakerSegments(segments)
    expect(merged).toHaveLength(2)
    expect(merged[0].end).toBeCloseTo(5, 1)
  })

  it('merges segments within gap tolerance', () => {
    const segments: SpeakerSegment[] = [
      { speakerId: 'spk0', start: 0, end: 3, confidence: 0.9 },
      { speakerId: 'spk0', start: 3.2, end: 5, confidence: 0.88 },
    ]
    const merged = mergeSpeakerSegments(segments, 0.5)
    expect(merged).toHaveLength(1)
  })
})
