import { describe, it, expect } from 'vitest'
import {
  detectKeywords,
  computeTFIDF,
  detectEmphasisWords,
  type KeywordResult,
} from './smartKeywordEmphasis'

describe('detectKeywords', () => {
  it('detects nouns and verbs as keywords', () => {
    const result = detectKeywords('The quick brown fox jumps over the lazy dog')
    expect(result.length).toBeGreaterThan(0)
    expect(result.some(k => k.word.toLowerCase() === 'fox')).toBe(true)
  })

  it('detects superlatives', () => {
    const result = detectKeywords('This is the best thing ever created')
    expect(result.some(k => k.word.toLowerCase() === 'best')).toBe(true)
  })

  it('detects numbers', () => {
    const result = detectKeywords('You need 7 steps to succeed')
    expect(result.some(k => k.word === '7')).toBe(true)
  })
})

describe('computeTFIDF', () => {
  it('scores rare words higher', () => {
    const docs = [
      'the cat sat on the mat',
      'the dog sat on the log',
      'a unique algorithmic approach',
    ]
    const scores = computeTFIDF('the unique algorithmic approach', docs)
    expect(scores.length).toBe(4)
    const uniqueScore = scores.find(s => s.word === 'unique')
    const theScore = scores.find(s => s.word === 'the')
    expect(uniqueScore!.score).toBeGreaterThan(theScore!.score)
  })
})

describe('detectEmphasisWords', () => {
  it('identifies emotional emphasis words', () => {
    const result = detectEmphasisWords('This is absolutely insane and incredible')
    expect(result.length).toBeGreaterThan(0)
    expect(result.some(k => k.word.toLowerCase() === 'insane')).toBe(true)
  })

  it('identifies action words', () => {
    const result = detectEmphasisWords('Stop doing this immediately')
    expect(result.some(k => k.word.toLowerCase() === 'stop')).toBe(true)
  })
})
