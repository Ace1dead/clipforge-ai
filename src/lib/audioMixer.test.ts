import { describe, it, expect } from 'vitest'
import { calculateDucking, getFadeGain, createMixerState, createAudioTrack, type DuckingConfig } from './audioMixer'

describe('calculateDucking', () => {
  it('returns 1 when ducking disabled', () => {
    const config: DuckingConfig = {
      enabled: false, sourceTrackId: '', targetTrackId: '',
      threshold: -20, ratio: 4, attack: 10, release: 200, duckAmount: 6,
    }
    expect(calculateDucking(0.5, config)).toBe(1)
  })

  it('reduces gain when source exceeds threshold', () => {
    const config: DuckingConfig = {
      enabled: true, sourceTrackId: 's1', targetTrackId: 't1',
      threshold: -20, ratio: 4, attack: 10, release: 200, duckAmount: 6,
    }
    const gain = calculateDucking(0.5, config) // ~-6dB source
    expect(gain).toBeLessThan(1)
    expect(gain).toBeGreaterThan(0)
  })

  it('does not duck when source below threshold', () => {
    const config: DuckingConfig = {
      enabled: true, sourceTrackId: 's1', targetTrackId: 't1',
      threshold: -6, ratio: 4, attack: 10, release: 200, duckAmount: 6,
    }
    expect(calculateDucking(0.01, config)).toBe(1) // very quiet
  })
})

describe('getFadeGain', () => {
  it('returns 1 when no fades', () => {
    expect(getFadeGain(5, 0, 10, 0, 0, 'linear', 'linear')).toBe(1)
  })

  it('fades in during fade period', () => {
    const gain = getFadeGain(0.5, 0, 10, 1, 0, 'linear', 'linear')
    expect(gain).toBeCloseTo(0.5, 1)
  })

  it('fades out during fade period', () => {
    const gain = getFadeGain(9.5, 0, 10, 0, 1, 'linear', 'linear')
    expect(gain).toBeCloseTo(0.5, 1)
  })
})

describe('createMixerState', () => {
  it('creates empty mixer', () => {
    const state = createMixerState()
    expect(state.tracks.length).toBe(0)
    expect(state.masterVolume).toBe(1)
  })
})

describe('createAudioTrack', () => {
  it('creates track with defaults', () => {
    const track = createAudioTrack('Music')
    expect(track.name).toBe('Music')
    expect(track.volume).toBe(1)
    expect(track.muted).toBe(false)
  })
})
