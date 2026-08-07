import { describe, it, expect } from 'vitest'
import { MASK_PRESETS, type Mask } from './masking'

describe('MASK_PRESETS', () => {
  it('has center-focus preset', () => {
    expect(MASK_PRESETS['center-focus']).toBeDefined()
    expect(MASK_PRESETS['center-focus'].type).toBe('ellipse')
  })

  it('has cinematic-bars preset', () => {
    expect(MASK_PRESETS['cinematic-bars']).toBeDefined()
    expect(MASK_PRESETS['cinematic-bars']!.width).toBe(1)
  })

  it('all presets have valid types', () => {
    for (const [name, mask] of Object.entries(MASK_PRESETS)) {
      expect(['rect', 'ellipse', 'linear', 'free']).toContain(mask.type)
    }
  })
})
