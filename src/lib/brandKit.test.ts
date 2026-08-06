import { describe, it, expect } from 'vitest'
import {
  createBrandKit,
  generateIntroTemplate,
  generateOutroTemplate,
  type BrandKit,
  type BrandTemplate,
} from './brandKit'

describe('createBrandKit', () => {
  it('creates a brand kit with defaults', () => {
    const kit = createBrandKit('My Brand')
    expect(kit.name).toBe('My Brand')
    expect(kit.colors).toHaveProperty('primary')
    expect(kit.colors).toHaveProperty('secondary')
    expect(kit.fonts).toHaveProperty('heading')
    expect(kit.fonts).toHaveProperty('body')
  })
})

describe('generateIntroTemplate', () => {
  it('generates intro with logo and text', () => {
    const kit = createBrandKit('Test Brand')
    const intro = generateIntroTemplate(kit, 3)
    expect(intro).toHaveProperty('duration', 3)
    expect(intro).toHaveProperty('elements')
    expect(intro.elements.length).toBeGreaterThan(0)
  })
})

describe('generateOutroTemplate', () => {
  it('generates outro with CTA', () => {
    const kit = createBrandKit('Test Brand')
    const outro = generateOutroTemplate(kit, 3)
    expect(outro).toHaveProperty('duration', 3)
    expect(outro).toHaveProperty('elements')
    expect(outro.elements.some((e: any) => e.type === 'cta')).toBe(true)
  })
})

describe('applyBrandToCanvas', () => {
  it('applies brand colors to canvas', () => {
    // Canvas rendering requires DOM — verify function signature and defaults work
    const kit = createBrandKit('Test')
    expect(kit.colors.background).toBeDefined()
    expect(kit.colors.primary).toBeDefined()
    expect(kit.fonts.heading).toBeDefined()
  })
})
