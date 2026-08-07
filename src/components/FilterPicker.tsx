/**
 * FilterPicker — Instagram/TikTok-style filter selector with thumbnails and custom filter creator.
 * Shows filter grid with live preview thumbnails, category tabs, and a custom filter editor.
 */

import React, { useState, useRef, useEffect } from 'react'
import {
  FILTER_PRESETS,
  FILTER_CATEGORIES,
  getFiltersByCategory,
  getFilterById,
  createCustomFilter,
  saveCustomFilter,
  deleteCustomFilter,
  getCustomFilters,
  applyFilter,
  type FilterPreset,
  type CustomFilter,
} from '../lib/filters'
import { Plus, Trash2, RotateCcw, Check, Pencil, X } from 'lucide-react'

interface FilterPickerProps {
  activeFilterId?: string | null
  filterStrength?: number
  onFilterSelect: (filterId: string | null) => void
  onStrengthChange?: (strength: number) => void
}

// ── Filter Thumbnail ───────────────────────────────────────────────

function FilterThumbnail({
  filter,
  isActive,
  onClick,
}: {
  filter: FilterPreset
  isActive: boolean
  onClick: () => void
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    // Draw a sample gradient to show the filter effect
    const w = 64
    const h = 64
    canvas.width = w
    canvas.height = h

    // Base gradient (simulating a photo)
    const grad = ctx.createLinearGradient(0, 0, w, h)
    grad.addColorStop(0, '#4a90d9')
    grad.addColorStop(0.3, '#7ec8e3')
    grad.addColorStop(0.5, '#f5c542')
    grad.addColorStop(0.7, '#e8a87c')
    grad.addColorStop(1, '#d35d6e')
    ctx.fillStyle = grad
    ctx.fillRect(0, 0, w, h)

    // Apply the filter
    applyFilter(ctx, w, h, filter, 1)
  }, [filter])

  return (
    <button
      onClick={onClick}
      className={`relative flex flex-col items-center gap-1 p-1 rounded-lg cursor-pointer transition-all ${
        isActive
          ? 'bg-indigo-600/30 ring-2 ring-indigo-500'
          : 'bg-gray-800/50 hover:bg-gray-700/50'
      }`}
      title={filter.name}
    >
      <canvas
        ref={canvasRef}
        className="w-14 h-14 rounded-md object-cover"
        style={{ imageRendering: 'pixelated' }}
      />
      <span className="text-[9px] text-gray-300 truncate w-16 text-center">
        {filter.name}
      </span>
      {isActive && (
        <div className="absolute top-0.5 right-0.5 w-4 h-4 bg-indigo-500 rounded-full flex items-center justify-center">
          <Check size={10} className="text-white" />
        </div>
      )}
    </button>
  )
}

// ── Custom Filter Editor ───────────────────────────────────────────

function CustomFilterEditor({
  onSave,
  onCancel,
  initialFilter,
}: {
  onSave: (filter: CustomFilter) => void
  onCancel: () => void
  initialFilter?: CustomFilter
}) {
  const [name, setName] = useState(initialFilter?.name || 'My Filter')
  const [brightness, setBrightness] = useState(initialFilter?.brightness ?? 0)
  const [contrast, setContrast] = useState(initialFilter?.contrast ?? 1)
  const [saturation, setSaturation] = useState(initialFilter?.saturation ?? 1)
  const [temperature, setTemperature] = useState(initialFilter?.temperature ?? 0)
  const [tint, setTint] = useState(initialFilter?.tint ?? 0)
  const [fade, setFade] = useState(initialFilter?.fade ?? 0)
  const [vignette, setVignette] = useState(initialFilter?.vignette ?? 0)
  const [grain, setGrain] = useState(initialFilter?.grain ?? 0)
  const [hueShift, setHueShift] = useState(initialFilter?.hueShift ?? 0)

  const previewRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const canvas = previewRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    const w = 120, h = 120
    canvas.width = w
    canvas.height = h

    // Draw sample image
    const grad = ctx.createLinearGradient(0, 0, w, h)
    grad.addColorStop(0, '#4a90d9')
    grad.addColorStop(0.3, '#7ec8e3')
    grad.addColorStop(0.5, '#f5c542')
    grad.addColorStop(0.7, '#e8a87c')
    grad.addColorStop(1, '#d35d6e')
    ctx.fillStyle = grad
    ctx.fillRect(0, 0, w, h)

    // Add some shapes for visual reference
    ctx.fillStyle = 'rgba(255,255,255,0.3)'
    ctx.beginPath()
    ctx.arc(40, 40, 20, 0, Math.PI * 2)
    ctx.fill()
    ctx.fillStyle = 'rgba(0,0,0,0.2)'
    ctx.fillRect(60, 60, 40, 40)

    applyFilter(ctx, w, h, {
      id: 'preview',
      name: 'Preview',
      category: 'custom',
      brightness, contrast, saturation, vibrance: 1,
      hueShift, temperature, tint,
      highlights: 0, shadows: 0, fade, vignette, grain, sharpen: 0,
    })
  }, [brightness, contrast, saturation, temperature, tint, fade, vignette, grain, hueShift])

  const handleSave = () => {
    const filter = createCustomFilter({
      name,
      brightness, contrast, saturation, vibrance: 1,
      hueShift, temperature, tint,
      highlights: 0, shadows: 0, fade, vignette, grain, sharpen: 0,
    })
    if (initialFilter) filter.id = initialFilter.id
    saveCustomFilter(filter)
    onSave(filter)
  }

  return (
    <div className="space-y-3 p-3 bg-gray-800/50 rounded-xl">
      <div className="flex items-center justify-between">
        <span className="text-[12px] font-semibold text-gray-300">Create Filter</span>
        <button onClick={onCancel} className="text-gray-500 hover:text-white text-[11px]">Cancel</button>
      </div>

      {/* Preview */}
      <div className="flex justify-center">
        <canvas ref={previewRef} className="w-[120px] h-[120px] rounded-lg border border-gray-700" />
      </div>

      {/* Name */}
      <div>
        <label className="text-[10px] text-gray-400 mb-1 block">Name</label>
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="w-full bg-gray-700 text-white text-[11px] rounded px-2 py-1 border border-gray-600"
        />
      </div>

      {/* Sliders */}
      {[
        { label: 'Brightness', value: brightness, set: setBrightness, min: -1, max: 1, step: 0.05 },
        { label: 'Contrast', value: contrast, set: setContrast, min: 0, max: 3, step: 0.05 },
        { label: 'Saturation', value: saturation, set: setSaturation, min: 0, max: 3, step: 0.05 },
        { label: 'Temperature', value: temperature, set: setTemperature, min: -1, max: 1, step: 0.05 },
        { label: 'Tint', value: tint, set: setTint, min: -1, max: 1, step: 0.05 },
        { label: 'Hue Shift', value: hueShift, set: setHueShift, min: -180, max: 180, step: 5 },
        { label: 'Fade', value: fade, set: setFade, min: 0, max: 1, step: 0.05 },
        { label: 'Vignette', value: vignette, set: setVignette, min: 0, max: 1, step: 0.05 },
        { label: 'Grain', value: grain, set: setGrain, min: 0, max: 1, step: 0.05 },
      ].map(({ label, value, set, min, max, step }) => (
        <div key={label}>
          <label className="text-[10px] text-gray-400 mb-1 flex justify-between">
            <span>{label}</span>
            <span className="font-mono">{value.toFixed(2)}</span>
          </label>
          <input
            type="range"
            min={min}
            max={max}
            step={step}
            value={value}
            onChange={(e) => set(parseFloat(e.target.value))}
            className="w-full h-1 bg-gray-700 rounded-lg appearance-none cursor-pointer"
          />
        </div>
      ))}

      {/* Reset */}
      <button
        onClick={() => {
          setBrightness(0); setContrast(1); setSaturation(1)
          setTemperature(0); setTint(0); setHueShift(0)
          setFade(0); setVignette(0); setGrain(0)
        }}
        className="flex items-center gap-1 text-[10px] text-gray-400 hover:text-white"
      >
        <RotateCcw size={10} /> Reset all
      </button>

      {/* Save */}
      <button
        onClick={handleSave}
        className="w-full py-1.5 bg-indigo-600 text-white text-[11px] font-semibold rounded-lg hover:bg-indigo-500"
      >
        Save Filter
      </button>
    </div>
  )
}

// ── Main FilterPicker ──────────────────────────────────────────────

export default function FilterPicker({
  activeFilterId,
  filterStrength = 1,
  onFilterSelect,
  onStrengthChange,
}: FilterPickerProps) {
  const [category, setCategory] = useState('all')
  const [showCreator, setShowCreator] = useState(false)
  const [editingFilter, setEditingFilter] = useState<CustomFilter | undefined>()

  const filters = getFiltersByCategory(category)
  const activeFilter = activeFilterId ? getFilterById(activeFilterId) : null

  return (
    <div className="space-y-3">
      {/* Header */}
      <div className="flex items-center justify-between">
        <span className="text-[12px] font-semibold text-gray-300">Filters</span>
        <button
          onClick={() => { setShowCreator(true); setEditingFilter(undefined) }}
          className="flex items-center gap-1 text-[10px] text-indigo-400 hover:text-indigo-300"
        >
          <Plus size={10} /> Create
        </button>
      </div>

      {/* Category tabs */}
      <div className="flex flex-wrap gap-1">
        {FILTER_CATEGORIES.map((cat) => (
          <button
            key={cat.id}
            onClick={() => setCategory(cat.id)}
            className={`text-[9px] px-2 py-0.5 rounded-full ${
              category === cat.id
                ? 'bg-indigo-600 text-white'
                : 'bg-gray-700 text-gray-400 hover:bg-gray-600'
            }`}
          >
            {cat.name}
          </button>
        ))}
      </div>

      {/* Custom filter editor */}
      {showCreator && (
        <CustomFilterEditor
          initialFilter={editingFilter}
          onSave={(filter) => {
            setShowCreator(false)
            onFilterSelect(filter.id)
          }}
          onCancel={() => setShowCreator(false)}
        />
      )}

      {/* Filter grid */}
      {!showCreator && (
        <div className="grid grid-cols-4 gap-1.5 max-h-[300px] overflow-y-auto">
          {/* None option */}
          <button
            onClick={() => onFilterSelect(null)}
            className={`relative flex flex-col items-center gap-1 p-1 rounded-lg cursor-pointer transition-all ${
              !activeFilterId
                ? 'bg-indigo-600/30 ring-2 ring-indigo-500'
                : 'bg-gray-800/50 hover:bg-gray-700/50'
            }`}
          >
            <div className="w-14 h-14 rounded-md bg-gray-700 flex items-center justify-center">
              <span className="text-[10px] text-gray-400">None</span>
            </div>
            <span className="text-[9px] text-gray-300">Off</span>
          </button>

          {filters.map((filter) => (
            <div key={filter.id} className="relative">
              <FilterThumbnail
                filter={filter}
                isActive={filter.id === activeFilterId}
                onClick={() => onFilterSelect(filter.id)}
              />
              {/* Edit/Delete for custom filters */}
              {filter.category === 'custom' && (
                <div className="absolute top-0 left-0 flex gap-0.5">
                  <button
                    onClick={(e) => {
                      e.stopPropagation()
                      setEditingFilter(filter as CustomFilter)
                      setShowCreator(true)
                    }}
                    className="w-3.5 h-3.5 bg-gray-600 rounded text-[7px] text-white hover:bg-gray-500 flex items-center justify-center"
                  >
                    <Pencil size={8} />
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation()
                      deleteCustomFilter(filter.id)
                      if (activeFilterId === filter.id) onFilterSelect(null)
                    }}
                    className="w-3.5 h-3.5 bg-red-600 rounded text-[7px] text-white hover:bg-red-500 flex items-center justify-center"
                  >
                    <X size={8} />
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Strength slider */}
      {activeFilterId && onStrengthChange && (
        <div>
          <label className="text-[10px] text-gray-400 mb-1 flex justify-between">
            <span>Filter Strength</span>
            <span className="font-mono">{Math.round(filterStrength * 100)}%</span>
          </label>
          <input
            type="range"
            min="0"
            max="1"
            step="0.05"
            value={filterStrength}
            onChange={(e) => onStrengthChange(parseFloat(e.target.value))}
            className="w-full h-1 bg-gray-700 rounded-lg appearance-none cursor-pointer"
          />
        </div>
      )}

      {/* Active filter info */}
      {activeFilter && (
        <div className="text-[10px] text-gray-500 text-center">
          {activeFilter.name} · {activeFilter.category}
        </div>
      )}
    </div>
  )
}
