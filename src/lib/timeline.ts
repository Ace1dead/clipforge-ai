/**
 * Timeline Data Model — Multi-track, multi-clip timeline.
 * The foundation for Premiere/CapCut-level editing.
 */

import type { KeyframedLayer, AnimatedProperty } from './keyframe'
import type { TransitionType } from './transitions'

// ═══════════════════════════════════════════════════════════════
// CORE TYPES
// ═══════════════════════════════════════════════════════════════

export type ClipType = 'video' | 'audio' | 'image' | 'text' | 'adjustment' | 'shape'
export type TrackType = 'video' | 'audio'

export interface Clip {
  id: string
  name: string
  type: ClipType
  trackId: string

  // Source
  sourceUrl?: string
  sourceStart: number       // in-point in source media (seconds)
  sourceEnd: number         // out-point in source media (seconds)

  // Timeline position
  timelineStart: number     // position on timeline (seconds)
  timelineEnd: number       // end position on timeline (seconds)

  // Properties
  volume: number            // 0-1 (audio clips)
  speed: number             // 0.25-4.0
  opacity: number           // 0-1 (video/image/text clips)
  muted: boolean
  locked: boolean

  // Transform (for video/image/text clips)
  transform?: {
    x: number               // offset from center (-1 to 1)
    y: number
    scale: number           // 0.1-5.0
    rotation: number        // degrees
    anchorX: number         // 0-1
    anchorY: number
  }

  // Effects applied to this clip
  effects: ClipEffect[]

  // Keyframes for animatable properties
  keyframes: KeyframedLayer

  // Transition at start/end
  transitionIn?: ClipTransition
  transitionOut?: ClipTransition

  // Chroma key
  chromaKey?: ChromaKeyConfig

  // Mask
  mask?: MaskConfig

  // Color grading
  colorGrade?: ColorGradeConfig

  // For text clips
  textConfig?: TextClipConfig

  // For adjustment clips
  adjustmentConfig?: AdjustmentClipConfig

  // Animations
  animationIn?: {
    type: string
    duration: number
    easing?: string
  }
  animationOut?: {
    type: string
    duration: number
    easing?: string
  }
  textAnimation?: string

  // Per-clip filter (applied after color grading)
  filter?: string     // FilterPreset id from filters.ts
  filterStrength?: number  // 0-1

  // Speed ramp (array of speed segments)
  speedRamp?: Array<{
    start: number   // relative time (0-1 of clip)
    end: number
    speed: number   // 0.25-4.0
  }>
}

export interface Track {
  id: string
  name: string
  type: TrackType
  index: number
  visible: boolean
  locked: boolean
  muted: boolean
  opacity: number           // track-level opacity (0-1)
  clips: Clip[]
}

export interface Timeline {
  id: string
  name: string
  duration: number          // total timeline duration
  fps: number
  width: number
  height: number
  tracks: Track[]
  playhead: number          // current playhead position (seconds)
}

// ═══════════════════════════════════════════════════════════════
// EFFECTS & CONFIGS
// ═══════════════════════════════════════════════════════════════

export interface ClipEffect {
  id: string
  name: string
  enabled: boolean
  params: Record<string, number | string | boolean>
}

export interface ClipTransition {
  type: TransitionType
  duration: number          // seconds
  intensity?: number        // 0-1
}

export interface ChromaKeyConfig {
  enabled: boolean
  color: string             // hex color to key out (default: green #00ff00)
  similarity: number        // 0-1 tolerance
  smoothness: number        // 0-1 edge softness
  spillReduction: number    // 0-1
}

export interface MaskConfig {
  enabled: boolean
  type: 'rect' | 'ellipse' | 'linear' | 'free'
  // Rect
  x?: number
  y?: number
  width?: number
  height?: number
  // Ellipse
  cx?: number
  cy?: number
  rx?: number
  ry?: number
  // Linear gradient
  angle?: number
  // Free (polygon points)
  points?: Array<{ x: number; y: number }>
  // Common
  feather?: number          // edge softness (pixels)
  inverted?: boolean
}

export interface ColorGradeConfig {
  enabled: boolean
  brightness: number        // -1 to 1
  contrast: number          // 0 to 3
  saturation: number        // 0 to 3
  hueShift: number          // -180 to 180
  temperature: number       // -1 to 1 (warm/cool)
  tint: number              // -1 to 1
  shadows: string           // hex color tint
  highlights: string        // hex color tint
  gammaValue: number             // 0.1 to 3
  // Color wheels (lift/gamma/gain)
  lift?: { r: number; g: number; b: number }
  gammaWheel?: { r: number; g: number; b: number }
  gain?: { r: number; g: number; b: number }
}

export interface TextClipConfig {
  text: string
  fontFamily: string
  fontSize: number
  fontWeight: number
  color: string
  backgroundColor?: string
  backgroundRadius?: number
  padding?: number
  align: 'left' | 'center' | 'right'
  valign: 'top' | 'middle' | 'bottom'
  letterSpacing?: number
  lineHeight?: number
  uppercase?: boolean
  stroke?: { color: string; width: number }
  shadow?: { color: string; blur: number; x: number; y: number }
}

export interface AdjustmentClipConfig {
  effects: ClipEffect[]
  colorGrade?: ColorGradeConfig
}

// ═══════════════════════════════════════════════════════════════
// TIMELINE CONSTRUCTION
// ═══════════════════════════════════════════════════════════════

let _trackId = 0
let _clipId = 0

export function createTimeline(opts: {
  name?: string
  duration?: number
  fps?: number
  width?: number
  height?: number
}): Timeline {
  return {
    id: `tl-${Date.now()}`,
    name: opts.name ?? 'Untitled Timeline',
    duration: opts.duration ?? 60,
    fps: opts.fps ?? 30,
    width: opts.width ?? 1080,
    height: opts.height ?? 1920,
    tracks: [
      { id: `track-v1`, name: 'V1', type: 'video', index: 0, visible: true, locked: false, muted: false, opacity: 1, clips: [] },
      { id: `track-a1`, name: 'A1', type: 'audio', index: 0, visible: true, locked: false, muted: false, opacity: 1, clips: [] },
    ],
    playhead: 0,
  }
}

export function createClip(opts: {
  type: ClipType
  trackId: string
  sourceUrl?: string
  sourceStart?: number
  sourceEnd?: number
  timelineStart?: number
  name?: string
  volume?: number
  speed?: number
  opacity?: number
}): Clip {
  const duration = (opts.sourceEnd ?? 10) - (opts.sourceStart ?? 0)
  return {
    id: `clip-${Date.now()}-${_clipId++}`,
    name: opts.name ?? `Clip ${_clipId}`,
    type: opts.type,
    trackId: opts.trackId,
    sourceUrl: opts.sourceUrl,
    sourceStart: opts.sourceStart ?? 0,
    sourceEnd: opts.sourceEnd ?? duration,
    timelineStart: opts.timelineStart ?? 0,
    timelineEnd: (opts.timelineStart ?? 0) + duration,
    volume: opts.volume ?? 1,
    speed: opts.speed ?? 1,
    opacity: opts.opacity ?? 1,
    muted: false,
    locked: false,
    effects: [],
    keyframes: {
      id: `kf-layer-${_clipId}`,
      name: 'Transform',
      startTime: opts.timelineStart ?? 0,
      endTime: (opts.timelineStart ?? 0) + duration,
      properties: {
        x: { name: 'x', keyframes: [], defaultValue: 0, min: -100, max: 100 },
        y: { name: 'y', keyframes: [], defaultValue: 0, min: -100, max: 100 },
        scale: { name: 'scale', keyframes: [], defaultValue: 1, min: 0.1, max: 5 },
        rotation: { name: 'rotation', keyframes: [], defaultValue: 0, min: -360, max: 360 },
        opacity: { name: 'opacity', keyframes: [], defaultValue: 1, min: 0, max: 1 },
      },
    },
  }
}

export function addTrack(timeline: Timeline, type: TrackType, name?: string): Timeline {
  const existing = timeline.tracks.filter(t => t.type === type)
  const track: Track = {
    id: `track-${type[0]}${existing.length + 1}-${Date.now()}`,
    name: name ?? `${type === 'video' ? 'V' : 'A'}${existing.length + 1}`,
    type,
    index: existing.length,
    visible: true,
    locked: false,
    muted: false,
    opacity: 1,
    clips: [],
  }
  return { ...timeline, tracks: [...timeline.tracks, track] }
}

export function addClipToTrack(timeline: Timeline, trackId: string, clip: Clip): Timeline {
  return {
    ...timeline,
    tracks: timeline.tracks.map(t =>
      t.id === trackId ? { ...t, clips: [...t.clips, clip] } : t
    ),
  }
}

export function removeClip(timeline: Timeline, clipId: string): Timeline {
  return {
    ...timeline,
    tracks: timeline.tracks.map(t => ({
      ...t,
      clips: t.clips.filter(c => c.id !== clipId),
    })),
  }
}

export function moveClip(
  timeline: Timeline,
  clipId: string,
  newTimelineStart: number,
): Timeline {
  return {
    ...timeline,
    tracks: timeline.tracks.map(t => ({
      ...t,
      clips: t.clips.map(c => {
        if (c.id !== clipId) return c
        const dur = c.timelineEnd - c.timelineStart
        return { ...c, timelineStart: newTimelineStart, timelineEnd: newTimelineStart + dur }
      }),
    })),
  }
}

export function splitClip(
  timeline: Timeline,
  clipId: string,
  splitTime: number,
): Timeline {
  return {
    ...timeline,
    tracks: timeline.tracks.map(t => ({
      ...t,
      clips: t.clips.flatMap(c => {
        if (c.id !== clipId) return [c]
        if (splitTime <= c.timelineStart || splitTime >= c.timelineEnd) return [c]
        const clipA = { ...c, timelineEnd: splitTime, sourceEnd: c.sourceStart + (splitTime - c.timelineStart) * c.speed }
        const clipB = {
          ...c,
          id: `${c.id}-split-${Date.now()}`,
          timelineStart: splitTime,
          timelineEnd: c.timelineEnd,
          sourceStart: c.sourceStart + (splitTime - c.timelineStart) * c.speed,
        }
        return [clipA, clipB]
      }),
    })),
  }
}

export function trimClip(
  timeline: Timeline,
  clipId: string,
  newStart: number,
  newEnd: number,
): Timeline {
  return {
    ...timeline,
    tracks: timeline.tracks.map(t => ({
      ...t,
      clips: t.clips.map(c => {
        if (c.id !== clipId) return c
        return {
          ...c,
          timelineStart: Math.max(c.timelineStart, newStart),
          timelineEnd: Math.min(c.timelineEnd, newEnd),
          sourceStart: c.sourceStart + (Math.max(c.timelineStart, newStart) - c.timelineStart) / c.speed,
          sourceEnd: c.sourceEnd - (c.timelineEnd - Math.min(c.timelineEnd, newEnd)) / c.speed,
        }
      }),
    })),
  }
}

// ═══════════════════════════════════════════════════════════════
// TIMELINE QUERIES
// ═══════════════════════════════════════════════════════════════

export function getClipsAtTime(timeline: Timeline, time: number): Clip[] {
  return timeline.tracks
    .filter(t => t.type === 'video' && t.visible)
    .flatMap(t => t.clips)
    .filter(c => time >= c.timelineStart && time <= c.timelineEnd)
}

export function getAudioClipsAtTime(timeline: Timeline, time: number): Clip[] {
  return timeline.tracks
    .filter(t => t.type === 'audio' && !t.muted)
    .flatMap(t => t.clips)
    .filter(c => time >= c.timelineStart && time <= c.timelineEnd)
}

export function getTimelineDuration(timeline: Timeline): number {
  let max = 0
  for (const track of timeline.tracks) {
    for (const clip of track.clips) {
      if (clip.timelineEnd > max) max = clip.timelineEnd
    }
  }
  return max
}

export function getClipAtPlayhead(timeline: Timeline): Clip | null {
  const clips = getClipsAtTime(timeline, timeline.playhead)
  return clips.length > 0 ? clips[clips.length - 1] : null
}

export function rippleDelete(timeline: Timeline, clipId: string): Timeline {
  const clip = timeline.tracks.flatMap(t => t.clips).find(c => c.id === clipId)
  if (!clip) return timeline
  const gap = clip.timelineEnd - clip.timelineStart
  // Shift all clips after this one left by the gap
  return {
    ...timeline,
    tracks: timeline.tracks.map(t => ({
      ...t,
      clips: t.clips
        .filter(c => c.id !== clipId)
        .map(c => {
          if (c.timelineStart > clip.timelineStart) {
            return { ...c, timelineStart: c.timelineStart - gap, timelineEnd: c.timelineEnd - gap }
          }
          return c
        }),
    })),
  }
}
