/**
 * Hierarchical AI Movie Summarizer — 3-phase pipeline.
 *
 * Phase 1: Summarize each transcript chunk (5-min segments)
 * Phase 2: Build a full-movie outline (acts, key scenes, characters)
 * Phase 3: Generate a cut plan (keep/discard segments with timestamps)
 *
 * All phases use real LLM calls via generateAI().
 * No heuristic fallbacks — the user's API key is required.
 */

import type { WordTimestamp } from '../stt'
import { generateAI } from '../aiService'

// ─── Types ─────────────────────────────────────────────────

export interface ChunkSummary {
  chunkIndex: number
  chunkStart: number
  chunkEnd: number
  summary: string
  keyPhrases: string[]
  sceneCount: number
  mood: string
}

export interface Act {
  actNumber: number
  name: string
  description: string
  startChunk: number
  endChunk: number
  keyEvents: string[]
}

export interface KeyScene {
  description: string
  estimatedTimeRange: [number, number]
  importance: 'low' | 'medium' | 'high' | 'critical'
}

export interface MovieOutline {
  title: string
  acts: Act[]
  keyScenes: KeyScene[]
  characters: string[]
  mood: string
  summary: string
}

export interface CutSegment {
  start: number
  end: number
  action: 'keep' | 'discard'
  reason: string
}

export interface CutPlan {
  segments: CutSegment[]
  estimatedDuration: number
  keepRatio: number
}

// ─── Phase 1: Chunk Summarization ──────────────────────────

/**
 * Summarize a single transcript chunk using the LLM.
 * Each chunk is ~5 minutes of transcript (~600-800 words).
 */
export async function summarizeChunk(input: {
  chunkIndex: number
  chunkStart: number
  chunkEnd: number
  transcript: string
  language: string
}): Promise<ChunkSummary> {
  const systemPrompt = `You are a professional film analyst and editor. Summarize a segment of a movie transcript.
Return ONLY a JSON object with these fields:
{
  "summary": "2-4 sentence summary of what happens in this segment",
  "keyPhrases": ["phrase1", "phrase2", "phrase3"],
  "sceneCount": 3,
  "mood": "one word describing the mood"
}
No markdown, no explanation, just the JSON.`

  const userPrompt = `Movie segment (seconds ${input.chunkStart}-${input.chunkEnd}):
Language: ${input.language}

Transcript:
${input.transcript}

Summarize this segment.`

  const response = await generateAI({
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userPrompt },
    ],
    maxTokens: 300,
    temperature: 0.3,
  })

  const parsed = parseJsonFromResponse(response.content)

  return {
    chunkIndex: input.chunkIndex,
    chunkStart: input.chunkStart,
    chunkEnd: input.chunkEnd,
    summary: typeof parsed.summary === 'string' ? parsed.summary : input.transcript.slice(0, 200),
    keyPhrases: Array.isArray(parsed.keyPhrases) ? parsed.keyPhrases : [],
    sceneCount: typeof parsed.sceneCount === 'number' ? parsed.sceneCount : 1,
    mood: typeof parsed.mood === 'string' ? parsed.mood : 'neutral',
  }
}

// ─── Phase 2: Full-Movie Outline ───────────────────────────

/**
 * Build a structural outline of the entire movie from chunk summaries.
 * Identifies acts, turning points, key scenes, and character arcs.
 */
export async function buildMovieOutline(input: {
  chunkSummaries: ChunkSummary[]
  totalDuration: number
  title?: string
}): Promise<MovieOutline> {
  const summariesText = input.chunkSummaries
    .map(s => `[Chunk ${s.chunkIndex} | ${s.chunkStart}s-${s.chunkEnd}s] ${s.summary} (Mood: ${s.mood}, Scenes: ${s.sceneCount})`)
    .join('\n')

  const systemPrompt = `You are a professional film editor and story analyst. Given summaries of a movie broken into chunks, build a structural outline.

Return ONLY a JSON object:
{
  "title": "movie title or 'Untitled' if unknown",
  "acts": [
    {
      "actNumber": 1,
      "name": "Act name (e.g. 'Setup', 'Confrontation', 'Resolution')",
      "description": "1-2 sentence description",
      "startChunk": 0,
      "endChunk": 2,
      "keyEvents": ["event1", "event2"]
    }
  ],
  "keyScenes": [
    {
      "description": "What happens in this scene",
      "estimatedTimeRange": [start_seconds, end_seconds],
      "importance": "critical|high|medium|low"
    }
  ],
  "characters": ["Character 1", "Character 2"],
  "mood": "overall mood",
  "summary": "2-3 sentence overall summary"
}
No markdown, no explanation, just the JSON.
Aim for 3-5 acts. Include 5-15 key scenes.
Key scenes with "critical" or "high" importance MUST be kept in the final edit.`

  const userPrompt = `Movie title: ${input.title ?? 'Unknown'}
Total duration: ${input.totalDuration}s (${Math.round(input.totalDuration / 60)} minutes)
Number of chunks: ${input.chunkSummaries.length}

Chunk summaries:
${summariesText}

Build the movie outline.`

  const response = await generateAI({
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userPrompt },
    ],
    maxTokens: 1500,
    temperature: 0.3,
  })

  const parsed = parseJsonFromResponse(response.content)

  const acts: Act[] = Array.isArray(parsed.acts)
    ? parsed.acts.map((a: Record<string, unknown>, i: number) => ({
        actNumber: typeof a.actNumber === 'number' ? a.actNumber : i + 1,
        name: typeof a.name === 'string' ? a.name : `Act ${i + 1}`,
        description: typeof a.description === 'string' ? a.description : '',
        startChunk: typeof a.startChunk === 'number' ? a.startChunk : 0,
        endChunk: typeof a.endChunk === 'number' ? a.endChunk : 0,
        keyEvents: Array.isArray(a.keyEvents) ? a.keyEvents : [],
      }))
    : [{ actNumber: 1, name: 'Full Movie', description: 'Complete film', startChunk: 0, endChunk: input.chunkSummaries.length - 1, keyEvents: [] }]

  const keyScenes: KeyScene[] = Array.isArray(parsed.keyScenes)
    ? parsed.keyScenes.map((s: Record<string, unknown>) => ({
        description: typeof s.description === 'string' ? s.description : '',
        estimatedTimeRange: Array.isArray(s.estimatedTimeRange) && s.estimatedTimeRange.length >= 2
          ? [Number(s.estimatedTimeRange[0]) || 0, Number(s.estimatedTimeRange[1]) || input.totalDuration]
          : [0, input.totalDuration],
        importance: ['critical', 'high', 'medium', 'low'].includes(s.importance as string)
          ? (s.importance as KeyScene['importance'])
          : 'medium',
      }))
    : []

  return {
    title: typeof parsed.title === 'string' ? parsed.title : (input.title ?? 'Untitled'),
    acts,
    keyScenes,
    characters: Array.isArray(parsed.characters) ? parsed.characters : [],
    mood: typeof parsed.mood === 'string' ? parsed.mood : 'neutral',
    summary: typeof parsed.summary === 'string' ? parsed.summary : '',
  }
}

// ─── Phase 3: Cut Plan Generation ──────────────────────────

/**
 * Generate a detailed cut plan mapping outline scenes to transcript timestamps.
 * Preserves critical/high-importance scenes, discards filler, respects target duration.
 */
export async function generateCutPlan(input: {
  outline: MovieOutline
  totalDuration: number
  targetDuration: number
  transcript: WordTimestamp[]
}): Promise<CutPlan> {
  const transcriptSnippet = input.transcript.length > 0
    ? input.transcript.slice(0, 200).map(w => `${w.word} [${w.start.toFixed(1)}s]`).join(' ')
    : '(no transcript available)'

  const keyScenesText = input.outline.keyScenes
    .map(s => `[${s.importance.toUpperCase()}] ${s.description} (${s.estimatedTimeRange[0]}s-${s.estimatedTimeRange[1]}s)`)
    .join('\n')

  const systemPrompt = `You are a professional film editor creating a condensed edit of a movie.
Given the movie outline and key scenes, generate a cut plan that:
1. KEEPS all "critical" and "high" importance scenes
2. DISCARDS low-importance filler, repeated exposition, and slow transitions
3. Targets the requested duration while preserving story coherence
4. Adds brief crossfade transitions at cut points

Return ONLY a JSON array of segments:
[
  {
    "start": 0,
    "end": 30,
    "action": "keep",
    "reason": "Opening scene establishes protagonist"
  },
  {
    "start": 30,
    "end": 45,
    "action": "discard",
    "reason": "Slow transition, redundant dialogue"
  }
]
No markdown, no explanation, just the JSON array.
Segments must cover the full duration without gaps or overlaps.
The "keep" segments should sum to approximately ${input.targetDuration} seconds.`

  const userPrompt = `Movie: ${input.outline.title}
Total duration: ${input.totalDuration}s
Target summary duration: ${input.targetDuration}s (${Math.round(input.targetDuration / 60)} minutes)
Keep ratio target: ${Math.round((input.targetDuration / input.totalDuration) * 100)}%

Acts:
${input.outline.acts.map(a => `Act ${a.actNumber} (${a.name}): ${a.description} [chunks ${a.startChunk}-${a.endChunk}]`).join('\n')}

Key scenes:
${keyScenesText}

Characters: ${input.outline.characters.join(', ')}

Transcript sample (with timestamps):
${transcriptSnippet}

Generate the cut plan.`

  const response = await generateAI({
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userPrompt },
    ],
    maxTokens: 2000,
    temperature: 0.2,
  })

  const parsed = parseJsonFromResponse(response.content)
  const rawSegments = Array.isArray(parsed) ? parsed : (Array.isArray(parsed.segments) ? parsed.segments : []) as Record<string, unknown>[]

  const segments: CutSegment[] = rawSegments.map((s) => ({
    start: typeof s.start === 'number' ? s.start : 0,
    end: typeof s.end === 'number' ? s.end : 0,
    action: s.action === 'keep' || s.action === 'discard' ? s.action : 'keep',
    reason: typeof s.reason === 'string' ? s.reason : '',
  }))

  // Calculate stats
  const keepDuration = segments
    .filter(s => s.action === 'keep')
    .reduce((sum, s) => sum + (s.end - s.start), 0)

  return {
    segments,
    estimatedDuration: keepDuration,
    keepRatio: input.totalDuration > 0 ? keepDuration / input.totalDuration : 0,
  }
}

// ─── Utilities ─────────────────────────────────────────────

/**
 * Merge adjacent keep segments separated by short discards (<2s).
 */
export function mergeOverlappingSegments(segments: CutSegment[]): CutSegment[] {
  if (segments.length === 0) return []

  const sorted = [...segments].sort((a, b) => a.start - b.start)
  const result: CutSegment[] = [sorted[0]]

  for (let i = 1; i < sorted.length; i++) {
    const prev = result[result.length - 1]
    const curr = sorted[i]

    // Merge adjacent keep segments
    if (prev.action === 'keep' && curr.action === 'keep' && curr.start <= prev.end + 0.1) {
      prev.end = Math.max(prev.end, curr.end)
      prev.reason = prev.reason + '; ' + curr.reason
    } else {
      result.push({ ...curr })
    }
  }

  return result
}

/**
 * Validate a cut plan for completeness and correctness.
 */
export function validateCutPlan(segments: CutSegment[], totalDuration: number): { valid: boolean; errors: string[] } {
  const errors: string[] = []

  if (segments.length === 0) {
    errors.push('Cut plan is empty')
    return { valid: false, errors }
  }

  const sorted = [...segments].sort((a, b) => a.start - b.start)

  // Check coverage (no gaps)
  for (let i = 1; i < sorted.length; i++) {
    if (sorted[i].start > sorted[i - 1].end + 0.01) {
      errors.push(`Gap between segments at ${sorted[i - 1].end}s - ${sorted[i].start}s`)
    }
  }

  // Check overlaps
  for (let i = 1; i < sorted.length; i++) {
    if (sorted[i].start < sorted[i - 1].end - 0.01) {
      errors.push(`Overlap at ${sorted[i].start}s (previous ends at ${sorted[i - 1].end}s)`)
    }
  }

  // Check duration bounds
  for (const seg of sorted) {
    if (seg.end > totalDuration + 0.01) {
      errors.push(`Segment extends past total duration: ${seg.end}s > ${totalDuration}s`)
    }
    if (seg.start < 0) {
      errors.push(`Negative start time: ${seg.start}s`)
    }
    if (seg.end <= seg.start) {
      errors.push(`Invalid segment: end ${seg.end}s <= start ${seg.start}s`)
    }
  }

  return { valid: errors.length === 0, errors }
}

/**
 * Parse JSON from an LLM response, handling markdown code blocks and partial JSON.
 */
function parseJsonFromResponse(content: string): Record<string, unknown> {
  // Try direct parse
  try {
    return JSON.parse(content) as Record<string, unknown>
  } catch { /* continue */ }

  // Try extracting from markdown code block
  const codeBlockMatch = content.match(/```(?:json)?\s*\n?([\s\S]*?)\n?```/)
  if (codeBlockMatch) {
    try {
      return JSON.parse(codeBlockMatch[1]) as Record<string, unknown>
    } catch { /* continue */ }
  }

  // Try finding JSON object or array
  const jsonMatch = content.match(/(\{[\s\S]*\}|\[[\s\S]*\])/)
  if (jsonMatch) {
    try {
      return JSON.parse(jsonMatch[1]) as Record<string, unknown>
    } catch { /* continue */ }
  }

  // Last resort: return the raw content as a summary
  return { summary: content.slice(0, 500), raw: true }
}
