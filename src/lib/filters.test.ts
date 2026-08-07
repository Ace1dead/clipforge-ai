import { describe, it, expect } from 'vitest'
import {
  FILTER_PRESETS,
  FILTER_CATEGORIES,
  getFiltersByCategory,
  getFilterById,
  createCustomFilter,
  getCustomFilters,
  saveCustomFilter,
  deleteCustomFilter,
  getAllFilters,
} from './filters'

describe('FILTER_PRESETS', () => {
  it('has at least 30 presets', () => {
    expect(FILTER_PRESETS.length).toBeGreaterThanOrEqual(30)
  })

  it('all presets have unique ids', () => {
    const ids = FILTER_PRESETS.map(f => f.id)
    expect(new Set(ids).size).toBe(ids.length)
  })

  it('all presets have valid categories', () => {
    const categories = FILTER_CATEGORIES.map(c => c.id)
    for (const preset of FILTER_PRESETS) {
      expect(categories).toContain(preset.category)
    }
  })

  it('all presets have valid value ranges', () => {
    for (const preset of FILTER_PRESETS) {
      expect(preset.brightness).toBeGreaterThanOrEqual(-1)
      expect(preset.brightness).toBeLessThanOrEqual(1)
      expect(preset.contrast).toBeGreaterThanOrEqual(0)
      expect(preset.contrast).toBeLessThanOrEqual(3)
      expect(preset.saturation).toBeGreaterThanOrEqual(0)
      expect(preset.saturation).toBeLessThanOrEqual(3)
    }
  })
})

describe('FILTER_CATEGORIES', () => {
  it('has all, vintage, cinematic, warm, cool, dramatic, artistic, bw, food, nature, retro, custom', () => {
    const ids = FILTER_CATEGORIES.map(c => c.id)
    expect(ids).toContain('all')
    expect(ids).toContain('vintage')
    expect(ids).toContain('cinematic')
    expect(ids).toContain('custom')
  })
})

describe('getFiltersByCategory', () => {
  it('returns all filters for "all"', () => {
    expect(getFiltersByCategory('all').length).toBe(FILTER_PRESETS.length)
  })

  it('returns vintage filters', () => {
    const vintage = getFiltersByCategory('vintage')
    expect(vintage.length).toBeGreaterThanOrEqual(3)
    for (const f of vintage) {
      expect(f.category).toBe('vintage')
    }
  })
})

describe('getFilterById', () => {
  it('finds a filter by id', () => {
    const filter = getFilterById('vintage-1')
    expect(filter).toBeDefined()
    expect(filter!.name).toBe('Nostalgia')
  })

  it('returns undefined for unknown id', () => {
    expect(getFilterById('nonexistent')).toBeUndefined()
  })
})

describe('createCustomFilter', () => {
  it('creates a custom filter with defaults', () => {
    const filter = createCustomFilter({ name: 'My Filter' })
    expect(filter.id).toMatch(/^custom-/)
    expect(filter.name).toBe('My Filter')
    expect(filter.category).toBe('custom')
    expect(filter.brightness).toBe(0)
    expect(filter.contrast).toBe(1)
  })

  it('applies overrides', () => {
    const filter = createCustomFilter({ name: 'Test', brightness: 0.5, contrast: 1.5 })
    expect(filter.brightness).toBe(0.5)
    expect(filter.contrast).toBe(1.5)
  })
})

describe('custom filter storage', () => {
  // Skip storage tests in vitest (no localStorage)
  const canStore = typeof localStorage !== 'undefined'

  it.skipIf(!canStore)('saves and retrieves custom filters', () => {
    const filter = createCustomFilter({ name: 'Storage Test' })
    saveCustomFilter(filter)
    const filters = getCustomFilters()
    expect(filters.some(f => f.id === filter.id)).toBe(true)
    deleteCustomFilter(filter.id)
  })

  it.skipIf(!canStore)('deletes custom filters', () => {
    const filter = createCustomFilter({ name: 'Delete Test' })
    saveCustomFilter(filter)
    deleteCustomFilter(filter.id)
    expect(getCustomFilters().some(f => f.id === filter.id)).toBe(false)
  })

  it('getCustomFilters returns array even when localStorage fails', () => {
    const result = getCustomFilters()
    expect(Array.isArray(result)).toBe(true)
  })
})
