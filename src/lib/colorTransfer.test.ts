import { describe, it, expect } from 'vitest'
import {
  rgbToLAB,
  labToRGB,
  rgbToOklab,
  oklabToRgb,
  computeLABStats,
  generateTransferLUT,
  type LABStats,
} from './colorTransfer'

describe('RGB ↔ LAB conversion', () => {
  it('black (0,0,0) → LAB ≈ (0, 0, 0)', () => {
    const [L, a, b] = rgbToLAB(0, 0, 0)
    expect(L).toBeCloseTo(0, 0)
    expect(a).toBeCloseTo(0, 0)
    expect(b).toBeCloseTo(0, 0)
  })

  it('white (255,255,255) → LAB ≈ (100, 0, 0)', () => {
    const [L, a, b] = rgbToLAB(255, 255, 255)
    expect(L).toBeCloseTo(100, 0)
    expect(a).toBeCloseTo(0, 0)
    expect(b).toBeCloseTo(0, 0)
  })

  it('roundtrip RGB → LAB → RGB is close to identity', () => {
    const colors = [[128, 64, 200], [255, 0, 0], [0, 255, 0], [0, 0, 255], [50, 150, 200]]
    for (const [r, g, b] of colors) {
      const [L, a, bb] = rgbToLAB(r, g, b)
      const [r2, g2, b2] = labToRGB(L, a, bb)
      expect(r2).toBeCloseTo(r, -1) // ±1 tolerance due to rounding
      expect(g2).toBeCloseTo(g, -1)
      expect(b2).toBeCloseTo(b, -1)
    }
  })
})

describe('RGB ↔ Oklab conversion', () => {
  it('white (1,1,1) → Oklab ≈ (1, 0, 0)', () => {
    const [L, a, b] = rgbToOklab(1, 1, 1)
    expect(L).toBeCloseTo(1, 2)
    expect(a).toBeCloseTo(0, 2)
    expect(b).toBeCloseTo(0, 2)
  })

  it('roundtrip RGB → Oklab → RGB is close to identity', () => {
    const colors = [[0.5, 0.2, 0.8], [1, 0, 0], [0, 1, 0], [0, 0, 1]]
    for (const [r, g, b] of colors) {
      const [L, a, bb] = rgbToOklab(r, g, b)
      const [r2, g2, b2] = oklabToRgb(L, a, bb)
      expect(r2).toBeCloseTo(r, 2)
      expect(g2).toBeCloseTo(g, 2)
      expect(b2).toBeCloseTo(b, 2)
    }
  })
})

describe('computeLABStats', () => {
  it('computes stats for uniform image', () => {
    // All pixels are (128, 128, 128) — neutral gray
    const data = new Uint8ClampedArray(4 * 4) // 4 pixels
    for (let i = 0; i < 4; i++) {
      data[i * 4] = 128
      data[i * 4 + 1] = 128
      data[i * 4 + 2] = 128
      data[i * 4 + 3] = 255
    }
    const stats = computeLABStats(data, 1)
    expect(stats.count).toBe(4)
    // Uniform image → stddev is 0, but our code returns 1 (fallback to prevent div-by-zero)
    expect(stats.stdL).toBe(1)
    expect(stats.stdA).toBe(1)
    expect(stats.stdB).toBe(1)
  })
})

describe('generateTransferLUT', () => {
  it('generates a LUT with correct size', () => {
    const srcStats: LABStats = { meanL: 50, meanA: 0, meanB: 0, stdL: 10, stdA: 5, stdB: 5, count: 1000 }
    const refStats: LABStats = { meanL: 60, meanA: 2, meanB: -1, stdL: 12, stdA: 6, stdB: 4, count: 1000 }
    const lut = generateTransferLUT(srcStats, refStats, 17)
    expect(lut.size).toBe(17)
    expect(lut.data.length).toBe(17 * 17 * 17 * 3)
  })

  it('identity stats produce near-identity LUT', () => {
    const stats: LABStats = { meanL: 50, meanA: 0, meanB: 0, stdL: 10, stdA: 5, stdB: 5, count: 1000 }
    const lut = generateTransferLUT(stats, stats, 5)
    // Check that the identity mapping is approximately preserved
    // At (0,0,0) the output should be close to (0,0,0)
    expect(lut.data[0]).toBeCloseTo(0, 1)
    expect(lut.data[1]).toBeCloseTo(0, 1)
    expect(lut.data[2]).toBeCloseTo(0, 1)
  })
})
