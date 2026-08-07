/**
 * Masking System — Shape, linear gradient, and freeform masks.
 * Rivals Premiere Pro's mask tracking and CapCut's shape masks.
 */

export type MaskType = 'rect' | 'ellipse' | 'linear' | 'free'

export interface Mask {
  type: MaskType
  enabled: boolean
  inverted: boolean
  feather: number           // 0-50 pixels

  // Rect
  x: number                 // 0-1 normalized
  y: number
  width: number
  height: number

  // Ellipse
  cx: number
  cy: number
  rx: number
  ry: number

  // Linear gradient
  angle: number             // degrees
  position: number          // 0-1

  // Freeform polygon
  points: Array<{ x: number; y: number }>
}

export const DEFAULT_MASK: Mask = {
  type: 'rect',
  enabled: false,
  inverted: false,
  feather: 0,
  x: 0.1, y: 0.1, width: 0.8, height: 0.8,
  cx: 0.5, cy: 0.5, rx: 0.4, ry: 0.4,
  angle: 0, position: 0.5,
  points: [],
}

/**
 * Apply a mask to the current canvas context using compositing.
 * Uses 'destination-in' compositing to clip to the mask shape.
 */
export function applyMask(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  mask: Mask,
): void {
  if (!mask.enabled) return

  ctx.save()

  // Create mask on offscreen canvas
  const maskCanvas = document.createElement('canvas')
  maskCanvas.width = w
  maskCanvas.height = h
  const mCtx = maskCanvas.getContext('2d')!

  // Draw mask shape (white = keep)
  mCtx.fillStyle = 'white'
  mCtx.beginPath()

  switch (mask.type) {
    case 'rect': {
      const pad = mask.feather
      mCtx.rect(mask.x * w - pad, mask.y * h - pad, mask.width * w + pad * 2, mask.height * h + pad * 2)
      break
    }
    case 'ellipse': {
      mCtx.ellipse(mask.cx * w, mask.cy * h, mask.rx * w, mask.ry * h, 0, 0, Math.PI * 2)
      break
    }
    case 'linear': {
      const rad = (mask.angle * Math.PI) / 180
      const cx = w / 2, cy = h / 2
      const len = Math.max(w, h)
      const dx = Math.cos(rad) * len
      const dy = Math.sin(rad) * len
      const grad = mCtx.createLinearGradient(cx - dx, cy - dy, cx + dx, cy + dy)
      const pos = mask.position
      grad.addColorStop(Math.max(0, pos - 0.01), 'white')
      grad.addColorStop(Math.min(1, pos + 0.01), 'black')
      mCtx.fillStyle = grad
      mCtx.fillRect(0, 0, w, h)
      break
    }
    case 'free': {
      if (mask.points.length < 3) break
      mCtx.moveTo(mask.points[0].x * w, mask.points[0].y * h)
      for (let i = 1; i < mask.points.length; i++) {
        mCtx.lineTo(mask.points[i].x * w, mask.points[i].y * h)
      }
      mCtx.closePath()
      break
    }
  }

  if (mask.type !== 'linear') {
    mCtx.fill()
  }

  // Apply feather if needed
  if (mask.feather > 0 && mask.type !== 'linear') {
    mCtx.filter = `blur(${mask.feather}px)`
    mCtx.drawImage(maskCanvas, 0, 0)
    mCtx.filter = 'none'
  }

  // Invert if needed
  if (mask.inverted) {
    mCtx.globalCompositeOperation = 'source-over'
    mCtx.fillStyle = 'white'
    mCtx.fillRect(0, 0, w, h)
    mCtx.globalCompositeOperation = 'destination-out'
    mCtx.drawImage(maskCanvas, 0, 0)
  }

  // Apply mask to main canvas using compositing
  ctx.globalCompositeOperation = 'destination-in'
  ctx.drawImage(maskCanvas, 0, 0)
  ctx.globalCompositeOperation = 'source-over'

  ctx.restore()
}

/**
 * Draw mask overlay (for UI preview).
 */
export function drawMaskOverlay(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  mask: Mask,
): void {
  if (!mask.enabled) return

  ctx.save()
  ctx.strokeStyle = 'rgba(0, 200, 255, 0.8)'
  ctx.lineWidth = 2
  ctx.setLineDash([6, 4])

  switch (mask.type) {
    case 'rect':
      ctx.strokeRect(mask.x * w, mask.y * h, mask.width * w, mask.height * h)
      break
    case 'ellipse':
      ctx.beginPath()
      ctx.ellipse(mask.cx * w, mask.cy * h, mask.rx * w, mask.ry * h, 0, 0, Math.PI * 2)
      ctx.stroke()
      break
    case 'linear': {
      const rad = (mask.angle * Math.PI) / 180
      const cx = w / 2, cy = h / 2
      const len = Math.max(w, h) / 2
      ctx.beginPath()
      ctx.moveTo(cx - Math.cos(rad) * len, cy - Math.sin(rad) * len)
      ctx.lineTo(cx + Math.cos(rad) * len, cy + Math.sin(rad) * len)
      ctx.stroke()
      // Draw position indicator
      const px = cx + Math.cos(rad) * len * (mask.position * 2 - 1)
      const py = cy + Math.sin(rad) * len * (mask.position * 2 - 1)
      ctx.setLineDash([])
      ctx.fillStyle = 'rgba(0, 200, 255, 1)'
      ctx.beginPath()
      ctx.arc(px, py, 5, 0, Math.PI * 2)
      ctx.fill()
      break
    }
    case 'free':
      if (mask.points.length >= 2) {
        ctx.beginPath()
        ctx.moveTo(mask.points[0].x * w, mask.points[0].y * h)
        for (let i = 1; i < mask.points.length; i++) {
          ctx.lineTo(mask.points[i].x * w, mask.points[i].y * h)
        }
        ctx.closePath()
        ctx.stroke()
      }
      break
  }

  ctx.restore()
}

// ═══════════════════════════════════════════════════════════════
// PRESET MASKS
// ═══════════════════════════════════════════════════════════════

export const MASK_PRESETS: Record<string, Partial<Mask>> = {
  'center-focus': { type: 'ellipse', cx: 0.5, cy: 0.5, rx: 0.35, ry: 0.35, feather: 15 },
  'wide-screen': { type: 'rect', x: 0, y: 0.12, width: 1, height: 0.76, feather: 0 },
  'cinematic-bars': { type: 'rect', x: 0, y: 0.08, width: 1, height: 0.84, feather: 0 },
  'vignette-mask': { type: 'ellipse', cx: 0.5, cy: 0.5, rx: 0.5, ry: 0.5, feather: 30 },
  'left-third': { type: 'rect', x: 0, y: 0, width: 0.33, height: 1, feather: 5 },
  'right-third': { type: 'rect', x: 0.67, y: 0, width: 0.33, height: 1, feather: 5 },
  'top-half': { type: 'rect', x: 0, y: 0, width: 1, height: 0.5, feather: 5 },
  'bottom-half': { type: 'rect', x: 0, y: 0.5, width: 1, height: 0.5, feather: 5 },
}
