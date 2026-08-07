import { describe, it, expect } from 'vitest'
import {
  ANIMATION_PRESETS,
  ANIMATION_CATEGORIES,
  getAnimationsByCategory,
  createDefaultAnimation,
  getAnimationState,
  animationToCSS,
  type AnimationType,
} from './animations'

describe('ANIMATION_PRESETS', () => {
  it('has at least 20 presets', () => {
    expect(ANIMATION_PRESETS.length).toBeGreaterThanOrEqual(20)
  })

  it('all presets have unique types', () => {
    const types = ANIMATION_PRESETS.map(a => a.type)
    expect(new Set(types).size).toBe(types.length)
  })

  it('includes fade_in and slide_left', () => {
    const types = ANIMATION_PRESETS.map(a => a.type)
    expect(types).toContain('fade_in')
    expect(types).toContain('slide_left')
  })
})

describe('ANIMATION_CATEGORIES', () => {
  it('has all, basic, slide, zoom, rotate, bounce, glitch, 3d, blur, text', () => {
    const ids = ANIMATION_CATEGORIES.map(c => c.id)
    expect(ids).toContain('all')
    expect(ids).toContain('basic')
    expect(ids).toContain('slide')
    expect(ids).toContain('text')
  })
})

describe('getAnimationsByCategory', () => {
  it('returns all for "all"', () => {
    expect(getAnimationsByCategory('all').length).toBe(ANIMATION_PRESETS.length)
  })

  it('returns slide animations', () => {
    const slides = getAnimationsByCategory('slide')
    expect(slides.length).toBeGreaterThanOrEqual(4)
    for (const a of slides) {
      expect(a.category).toBe('slide')
    }
  })
})

describe('createDefaultAnimation', () => {
  it('creates a fade_in animation with 0.5s duration', () => {
    const anim = createDefaultAnimation()
    expect(anim.type).toBe('fade_in')
    expect(anim.duration).toBe(0.5)
    expect(anim.easing).toBe('ease_out')
  })

  it('creates custom animation', () => {
    const anim = createDefaultAnimation('bounce', 1.0)
    expect(anim.type).toBe('bounce')
    expect(anim.duration).toBe(1.0)
  })
})

describe('getAnimationState', () => {
  it('returns default state for none', () => {
    const state = getAnimationState({ type: 'none', duration: 1 }, 0.5, 2)
    expect(state.opacity).toBe(1)
    expect(state.scale).toBe(1)
  })

  it('fade_in at t=0 is invisible', () => {
    const state = getAnimationState({ type: 'fade_in', duration: 1, easing: 'linear' }, 0, 2)
    expect(state.opacity).toBe(0)
  })

  it('fade_in at t=duration is fully visible', () => {
    const state = getAnimationState({ type: 'fade_in', duration: 1, easing: 'linear' }, 1, 2)
    expect(state.opacity).toBe(1)
  })

  it('slide_left moves from left to center', () => {
    const start = getAnimationState({ type: 'slide_left', duration: 1, easing: 'linear' }, 0, 2)
    const end = getAnimationState({ type: 'slide_left', duration: 1, easing: 'linear' }, 1, 2)
    expect(start.x).toBe(-1)
    expect(end.x).toBe(0)
  })

  it('zoom_in scales from 0 to 1.2', () => {
    const start = getAnimationState({ type: 'zoom_in', duration: 1, easing: 'linear' }, 0, 2)
    const end = getAnimationState({ type: 'zoom_in', duration: 1, easing: 'linear' }, 1, 2)
    expect(start.scale).toBe(0)
    expect(end.scale).toBeCloseTo(1.2, 1)
  })
})

describe('animationToCSS', () => {
  it('returns valid CSS properties', () => {
    const css = animationToCSS({ opacity: 0.5, x: 0, y: 0, scale: 1.2, rotation: 45, blur: 0, skewX: 0, skewY: 0 }, 100, 100)
    expect(css.opacity).toBe(0.5)
    expect(css.transform).toContain('rotate(45deg)')
    expect(css.transform).toContain('scale(1.2)')
  })

  it('includes blur filter when blur > 0', () => {
    const css = animationToCSS({ opacity: 1, x: 0, y: 0, scale: 1, rotation: 0, blur: 5, skewX: 0, skewY: 0 }, 100, 100)
    expect(css.filter).toBe('blur(5px)')
  })
})
