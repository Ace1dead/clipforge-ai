import { describe, it, expect } from 'vitest'
import {
  computeRMS,
  computePeak,
  computeCrestFactor,
  energyBasedVAD,
} from './streamAnalyzer'

describe('computeRMS', () => {
  it('returns 0 for empty array', () => {
    expect(computeRMS(new Float32Array([]))).toBe(0)
  })

  it('computes root mean square', () => {
    const samples = new Float32Array([0.5, -0.5, 0.5, -0.5])
    const rms = computeRMS(samples)
    expect(rms).toBeCloseTo(0.5, 2)
  })

  it('returns higher RMS for louder signal', () => {
    const quiet = new Float32Array([0.1, -0.1, 0.1, -0.1])
    const loud = new Float32Array([0.9, -0.9, 0.9, -0.9])
    expect(computeRMS(loud)).toBeGreaterThan(computeRMS(quiet))
  })
})

describe('computePeak', () => {
  it('returns 0 for empty array', () => {
    expect(computePeak(new Float32Array([]))).toBe(0)
  })

  it('returns maximum absolute value', () => {
    const samples = new Float32Array([0.3, -0.8, 0.5])
    expect(computePeak(samples)).toBeCloseTo(0.8, 2)
  })
})

describe('computeCrestFactor', () => {
  it('returns 0 when rms is 0', () => {
    expect(computeCrestFactor(1.0, 0)).toBe(0)
  })

  it('computes peak/rms ratio', () => {
    expect(computeCrestFactor(1.0, 0.5)).toBeCloseTo(2.0, 2)
  })
})

describe('energyBasedVAD', () => {
  it('detects voice when RMS above threshold', () => {
    const rms = [0.01, 0.01, 0.1, 0.01, 0.01]
    const vad = energyBasedVAD(rms, 1.0)
    expect(vad[2]).toBe(true)
    expect(vad[0]).toBe(false)
  })

  it('returns empty for empty input', () => {
    expect(energyBasedVAD([])).toHaveLength(0)
  })

  it('returns all false for uniform low RMS', () => {
    const rms = [0.01, 0.01, 0.01]
    const vad = energyBasedVAD(rms, 1.0)
    expect(vad.every(v => v === false)).toBe(true)
  })
})
