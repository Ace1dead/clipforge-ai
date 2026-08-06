import { describe, it, expect } from 'vitest'
import {
  translateText,
  detectLanguage,
  generateDubScript,
  getSupportedLanguages,
  type DubRequest,
} from './multiLanguageDubbing'

describe('detectLanguage', () => {
  it('detects English', () => {
    expect(detectLanguage('Hello world this is English')).toBe('en')
  })

  it('detects Spanish', () => {
    expect(detectLanguage('Hola mundo esto es español')).toBe('es')
  })

  it('detects French', () => {
    expect(detectLanguage('Bonjour le monde ceci est français')).toBe('fr')
  })
})

describe('getSupportedLanguages', () => {
  it('returns 26+ languages', () => {
    const langs = getSupportedLanguages()
    expect(langs.length).toBeGreaterThanOrEqual(26)
  })

  it('includes major languages', () => {
    const langs = getSupportedLanguages()
    const codes = langs.map(l => l.code)
    expect(codes).toContain('en')
    expect(codes).toContain('es')
    expect(codes).toContain('zh')
    expect(codes).toContain('hi')
    expect(codes).toContain('ar')
  })
})

describe('generateDubScript', () => {
  it('generates dubbing script with timestamps', () => {
    const words = [
      { text: 'Hello', start: 0, end: 0.3 },
      { text: 'beautiful', start: 0.4, end: 0.8 },
      { text: 'world', start: 3.0, end: 3.4 },
      { text: 'today', start: 3.5, end: 3.9 },
    ]
    const script = generateDubScript(words, 'es')
    expect(script.length).toBeGreaterThanOrEqual(1)
    expect(script[0]).toHaveProperty('original')
    expect(script[0]).toHaveProperty('translated')
    expect(script[0]).toHaveProperty('start')
    expect(script[0]).toHaveProperty('end')
  })
})
