/**
 * Timeline Component — Visual multi-track NLE timeline.
 * Renders tracks, clips, playhead, and supports drag/trim/split/ripple delete.
 */

import React, { useState, useRef, useCallback, useEffect } from 'react'
import type { Timeline as TimelineType, Clip, Track, TrackType } from '../lib/timeline'
import {
  createTimeline,
  createClip,
  addClipToTrack,
  removeClip,
  moveClip,
  splitClip,
  rippleDelete,
  getClipsAtTime,
  getTimelineDuration,
} from '../lib/timeline'

interface TimelineProps {
  timeline: TimelineType
  onTimelineChange: (timeline: TimelineType) => void
  currentTime: number
  onTimeChange: (time: number) => void
  duration: number
  selectedClipId?: string | null
  onClipSelect?: (clipId: string | null) => void
  pixelsPerSecond?: number
  onAddTrack?: (type: TrackType) => void
}

interface ClipProps {
  clip: Clip
  pixelsPerSecond: number
  timelineHeight: number
  isSelected: boolean
  onSelect: () => void
  onDragStart: (clipId: string, offsetX: number) => void
  onTrimStart: (clipId: string, side: 'left' | 'right') => void
  trackIndex: number
  trackType: TrackType
}

interface TrackHeaderProps {
  track: Track
  onMuteToggle: () => void
  onLockToggle: () => void
  onDelete: () => void
  onAddClip?: () => void
}

// ── Colors ─────────────────────────────────────────────────────────

const TRACK_COLORS: Record<TrackType, string> = {
  video: '#3b82f6',
  audio: '#10b981',
}

const CLIP_TYPE_COLORS: Record<string, string> = {
  video: '#3b82f6',
  audio: '#10b981',
  text: '#f59e0b',
  adjustment: '#8b5cf6',
  image: '#ec4899',
  shape: '#6366f1',
}

// ── Track Header ───────────────────────────────────────────────────

function TrackHeader({ track, onMuteToggle, onLockToggle, onDelete, onAddClip }: TrackHeaderProps) {
  const bgColor = TRACK_COLORS[track.type] || '#6b7280'

  return (
    <div
      className="flex items-center gap-2 px-3 py-2 border-b border-gray-700"
      style={{ height: 48, backgroundColor: 'rgba(15,15,25,0.95)' }}
    >
      <div
        className="w-2 h-8 rounded-full"
        style={{ backgroundColor: bgColor }}
      />
      <span className="text-xs font-semibold text-gray-300 flex-1 truncate">
        {track.name}
      </span>
      <div className="flex items-center gap-1">
        <button
          onClick={onMuteToggle}
          className={`w-6 h-6 rounded text-[10px] font-bold ${
            track.muted ? 'bg-yellow-600 text-white' : 'bg-gray-700 text-gray-400'
          }`}
          title={track.muted ? 'Unmute' : 'Mute'}
        >
          M
        </button>
        <button
          onClick={onLockToggle}
          className={`w-6 h-6 rounded text-[10px] font-bold ${
            track.locked ? 'bg-red-600 text-white' : 'bg-gray-700 text-gray-400'
          }`}
          title={track.locked ? 'Unlock' : 'Lock'}
        >
          L
        </button>
        <button
          onClick={onDelete}
          className="w-6 h-6 rounded text-[10px] font-bold bg-gray-700 text-gray-400 hover:bg-red-600"
          title="Delete track"
        >
          ×
        </button>
      </div>
    </div>
  )
}

// ── Clip Component ─────────────────────────────────────────────────

function TimelineClip({
  clip,
  pixelsPerSecond,
  isSelected,
  onSelect,
  onDragStart,
  onTrimStart,
  trackIndex,
}: ClipProps) {
  const left = clip.timelineStart * pixelsPerSecond
  const width = (clip.timelineEnd - clip.timelineStart) * pixelsPerSecond
  const bgColor = CLIP_TYPE_COLORS[clip.type] || '#6b7280'
  const [hovering, setHovering] = useState(false)

  const handleMouseDown = (e: React.MouseEvent) => {
    e.stopPropagation()
    onSelect()

    // Check if near edge for trim
    const rect = e.currentTarget.getBoundingClientRect()
    const relX = e.clientX - rect.left
    if (relX < 6) {
      onTrimStart(clip.id, 'left')
    } else if (relX > rect.width - 6) {
      onTrimStart(clip.id, 'right')
    } else {
      onDragStart(clip.id, relX)
    }
  }

  return (
    <div
      className={`absolute top-1 bottom-1 rounded cursor-pointer transition-all ${
        isSelected ? 'ring-2 ring-white ring-opacity-80' : ''
      } ${hovering ? 'brightness-110' : ''}`}
      style={{
        left,
        width: Math.max(width, 4),
        backgroundColor: bgColor,
        opacity: clip.muted ? 0.4 : 0.85,
        zIndex: isSelected ? 10 : 1,
        top: `${trackIndex * 48 + 4}px`,
        height: '40px',
      }}
      onMouseDown={handleMouseDown}
      onMouseEnter={() => setHovering(true)}
      onMouseLeave={() => setHovering(false)}
    >
      {/* Trim handles */}
      <div
        className="absolute left-0 top-0 bottom-0 w-1.5 cursor-col-resize hover:bg-white/30"
        onMouseDown={(e) => {
          e.stopPropagation()
          onTrimStart(clip.id, 'left')
        }}
      />
      <div
        className="absolute right-0 top-0 bottom-0 w-1.5 cursor-col-resize hover:bg-white/30"
        onMouseDown={(e) => {
          e.stopPropagation()
          onTrimStart(clip.id, 'right')
        }}
      />

      {/* Clip label */}
      <div className="absolute inset-0 flex items-center px-2 overflow-hidden">
        <span className="text-[10px] font-semibold text-white truncate drop-shadow">
          {clip.name}
        </span>
      </div>

      {/* Transition indicators */}
      {clip.transitionIn && (
        <div className="absolute left-0 top-0 bottom-0 w-4 bg-gradient-to-r from-white/20 to-transparent" />
      )}
      {clip.transitionOut && (
        <div className="absolute right-0 top-0 bottom-0 w-4 bg-gradient-to-l from-white/20 to-transparent" />
      )}

      {/* Chroma key indicator */}
      {clip.chromaKey?.enabled && (
        <div className="absolute top-0.5 right-0.5 w-2 h-2 rounded-full bg-green-400" />
      )}

      {/* Speed indicator */}
      {clip.speed !== 1 && (
        <div className="absolute bottom-0.5 right-1 text-[8px] text-white/70 font-mono">
          {clip.speed.toFixed(1)}×
        </div>
      )}
    </div>
  )
}

// ── Main Timeline Component ────────────────────────────────────────

export default function TimelineComponent({
  timeline,
  onTimelineChange,
  currentTime,
  onTimeChange,
  duration,
  selectedClipId,
  onClipSelect,
  pixelsPerSecond: initialPPS = 60,
  onAddTrack,
}: TimelineProps) {
  const scrollRef = useRef<HTMLDivElement>(null)
  const rulerRef = useRef<HTMLDivElement>(null)
  const [pixelsPerSecond, setPixelsPerSecond] = useState(initialPPS)
  const [dragging, setDragging] = useState<{
    clipId: string
    offsetX: number
    trackId: string
  } | null>(null)
  const [trimming, setTrimming] = useState<{
    clipId: string
    side: 'left' | 'right'
  } | null>(null)

  const totalWidth = duration * pixelsPerSecond
  const trackHeaderWidth = 140

  // Playhead position
  const playheadX = currentTime * pixelsPerSecond

  // Scroll to playhead on time change
  useEffect(() => {
    if (scrollRef.current) {
      const containerWidth = scrollRef.current.clientWidth - trackHeaderWidth
      const scrollLeft = scrollRef.current.scrollLeft
      if (playheadX < scrollLeft || playheadX > scrollLeft + containerWidth) {
        scrollRef.current.scrollLeft = playheadX - containerWidth / 2
      }
    }
  }, [currentTime, playheadX, trackHeaderWidth])

  // Handle ruler click to set playhead
  const handleRulerClick = useCallback(
    (e: React.MouseEvent) => {
      const rect = e.currentTarget.getBoundingClientRect()
      const x = e.clientX - rect.left + (scrollRef.current?.scrollLeft || 0)
      const time = x / pixelsPerSecond
      onTimeChange(Math.max(0, Math.min(duration, time)))
    },
    [pixelsPerSecond, duration, onTimeChange],
  )

  // Handle clip drag
  const handleMouseMove = useCallback(
    (e: MouseEvent) => {
      if (!dragging || !scrollRef.current) return

      const rect = scrollRef.current.getBoundingClientRect()
      const scrollLeft = scrollRef.current.scrollLeft
      const x = e.clientX - rect.left + scrollLeft - trackHeaderWidth - dragging.offsetX
      const newTime = Math.max(0, x / pixelsPerSecond)

      const tl = { ...timeline }
      const track = tl.tracks.find(t => t.id === dragging.trackId)
      if (!track) return

      const clip = track.clips.find(c => c.id === dragging.clipId)
      if (!clip) return

      const clipDuration = clip.timelineEnd - clip.timelineStart
      clip.timelineStart = Math.round(newTime * 10) / 10
      clip.timelineEnd = clip.timelineStart + clipDuration

      onTimelineChange(tl)
    },
    [dragging, timeline, pixelsPerSecond, onTimelineChange, trackHeaderWidth],
  )

  const handleMouseUp = useCallback(() => {
    setDragging(null)
    setTrimming(null)
  }, [])

  useEffect(() => {
    if (dragging || trimming) {
      window.addEventListener('mousemove', handleMouseMove)
      window.addEventListener('mouseup', handleMouseUp)
      return () => {
        window.removeEventListener('mousemove', handleMouseMove)
        window.removeEventListener('mouseup', handleMouseUp)
      }
    }
  }, [dragging, trimming, handleMouseMove, handleMouseUp])

  // Handle zoom
  const handleWheel = useCallback(
    (e: React.WheelEvent) => {
      if (e.ctrlKey || e.metaKey) {
        e.preventDefault()
        const delta = e.deltaY > 0 ? -5 : 5
        setPixelsPerSecond(p => Math.max(10, Math.min(300, p + delta)))
      }
    },
    [],
  )

  // Keyboard shortcuts
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return

      if (e.key === 'Delete' || e.key === 'Backspace') {
        if (selectedClipId) {
          const tl = removeClip(timeline, selectedClipId)
          onTimelineChange(tl)
          onClipSelect?.(null)
        }
      } else if (e.key === 's' && !e.ctrlKey && !e.metaKey) {
        if (selectedClipId) {
          const tl = splitClip(timeline, selectedClipId, currentTime)
          onTimelineChange(tl)
        }
      } else if (e.key === 'r' && !e.ctrlKey && !e.metaKey) {
        if (selectedClipId) {
          const tl = rippleDelete(timeline, selectedClipId)
          onTimelineChange(tl)
          onClipSelect?.(null)
        }
      } else if (e.key === ' ') {
        e.preventDefault()
        // Space for play/pause — handled by parent
      }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [selectedClipId, timeline, currentTime, onTimelineChange, onClipSelect])

  // Time markers
  const markers: number[] = []
  const interval = pixelsPerSecond >= 60 ? 1 : pixelsPerSecond >= 30 ? 2 : 5
  for (let t = 0; t <= duration; t += interval) {
    markers.push(t)
  }

  return (
    <div className="flex flex-col h-full bg-gray-900 rounded-lg overflow-hidden border border-gray-700">
      {/* Toolbar */}
      <div className="flex items-center gap-2 px-3 py-1.5 bg-gray-850 border-b border-gray-700">
        <span className="text-[11px] text-gray-400">Timeline</span>
        <div className="flex-1" />
        <span className="text-[10px] text-gray-500 font-mono">
          {Math.floor(currentTime / 60)}:{String(Math.floor(currentTime % 60)).padStart(2, '0')}.{String(Math.floor((currentTime % 1) * 100)).padStart(2, '0')} / {duration.toFixed(1)}s
        </span>
        <span className="text-[10px] text-gray-500">
          {pixelsPerSecond.toFixed(0)} px/s
        </span>
        {onAddTrack && (
          <div className="flex gap-1">
            <button
              onClick={() => onAddTrack('video')}
              className="text-[10px] px-1.5 py-0.5 bg-blue-600 text-white rounded hover:bg-blue-500"
            >
              +V
            </button>
            <button
              onClick={() => onAddTrack('audio')}
              className="text-[10px] px-1.5 py-0.5 bg-green-600 text-white rounded hover:bg-green-500"
            >
              +A
            </button>
          </div>
        )}
      </div>

      <div className="flex flex-1 overflow-hidden">
        {/* Track headers */}
        <div className="flex-shrink-0" style={{ width: trackHeaderWidth }}>
          {/* Ruler spacer */}
          <div className="h-6 bg-gray-800 border-b border-gray-700" />
          {timeline.tracks.map((track) => (
            <TrackHeader
              key={track.id}
              track={track}
              onMuteToggle={() => {
                const tl = { ...timeline }
                const t = tl.tracks.find(tr => tr.id === track.id)
                if (t) t.muted = !t.muted
                onTimelineChange(tl)
              }}
              onLockToggle={() => {
                const tl = { ...timeline }
                const t = tl.tracks.find(tr => tr.id === track.id)
                if (t) t.locked = !t.locked
                onTimelineChange(tl)
              }}
              onDelete={() => {
                const tl = { ...timeline, tracks: timeline.tracks.filter(tr => tr.id !== track.id) }
                onTimelineChange(tl)
              }}
            />
          ))}
        </div>

        {/* Timeline scroll area */}
        <div
          ref={scrollRef}
          className="flex-1 overflow-x-auto overflow-y-hidden"
          onWheel={handleWheel}
        >
          {/* Ruler */}
          <div
            ref={rulerRef}
            className="relative h-6 bg-gray-800 border-b border-gray-700 cursor-pointer select-none"
            style={{ width: totalWidth }}
            onClick={handleRulerClick}
          >
            {markers.map((t) => (
              <div
                key={t}
                className="absolute top-0 h-full flex flex-col items-center"
                style={{ left: t * pixelsPerSecond }}
              >
                <div className="w-px h-3 bg-gray-600" />
                <span className="text-[9px] text-gray-500 mt-0.5 font-mono">
                  {t >= 60 ? `${Math.floor(t / 60)}:` : ''}{Math.floor(t % 60)}s
                </span>
              </div>
            ))}

            {/* Playhead on ruler */}
            <div
              className="absolute top-0 w-0.5 h-full bg-red-500 z-20"
              style={{ left: playheadX }}
            >
              <div className="absolute -top-0.5 left-1/2 -translate-x-1/2 w-0 h-0 border-l-[4px] border-r-[4px] border-t-[6px] border-transparent border-t-red-500" />
            </div>
          </div>

          {/* Tracks area */}
          <div
            className="relative bg-gray-900"
            style={{ width: totalWidth, minHeight: timeline.tracks.length * 48 + 8 }}
            onClick={(e) => {
              if (e.target === e.currentTarget) {
                onClipSelect?.(null)
              }
            }}
          >
            {/* Track backgrounds */}
            {timeline.tracks.map((track, i) => (
              <div
                key={track.id}
                className={`absolute left-0 right-0 border-b border-gray-800 ${
                  i % 2 === 0 ? 'bg-gray-900/50' : 'bg-gray-900/80'
                }`}
                style={{ top: i * 48, height: 48 }}
              />
            ))}

            {/* Clips */}
            {timeline.tracks.map((track, trackIndex) =>
              track.clips.map((clip) => (
                <TimelineClip
                  key={clip.id}
                  clip={clip}
                  pixelsPerSecond={pixelsPerSecond}
                  timelineHeight={timeline.tracks.length * 48}
                  isSelected={clip.id === selectedClipId}
                  onSelect={() => onClipSelect?.(clip.id)}
                  onDragStart={(clipId, offsetX) =>
                    setDragging({ clipId, offsetX, trackId: track.id })
                  }
                  onTrimStart={(clipId, side) =>
                    setTrimming({ clipId, side })
                  }
                  trackIndex={trackIndex}
                  trackType={track.type}
                />
              )),
            )}

            {/* Playhead line */}
            <div
              className="absolute top-0 w-0.5 bg-red-500 z-20 pointer-events-none"
              style={{ left: playheadX, height: '100%' }}
            />
          </div>
        </div>
      </div>

      {/* Status bar */}
      <div className="flex items-center justify-between px-3 py-1 bg-gray-850 border-t border-gray-700 text-[10px] text-gray-500">
        <span>{timeline.tracks.length} tracks · {timeline.tracks.reduce((sum, t) => sum + t.clips.length, 0)} clips</span>
        <span>
          {selectedClipId ? `Selected: ${timeline.tracks.flatMap(t => t.clips).find(c => c.id === selectedClipId)?.name || selectedClipId}` : 'No selection'}
          {' · '}S to split · Del to delete · R to ripple · Ctrl+Scroll to zoom
        </span>
      </div>
    </div>
  )
}
