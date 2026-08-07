/**
 * Tests for LUT presets — shared LUT module for compositor and UI.
 */
import { describe, it, expect } from 'vitest'
import {
  LUT_PRESETS,
  getLUTPresetById,
  getLUTById,
  getLUTsByCategory,
  getLUTCategories,
} from './lutPresets'

describe('LUT_PRESETS', () => {
  it('has at least 8 built-in presets', () => {
    expect(LUT_PRESETS.length).toBeGreaterThanOrEqual(8)
  })

  it('has identity preset', () => {
    const identity = getLUTPresetById('identity')
    expect(identity).toBeDefined()
    expect(identity!.name).toBe('None')
    expect(identity!.category).toBe('basic')
  })

  it('all presets have required fields', () => {
    for (const preset of LUT_PRESETS) {
      expect(preset.id).toBeTruthy()
      expect(preset.name).toBeTruthy()
      expect(preset.category).toBeTruthy()
      expect(preset.thumbnail).toBeTruthy()
      expect(typeof preset.generate).toBe('function')
    }
  })

  it('all presets generate valid LUTs', () => {
    for (const preset of LUT_PRESETS) {
      const lut = preset.generate()
      expect(lut.size).toBe(17)
      expect(lut.data.length).toBe(17 * 17 * 17 * 3)
      // All values should be finite
      for (let i = 0; i < lut.data.length; i++) {
        expect(Number.isFinite(lut.data[i])).toBe(true)
      }
    }
  })

  it('identity LUT maps input to output', () => {
    const lut = getLUTById('identity')!
    expect(lut).toBeDefined()
    // At index 0 (R=0, G=0, B=0), output should be (0,0,0)
    expect(lut.data[0]).toBeCloseTo(0, 1)
    expect(lut.data[1]).toBeCloseTo(0, 1)
    expect(lut.data[2]).toBeCloseTo(0, 1)
  })
})

describe('LUT lookup', () => {
  it('getLUTPresetById returns undefined for unknown ID', () => {
    expect(getLUTPresetById('nonexistent')).toBeUndefined()
  })

  it('getLUTById returns undefined for unknown ID', () => {
    expect(getLUTById('nonexistent')).toBeUndefined()
  })

  it('getLUTById returns a LUT3D for known ID', () => {
    const lut = getLUTById('teal-orange')
    expect(lut).toBeDefined()
    expect(lut!.size).toBe(17)
  })
})

describe('LUT categories', () => {
  it('getLUTsByCategory returns all for "all"', () => {
    expect(getLUTsByCategory('all').length).toBe(LUT_PRESETS.length)
  })

  it('getLUTsByCategory filters correctly', () => {
    const cinematic = getLUTsByCategory('cinematic')
    expect(cinematic.length).toBeGreaterThanOrEqual(1)
    for (const p of cinematic) {
      expect(p.category).toBe('cinematic')
    }
  })

  it('getLUTCategories returns unique categories', () => {
    const cats = getLUTCategories()
    expect(cats.length).toBeGreaterThanOrEqual(5)
    // No duplicates
    expect(new Set(cats).size).toBe(cats.length)
  })
})
