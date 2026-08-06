/**
 * Advanced Text-Based Video Editing — Based on FunClip's proc() algorithm.
 * Maps text selections to video timestamps via substring matching + token indexing.
 * Supports speaker-filtered clipping and fuzzy matching.
 */

import type { WordTimestamp } from './transcript'

export interface SpeakerSegment {
  speakerId: string
  start: number
  end: number
  confidence?: number
}

export interface TextMatchOptions {
  startOffset?: number
  endOffset?: number
  fuzzyTolerance?: number
  caseSensitive?: boolean
}

// ═══════════════════════════════════════════════════════════════
// TEXT NORMALIZATION (FunClip-inspired)
// ═══════════════════════════════════════════════════════════════

const PUNCTUATION_REGEX = /[.,\-!?:;"'()\[\]{}—–…\/\\]/g
const UNICODE_MAP: Record<string, string> = { 'é': 'e', 'è': 'e', 'ê': 'e', 'ë': 'e', 'à': 'a', 'â': 'a', 'ù': 'u', 'û': 'u', 'î': 'i', 'ï': 'i', 'ô': 'o', 'ç': 'c', 'ñ': 'n' }

export function normalizeText(text: string): string {
  let normalized = text.toLowerCase()
  // Strip punctuation
  normalized = normalized.replace(PUNCTUATION_REGEX, '')
  // Normalize unicode (decompose + strip combining marks)
  normalized = normalized.normalize('NFD').replace(/[\u0300-\u036f]/g, '')
  // Collapse whitespace
  normalized = normalized.replace(/\s+/g, ' ').trim()
  return normalized
}

// ═══════════════════════════════════════════════════════════════
// TOKEN INDEX (FunClip space-counting approach)
// ═══════════════════════════════════════════════════════════════

/**
 * Builds a map from character position → token (word) index.
 * FunClip counts spaces to find token position from character index.
 * Returns a plain object for easy bracket access.
 */
export function buildTokenIndex(words: string[]): Record<number, number> {
  const index: Record<number, number> = {}
  let charPos = 0
  for (let i = 0; i < words.length; i++) {
    for (let j = 0; j < words[i].length; j++) {
      index[charPos] = i
      charPos++
    }
    // Account for space between words
    if (i < words.length - 1) {
      index[charPos] = i + 1 // Space belongs to next token boundary
      charPos++
    }
  }
  return index
}

// ═══════════════════════════════════════════════════════════════
// TEXT → TIMESTAMP MAPPING (Core FunClip algorithm)
// ═══════════════════════════════════════════════════════════════

/**
 * Maps user-selected text to video timestamps by matching against word transcript.
 * FunClip core: substring search → token index via space counting → timestamp lookup.
 */
export function procTextToTimestamps(
  searchText: string,
  words: WordTimestamp[],
): Array<{ start: number; end: number }> {
  if (!searchText || words.length === 0) return []

  const normalizedSearch = normalizeText(searchText)
  if (!normalizedSearch) return []

  // Build searchable text from words
  const wordTexts = words.map(w => normalizeText(w.word))
  const joinedText = wordTexts.join(' ')

  const results: Array<{ start: number; end: number }> = []
  let offset = 0

  while (true) {
    const foundIdx = joinedText.indexOf(normalizedSearch, offset)
    if (foundIdx === -1) break

    // Map character position to token index
    const searchLen = normalizedSearch.length
    const startToken = countTokensBefore(joinedText, foundIdx)
    const endToken = countTokensBefore(joinedText, foundIdx + searchLen - 1)

    if (startToken < words.length && endToken < words.length) {
      results.push({
        start: words[startToken].start,
        end: words[Math.min(endToken, words.length - 1)].end,
      })
    }

    offset = foundIdx + 1
  }

  return results
}

function countTokensBefore(text: string, charIdx: number): number {
  let count = 0
  for (let i = 0; i <= charIdx && i < text.length; i++) {
    if (i === 0 || text[i - 1] === ' ') count++
  }
  return Math.max(0, count - 1)
}

/**
 * Advanced text matching with offset and fuzzy tolerance.
 * Based on FunClip's proc() with extensions for our use case.
 */
export function matchTextToTimestampsAdvanced(
  searchText: string,
  words: WordTimestamp[],
  options: TextMatchOptions = {},
): Array<{ start: number; end: number }> {
  const { startOffset = 0, endOffset = 0, fuzzyTolerance = 0 } = options

  let results = procTextToTimestamps(searchText, words)

  // Apply fuzzy matching if no exact match found
  if (results.length === 0 && fuzzyTolerance > 0) {
    results = fuzzyMatch(searchText, words, fuzzyTolerance)
  }

  // Apply offsets
  if (startOffset !== 0 || endOffset !== 0) {
    results = results.map(r => ({
      start: Math.max(0, r.start + startOffset),
      end: r.end + endOffset,
    }))
  }

  return results
}

function fuzzyMatch(
  searchText: string,
  words: WordTimestamp[],
  tolerance: number,
): Array<{ start: number; end: number }> {
  const searchTokens = normalizeText(searchText).split(' ')
  if (searchTokens.length === 0) return []

  const wordTexts = words.map(w => normalizeText(w.word))
  const results: Array<{ start: number; end: number }> = []

  // Sliding window with tolerance
  for (let i = 0; i <= wordTexts.length - searchTokens.length; i++) {
    let matchCount = 0
    for (let j = 0; j < searchTokens.length; j++) {
      const similarity = computeSimilarity(wordTexts[i + j], searchTokens[j])
      if (similarity >= (1 - tolerance)) matchCount++
    }
    if (matchCount >= searchTokens.length * (1 - tolerance)) {
      results.push({
        start: words[i].start,
        end: words[i + searchTokens.length - 1].end,
      })
    }
  }

  return results
}

function computeSimilarity(a: string, b: string): number {
  if (a === b) return 1
  if (a.length === 0 || b.length === 0) return 0
  // Levenshtein-based similarity
  const maxLen = Math.max(a.length, b.length)
  const dist = levenshteinDistance(a, b)
  return 1 - dist / maxLen
}

function levenshteinDistance(a: string, b: string): number {
  const m = a.length, n = b.length
  const dp: number[][] = Array.from({ length: m + 1 }, () => new Array(n + 1).fill(0))
  for (let i = 0; i <= m; i++) dp[i][0] = i
  for (let j = 0; j <= n; j++) dp[0][j] = j
  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      dp[i][j] = a[i - 1] === b[j - 1]
        ? dp[i - 1][j - 1]
        : 1 + Math.min(dp[i - 1][j], dp[i][j - 1], dp[i - 1][j - 1])
    }
  }
  return dp[m][n]
}

// ═══════════════════════════════════════════════════════════════
// SPEAKER OVERLAP COMPUTATION
// ═══════════════════════════════════════════════════════════════

/**
 * Computes total overlap duration between speaker segments.
 * Used to detect when speakers talk over each other.
 */
export function computeSpeakerOverlap(segments: SpeakerSegment[]): number {
  if (segments.length < 2) return 0

  let totalOverlap = 0
  for (let i = 0; i < segments.length; i++) {
    for (let j = i + 1; j < segments.length; j++) {
      if (segments[i].speakerId !== segments[j].speakerId) {
        const overlapStart = Math.max(segments[i].start, segments[j].start)
        const overlapEnd = Math.min(segments[i].end, segments[j].end)
        if (overlapEnd > overlapStart) {
          totalOverlap += overlapEnd - overlapStart
        }
      }
    }
  }

  return totalOverlap
}
