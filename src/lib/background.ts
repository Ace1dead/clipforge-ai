/** Background removal via border flood-fill with color similarity (works best on uniform-ish backgrounds). */

export interface RemoveBgOpts { tolerance?: number; feather?: boolean }

/** Removes pixels similar to the border color. Mutates ImageData in place. */
export function removeBgFromData(data: Uint8ClampedArray, width: number, height: number, tolerance = 42): void {
  const visited = new Uint8Array(width * height)
  const queue = new Int32Array(width * height * 2)
  let qHead = 0
  let qTail = 0
  const push = (x: number, y: number) => {
    if (x < 0 || y < 0 || x >= width || y >= height) return
    const idx = y * width + x
    if (visited[idx]) return
    visited[idx] = 1
    queue[qTail++] = x
    queue[qTail++] = y
  }
  for (let x = 0; x < width; x++) { push(x, 0); push(x, height - 1) }
  for (let y = 0; y < height; y++) { push(0, y); push(width - 1, y) }

  const r0 = data[0], g0 = data[1], b0 = data[2]
  const tol2 = tolerance * tolerance

  while (qHead < qTail) {
    const x = queue[qHead++]
    const y = queue[qHead++]
    const idx = (y * width + x) * 4
    const r = data[idx], g = data[idx + 1], b = data[idx + 2]
    const dr = r - r0, dg = g - g0, db = b - b0
    const d = dr * dr + dg * dg + db * db
    if (d <= tol2) {
      data[idx + 3] = 0
      push(x + 1, y); push(x - 1, y); push(x, y + 1); push(x, y - 1)
    }
  }
}

/** Soften alpha edges with a cheap box blur on the alpha channel. */
export function featherAlpha(data: Uint8ClampedArray, width: number, height: number, radius = 1): void {
  const alpha = new Uint8Array(width * height)
  for (let i = 0; i < width * height; i++) alpha[i] = data[i * 4 + 3]
  const out = new Uint8Array(alpha.length)
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      let sum = 0
      let n = 0
      for (let dy = -radius; dy <= radius; dy++) {
        for (let dx = -radius; dx <= radius; dx++) {
          const nx = x + dx, ny = y + dy
          if (nx >= 0 && ny >= 0 && nx < width && ny < height) { sum += alpha[ny * width + nx]; n++ }
        }
      }
      out[y * width + x] = sum / Math.max(1, n)
    }
  }
  for (let i = 0; i < width * height; i++) data[i * 4 + 3] = out[i]
}

export async function removeBgFromCanvas(src: HTMLCanvasElement | HTMLImageElement, opts: RemoveBgOpts = {}): Promise<HTMLCanvasElement> {
  const w = src instanceof HTMLImageElement ? src.naturalWidth : src.width
  const h = src instanceof HTMLImageElement ? src.naturalHeight : src.height
  const maxSide = 1200
  const scale = Math.min(1, maxSide / Math.max(w, h))
  const outW = Math.max(1, Math.round(w * scale))
  const outH = Math.max(1, Math.round(h * scale))

  const canvas = document.createElement('canvas')
  canvas.width = outW
  canvas.height = outH
  const ctx = canvas.getContext('2d')!
  ctx.drawImage(src, 0, 0, outW, outH)
  const data = ctx.getImageData(0, 0, outW, outH)
  await new Promise<void>((resolve) => setTimeout(() => { removeBgFromData(data.data, outW, outH, opts.tolerance ?? 42); resolve() }, 0))
  if (opts.feather !== false) featherAlpha(data.data, outW, outH, 2)
  ctx.putImageData(data, 0, 0)
  return canvas
}

export function subtitleBand(h: number, pct: number): { y: number; h: number } {
  const bandH = Math.round(h * Math.max(0.08, Math.min(0.5, pct)))
  return { y: h - bandH, h: bandH }
}