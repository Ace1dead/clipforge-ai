import type { WordTimestamp, Transcript, ClipRange } from './transcript'

export interface TextEditCommand {
  type: 'delete' | 'move' | 'duplicate' | 'insert'
  wordRange: [number, number]
  targetIndex?: number
  insertText?: string
}

export interface EditSegment {
  start: number
  end: number
  keep: boolean
  label?: string
}

export interface TextEditResult {
  segments: EditSegment[]
  totalDuration: number
  removedDuration: number
  keptDuration: number
  wordCountBefore: number
  wordCountAfter: number
}

export function applyTextEdit(
  words: WordTimestamp[],
  commands: TextEditCommand[],
): WordTimestamp[] {
  let result = [...words]

  const sorted = [...commands].sort((a, b) => b.wordRange[0] - a.wordRange[0])

  for (const cmd of sorted) {
    const [start, end] = cmd.wordRange

    switch (cmd.type) {
      case 'delete': {
        result.splice(start, end - start + 1)
        break
      }
      case 'move': {
        const target = cmd.targetIndex ?? 0
        const removed = result.splice(start, end - start + 1)
        result.splice(target, 0, ...removed)
        break
      }
      case 'duplicate': {
        const segment = result.slice(start, end + 1)
        const dupes = segment.map(w => ({
          ...w,
          start: w.start,
          end: w.end,
        }))
        result.splice(end + 1, 0, ...dupes)
        break
      }
      case 'insert': {
        const newWords: WordTimestamp[] = (cmd.insertText || '').split(/\s+/).filter(Boolean).map((word, i, arr) => {
          const prevEnd = start > 0 ? result[start - 1].end : 0
          const duration = arr.length > 0 ? 0.3 : 0
          return {
            word,
            start: prevEnd + i * duration,
            end: prevEnd + (i + 1) * duration,
          }
        })
        result.splice(start, 0, ...newWords)
        break
      }
    }
  }

  return recomputeTimestamps(result)
}

function recomputeTimestamps(words: WordTimestamp[]): WordTimestamp[] {
  if (words.length === 0) return words

  const gap = 0.05
  const result: WordTimestamp[] = []
  let currentTime = 0

  for (const w of words) {
    const duration = w.end - w.start || 0.3
    result.push({
      ...w,
      start: currentTime,
      end: currentTime + duration,
    })
    currentTime += duration + gap
  }

  return result
}

export function generateEditSegments(
  words: WordTimestamp[],
  commands: TextEditCommand[],
): EditSegment[] {
  const edited = applyTextEdit(words, commands)
  const segments: EditSegment[] = []

  for (let i = 0; i < edited.length; i++) {
    const w = edited[i]
    if (segments.length > 0 && Math.abs(segments[segments.length - 1].end - w.start) < 0.1) {
      segments[segments.length - 1].end = w.end
    } else {
      segments.push({ start: w.start, end: w.end, keep: true })
    }
  }

  return segments
}

export function segmentsToClipRanges(segments: EditSegment[]): ClipRange[] {
  return segments
    .filter(s => s.keep)
    .map(s => ({ start: s.start, end: s.end }))
}

export function computeTextEditStats(
  original: WordTimestamp[],
  edited: WordTimestamp[],
  totalDuration: number,
): TextEditResult {
  const originalDuration = original.length > 0
    ? original[original.length - 1].end - original[0].start
    : 0
  const editedDuration = edited.length > 0
    ? edited[edited.length - 1].end - edited[0].start
    : 0

  return {
    segments: [],
    totalDuration: editedDuration,
    removedDuration: originalDuration - editedDuration,
    keptDuration: editedDuration,
    wordCountBefore: original.length,
    wordCountAfter: edited.length,
  }
}

export function findWordAtTime(words: WordTimestamp[], time: number): number {
  for (let i = 0; i < words.length; i++) {
    if (time >= words[i].start && time <= words[i].end) return i
  }
  for (let i = 0; i < words.length; i++) {
    if (words[i].start > time) return Math.max(0, i - 1)
  }
  return words.length - 1
}

export function findWordBySearch(words: WordTimestamp[], searchText: string): number[] {
  const normalized = searchText.toLowerCase().trim()
  if (!normalized) return []

  const results: number[] = []
  for (let i = 0; i < words.length; i++) {
    if (words[i].word.toLowerCase().includes(normalized)) {
      results.push(i)
    }
  }
  return results
}
