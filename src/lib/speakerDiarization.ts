/**
 * Speaker Diarization — Color-coded captions by speaker.
 * Based on FunClip's CAM++ diarization + OpenShorts' speaker tracking.
 * Uses Deepgram diarization or client-side speaker embeddings.
 */

export interface SpeakerSegment {
  speakerId: string
  start: number
  end: number
  confidence?: number
}

export interface SpeakerColorMap {
  [speakerId: string]: string
}

export interface SpeakerChange {
  from: string
  to: string
  time: number
}

// ═══════════════════════════════════════════════════════════════
// SPEAKER COLOR PALETTE
// ═══════════════════════════════════════════════════════════════

const SPEAKER_COLORS = [
  '#5e6ad2', // Primary blue
  '#ef4444', // Red
  '#22d3ee', // Cyan
  '#fbbf24', // Yellow
  '#10b981', // Green
  '#ec4899', // Pink
  '#f97316', // Orange
  '#8b5cf6', // Purple
  // Extended palette for >8 speakers
  '#06b6d4', '#84cc16', '#f43f5e', '#0ea5e9',
  '#d946ef', '#14b8a6', '#fb923c', '#a78bfa',
]

// ═══════════════════════════════════════════════════════════════
// COLOR ASSIGNMENT
// ═══════════════════════════════════════════════════════════════

/**
 * Assigns distinct colors to each speaker.
 * First speaker gets the primary color, subsequent speakers get cycling colors.
 */
export function assignSpeakerColors(segments: SpeakerSegment[]): SpeakerColorMap {
  const speakerIds = [...new Set(segments.map(s => s.speakerId))]
  const colorMap: SpeakerColorMap = {}

  speakerIds.forEach((id, idx) => {
    colorMap[id] = SPEAKER_COLORS[idx % SPEAKER_COLORS.length]
  })

  return colorMap
}

/**
 * Gets color for a specific speaker at a given time.
 */
export function getSpeakerColorAtTime(
  segments: SpeakerSegment[],
  time: number,
  colorMap: SpeakerColorMap,
): string | null {
  const active = segments.find(s => time >= s.start && time < s.end)
  if (!active) return null
  return colorMap[active.speakerId] ?? null
}

// ═══════════════════════════════════════════════════════════════
// SPEAKER CHANGE DETECTION
// ═══════════════════════════════════════════════════════════════

/**
 * Detects speaker transitions in a segment list.
 * Based on FunClip's proc_spk() — identifies where speaker ID changes.
 */
export function detectSpeakerChanges(segments: SpeakerSegment[]): SpeakerChange[] {
  if (segments.length < 2) return []

  const changes: SpeakerChange[] = []
  for (let i = 1; i < segments.length; i++) {
    if (segments[i].speakerId !== segments[i - 1].speakerId) {
      changes.push({
        from: segments[i - 1].speakerId,
        to: segments[i].speakerId,
        time: segments[i].start,
      })
    }
  }
  return changes
}

// ═══════════════════════════════════════════════════════════════
// SPEAKER DOMINANCE
// ═══════════════════════════════════════════════════════════════

/**
 * Computes speaking time dominance per speaker (0-1).
 */
export function computeSpeakerDominance(segments: SpeakerSegment[]): Record<string, number> {
  const totalTime = segments.reduce((sum, s) => sum + (s.end - s.start), 0)
  if (totalTime === 0) return {}

  const speakerTimes: Record<string, number> = {}
  for (const seg of segments) {
    const dur = seg.end - seg.start
    speakerTimes[seg.speakerId] = (speakerTimes[seg.speakerId] || 0) + dur
  }

  const dominance: Record<string, number> = {}
  for (const [id, time] of Object.entries(speakerTimes)) {
    dominance[id] = time / totalTime
  }
  return dominance
}

// ═══════════════════════════════════════════════════════════════
// SEGMENT MERGING
// ═══════════════════════════════════════════════════════════════

/**
 * Merges adjacent same-speaker segments within a gap tolerance.
 * Based on OpenShorts' speaker tracking merge logic.
 */
export function mergeSpeakerSegments(
  segments: SpeakerSegment[],
  gapTolerance: number = 0.3,
): SpeakerSegment[] {
  if (segments.length === 0) return []

  const sorted = [...segments].sort((a, b) => a.start - b.start)
  const merged: SpeakerSegment[] = [sorted[0]]

  for (let i = 1; i < sorted.length; i++) {
    const prev = merged[merged.length - 1]
    const curr = sorted[i]

    if (curr.speakerId === prev.speakerId && curr.start - prev.end <= gapTolerance) {
      // Merge
      prev.end = Math.max(prev.end, curr.end)
      if (curr.confidence !== undefined) {
        prev.confidence = Math.max(prev.confidence ?? 0, curr.confidence)
      }
    } else {
      merged.push({ ...curr })
    }
  }

  return merged
}

// ═══════════════════════════════════════════════════════════════
// SPEAKER-BASED WORD GROUPING
// ═══════════════════════════════════════════════════════════════

export interface WordWithSpeaker {
  text: string
  start: number
  end: number
  speakerId: string
  color: string
}

/**
 * Assigns speaker IDs and colors to words based on timestamp overlap.
 * This is the key function for rendering speaker-colored captions.
 */
export function assignSpeakersToWords(
  words: Array<{ text: string; start: number; end: number }>,
  speakerSegments: SpeakerSegment[],
  colorMap: SpeakerColorMap,
): WordWithSpeaker[] {
  return words.map(word => {
    // Find the speaker segment with maximum overlap
    let bestSpeaker = 'spk0'
    let bestOverlap = 0

    for (const seg of speakerSegments) {
      const overlapStart = Math.max(word.start, seg.start)
      const overlapEnd = Math.min(word.end, seg.end)
      const overlap = Math.max(0, overlapEnd - overlapStart)

      if (overlap > bestOverlap) {
        bestOverlap = overlap
        bestSpeaker = seg.speakerId
      }
    }

    return {
      ...word,
      speakerId: bestSpeaker,
      color: colorMap[bestSpeaker] ?? SPEAKER_COLORS[0],
    }
  })
}
