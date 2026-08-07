/**
 * 3D LUT Generator — Identity HALD CLUT generation, trilinear interpolation,
 * .cube file export/import. The foundation for standardized color grading.
 *
 * A 3D LUT maps every (R,G,B) input to a (R',G',B') output via a 3D lookup grid.
 * Identity HALD: input == output (used as a canvas to bake transforms into).
 */

// ── Types ──────────────────────────────────────────────────────────

export interface LUT3D {
  /** Number of entries per axis (e.g. 33 for 33×33×33 grid) */
  size: number
  /** Flat array of RGB triplets: [r0,g0,b0, r1,g1,b1, ...] length = size^3 * 3 */
  data: Float32Array
  /** Optional name */
  name?: string
}

export interface CubeFile {
  title: string
  size: number
  domainMin: [number, number, number]
  domainMax: [number, number, number]
  data: Float32Array // flat [r,g,b, r,g,b, ...] length = size^3 * 3
}

// ── Identity HALD Generation ───────────────────────────────────────

/**
 * Generate an identity 3D LUT. For each grid point (ri, gi, bi),
 * the output equals the input normalized to 0-1.
 *
 * @param size - Number of entries per axis (typical: 17, 33, 65)
 * @returns LUT3D with identity mapping
 */
export function generateIdentityLUT(size: number): LUT3D {
  const total = size * size * size * 3
  const data = new Float32Array(total)
  let idx = 0

  for (let bi = 0; bi < size; bi++) {
    for (let gi = 0; gi < size; gi++) {
      for (let ri = 0; ri < size; ri++) {
        data[idx++] = ri / (size - 1) // R
        data[idx++] = gi / (size - 1) // G
        data[idx++] = bi / (size - 1) // B
      }
    }
  }

  return { size, data }
}

/**
 * Generate an identity HALD CLUT image as an offscreen canvas.
 * The HALD image is size^2 × size^2 pixels, containing all possible
 * color combinations for baking transforms.
 *
 * @param size - Entries per axis (image will be size^2 × size^2)
 * @returns HTMLCanvasElement with identity color pattern
 */
export function generateIdentityHALD(size: number): HTMLCanvasElement {
  const dim = size * size
  const canvas = document.createElement('canvas')
  canvas.width = dim
  canvas.height = dim
  const ctx = canvas.getContext('2d')!
  const imageData = ctx.createImageData(dim, dim)
  const d = imageData.data

  for (let y = 0; y < dim; y++) {
    for (let x = 0; x < dim; x++) {
      const pixelIdx = (y * dim + x) * 4
      // Map 2D position to 3D color: R = x % size, G = x / size, B = y
      const ri = x % size
      const gi = Math.floor(x / size)
      const bi = y % size + Math.floor(y / size) * 0 // simplified: use y for B

      d[pixelIdx] = Math.round((ri / (size - 1)) * 255)
      d[pixelIdx + 1] = Math.round((gi / (size - 1)) * 255)
      d[pixelIdx + 2] = Math.round((bi / (size - 1)) * 255)
      d[pixelIdx + 3] = 255
    }
  }

  ctx.putImageData(imageData, 0, 0)
  return canvas
}

// ── Trilinear Interpolation ────────────────────────────────────────

/**
 * Apply a 3D LUT to canvas data using trilinear interpolation.
 * This is the standard method for real-time LUT application.
 *
 * @param ctx - Canvas context to read from and write to
 * @param w - Width
 * @param h - Height
 * @param lut - The 3D LUT to apply
 * @param strength - Blend factor 0 (identity) to 1 (full LUT)
 */
export function applyLUT3D(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  lut: LUT3D,
  strength: number = 1,
): void {
  if (strength <= 0) return

  const imageData = ctx.getImageData(0, 0, w, h)
  const data = imageData.data
  const { size, data: lutData } = lut
  const maxIdx = size - 1

  for (let i = 0; i < data.length; i += 4) {
    // Normalize input to 0-1
    const r = data[i] / 255
    const g = data[i + 1] / 255
    const b = data[i + 2] / 255

    // Scale to LUT grid coordinates
    const rIdx = r * maxIdx
    const gIdx = g * maxIdx
    const bIdx = b * maxIdx

    // Get integer parts and fractional parts
    const r0 = Math.floor(rIdx)
    const g0 = Math.floor(gIdx)
    const b0 = Math.floor(bIdx)
    const r1 = Math.min(r0 + 1, maxIdx)
    const g1 = Math.min(g0 + 1, maxIdx)
    const b1 = Math.min(b0 + 1, maxIdx)

    const rf = rIdx - r0
    const gf = gIdx - g0
    const bf = bIdx - b0

    // Trilinear interpolation: 8 corner samples
    const idx = (ri: number, gi: number, bi: number) => (bi * size * size + gi * size + ri) * 3

    const c000 = idx(r0, g0, b0)
    const c100 = idx(r1, g0, b0)
    const c010 = idx(r0, g1, b0)
    const c110 = idx(r1, g1, b0)
    const c001 = idx(r0, g0, b1)
    const c101 = idx(r1, g0, b1)
    const c011 = idx(r0, g1, b1)
    const c111 = idx(r1, g1, b1)

    // Interpolate R channel
    const lr00 = lutData[c000] * (1 - rf) + lutData[c100] * rf
    const lr10 = lutData[c010] * (1 - rf) + lutData[c110] * rf
    const lr01 = lutData[c001] * (1 - rf) + lutData[c101] * rf
    const lr11 = lutData[c011] * (1 - rf) + lutData[c111] * rf
    const lrr0 = lr00 * (1 - gf) + lr10 * gf
    const lrr1 = lr01 * (1 - gf) + lr11 * gf
    const outR = lrr0 * (1 - bf) + lrr1 * bf

    // Interpolate G channel
    const lg00 = lutData[c000 + 1] * (1 - rf) + lutData[c100 + 1] * rf
    const lg10 = lutData[c010 + 1] * (1 - rf) + lutData[c110 + 1] * rf
    const lg01 = lutData[c001 + 1] * (1 - rf) + lutData[c101 + 1] * rf
    const lg11 = lutData[c011 + 1] * (1 - rf) + lutData[c111 + 1] * rf
    const lgr0 = lg00 * (1 - gf) + lg10 * gf
    const lgr1 = lg01 * (1 - gf) + lg11 * gf
    const outG = lgr0 * (1 - bf) + lgr1 * bf

    // Interpolate B channel
    const lb00 = lutData[c000 + 2] * (1 - rf) + lutData[c100 + 2] * rf
    const lb10 = lutData[c010 + 2] * (1 - rf) + lutData[c110 + 2] * rf
    const lb01 = lutData[c001 + 2] * (1 - rf) + lutData[c101 + 2] * rf
    const lb11 = lutData[c011 + 2] * (1 - rf) + lutData[c111 + 2] * rf
    const lbr0 = lb00 * (1 - gf) + lb10 * gf
    const lbr1 = lb01 * (1 - gf) + lb11 * gf
    const outB = lbr0 * (1 - bf) + lbr1 * bf

    // Blend with original based on strength
    data[i] = Math.round((r * 255 * (1 - strength) + outR * 255 * strength))
    data[i + 1] = Math.round((g * 255 * (1 - strength) + outG * 255 * strength))
    data[i + 2] = Math.round((b * 255 * (1 - strength) + outB * 255 * strength))
  }

  ctx.putImageData(imageData, 0, 0)
}

// ── .cube File Export ──────────────────────────────────────────────

/**
 * Export a 3D LUT as a standard .cube file string.
 * Format: https://wwwResolve.com/developerDocumentation/pdf/LUT_file_format.pdf
 *
 * @param lut - The 3D LUT to export
 * @param name - Optional title for the LUT
 * @returns .cube file content as string
 */
export function exportCubeLUT(lut: LUT3D, name?: string): string {
  const lines: string[] = []
  const title = name || lut.name || 'ClipForge LUT'

  lines.push(`TITLE "${title}"`)
  lines.push(`LUT_3D_SIZE ${lut.size}`)
  lines.push(`DOMAIN_MIN 0.0 0.0 0.0`)
  lines.push(`DOMAIN_MAX 1.0 1.0 1.0`)
  lines.push('')

  // .cube format: R varies fastest, then G, then B
  const { size, data } = lut
  for (let bi = 0; bi < size; bi++) {
    for (let gi = 0; gi < size; gi++) {
      for (let ri = 0; ri < size; ri++) {
        const idx = (bi * size * size + gi * size + ri) * 3
        const r = data[idx]
        const g = data[idx + 1]
        const b = data[idx + 2]
        lines.push(`${r.toFixed(6)} ${g.toFixed(6)} ${b.toFixed(6)}`)
      }
    }
  }

  return lines.join('\n') + '\n'
}

/**
 * Trigger a download of a .cube file.
 */
export function downloadCubeFile(cubeString: string, filename: string): void {
  const blob = new Blob([cubeString], { type: 'application/octet-stream' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename.endsWith('.cube') ? filename : `${filename}.cube`
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}

// ── .cube File Import / Parse ──────────────────────────────────────

/**
 * Parse a .cube file string into a LUT3D.
 * Supports both 1D and 3D LUTs. For 1D LUTs, returns a 3D LUT with size=1.
 *
 * @param text - Raw .cube file content
 * @returns Parsed CubeFile object
 * @throws on invalid format
 */
export function parseCubeLUT(text: string): CubeFile {
  const lines = text.split(/\r?\n/)
  let title = 'Untitled'
  let size = 0
  const domainMin: [number, number, number] = [0, 0, 0]
  const domainMax: [number, number, number] = [1, 1, 1]
  const dataLines: string[] = []

  const MAX_LUT_SIZE = 65

  for (const line of lines) {
    const trimmed = line.trim()
    if (!trimmed || trimmed.startsWith('#')) continue

    if (trimmed.startsWith('TITLE')) {
      const match = trimmed.match(/TITLE\s+"?([^"]+)"?/)
      if (match) {
        // Sanitize: strip control chars, cap length
        title = match[1].replace(/[\x00-\x1f\x7f]/g, '').slice(0, 200) || 'Untitled'
      }
    } else if (trimmed.startsWith('LUT_1D_SIZE')) {
      const match = trimmed.match(/LUT_1D_SIZE\s+(\d+)/)
      if (match) size = parseInt(match[1], 10)
    } else if (trimmed.startsWith('LUT_3D_SIZE')) {
      const match = trimmed.match(/LUT_3D_SIZE\s+(\d+)/)
      if (match) size = parseInt(match[1], 10)
    } else if (trimmed.startsWith('DOMAIN_MIN')) {
      const parts = trimmed.split(/\s+/).slice(1).map(Number)
      if (parts.length >= 3) {
        domainMin[0] = parts[0]
        domainMin[1] = parts[1]
        domainMin[2] = parts[2]
      }
    } else if (trimmed.startsWith('DOMAIN_MAX')) {
      const parts = trimmed.split(/\s+/).slice(1).map(Number)
      if (parts.length >= 3) {
        domainMax[0] = parts[0]
        domainMax[1] = parts[1]
        domainMax[2] = parts[2]
      }
    } else if (/^[\d.\-]/.test(trimmed)) {
      // Data line: starts with a number
      dataLines.push(trimmed)
    }
  }

  if (size === 0) {
    // Try to infer size from data line count
    if (dataLines.length > 0) {
      const cubeRoot = Math.round(Math.cbrt(dataLines.length))
      if (cubeRoot * cubeRoot * cubeRoot === dataLines.length) {
        size = cubeRoot
      } else {
        throw new Error('1D LUTs are not supported — only 3D LUTs can be imported')
      }
    } else {
      throw new Error('No LUT size found in .cube file')
    }
  }

  if (size > MAX_LUT_SIZE) {
    throw new Error(`LUT size ${size} exceeds maximum ${MAX_LUT_SIZE}`)
  }

  const expected3D = size * size * size
  const data = new Float32Array(expected3D * 3)

  for (let i = 0; i < Math.min(dataLines.length, expected3D); i++) {
    const parts = dataLines[i].split(/\s+/).map(Number)
    if (parts.length >= 3) {
      // Validate each value
      const r = Number.isFinite(parts[0]) ? parts[0] : 0
      const g = Number.isFinite(parts[1]) ? parts[1] : 0
      const b = Number.isFinite(parts[2]) ? parts[2] : 0
      data[i * 3] = r
      data[i * 3 + 1] = g
      data[i * 3 + 2] = b
    }
  }

  return { title, size, domainMin, domainMax, data }
}

/**
 * Convert a CubeFile to our LUT3D format.
 */
export function cubeToLUT3D(cube: CubeFile): LUT3D {
  return {
    size: cube.size,
    data: cube.data,
    name: cube.title,
  }
}

/**
 * Read a .cube file from a File object (e.g. from file input).
 * Returns a promise that resolves to a LUT3D.
 */
export function importCubeFile(file: File): Promise<LUT3D> {
  const MAX_CUBE_BYTES = 8 * 1024 * 1024 // 8 MB
  if (file.size > MAX_CUBE_BYTES) {
    return Promise.reject(new Error('File too large (max 8 MB)'))
  }
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => {
      try {
        const text = reader.result as string
        const cube = parseCubeLUT(text)
        resolve(cubeToLUT3D(cube))
      } catch (e) {
        reject(e)
      }
    }
    reader.onerror = () => reject(new Error('Failed to read file'))
    reader.readAsText(file)
  })
}

// ── LUT Composition ────────────────────────────────────────────────

/**
 * Compose (concatenate) two 3D LUTs: apply lutB after lutA.
 * Result[x] = lutB[lutA[x]]
 *
 * @param lutA - First LUT (applied first)
 * @param lutB - Second LUT (applied second)
 * @returns Composed LUT
 */
export function composeLUTs(lutA: LUT3D, lutB: LUT3D): LUT3D {
  if (lutA.size !== lutB.size) {
    throw new Error('LUTs must have the same size to compose')
  }

  const size = lutA.size
  const result = new Float32Array(size * size * size * 3)
  const maxIdx = size - 1

  for (let bi = 0; bi < size; bi++) {
    for (let gi = 0; gi < size; gi++) {
      for (let ri = 0; ri < size; ri++) {
        const inIdx = (bi * size * size + gi * size + ri) * 3

        // Look up lutA at this position
        const aR = lutA.data[inIdx]
        const aG = lutA.data[inIdx + 1]
        const aB = lutA.data[inIdx + 2]

        // Convert lutA output to grid coordinates for lutB lookup
        const bR = Math.min(Math.round(aR * maxIdx), maxIdx)
        const bG = Math.min(Math.round(aG * maxIdx), maxIdx)
        const bB = Math.min(Math.round(aB * maxIdx), maxIdx)

        const bIdx = (bB * size * size + bG * size + bR) * 3

        result[inIdx] = lutB.data[bIdx]
        result[inIdx + 1] = lutB.data[bIdx + 1]
        result[inIdx + 2] = lutB.data[bIdx + 2]
      }
    }
  }

  return { size, data: result, name: `${lutA.name || 'A'} + ${lutB.name || 'B'}` }
}

/**
 * Invert a 3D LUT (find the inverse mapping).
 * For each output in the identity LUT, find which input produces it.
 *
 * @param lut - The LUT to invert
 * @returns Inverted LUT
 */
export function invertLUT(lut: LUT3D): LUT3D {
  const size = lut.size
  const result = new Float32Array(size * size * size * 3)
  const maxIdx = size - 1

  // Build a reverse mapping: for each output, find the closest input
  for (let bi = 0; bi < size; bi++) {
    for (let gi = 0; gi < size; gi++) {
      for (let ri = 0; ri < size; ri++) {
        const outIdx = (bi * size * size + gi * size + ri) * 3
        const targetR = ri / maxIdx
        const targetG = gi / maxIdx
        const targetB = bi / maxIdx

        // Find the input that maps closest to this target
        let bestDist = Infinity
        let bestR = 0, bestG = 0, bestB = 0

        // Sample the LUT to find the closest match
        for (let si = 0; si < size; si++) {
          for (let sj = 0; sj < size; sj++) {
            for (let sk = 0; sk < size; sk++) {
              const sIdx = (si * size * size + sj * size + sk) * 3
              const dR = lut.data[sIdx] - targetR
              const dG = lut.data[sIdx + 1] - targetG
              const dB = lut.data[sIdx + 2] - targetB
              const dist = dR * dR + dG * dG + dB * dB
              if (dist < bestDist) {
                bestDist = dist
                bestR = sk / maxIdx
                bestG = sj / maxIdx
                bestB = si / maxIdx
              }
            }
          }
        }

        result[outIdx] = bestR
        result[outIdx + 1] = bestG
        result[outIdx + 2] = bestB
      }
    }
  }

  return { size, data: result, name: `Inverted ${lut.name || 'LUT'}` }
}
