export interface WordTimestamp {
  word: string
  start: number
  end: number
  speaker?: string
}

export interface TranscriptSegment {
  text: string
  start: number
  end: number
  words: WordTimestamp[]
  speaker?: string
}

export interface Transcript {
  fullText: string
  segments: TranscriptSegment[]
  words: WordTimestamp[]
  language: string
  duration: number
}

export interface ClipRange {
  start: number
  end: number
}

const PUNCTUATION = /[,.\-!?:;"'()\[\]{}—–…\/\\]/g

function stripPunctuation(text: string): string {
  return text.replace(PUNCTUATION, '')
}

function tokenize(text: string): string[] {
  return stripPunctuation(text).split(/\s+/).filter(Boolean)
}

function buildSpaceIndex(text: string): number[] {
  const indices: number[] = []
  for (let i = 0; i < text.length; i++) {
    if (text[i] === ' ') indices.push(i)
  }
  return indices
}

export function matchTextToTimestamps(
  transcript: Transcript,
  searchText: string,
): ClipRange[] {
  const normalizedSearch = stripPunctuation(searchText).toLowerCase()
  if (!normalizedSearch) return []

  const words = transcript.words
  if (words.length === 0) return []

  const results: ClipRange[] = []
  const searchTokens = tokenize(searchText)
  if (searchTokens.length === 0) return []

  const wordTexts = words.map(w => stripPunctuation(w.word).toLowerCase())

  for (let i = 0; i <= wordTexts.length - searchTokens.length; i++) {
    let match = true
    for (let j = 0; j < searchTokens.length; j++) {
      if (wordTexts[i + j] !== searchTokens[j]) {
        match = false
        break
      }
    }
    if (match) {
      results.push({
        start: words[i].start,
        end: words[i + searchTokens.length - 1].end,
      })
    }
  }

  return results
}

export function selectTranscriptRange(
  words: WordTimestamp[],
  startIndex: number,
  endIndex: number,
): ClipRange | null {
  if (startIndex < 0 || endIndex >= words.length || startIndex > endIndex) return null
  return {
    start: words[startIndex].start,
    end: words[endIndex].end,
  }
}

export function buildTranscriptFromWords(
  words: WordTimestamp[],
  segmentGapSec = 1.5,
  language = 'en',
): Transcript {
  if (words.length === 0) {
    return { fullText: '', segments: [], words: [], language, duration: 0 }
  }

  const segments: TranscriptSegment[] = []
  let currentWords: WordTimestamp[] = [words[0]]
  let currentText = words[0].word

  for (let i = 1; i < words.length; i++) {
    const gap = words[i].start - words[i - 1].end
    if (gap > segmentGapSec) {
      segments.push({
        text: currentText.trim(),
        start: currentWords[0].start,
        end: currentWords[currentWords.length - 1].end,
        words: currentWords,
      })
      currentWords = [words[i]]
      currentText = words[i].word
    } else {
      currentWords.push(words[i])
      currentText += ' ' + words[i].word
    }
  }

  segments.push({
    text: currentText.trim(),
    start: currentWords[0].start,
    end: currentWords[currentWords.length - 1].end,
    words: currentWords,
  })

  const fullText = segments.map(s => s.text).join(' ')
  const duration = words[words.length - 1].end

  return { fullText, segments, words, language, duration }
}

export function highlightWordsInTranscript(
  words: WordTimestamp[],
  clipRange: ClipRange,
): number[] {
  const indices: number[] = []
  for (let i = 0; i < words.length; i++) {
    if (words[i].end >= clipRange.start && words[i].start <= clipRange.end) {
      indices.push(i)
    }
  }
  return indices
}

export function formatTimestamp(seconds: number): string {
  const mins = Math.floor(seconds / 60)
  const secs = Math.floor(seconds % 60)
  const ms = Math.floor((seconds % 1) * 100)
  return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}.${ms.toString().padStart(2, '0')}`
}

export function parseTimestamp(ts: string): number {
  const parts = ts.split(':')
  if (parts.length === 2) {
    const [mins, secPart] = parts
    const [secs, ms] = secPart.split('.')
    return parseInt(mins) * 60 + parseInt(secs) + (ms ? parseInt(ms) / 100 : 0)
  }
  return parseFloat(ts) || 0
}
