import { describe, it, expect } from 'vitest'
import { ADJUSTMENT_PRESETS, createAdjustmentLayer } from './adjustmentLayer'

describe('createAdjustmentLayer', () => {
  it('creates an adjustment layer with defaults', () => {
    const layer = createAdjustmentLayer({})
    expect(layer.id).toBeTruthy()
    expect(layer.opacity).toBe(1)
    expect(layer.blendMode).toBe('normal')
  })
})

describe('ADJUSTMENT_PRESETS', () => {
  it('has at least 5 presets', () => {
    expect(Object.keys(ADJUSTMENT_PRESETS).length).toBeGreaterThanOrEqual(5)
  })

  it('all presets have colorGrade', () => {
    for (const [name, preset] of Object.entries(ADJUSTMENT_PRESETS)) {
      expect(preset.colorGrade).toBeDefined()
    }
  })
})
