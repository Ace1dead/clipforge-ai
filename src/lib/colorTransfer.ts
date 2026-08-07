/**
 * Color Transfer Engine — RGB↔LAB conversion, Reinhard statistical transfer,
 * paired LUT extraction, histogram matching. Enables extracting a color grade
 * from a reference image and applying it as a 3D LUT.
 */

import { generateIdentityLUT, type LUT3D } from './lutGenerator'

// ── RGB ↔ sRGB (linear) Conversion ─────────────────────────────────

/** sRGB gamma → linear */
function srgbToLinear(c: number): number {
  return c <= 0.04045 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4)
}

/** Linear → sRGB gamma */
function linearToSrgb(c: number): number {
  const clamped = Math.max(0, Math.min(1, c))
  return clamped <= 0.0031308 ? clamped * 12.92 : 1.055 * Math.pow(clamped, 1 / 2.4) - 0.055
}

// ── RGB ↔ XYZ (D65) ───────────────────────────────────────────────

/** RGB [0-1] → XYZ using sRGB D65 matrix */
function rgbToXyz(r: number, g: number, b: number): [number, number, number] {
  const lr = srgbToLinear(r)
  const lg = srgbToLinear(g)
  const lb = srgbToLinear(b)
  return [
    0.4124564 * lr + 0.3575761 * lg + 0.1804375 * lb,
    0.2126729 * lr + 0.7151522 * lg + 0.0721750 * lb,
    0.0193339 * lr + 0.1191920 * lg + 0.9503041 * lb,
  ]
}

/** XYZ → RGB [0-1] using sRGB D65 matrix */
function xyzToRgb(x: number, y: number, z: number): [number, number, number] {
  const r = 3.2404542 * x - 1.5371385 * y - 0.4985314 * z
  const g = -0.9692660 * x + 1.8760108 * y + 0.0415560 * z
  const b = 0.0556434 * x - 0.2040259 * y + 1.0572252 * z
  return [linearToSrgb(r), linearToSrgb(g), linearToSrgb(b)]
}

// ── XYZ ↔ CIELAB ──────────────────────────────────────────────────

// D65 white point
const XN = 0.95047
const YN = 1.0
const ZN = 1.08883

const LAB_EPSILON = 216 / 24389
const LAB_KAPPA = 24389 / 27

function labF(t: number): number {
  return t > LAB_EPSILON ? Math.cbrt(t) : (LAB_KAPPA * t + 16) / 116
}

function labFInv(t: number): number {
  const t3 = t * t * t
  return t3 > LAB_EPSILON ? t3 : (116 * t - 16) / LAB_KAPPA
}

/** XYZ → CIELAB */
function xyzToLab(x: number, y: number, z: number): [number, number, number] {
  const fx = labF(x / XN)
  const fy = labF(y / YN)
  const fz = labF(z / ZN)
  const L = 116 * fy - 16
  const a = 500 * (fx - fy)
  const b = 200 * (fy - fz)
  return [L, a, b]
}

/** CIELAB → XYZ */
function labToXyz(L: number, a: number, b: number): [number, number, number] {
  const fy = (L + 16) / 116
  const fx = a / 500 + fy
  const fz = fy - b / 200
  return [XN * labFInv(fx), YN * labFInv(fy), ZN * labFInv(fz)]
}

// ── Public RGB ↔ LAB ──────────────────────────────────────────────

/** RGB [0-255] → CIELAB [L:0-100, a:-128-127, b:-128-127] */
export function rgbToLAB(r: number, g: number, b: number): [number, number, number] {
  const [x, y, z] = rgbToXyz(r / 255, g / 255, b / 255)
  return xyzToLab(x, y, z)
}

/** CIELAB → RGB [0-255] */
export function labToRGB(L: number, a: number, b: number): [number, number, number] {
  const [x, y, z] = labToXyz(L, a, b)
  const [r, g, bb] = xyzToRgb(x, y, z)
  return [
    Math.max(0, Math.min(255, Math.round(r * 255))),
    Math.max(0, Math.min(255, Math.round(g * 255))),
    Math.max(0, Math.min(255, Math.round(bb * 255))),
  ]
}

// ── Oklab (perceptually uniform) ───────────────────────────────────

/** RGB [0-1] → Oklab [L:0-1, a:-0.4-0.4, b:-0.4-0.4] */
export function rgbToOklab(r: number, g: number, b: number): [number, number, number] {
  const lr = srgbToLinear(r)
  const lg = srgbToLinear(g)
  const lb = srgbToLinear(b)

  const l_ = 0.4122214708 * lr + 0.5363325363 * lg + 0.0514459929 * lb
  const m_ = 0.2119034982 * lr + 0.6806995451 * lg + 0.1073969566 * lb
  const s_ = 0.0883024619 * lr + 0.2817188376 * lg + 0.6299787005 * lb

  const l = Math.cbrt(l_)
  const m = Math.cbrt(m_)
  const s = Math.cbrt(s_)

  return [
    0.2104542553 * l + 0.7936177850 * m - 0.0040720468 * s,
    1.9779984951 * l - 2.4285922050 * m + 0.4505937099 * s,
    0.0259040371 * l + 0.7827717662 * m - 0.8086757660 * s,
  ]
}

/** Oklab → RGB [0-1] */
export function oklabToRgb(L: number, a: number, b: number): [number, number, number] {
  const l_ = L + 0.3963377774 * a + 0.2158037573 * b
  const m_ = L - 0.1055613458 * a - 0.0638541728 * b
  const s_ = L - 0.0894841775 * a - 1.2914855480 * b

  const l = l_ * l_ * l_
  const m = m_ * m_ * m_
  const s = s_ * s_ * s_

  const r = +4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s
  const g = -1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s
  const bVal = -0.0041960863 * l - 0.7034186147 * m + 1.7076147010 * s

  return [
    linearToSrgb(Math.max(0, Math.min(1, r))),
    linearToSrgb(Math.max(0, Math.min(1, g))),
    linearToSrgb(Math.max(0, Math.min(1, bVal))),
  ]
}

// ── LAB Statistics ─────────────────────────────────────────────────

export interface LABStats {
  meanL: number
  meanA: number
  meanB: number
  stdL: number
  stdA: number
  stdB: number
  count: number
}

/** Compute mean and stddev of LAB channels from canvas image data */
export function computeLABStats(
  data: Uint8ClampedArray,
  pixelStep: number = 4,
): LABStats {
  let sumL = 0, sumA = 0, sumB = 0
  let count = 0

  // First pass: compute means
  for (let i = 0; i < data.length; i += pixelStep * 4) {
    const [L, a, b] = rgbToLAB(data[i], data[i + 1], data[i + 2])
    sumL += L
    sumA += a
    sumB += b
    count++
  }

  if (count === 0) {
    return { meanL: 0, meanA: 0, meanB: 0, stdL: 1, stdA: 1, stdB: 1, count: 0 }
  }

  const meanL = sumL / count
  const meanA = sumA / count
  const meanB = sumB / count

  // Second pass: compute stddev
  let varL = 0, varA = 0, varB = 0
  for (let i = 0; i < data.length; i += pixelStep * 4) {
    const [L, a, b] = rgbToLAB(data[i], data[i + 1], data[i + 2])
    varL += (L - meanL) ** 2
    varA += (a - meanA) ** 2
    varB += (b - meanB) ** 2
  }

  return {
    meanL,
    meanA,
    meanB,
    stdL: Math.sqrt(varL / count) || 1,
    stdA: Math.sqrt(varA / count) || 1,
    stdB: Math.sqrt(varB / count) || 1,
    count,
  }
}

// ── Reinhard Color Transfer ────────────────────────────────────────

/**
 * Apply Reinhard color transfer: match LAB statistics of source to reference.
 * Formula: target = (source - mean_src) / std_src * std_ref + mean_ref
 *
 * @param sourceData - Original ungraded pixel data
 * @param refData - Reference graded pixel data
 * @param pixelStep - Sample every Nth pixel for speed (1 = all pixels)
 * @returns LUT3D that performs this transfer
 */
export function reinhardTransfer(
  sourceData: Uint8ClampedArray,
  refData: Uint8ClampedArray,
  pixelStep: number = 4,
): LUT3D {
  const srcStats = computeLABStats(sourceData, pixelStep)
  const refStats = computeLABStats(refData, pixelStep)

  return generateTransferLUT(srcStats, refStats)
}

/**
 * Generate a LUT from LAB statistics transfer parameters.
 * Maps the identity LUT through the Reinhard transfer formula.
 */
export function generateTransferLUT(
  srcStats: LABStats,
  refStats: LABStats,
  lutSize: number = 33,
): LUT3D {
  const identity = generateIdentityLUT(lutSize)
  const result = new Float32Array(identity.data.length)
  const maxIdx = lutSize - 1

  for (let i = 0; i < identity.data.length; i += 3) {
    // Identity LUT gives us RGB [0-1]. Convert to LAB.
    const r = Math.round(identity.data[i] * 255)
    const g = Math.round(identity.data[i + 1] * 255)
    const b = Math.round(identity.data[i + 2] * 255)

    const [L, a, bLab] = rgbToLAB(r, g, b)

    // Apply Reinhard transfer
    const newL = ((L - srcStats.meanL) / srcStats.stdL) * refStats.stdL + refStats.meanL
    const newA = ((a - srcStats.meanA) / srcStats.stdA) * refStats.stdA + refStats.meanA
    const newB = ((bLab - srcStats.meanB) / srcStats.stdB) * refStats.stdB + refStats.meanB

    // Convert back to RGB
    const [nr, ng, nb] = labToRGB(newL, newA, newB)

    result[i] = nr / 255
    result[i + 1] = ng / 255
    result[i + 2] = nb / 255
  }

  return { size: lutSize, data: result, name: 'Reinhard Transfer' }
}

// ── Paired LUT Extraction ──────────────────────────────────────────

/**
 * Extract a 3D LUT from paired ungraded + graded images.
 * Samples pixel pairs and builds a direct RGB mapping.
 *
 * @param originalData - Pixel data from ungraded frame
 * @param gradedData - Pixel data from graded frame (must be same dimensions)
 * @param lutSize - Size of output LUT (default 33)
 * @param pixelStep - Sample every Nth pixel (1 = all, higher = faster but less accurate)
 * @returns LUT3D mapping original → graded
 */
export function extractPairedLUT(
  originalData: Uint8ClampedArray,
  gradedData: Uint8ClampedArray,
  lutSize: number = 33,
  pixelStep: number = 4,
): LUT3D {
  const maxIdx = lutSize - 1
  // Accumulator: sum of output values for each grid cell
  const accumR = new Float64Array(lutSize * lutSize * lutSize)
  const accumG = new Float64Array(lutSize * lutSize * lutSize)
  const accumB = new Float64Array(lutSize * lutSize * lutSize)
  const counts = new Uint32Array(lutSize * lutSize * lutSize)

  // Sample paired pixels
  const len = Math.min(originalData.length, gradedData.length)
  for (let i = 0; i < len; i += pixelStep * 4) {
    // Input (original) → grid coordinates
    const inR = originalData[i]
    const inG = originalData[i + 1]
    const inB = originalData[i + 2]

    const gi = Math.min(Math.round(inR / 255 * maxIdx), maxIdx)
    const gIdx = Math.min(Math.round(inG / 255 * maxIdx), maxIdx)
    const gb = Math.min(Math.round(inB / 255 * maxIdx), maxIdx)

    const cellIdx = gb * lutSize * lutSize + gIdx * lutSize + gi

    // Output (graded)
    accumR[cellIdx] += gradedData[i] / 255
    accumG[cellIdx] += gradedData[i + 1] / 255
    accumB[cellIdx] += gradedData[i + 2] / 255
    counts[cellIdx]++
  }

  // Average the accumulated values
  const result = new Float32Array(lutSize * lutSize * lutSize * 3)
  for (let i = 0; i < lutSize * lutSize * lutSize; i++) {
    if (counts[i] > 0) {
      result[i * 3] = accumR[i] / counts[i]
      result[i * 3 + 1] = accumG[i] / counts[i]
      result[i * 3 + 2] = accumB[i] / counts[i]
    } else {
      // Empty cells: use identity
      const bi = Math.floor(i / (lutSize * lutSize))
      const gi2 = Math.floor((i % (lutSize * lutSize)) / lutSize)
      const ri = i % lutSize
      result[i * 3] = ri / maxIdx
      result[i * 3 + 1] = gi2 / maxIdx
      result[i * 3 + 2] = bi / maxIdx
    }
  }

  // Smooth empty cells by averaging neighbors
  smoothLUT(result, lutSize, counts)

  return { size: lutSize, data: result, name: 'Paired Extraction' }
}

/**
 * Smooth empty cells in a LUT by averaging filled neighbors.
 */
function smoothLUT(
  data: Float32Array,
  size: number,
  counts: Uint32Array,
): void {
  const maxIdx = size - 1
  const temp = new Float32Array(data.length)

  for (let bi = 0; bi < size; bi++) {
    for (let gi = 0; gi < size; gi++) {
      for (let ri = 0; ri < size; ri++) {
        const idx = bi * size * size + gi * size + ri
        if (counts[idx] > 0) {
          temp[idx * 3] = data[idx * 3]
          temp[idx * 3 + 1] = data[idx * 3 + 1]
          temp[idx * 3 + 2] = data[idx * 3 + 2]
          continue
        }

        // Average 6-connected neighbors
        let sumR = 0, sumG = 0, sumB = 0, n = 0
        const neighbors = [
          [ri - 1, gi, bi], [ri + 1, gi, bi],
          [ri, gi - 1, bi], [ri, gi + 1, bi],
          [ri, gi, bi - 1], [ri, gi, bi + 1],
        ]
        for (const [nr, ng, nb] of neighbors) {
          if (nr >= 0 && nr < size && ng >= 0 && ng < size && nb >= 0 && nb < size) {
            const ni = nb * size * size + ng * size + nr
            if (counts[ni] > 0) {
              sumR += data[ni * 3]
              sumG += data[ni * 3 + 1]
              sumB += data[ni * 3 + 2]
              n++
            }
          }
        }

        if (n > 0) {
          temp[idx * 3] = sumR / n
          temp[idx * 3 + 1] = sumG / n
          temp[idx * 3 + 2] = sumB / n
        } else {
          // Still empty: identity
          temp[idx * 3] = ri / maxIdx
          temp[idx * 3 + 1] = gi / maxIdx
          temp[idx * 3 + 2] = bi / maxIdx
        }
      }
    }
  }

  data.set(temp)
}

// ── Histogram Matching (CDF-based) ─────────────────────────────────

/**
 * Build a cumulative distribution function for a single channel.
 * @param data - Channel values [0-1]
 * @param bins - Number of histogram bins (default 256)
 * @returns CDF array of length bins
 */
function buildCDF(values: number[], bins: number = 256): Float32Array {
  const histogram = new Float32Array(bins)
  for (const v of values) {
    const bin = Math.min(Math.floor(v * bins), bins - 1)
    histogram[bin]++
  }

  // Normalize to probability
  const total = values.length || 1
  let cumsum = 0
  const cdf = new Float32Array(bins)
  for (let i = 0; i < bins; i++) {
    cumsum += histogram[i] / total
    cdf[i] = cumsum
  }

  return cdf
}

/**
 * Match the histogram of source channel to reference channel.
 * @param srcValues - Source channel values [0-1]
 * @param refValues - Reference channel values [0-1]
 * @param bins - Number of histogram bins
 * @returns Mapping function: srcValue → matchedValue
 */
function matchChannel(
  srcValues: number[],
  refValues: number[],
  bins: number = 256,
): (v: number) => number {
  const srcCDF = buildCDF(srcValues, bins)
  const refCDF = buildCDF(refValues, bins)

  return (v: number): number => {
    const bin = Math.min(Math.floor(v * bins), bins - 1)
    const srcProb = srcCDF[bin]

    // Find closest ref CDF value
    let bestBin = 0
    let bestDist = Math.abs(refCDF[0] - srcProb)
    for (let i = 1; i < bins; i++) {
      const dist = Math.abs(refCDF[i] - srcProb)
      if (dist < bestDist) {
        bestDist = dist
        bestBin = i
      }
    }

    return bestBin / (bins - 1)
  }
}

/**
 * Generate a LUT from histogram matching between source and reference images.
 * Operates in LAB space for perceptual accuracy.
 *
 * @param sourceData - Original ungraded pixel data
 * @param refData - Reference graded pixel data
 * @param lutSize - Output LUT size
 * @param pixelStep - Sample every Nth pixel
 * @returns LUT3D that performs histogram matching
 */
export function histogramMatchLUT(
  sourceData: Uint8ClampedArray,
  refData: Uint8ClampedArray,
  lutSize: number = 33,
  pixelStep: number = 16,
): LUT3D {
  // Extract LAB channels from both images
  const srcL: number[] = [], srcA: number[] = [], srcB: number[] = []
  const refL: number[] = [], refA: number[] = [], refB: number[] = []

  const len = Math.min(sourceData.length, refData.length)
  for (let i = 0; i < len; i += pixelStep * 4) {
    const [sL, sA, sB] = rgbToLAB(sourceData[i], sourceData[i + 1], sourceData[i + 2])
    const [rL, rA, rB] = rgbToLAB(refData[i], refData[i + 1], refData[i + 2])

    // Normalize L to 0-1, a and b to 0-1 (offset by 128 and scale)
    srcL.push(sL / 100)
    srcA.push((sA + 128) / 256)
    srcB.push((sB + 128) / 256)
    refL.push(rL / 100)
    refA.push((rA + 128) / 256)
    refB.push((rB + 128) / 256)
  }

  const matchL = matchChannel(srcL, refL)
  const matchA = matchChannel(srcA, refA)
  const matchB = matchChannel(srcB, refB)

  // Build LUT by applying the match to each identity grid point
  const identity = generateIdentityLUT(lutSize)
  const result = new Float32Array(identity.data.length)

  for (let i = 0; i < identity.data.length; i += 3) {
    const r = Math.round(identity.data[i] * 255)
    const g = Math.round(identity.data[i + 1] * 255)
    const b = Math.round(identity.data[i + 2] * 255)

    const [L, a, bLab] = rgbToLAB(r, g, b)

    // Apply histogram matching
    const newL = (matchL(L / 100) * 100)
    const newA = (matchA((a + 128) / 256) * 256) - 128
    const newB = (matchB((bLab + 128) / 256) * 256) - 128

    const [nr, ng, nb] = labToRGB(newL, newA, newB)

    result[i] = nr / 255
    result[i + 1] = ng / 255
    result[i + 2] = nb / 255
  }

  return { size: lutSize, data: result, name: 'Histogram Match' }
}

// ── Image Data Extraction Helpers ──────────────────────────────────

/**
 * Extract pixel data from a canvas or image element.
 * Returns Uint8ClampedArray of RGBA pixel data.
 */
export function extractImageData(
  source: HTMLCanvasElement | HTMLImageElement,
  maxSize: number = 512,
): { data: Uint8ClampedArray; width: number; height: number } {
  const canvas = document.createElement('canvas')
  const ctx = canvas.getContext('2d')!

  let w = source instanceof HTMLCanvasElement ? source.width : source.naturalWidth
  let h = source instanceof HTMLCanvasElement ? source.height : source.naturalHeight

  // Downscale for performance
  if (w > maxSize || h > maxSize) {
    const scale = maxSize / Math.max(w, h)
    w = Math.round(w * scale)
    h = Math.round(h * scale)
  }

  canvas.width = w
  canvas.height = h
  ctx.drawImage(source, 0, 0, w, h)

  return { data: ctx.getImageData(0, 0, w, h).data, width: w, height: h }
}
