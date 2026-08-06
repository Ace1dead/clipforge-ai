/**
 * Smart Keyword Emphasis — AI detects important words for highlighting.
 * Opus Clip does this with ML. We do it with NLP heuristics + TF-IDF.
 */

export interface KeywordResult {
  word: string
  index: number
  score: number
  type: 'superlative' | 'emotion' | 'action' | 'number' | 'entity' | 'tfidf'
}

// ═══════════════════════════════════════════════════════════════
// KEYWORD DETECTION PATTERNS
// ═══════════════════════════════════════════════════════════════

const SUPERLATIVES = /\b(best|worst|greatest|biggest|smallest|fastest|slowest|most|least|highest|lowest|strongest|weakest|loudest|quietest|hottest|coldest|richest|poorest|oldest|youngest|smartest|dumbest|beautiful|ugliest|longest|shortest|tallest|deepest|shallowest|easiest|hardest|simplest|complex|deadliest|safest|dangerous)\b/gi

const EMOTION_WORDS = /\b(amazing|incredible|insane|unbelievable|shocking|mind-blowing|epic|legendary|crazy|wild|brilliant|genius|perfect|terrible|horrible|disaster|catastrophe|nightmare|awesome|fantastic|terrible|awful|beautiful|gorgeous|stunning|magnificent|wonderful|lovely|cute|adorable|hideous|disgusting|repulsive|fascinating|captivating|breathtaking|spectacular|magnificent|glorious|divine|heavenly|ethereal|magical|enchanted|mystical|enchanting|mesmerizing|hypnotic)\b/gi

const ACTION_WORDS = /\b(stop|start|begin|end|finish|create|destroy|build|break|fix|repair|solve|discover|invent|transform|revolutionize|change|improve|enhance|upgrade|downgrade|eliminate|remove|delete|add|insert|update|modify|convert|translate|analyze|examine|investigate|explore|research|study|learn|teach|educate|train|practice|perform|execute|implement|deploy|launch|release|publish|share|spread|grow|expand|shrink|reduce|increase|decrease|optimize|accelerate|decelerate)\b/gi

const NUMBERS = /\b(\d+(?:\.\d+)?)\b/g

const HEDGE_WORDS = /\b(maybe|perhaps|possibly|probably|likely|unlikely|might|could|would|should|may|can|will|shall|must|need|have to|got to|supposed to|going to|gonna|wanna|gotta)\b/gi

const FILLER_WORDS = /\b(um|uh|like|you know|basically|actually|literally|really|very|just|so|well|right|okay|alright|yeah|yep|nah|nope|well)\b/gi

// ═══════════════════════════════════════════════════════════════
// MAIN KEYWORD DETECTION
// ═══════════════════════════════════════════════════════════════

export function detectKeywords(text: string): KeywordResult[] {
  const words = text.split(/\s+/)
  const results: KeywordResult[] = []

  words.forEach((word, index) => {
    const clean = word.replace(/[^a-zA-Z0-9]/g, '')
    if (!clean) return

    let score = 0
    let type: KeywordResult['type'] = 'entity'

    // Superlatives (highest priority)
    if (SUPERLATIVES.test(word)) {
      score = 10
      type = 'superlative'
    }
    // Emotion words
    else if (EMOTION_WORDS.test(word)) {
      score = 8
      type = 'emotion'
    }
    // Action words
    else if (ACTION_WORDS.test(word)) {
      score = 6
      type = 'action'
    }
    // Numbers
    else if (NUMBERS.test(word)) {
      score = 7
      type = 'number'
    }
    // Skip hedges and fillers
    else if (HEDGE_WORDS.test(word) || FILLER_WORDS.test(word)) {
      score = -2
      type = 'entity'
    }
    // Regular nouns/verbs (POS-based would be better, but simple heuristic here)
    else if (clean.length >= 3) {
      score = 3
      type = 'entity'
    }

    if (score > 0) {
      results.push({ word: clean, index, score, type })
    }
  })

  return results.sort((a, b) => b.score - a.score)
}

// ═══════════════════════════════════════════════════════════════
// TF-IDF SCORING
// ═══════════════════════════════════════════════════════════════

export function computeTFIDF(
  text: string,
  documents: string[],
): Array<{ word: string; score: number }> {
  const words = text.toLowerCase().split(/\s+/)
  const docCount = documents.length

  const scores = words.map(word => {
    // Term frequency in current text
    const tf = words.filter(w => w === word).length / words.length

    // Document frequency (how many docs contain this word)
    const df = documents.filter(doc =>
      doc.toLowerCase().split(/\s+/).includes(word)
    ).length

    // IDF: higher score for rare words
    const idf = Math.log((docCount + 1) / (df + 1)) + 1

    return { word, score: tf * idf }
  })

  return scores.sort((a, b) => b.score - a.score)
}

// ═══════════════════════════════════════════════════════════════
// EMPHASIS WORD DETECTION
// ═══════════════════════════════════════════════════════════════

export function detectEmphasisWords(text: string): KeywordResult[] {
  const words = text.split(/\s+/)
  const results: KeywordResult[] = []

  words.forEach((word, index) => {
    const clean = word.replace(/[^a-zA-Z0-9]/g, '')
    if (!clean || clean.length < 3) return

    // ALL CAPS detection
    if (word === word.toUpperCase() && word.length > 2) {
      results.push({ word: clean, index, score: 9, type: 'emotion' })
      return
    }

    // Exclamation/question marks attached
    if (/[!?:]$/.test(word)) {
      results.push({ word: clean, index, score: 7, type: 'emotion' })
      return
    }

    // Repeated letters (e.g., "soooo", "nooo")
    if (/(.)\1{2,}/.test(word)) {
      results.push({ word: clean, index, score: 8, type: 'emotion' })
      return
    }

    // Strong emphasis words
    if (EMOTION_WORDS.test(word)) {
      results.push({ word: clean, index, score: 8, type: 'emotion' })
    } else if (ACTION_WORDS.test(word)) {
      results.push({ word: clean, index, score: 6, type: 'action' })
    }
  })

  return results.sort((a, b) => b.score - a.score)
}

// ═══════════════════════════════════════════════════════════════
// WORD IMPORTANCE RANKING (for caption highlighting)
// ═══════════════════════════════════════════════════════════════

export function rankWordsForHighlighting(
  words: Array<{ text: string; start: number; end: number }>,
  fullTranscript: string,
): Array<{ text: string; start: number; end: number; highlight: boolean; score: number }> {
  const allKeywords = detectKeywords(fullTranscript)
  const emphasisWords = detectEmphasisWords(fullTranscript)

  // Build lookup of keyword scores
  const scoreMap = new Map<string, number>()
  for (const kw of allKeywords) {
    scoreMap.set(kw.word.toLowerCase(), Math.max(scoreMap.get(kw.word.toLowerCase()) ?? 0, kw.score))
  }
  for (const ew of emphasisWords) {
    scoreMap.set(ew.word.toLowerCase(), Math.max(scoreMap.get(ew.word.toLowerCase()) ?? 0, ew.score))
  }

  // Rank words
  const ranked = words.map(w => {
    const clean = w.text.toLowerCase().replace(/[^a-z0-9]/g, '')
    const score = scoreMap.get(clean) ?? 0
    return { ...w, highlight: score >= 6, score }
  })

  // Ensure at least 20% of words are highlighted
  const sorted = [...ranked].sort((a, b) => b.score - a.score)
  const minHighlight = Math.max(1, Math.ceil(ranked.length * 0.2))
  for (let i = 0; i < minHighlight && i < sorted.length; i++) {
    const idx = ranked.findIndex(r => r.text === sorted[i].text && r.start === sorted[i].start)
    if (idx >= 0 && !ranked[idx].highlight) {
      ranked[idx] = { ...ranked[idx], highlight: true, score: Math.max(ranked[idx].score, 5) }
    }
  }

  return ranked
}
