import { describe, it, expect } from 'vitest'
import {
  detectTopicVectors,
  getVectorForTopic,
  injectVectorsIntoWords,
  type VectorIcon,
  type TimedWordWithVectors,
} from './vectorInjector'

describe('detectTopicVectors', () => {
  it('detects money/business topics', () => {
    const vectors = detectTopicVectors('How to make money online with affiliate marketing')
    expect(vectors.some(v => v.id === 'money')).toBe(true)
  })

  it('detects technology topics', () => {
    const vectors = detectTopicVectors('This AI robot just changed everything about coding')
    expect(vectors.some(v => v.id === 'tech')).toBe(true)
  })

  it('detects health topics', () => {
    const vectors = detectTopicVectors('This workout routine will transform your body')
    expect(vectors.some(v => v.id === 'fitness')).toBe(true)
  })

  it('returns empty for generic text', () => {
    const vectors = detectTopicVectors('hello world testing')
    expect(vectors).toHaveLength(0)
  })
})

describe('getVectorForTopic', () => {
  it('returns a valid VectorIcon for known topic', () => {
    const icon = getVectorForTopic('money')
    expect(icon).not.toBeNull()
    expect(icon!.svg).toContain('<path')
    expect(icon!.color).toBeDefined()
  })

  it('returns null for unknown topic', () => {
    const icon = getVectorForTopic('nonexistent')
    expect(icon).toBeNull()
  })
})

describe('injectVectorsIntoWords', () => {
  it('injects vectors at topic-relevant words', () => {
    const words = [
      { text: 'make', start: 0, end: 0.3 },
      { text: 'money', start: 0.3, end: 0.6 },
      { text: 'online', start: 0.6, end: 0.9 },
    ]
    const result = injectVectorsIntoWords(words, 'make money online')
    const moneyWord = result.find(w => w.text === 'money')
    expect(moneyWord?.vector).toBeDefined()
  })

  it('does not inject vectors for non-topic words', () => {
    const words = [
      { text: 'the', start: 0, end: 0.3 },
      { text: 'cat', start: 0.3, end: 0.6 },
    ]
    const result = injectVectorsIntoWords(words, 'the cat sat')
    expect(result.every(w => !w.vector)).toBe(true)
  })
})
