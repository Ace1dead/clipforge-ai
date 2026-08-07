/**
 * KeyframeEditor — Property panel for editing keyframes on a selected layer.
 * Shows keyframe list, add/remove, interpolation type, and mini curve preview.
 */

import React, { useState, useRef, useCallback, useEffect } from 'react'
import type { KeyframedLayer, Keyframe, AnimatedProperty, InterpolationType } from '../lib/keyframe'
import { createKeyframe, removeKeyframe, ANIMATION_PRESETS } from '../lib/keyframe'

interface KeyframeEditorProps {
  layer: KeyframedLayer
  onLayerChange: (layer: KeyframedLayer) => void
  currentTime: number
  duration: number
  onTimeChange?: (time: number) => void
}

const INTERPOLATION_OPTIONS: { value: InterpolationType; label: string }[] = [
  { value: 'linear', label: 'Linear' },
  { value: 'ease_in', label: 'Ease In' },
  { value: 'ease_out', label: 'Ease Out' },
  { value: 'ease_in_out', label: 'Ease In/Out' },
  { value: 'step', label: 'Step' },
  { value: 'bezier', label: 'Bezier' },
]

const PRESET_NAMES = Object.keys(ANIMATION_PRESETS) as Array<keyof typeof ANIMATION_PRESETS>

// ── Mini Curve Preview ─────────────────────────────────────────────

function CurvePreview({
  keyframes,
  property,
  duration,
  width = 200,
  height = 60,
}: {
  keyframes: Keyframe[]
  property: AnimatedProperty
  duration: number
  width?: number
  height?: number
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    ctx.clearRect(0, 0, width, height)

    // Background
    ctx.fillStyle = 'rgba(30,30,50,0.6)'
    ctx.fillRect(0, 0, width, height)

    // Grid
    ctx.strokeStyle = 'rgba(100,100,140,0.2)'
    ctx.lineWidth = 0.5
    for (let x = 0; x < width; x += 20) {
      ctx.beginPath()
      ctx.moveTo(x, 0)
      ctx.lineTo(x, height)
      ctx.stroke()
    }
    for (let y = 0; y < height; y += 15) {
      ctx.beginPath()
      ctx.moveTo(0, y)
      ctx.lineTo(width, y)
      ctx.stroke()
    }

    if (keyframes.length === 0) return

    // Sort keyframes by time
    const sorted = [...keyframes].sort((a, b) => a.time - b.time)
    const minVal = Math.min(property.min ?? 0, ...sorted.map(k => k.value))
    const maxVal = Math.max(property.max ?? 100, ...sorted.map(k => k.value))
    const range = maxVal - minVal || 1

    // Draw curve
    ctx.strokeStyle = '#6366f1'
    ctx.lineWidth = 2
    ctx.beginPath()

    const steps = 100
    for (let i = 0; i <= steps; i++) {
      const t = (i / steps) * duration
      // Simple linear interpolation for preview
      let prevKf = sorted[0]
      let nextKf = sorted[sorted.length - 1]
      for (let j = 0; j < sorted.length - 1; j++) {
        if (t >= sorted[j].time && t <= sorted[j + 1].time) {
          prevKf = sorted[j]
          nextKf = sorted[j + 1]
          break
        }
      }
      const kfRange = nextKf.time - prevKf.time || 1
      const progress = (t - prevKf.time) / kfRange
      let value: number
      if (nextKf.interpolation === 'step') {
        value = progress < 1 ? prevKf.value : nextKf.value
      } else {
        value = prevKf.value + (nextKf.value - prevKf.value) * progress
      }
      const x = (i / steps) * width
      const y = height - ((value - minVal) / range) * (height - 10) - 5
      if (i === 0) ctx.moveTo(x, y)
      else ctx.lineTo(x, y)
    }
    ctx.stroke()

    // Draw keyframe dots
    for (const kf of sorted) {
      const x = (kf.time / duration) * width
      const y = height - ((kf.value - minVal) / range) * (height - 10) - 5
      ctx.fillStyle = '#a5b4fc'
      ctx.beginPath()
      ctx.arc(x, y, 3, 0, Math.PI * 2)
      ctx.fill()
    }
  }, [keyframes, property, duration, width, height])

  return (
    <canvas
      ref={canvasRef}
      width={width}
      height={height}
      className="rounded border border-gray-700"
    />
  )
}

// ── Keyframe Editor ────────────────────────────────────────────────

export default function KeyframeEditor({
  layer,
  onLayerChange,
  currentTime,
  duration,
  onTimeChange,
}: KeyframeEditorProps) {
  const [selectedProperty, setSelectedProperty] = useState<string>(
    Object.keys(layer.properties)[0] || '',
  )
  const [selectedKeyframeId, setSelectedKeyframeId] = useState<string | null>(null)

  const property = layer.properties[selectedProperty]

  const handleAddKeyframe = () => {
    if (!property) return
    const value = prompt(`Enter value for "${selectedProperty}" at t=${currentTime.toFixed(2)}s:`)
    if (value === null) return
    const numValue = parseFloat(value)
    if (isNaN(numValue)) return

    const newKf = createKeyframe(currentTime, numValue)
    const updated = {
      ...layer,
      properties: {
        ...layer.properties,
        [selectedProperty]: {
          ...property,
          keyframes: [...property.keyframes, newKf].sort((a, b) => a.time - b.time),
        },
      },
    }
    onLayerChange(updated)
  }

  const handleRemoveKeyframe = (kfId: string) => {
    if (!property) return
    const updated = {
      ...layer,
      properties: {
        ...layer.properties,
        [selectedProperty]: {
          ...property,
          keyframes: property.keyframes.filter(k => k.id !== kfId),
        },
      },
    }
    onLayerChange(updated)
    if (selectedKeyframeId === kfId) setSelectedKeyframeId(null)
  }

  const handleInterpolationChange = (kfId: string, interp: InterpolationType) => {
    if (!property) return
    const updated = {
      ...layer,
      properties: {
        ...layer.properties,
        [selectedProperty]: {
          ...property,
          keyframes: property.keyframes.map(k =>
            k.id === kfId ? { ...k, interpolation: interp } : k,
          ),
        },
      },
    }
    onLayerChange(updated)
  }

  const handleValueChange = (kfId: string, value: number) => {
    if (!property) return
    const updated = {
      ...layer,
      properties: {
        ...layer.properties,
        [selectedProperty]: {
          ...property,
          keyframes: property.keyframes.map(k =>
            k.id === kfId ? { ...k, value } : k,
          ),
        },
      },
    }
    onLayerChange(updated)
  }

  const handleApplyPreset = (presetName: keyof typeof ANIMATION_PRESETS) => {
    const fn = ANIMATION_PRESETS[presetName]
    const newProps = fn(layer.endTime - layer.startTime)
    const updated = {
      ...layer,
      properties: {
        ...layer.properties,
        ...Object.fromEntries(
          Object.entries(newProps).map(([key, prop]) => [
            key,
            {
              name: key,
              keyframes: prop.keyframes,
              defaultValue: prop.keyframes[0]?.value ?? 0,
              min: -1000,
              max: 1000,
            },
          ]),
        ),
      },
    }
    onLayerChange(updated)
  }

  const selectedKf = property?.keyframes.find(k => k.id === selectedKeyframeId)

  return (
    <div className="flex flex-col h-full bg-gray-900 rounded-lg overflow-hidden border border-gray-700">
      {/* Header */}
      <div className="flex items-center gap-2 px-3 py-2 bg-gray-850 border-b border-gray-700">
        <span className="text-xs font-semibold text-gray-300">{layer.name}</span>
        <span className="text-[10px] text-gray-500">
          {layer.startTime.toFixed(1)}s – {layer.endTime.toFixed(1)}s
        </span>
      </div>

      {/* Property selector */}
      <div className="flex flex-wrap gap-1 px-3 py-2 border-b border-gray-700">
        {Object.keys(layer.properties).map((key) => (
          <button
            key={key}
            onClick={() => {
              setSelectedProperty(key)
              setSelectedKeyframeId(null)
            }}
            className={`text-[10px] px-2 py-1 rounded ${
              selectedProperty === key
                ? 'bg-indigo-600 text-white'
                : 'bg-gray-700 text-gray-400 hover:bg-gray-600'
            }`}
          >
            {key}
          </button>
        ))}
        {Object.keys(layer.properties).length === 0 && (
          <span className="text-[10px] text-gray-500 italic">No properties</span>
        )}
      </div>

      {/* Preset buttons */}
      <div className="flex flex-wrap gap-1 px-3 py-2 border-b border-gray-700">
        <span className="text-[10px] text-gray-500 mr-1">Presets:</span>
        {PRESET_NAMES.map((name) => (
          <button
            key={name}
            onClick={() => handleApplyPreset(name)}
            className="text-[10px] px-1.5 py-0.5 bg-purple-700 text-purple-200 rounded hover:bg-purple-600"
          >
            {name}
          </button>
        ))}
      </div>

      {/* Curve preview */}
      {property && property.keyframes.length > 0 && (
        <div className="px-3 py-2 border-b border-gray-700">
          <CurvePreview
            keyframes={property.keyframes}
            property={property}
            duration={layer.endTime - layer.startTime}
            width={240}
            height={60}
          />
        </div>
      )}

      {/* Keyframe list */}
      <div className="flex-1 overflow-y-auto px-3 py-2">
        {property ? (
          <>
            <div className="flex items-center gap-2 mb-2">
              <span className="text-[10px] text-gray-400">
                {property.keyframes.length} keyframes
              </span>
              <button
                onClick={handleAddKeyframe}
                className="text-[10px] px-2 py-0.5 bg-green-600 text-white rounded hover:bg-green-500"
              >
                + Add at {currentTime.toFixed(1)}s
              </button>
            </div>

            <div className="space-y-1">
              {property.keyframes.map((kf) => (
                <div
                  key={kf.id}
                  onClick={() => setSelectedKeyframeId(kf.id)}
                  className={`flex items-center gap-2 p-1.5 rounded cursor-pointer ${
                    selectedKeyframeId === kf.id
                      ? 'bg-indigo-600/30 ring-1 ring-indigo-500'
                      : 'bg-gray-800/50 hover:bg-gray-700/50'
                  }`}
                >
                  <span className="text-[10px] text-gray-400 font-mono w-12">
                    {kf.time.toFixed(2)}s
                  </span>
                  <input
                    type="number"
                    value={kf.value}
                    onChange={(e) => handleValueChange(kf.id, parseFloat(e.target.value) || 0)}
                    className="w-16 text-[10px] bg-gray-700 text-white rounded px-1 py-0.5 border border-gray-600"
                    step="0.1"
                  />
                  <select
                    value={kf.interpolation}
                    onChange={(e) =>
                      handleInterpolationChange(kf.id, e.target.value as InterpolationType)
                    }
                    className="text-[10px] bg-gray-700 text-white rounded px-1 py-0.5 border border-gray-600"
                  >
                    {INTERPOLATION_OPTIONS.map((opt) => (
                      <option key={opt.value} value={opt.value}>
                        {opt.label}
                      </option>
                    ))}
                  </select>
                  <button
                    onClick={(e) => {
                      e.stopPropagation()
                      onTimeChange?.(kf.time)
                    }}
                    className="text-[10px] text-gray-400 hover:text-white"
                    title="Go to time"
                  >
                    ◎
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation()
                      handleRemoveKeyframe(kf.id)
                    }}
                    className="text-[10px] text-gray-400 hover:text-red-400"
                    title="Remove keyframe"
                  >
                    ×
                  </button>
                </div>
              ))}
            </div>
          </>
        ) : (
          <div className="text-center text-[10px] text-gray-500 mt-4">
            Select a property to edit keyframes
          </div>
        )}
      </div>

      {/* Status bar */}
      <div className="px-3 py-1 bg-gray-850 border-t border-gray-700 text-[10px] text-gray-500">
        {selectedKf
          ? `Keyframe @ ${selectedKf.time.toFixed(2)}s = ${selectedKf.value.toFixed(2)} (${selectedKf.interpolation})`
          : 'Click a keyframe to edit'}
      </div>
    </div>
  )
}
