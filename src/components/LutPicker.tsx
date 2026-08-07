/**
 * LutPicker — UI for selecting, importing, and extracting 3D LUTs.
 * Shows built-in LUT presets, .cube file import, and color grade extraction
 * from reference images using Reinhard transfer or paired extraction.
 */

import React, { useState, useRef, useEffect, useCallback } from 'react'
import {
  generateIdentityLUT,
  applyLUT3D,
  exportCubeLUT,
  downloadCubeFile,
  importCubeFile,
  composeLUTs,
  type LUT3D,
} from '../lib/lutGenerator'
import {
  rgbToLAB,
  labToRGB,
  computeLABStats,
  reinhardTransfer,
  extractPairedLUT,
  histogramMatchLUT,
  extractImageData,
} from '../lib/colorTransfer'
import { LUT_PRESETS } from '../lib/lutPresets'
import { Upload, Download, Wand2, Image, Sliders, X, Loader2, Check } from 'lucide-react'

// ── Built-in LUT Presets (from shared module) ──────────────────────

// Lazy-generate LUTs from presets (memoized in lutPresets.ts)
const _presetLuts = new Map<string, LUT3D>()
function getPresetLut(preset: typeof LUT_PRESETS[number]): LUT3D {
  if (!_presetLuts.has(preset.id)) {
    _presetLuts.set(preset.id, preset.generate())
  }
  return _presetLuts.get(preset.id)!
}

function getBuiltinLUTs() {
  return LUT_PRESETS.map(p => ({
    id: p.id,
    name: p.name,
    category: p.category,
    lut: getPresetLut(p),
    thumbnail: p.thumbnail,
  }))
}

const BUILTIN_LUTS = getBuiltinLUTs()

// ── Thumbnail Canvas ───────────────────────────────────────────────

function LutThumbnail({
  lut,
  isActive,
  onClick,
  gradient,
}: {
  lut: LUT3D
  isActive: boolean
  onClick: () => void
  gradient?: string
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    const w = 64, h = 64
    canvas.width = w
    canvas.height = h

    // Draw base gradient
    const grad = ctx.createLinearGradient(0, 0, w, h)
    grad.addColorStop(0, '#4a90d9')
    grad.addColorStop(0.3, '#7ec8e3')
    grad.addColorStop(0.5, '#f5c542')
    grad.addColorStop(0.7, '#e8a87c')
    grad.addColorStop(1, '#d35d6e')
    ctx.fillStyle = grad
    ctx.fillRect(0, 0, w, h)

    // Apply LUT
    applyLUT3D(ctx, w, h, lut, 1)
  }, [lut])

  return (
    <button
      onClick={onClick}
      className={`relative flex flex-col items-center gap-1 p-1 rounded-lg cursor-pointer transition-all ${
        isActive
          ? 'bg-indigo-600/30 ring-2 ring-indigo-500'
          : 'bg-gray-800/50 hover:bg-gray-700/50'
      }`}
    >
      <canvas ref={canvasRef} className="w-14 h-14 rounded-md" style={{ imageRendering: 'pixelated' }} />
      {gradient && (
        <div className="w-14 h-2 rounded-sm" style={{ background: gradient }} />
      )}
      {isActive && (
        <div className="absolute top-0.5 right-0.5 w-4 h-4 bg-indigo-500 rounded-full flex items-center justify-center">
          <Check size={10} className="text-white" />
        </div>
      )}
    </button>
  )
}

// ── Main LutPicker ─────────────────────────────────────────────────

interface LutPickerProps {
  activeLutId?: string | null
  lutStrength?: number
  onLutSelect: (lutId: string | null, lut?: LUT3D) => void
  onStrengthChange?: (strength: number) => void
  onExport?: (lut: LUT3D, name: string) => void
}

export default function LutPicker({
  activeLutId,
  lutStrength = 1,
  onLutSelect,
  onStrengthChange,
  onExport,
}: LutPickerProps) {
  const [category, setCategory] = useState('all')
  const [importing, setImporting] = useState(false)
  const [extracting, setExtracting] = useState(false)
  const [extractMethod, setExtractMethod] = useState<'reinhard' | 'paired' | 'histogram'>('reinhard')
  const [extractedLut, setExtractedLut] = useState<LUT3D | null>(null)
  const [extractedName, setExtractedName] = useState('Extracted LUT')
  const fileInputRef = useRef<HTMLInputElement>(null)
  const sourceImageRef = useRef<HTMLInputElement>(null)
  const refImageRef = useRef<HTMLInputElement>(null)

  const categories = ['all', 'basic', 'cinematic', 'vintage', 'cool', 'bw', 'artistic', 'dramatic']

  const filteredLuts = category === 'all'
    ? BUILTIN_LUTS
    : BUILTIN_LUTS.filter(l => l.category === category)

  // Handle .cube file import
  const handleImport = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setImporting(true)
    try {
      const lut = await importCubeFile(file)
      onLutSelect(`imported-${file.name}`, lut)
      toast('success', 'LUT imported', `${lut.size}×${lut.size}×${lut.size}`)
    } catch (err) {
      toast('error', 'Import failed', err instanceof Error ? err.message : undefined)
    } finally {
      setImporting(false)
      if (fileInputRef.current) fileInputRef.current.value = ''
    }
  }, [onLutSelect])

  // Handle color grade extraction
  const handleExtract = useCallback(async () => {
    const sourceFile = sourceImageRef.current?.files?.[0]
    if (!sourceFile) {
      toast('error', 'Select a source image')
      return
    }

    setExtracting(true)
    try {
      const sourceImg = await loadImage(sourceFile)
      const sourceData = extractImageData(sourceImg)

      if (extractMethod === 'paired') {
        const refFile = refImageRef.current?.files?.[0]
        if (!refFile) {
          toast('error', 'Paired extraction requires a reference (graded) image')
          setExtracting(false)
          return
        }
        const refImg = await loadImage(refFile)
        const refData = extractImageData(refImg)
        const lut = extractPairedLUT(sourceData.data, refData.data, 33, 4)
        setExtractedLut(lut)
        onLutSelect(`extracted-${Date.now()}`, lut)
        toast('success', 'LUT extracted', 'Paired extraction complete')
      } else {
        // Reinhard or histogram — needs reference image
        const refFile = refImageRef.current?.files?.[0]
        if (!refFile) {
          toast('error', 'Select a reference (graded) image to extract the look from')
          setExtracting(false)
          return
        }
        const refImg = await loadImage(refFile)
        const refData = extractImageData(refImg)

        let lut: LUT3D
        if (extractMethod === 'reinhard') {
          lut = reinhardTransfer(sourceData.data, refData.data, 4)
        } else {
          lut = histogramMatchLUT(sourceData.data, refData.data, 33, 16)
        }
        setExtractedLut(lut)
        onLutSelect(`extracted-${Date.now()}`, lut)
        toast('success', 'LUT extracted', `${extractMethod} transfer complete`)
      }
    } catch (err) {
      toast('error', 'Extraction failed', err instanceof Error ? err.message : undefined)
    } finally {
      setExtracting(false)
    }
  }, [extractMethod, onLutSelect])

  // Export current LUT
  const handleExport = useCallback(() => {
    if (!extractedLut) return
    const cube = exportCubeLUT(extractedLut, extractedName)
    downloadCubeFile(cube, `${extractedName.replace(/\s+/g, '_')}.cube`)
    onExport?.(extractedLut, extractedName)
  }, [extractedLut, extractedName, onExport])

  return (
    <div className="space-y-3">
      {/* Header */}
      <div className="flex items-center justify-between">
        <span className="text-[12px] font-semibold text-gray-300">3D LUTs</span>
        <div className="flex gap-1">
          <button
            onClick={() => fileInputRef.current?.click()}
            className="flex items-center gap-1 text-[10px] px-2 py-0.5 bg-gray-700 text-gray-300 rounded hover:bg-gray-600"
          >
            <Upload size={10} /> Import .cube
          </button>
        </div>
      </div>
      <input ref={fileInputRef} type="file" accept=".cube,.CUBE" className="hidden" onChange={handleImport} />

      {/* Category tabs */}
      <div className="flex flex-wrap gap-1">
        {categories.map(cat => (
          <button
            key={cat}
            onClick={() => setCategory(cat)}
            className={`text-[9px] px-2 py-0.5 rounded-full capitalize ${
              category === cat ? 'bg-indigo-600 text-white' : 'bg-gray-700 text-gray-400 hover:bg-gray-600'
            }`}
          >
            {cat}
          </button>
        ))}
      </div>

      {/* LUT grid */}
      <div className="grid grid-cols-4 gap-1.5 max-h-[200px] overflow-y-auto">
        {filteredLuts.map(lut => (
          <LutThumbnail
            key={lut.id}
            lut={lut.lut}
            isActive={lut.id === activeLutId}
            onClick={() => onLutSelect(lut.id, lut.lut)}
            gradient={lut.thumbnail}
          />
        ))}
      </div>

      {/* Strength slider */}
      {activeLutId && activeLutId !== 'identity' && onStrengthChange && (
        <div>
          <label className="text-[10px] text-gray-400 mb-1 flex justify-between">
            <span>LUT Strength</span>
            <span className="font-mono">{Math.round(lutStrength * 100)}%</span>
          </label>
          <input
            type="range" min="0" max="1" step="0.05" value={lutStrength}
            onChange={(e) => onStrengthChange(parseFloat(e.target.value))}
            className="w-full h-1 bg-gray-700 rounded-lg appearance-none cursor-pointer"
          />
        </div>
      )}

      {/* Export button for extracted LUTs */}
      {extractedLut && (
        <div className="flex gap-2">
          <input
            value={extractedName}
            onChange={(e) => setExtractedName(e.target.value)}
            className="flex-1 bg-gray-700 text-white text-[11px] rounded px-2 py-1 border border-gray-600"
          />
          <button
            onClick={handleExport}
            className="flex items-center gap-1 text-[10px] px-2 py-1 bg-green-600 text-white rounded hover:bg-green-500"
          >
            <Download size={10} /> Export .cube
          </button>
        </div>
      )}

      {/* Extraction section */}
      <div className="border-t border-gray-700 pt-3 space-y-2">
        <span className="text-[11px] font-semibold text-gray-300">Extract from Reference</span>

        <div className="flex gap-2">
          <select
            value={extractMethod}
            onChange={(e) => setExtractMethod(e.target.value as typeof extractMethod)}
            className="flex-1 bg-gray-700 text-white text-[10px] rounded px-2 py-1 border border-gray-600"
          >
            <option value="reinhard">Reinhard Transfer (statistical)</option>
            <option value="paired">Paired Extraction (exact)</option>
            <option value="histogram">Histogram Match (CDF)</option>
          </select>
        </div>

        <div className="space-y-1.5">
          <label className="text-[10px] text-gray-400">
            Source image (your ungraded frame):
          </label>
          <input ref={sourceImageRef} type="file" accept="image/*" className="w-full text-[10px] text-gray-400 file:mr-2 file:py-1 file:px-2 file:rounded file:border-0 file:text-[10px] file:bg-gray-700 file:text-gray-300" />

          <label className="text-[10px] text-gray-400">
            Reference image (the look you want):
          </label>
          <input ref={refImageRef} type="file" accept="image/*" className="w-full text-[10px] text-gray-400 file:mr-2 file:py-1 file:px-2 file:rounded file:border-0 file:text-[10px] file:bg-gray-700 file:text-gray-300" />
        </div>

        <button
          onClick={() => void handleExtract()}
          disabled={extracting}
          className="w-full flex items-center justify-center gap-1 py-1.5 bg-purple-600 text-white text-[11px] font-semibold rounded-lg hover:bg-purple-500 disabled:opacity-50"
        >
          {extracting ? <Loader2 size={12} className="animate-spin" /> : <Wand2 size={12} />}
          {extracting ? 'Extracting...' : 'Extract LUT'}
        </button>
      </div>
    </div>
  )
}

// ── Helpers ────────────────────────────────────────────────────────

function loadImage(file: File): Promise<HTMLImageElement> {
  const MAX_IMG_BYTES = 20 * 1024 * 1024 // 20 MB
  if (file.size > MAX_IMG_BYTES) {
    return Promise.reject(new Error('Image too large (max 20 MB)'))
  }
  return new Promise((resolve, reject) => {
    const img = new Image()
    const url = URL.createObjectURL(file)
    img.onload = () => {
      // Guard against decompression bombs
      const area = img.naturalWidth * img.naturalHeight
      if (area > 20_000_000) {
        URL.revokeObjectURL(url)
        reject(new Error('Image too large (max ~4500×4500 pixels)'))
        return
      }
      URL.revokeObjectURL(url)
      resolve(img)
    }
    img.onerror = () => {
      URL.revokeObjectURL(url)
      reject(new Error('Failed to load image'))
    }
    img.src = url
  })
}

function toast(type: 'success' | 'error' | 'info', message: string, detail?: string) {
  // Lightweight inline toast — avoids circular import with ui.tsx
  const el = document.createElement('div')
  const bgColor = type === 'success' ? 'bg-green-600' : type === 'error' ? 'bg-red-600' : 'bg-blue-600'
  el.className = `fixed bottom-5 left-1/2 -translate-x-1/2 z-[9999] ${bgColor} text-white px-4 py-2 rounded-lg text-[12px] font-medium shadow-xl anim-float-up`
  const strong = document.createElement('strong')
  strong.textContent = message
  el.appendChild(strong)
  if (detail) {
    const span = document.createElement('span')
    span.style.opacity = '0.8'
    span.style.fontWeight = '400'
    span.textContent = detail
    el.appendChild(document.createElement('br'))
    el.appendChild(span)
  }
  document.body.appendChild(el)
  setTimeout(() => el.remove(), 3000)
}
