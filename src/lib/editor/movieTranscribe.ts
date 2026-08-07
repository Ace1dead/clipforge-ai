/**
 * Chunked transcription pipeline for long-form video (movies, streams, podcasts).
 *
 * Splits audio into manageable chunks, transcribes each with word-level
 * timestamps, then merges into a unified transcript with overlap deduplication.
 */

import type { WordTimestamp, TranscriptResult } from '../stt'

// ─── Types ─────────────────────────────────────────────────

export interface MovieChunk {
  index: number
  start: number   // seconds
  end: number     // seconds
}

export interface ChunkTranscript {
  words: WordTimestamp[]
  fullText: string
  language: string
  engine: TranscriptResult['engine']
}

export interface MovieTranscript {
  words: WordTimestamp[]
  fullText: string
  language: string
  totalDuration: number
  chunkCount: number
}

export interface ChunkOptions {
  chunkDurationSec?: number   // default 300 (5 min)
  overlapSec?: number         // overlap between chunks for context continuity (default 10)
}

// ─── Chunk Splitting ───────────────────────────────────────

/**
 * Split a movie's duration into overlapping chunks for transcription.
 * Each chunk is `chunkDurationSec` long. Adjacent chunks overlap by `overlapSec`
 * so that words near chunk boundaries aren't lost.
 *
 * Example: 900s audio, 300s chunks, 10s overlap
 *   chunk 0: [0, 300]
 *   chunk 1: [290, 590]
 *   chunk 2: [580, 880]
 *   chunk 3: [870, 900]  (short final chunk)
 */
export function splitAudioIntoChunks(
  totalDurationSec: number,
  chunkDurationSec = 300,
  opts?: ChunkOptions,
): MovieChunk[] {
  const overlap = opts?.overlapSec ?? 10
  const chunks: MovieChunk[] = []

  if (totalDurationSec <= 0) return chunks
  if (totalDurationSec <= chunkDurationSec) {
    chunks.push({ index: 0, start: 0, end: totalDurationSec })
    return chunks
  }

  // Guard against infinite loop: overlap must be less than chunk duration
  const safeOverlap = Math.max(0, Math.min(overlap, chunkDurationSec - 1))

  let start = 0
  let index = 0

  while (start < totalDurationSec) {
    const end = Math.min(start + chunkDurationSec, totalDurationSec)
    chunks.push({ index, start, end })
    if (end >= totalDurationSec) break
    // Next chunk starts `chunkDuration - overlap` seconds later
    start += chunkDurationSec - safeOverlap
    index++
  }

  return chunks
}

// ─── Chunk Transcription ───────────────────────────────────

/**
 * Transcribe a single audio chunk using available engines.
 * Tries: Deepgram (server) → Groq Whisper → Web Speech API → estimated fallback.
 */
export async function transcribeChunk(
  audioContext: AudioContext,
  audioBuffer: AudioBuffer,
  chunk: MovieChunk,
  opts?: { language?: string; signal?: AbortSignal },
): Promise<ChunkTranscript> {
  const startSample = Math.floor(chunk.start * audioBuffer.sampleRate)
  const endSample = Math.floor(chunk.end * audioBuffer.sampleRate)
  const length = endSample - startSample

  if (length <= 0) {
    return { words: [], fullText: '', language: opts?.language ?? 'en', engine: 'estimated' }
  }

  // Extract chunk audio
  const chunkBuffer = audioContext.createBuffer(
    audioBuffer.numberOfChannels,
    length,
    audioBuffer.sampleRate,
  )
  for (let ch = 0; ch < audioBuffer.numberOfChannels; ch++) {
    const src = audioBuffer.getChannelData(ch)
    const dst = chunkBuffer.getChannelData(ch)
    for (let i = 0; i < length; i++) {
      dst[i] = src[startSample + i] ?? 0
    }
  }

  // Convert to WAV blob for transcription
  const wavBlob = audioBufferToWav(chunkBuffer)

  // Try transcription engines — single call with fallback chain
  const language = opts?.language ?? 'en'

  try {
    const { transcribeAudio } = await import('../stt')
    const result = await transcribeAudio(wavBlob, language, undefined, opts?.signal)
    if (result.words.length > 0) {
      // Offset timestamps to movie time
      const offsetWords = result.words.map(w => ({
        word: w.word,
        start: w.start + chunk.start,
        end: w.end + chunk.start,
      }))
      return {
        words: offsetWords,
        fullText: result.fullText,
        language: result.language,
        engine: result.engine,
      }
    }
  } catch { /* fall through to error */ }

  // No speech detected or all engines failed
  return { words: [], fullText: '', language, engine: 'estimated' }
}

// ─── Transcript Merging ────────────────────────────────────

/**
 * Merge chunk transcripts into a single unified transcript.
 * Deduplicates overlapping words at chunk boundaries using fuzzy timestamp matching.
 */
export function mergeChunkTranscripts(
  chunks: MovieChunk[],
  transcripts: ChunkTranscript[],
): MovieTranscript {
  if (chunks.length === 0 || transcripts.length === 0) {
    return { words: [], fullText: '', language: 'en', totalDuration: 0, chunkCount: 0 }
  }

  const allWords: WordTimestamp[] = []
  const textParts: string[] = []

  for (const transcript of transcripts) {
    allWords.push(...transcript.words)
    if (transcript.fullText) textParts.push(transcript.fullText)
  }

  // Sort by start time first (required for deduplication)
  allWords.sort((a, b) => a.start - b.start)

  // Deduplicate overlapping words (same word within 1s at boundary)
  const deduped = deduplicateOverlappingWords(allWords)

  // Get total duration from last chunk
  const lastChunk = chunks[chunks.length - 1]
  const totalDuration = lastChunk ? lastChunk.end : 0

  return {
    words: deduped,
    fullText: textParts.join(' ').replace(/\s+/g, ' ').trim(),
    language: transcripts[0]?.language ?? 'en',
    totalDuration,
    chunkCount: chunks.length,
  }
}

/**
 * Remove duplicate words from overlapping regions.
 * Two words are considered duplicates if they match text (case-insensitive)
 * and are within 1.0s of each other (covers overlap zone).
 */
function deduplicateOverlappingWords(words: WordTimestamp[]): WordTimestamp[] {
  if (words.length === 0) return []

  const result: WordTimestamp[] = [words[0]]
  for (let i = 1; i < words.length; i++) {
    const prev = result[result.length - 1]
    const curr = words[i]
    // Skip if same word text and within 1s (overlap region)
    if (
      prev.word.toLowerCase() === curr.word.toLowerCase() &&
      Math.abs(prev.start - curr.start) < 1.0
    ) {
      continue
    }
    result.push(curr)
  }
  return result
}

// ─── Utilities ─────────────────────────────────────────────

/** Get total duration from video metadata. */
export function estimateMovieDuration(meta: { duration: number }): number {
  return Math.max(0, meta.duration || 0)
}

/** Convert AudioBuffer to WAV Blob (mono, 16-bit PCM). */
function audioBufferToWav(buffer: AudioBuffer): Blob {
  const numChannels = 1 // mono for transcription
  const sampleRate = buffer.sampleRate
  const format = 1 // PCM
  const bitsPerSample = 16

  const samples = buffer.length
  const dataSize = samples * numChannels * (bitsPerSample / 8)
  const headerSize = 44
  const arrayBuffer = new ArrayBuffer(headerSize + dataSize)
  const view = new DataView(arrayBuffer)

  // WAV header
  writeString(view, 0, 'RIFF')
  view.setUint32(4, 36 + dataSize, true)
  writeString(view, 8, 'WAVE')
  writeString(view, 12, 'fmt ')
  view.setUint32(16, 16, true) // chunk size
  view.setUint16(20, format, true)
  view.setUint16(22, numChannels, true)
  view.setUint32(24, sampleRate, true)
  view.setUint32(28, sampleRate * numChannels * (bitsPerSample / 8), true)
  view.setUint16(32, numChannels * (bitsPerSample / 8), true)
  view.setUint16(34, bitsPerSample, true)
  writeString(view, 36, 'data')
  view.setUint32(40, dataSize, true)

  // Interleave mono samples
  const channelData = buffer.getChannelData(0)
  let offset = 44
  for (let i = 0; i < samples; i++) {
    const sample = Math.max(-1, Math.min(1, channelData[i] ?? 0))
    view.setInt16(offset, sample < 0 ? sample * 0x8000 : sample * 0x7FFF, true)
    offset += 2
  }

  return new Blob([arrayBuffer], { type: 'audio/wav' })
}

function writeString(view: DataView, offset: number, str: string) {
  for (let i = 0; i < str.length; i++) {
    view.setUint8(offset + i, str.charCodeAt(i))
  }
}
