import { describe, it, expect } from 'vitest'
import {
  generateIdentityLUT,
  exportCubeLUT,
  parseCubeLUT,
  cubeToLUT3D,
  composeLUTs,
  type LUT3D,
} from './lutGenerator'

describe('generateIdentityLUT', () => {
  it('generates a LUT with correct size', () => {
    const lut = generateIdentityLUT(3)
    expect(lut.size).toBe(3)
    expect(lut.data.length).toBe(3 * 3 * 3 * 3) // size^3 * 3 channels
  })

  it('identity mapping: input equals output', () => {
    const lut = generateIdentityLUT(5)
    // Corner: (0,0,0) should map to (0,0,0)
    expect(lut.data[0]).toBe(0)
    expect(lut.data[1]).toBe(0)
    expect(lut.data[2]).toBe(0)

    // Corner: (1,1,1) should map to (1,1,1)
    const last = (5 * 5 * 5 - 1) * 3
    expect(lut.data[last]).toBeCloseTo(1, 5)
    expect(lut.data[last + 1]).toBeCloseTo(1, 5)
    expect(lut.data[last + 2]).toBeCloseTo(1, 5)
  })

  it('generates 33x33x33 LUT (standard size)', () => {
    const lut = generateIdentityLUT(33)
    expect(lut.size).toBe(33)
    expect(lut.data.length).toBe(33 * 33 * 33 * 3)
  })
})

describe('exportCubeLUT', () => {
  it('exports a valid .cube file header', () => {
    const lut = generateIdentityLUT(3)
    const cube = exportCubeLUT(lut, 'Test LUT')
    expect(cube).toContain('TITLE "Test LUT"')
    expect(cube).toContain('LUT_3D_SIZE 3')
    expect(cube).toContain('DOMAIN_MIN 0.0 0.0 0.0')
    expect(cube).toContain('DOMAIN_MAX 1.0 1.0 1.0')
  })

  it('exports correct number of data lines', () => {
    const lut = generateIdentityLUT(3)
    const cube = exportCubeLUT(lut)
    const lines = cube.split('\n').filter(l => l.trim() && !l.startsWith('TITLE') && !l.startsWith('LUT_') && !l.startsWith('DOMAIN'))
    expect(lines.length).toBe(3 * 3 * 3)
  })

  it('data lines have 3 floats', () => {
    const lut = generateIdentityLUT(3)
    const cube = exportCubeLUT(lut)
    const dataLines = cube.split('\n').filter(l => /^[\d.\-]/.test(l.trim()))
    for (const line of dataLines) {
      const parts = line.trim().split(/\s+/).map(Number)
      expect(parts.length).toBe(3)
      expect(parts.every(p => !isNaN(p))).toBe(true)
    }
  })
})

describe('parseCubeLUT', () => {
  it('parses a simple .cube file', () => {
    const lut = generateIdentityLUT(2)
    const cubeStr = exportCubeLUT(lut, 'Parse Test')
    const parsed = parseCubeLUT(cubeStr)
    expect(parsed.title).toBe('Parse Test')
    expect(parsed.size).toBe(2)
    expect(parsed.data.length).toBe(2 * 2 * 2 * 3)
  })

  it('roundtrip: export → parse → data matches', () => {
    const original = generateIdentityLUT(3)
    const cubeStr = exportCubeLUT(original, 'Roundtrip')
    const parsed = parseCubeLUT(cubeStr)
    const restored = cubeToLUT3D(parsed)

    expect(restored.size).toBe(3)
    for (let i = 0; i < original.data.length; i++) {
      expect(restored.data[i]).toBeCloseTo(original.data[i], 4)
    }
  })

  it('throws on empty/invalid input', () => {
    expect(() => parseCubeLUT('')).toThrow()
  })
})

describe('composeLUTs', () => {
  it('composing identity with identity returns identity', () => {
    const id = generateIdentityLUT(3)
    const composed = composeLUTs(id, id)
    expect(composed.size).toBe(3)
    // Should be close to identity
    for (let i = 0; i < composed.data.length; i++) {
      expect(composed.data[i]).toBeCloseTo(id.data[i], 3)
    }
  })

  it('throws on mismatched sizes', () => {
    const a = generateIdentityLUT(3)
    const b = generateIdentityLUT(5)
    expect(() => composeLUTs(a, b)).toThrow()
  })
})
