import { describe, it, expect } from 'vitest'
import { LUT_PRESETS, generateCurveLUT, DEFAULT_COLOR_GRADING } from './colorGrading'

describe('LUT_PRESETS', () => {
  it('has at least 5 presets', () => {
    expect(LUT_PRESETS.length).toBeGreaterThanOrEqual(5)
  })

  it('all presets have name and grade', () => {
    for (const preset of LUT_PRESETS) {
      expect(preset.name).toBeTruthy()
      expect(preset.grade).toBeDefined()
    }
  })
})

describe('generateCurveLUT', () => {
  it('generates a 256-entry LUT', () => {
    const lut = generateCurveLUT([{ x: 0, y: 0 }, { x: 1, y: 1 }])
    expect(lut.length).toBe(256)
  })

  it('identity curve maps input to output', () => {
    const lut = generateCurveLUT([{ x: 0, y: 0 }, { x: 1, y: 1 }])
    expect(lut[0]).toBe(0)
    expect(lut[128]).toBeCloseTo(128, 0)
    expect(lut[255]).toBe(255)
  })
})

describe('DEFAULT_COLOR_GRADING', () => {
  it('has neutral defaults', () => {
    expect(DEFAULT_COLOR_GRADING.brightness).toBe(0)
    expect(DEFAULT_COLOR_GRADING.contrast).toBe(1)
    expect(DEFAULT_COLOR_GRADING.saturation).toBe(1)
  })
})
