import { describe, it, expect } from 'vitest'
import {
  interpolateKeyframes,
  createKeyframe,
  resolveLayerProperties,
  resolveTransform,
  ANIMATION_PRESETS,
  DEFAULT_TRANSFORM,
  type Keyframe,
  type AnimatedProperty,
  type KeyframedLayer,
} from './keyframe'

describe('interpolateKeyframes', () => {
  it('returns default when no keyframes', () => {
    expect(interpolateKeyframes([], 0, 42)).toBe(42)
  })

  it('returns single keyframe value', () => {
    const kfs = [createKeyframe(0, 100)]
    expect(interpolateKeyframes(kfs, 5, 0)).toBe(100)
  })

  it('linearly interpolates between two keyframes', () => {
    const kfs: Keyframe[] = [
      { id: '1', time: 0, value: 0, interpolation: 'linear' },
      { id: '2', time: 1, value: 100, interpolation: 'linear' },
    ]
    expect(interpolateKeyframes(kfs, 0, 0)).toBe(0)
    expect(interpolateKeyframes(kfs, 0.5, 0)).toBe(50)
    expect(interpolateKeyframes(kfs, 1, 0)).toBe(100)
  })

  it('clamps before first keyframe', () => {
    const kfs = [createKeyframe(1, 50)]
    expect(interpolateKeyframes(kfs, 0, 0)).toBe(50)
  })

  it('clamps after last keyframe', () => {
    const kfs = [createKeyframe(0, 50)]
    expect(interpolateKeyframes(kfs, 10, 0)).toBe(50)
  })
})

describe('resolveLayerProperties', () => {
  it('returns default values when no keyframes', () => {
    const layer: KeyframedLayer = {
      id: '1', name: 'test', startTime: 0, endTime: 10,
      properties: {
        x: { name: 'x', keyframes: [], defaultValue: 50, min: -100, max: 100 },
        opacity: { name: 'opacity', keyframes: [], defaultValue: 0.7, min: 0, max: 1 },
      },
    }
    const props = resolveLayerProperties(layer, 5)
    expect(props.x).toBe(50)
    expect(props.opacity).toBe(0.7)
  })
})

describe('resolveTransform', () => {
  it('returns default transform when no keyframes', () => {
    const layer: KeyframedLayer = {
      id: '1', name: 'test', startTime: 0, endTime: 10,
      properties: {},
    }
    const t = resolveTransform(layer, 5)
    expect(t).toEqual(DEFAULT_TRANSFORM)
  })
})

describe('ANIMATION_PRESETS', () => {
  it('has fade-in preset', () => {
    const props = ANIMATION_PRESETS['fade-in'](1)
    expect(props.opacity).toBeDefined()
    expect(props.opacity.keyframes.length).toBe(2)
  })

  it('has scale-pop preset', () => {
    const props = ANIMATION_PRESETS['scale-pop'](0.5)
    expect(props.scale).toBeDefined()
    expect(props.opacity).toBeDefined()
  })

  it('all presets produce valid properties', () => {
    for (const [name, fn] of Object.entries(ANIMATION_PRESETS)) {
      const props = fn(1)
      expect(Object.keys(props).length).toBeGreaterThan(0)
      for (const prop of Object.values(props)) {
        expect(prop.keyframes.length).toBeGreaterThan(0)
      }
    }
  })
})
