import { describe, it, expect } from 'vitest'
import { TEXT_ANIMATIONS, TEXT_STYLE_PRESETS, createDefaultTextLayer } from './textLayers'

describe('TEXT_ANIMATIONS', () => {
  it('has at least 5 animation presets', () => {
    expect(TEXT_ANIMATIONS.length).toBeGreaterThanOrEqual(5)
  })

  it('all presets have apply function', () => {
    for (const preset of TEXT_ANIMATIONS) {
      expect(typeof preset.apply).toBe('function')
    }
  })
})

describe('TEXT_STYLE_PRESETS', () => {
  it('has default preset', () => {
    expect(TEXT_STYLE_PRESETS['default']).toBeDefined()
    expect(TEXT_STYLE_PRESETS['default'].fontFamily).toBeTruthy()
  })
})

describe('createDefaultTextLayer', () => {
  it('creates a text layer with defaults', () => {
    const layer = createDefaultTextLayer()
    expect(layer.id).toBeTruthy()
    expect(layer.text).toBe('Your Text Here')
    expect(layer.fontSize).toBeGreaterThan(0)
  })

  it('applies overrides', () => {
    const layer = createDefaultTextLayer({ text: 'Hello', fontSize: 72 })
    expect(layer.text).toBe('Hello')
    expect(layer.fontSize).toBe(72)
  })
})
