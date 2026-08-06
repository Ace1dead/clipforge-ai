export interface CursorPosition {
  x: number
  y: number
  time: number
}

export interface CursorTrail {
  positions: CursorPosition[]
  smoothing: number
}

export interface ZoomEffect {
  centerX: number
  centerY: number
  zoomLevel: number
  duration: number
  startTime: number
}

export interface CursorTrackingConfig {
  trailLength: number
  smoothingFactor: number
  zoomDuration: number
  maxZoomLevel: number
  fadeTrail: boolean
  trailColor: string
  trailWidth: number
}

const DEFAULT_CURSOR_CONFIG: CursorTrackingConfig = {
  trailLength: 30,
  smoothingFactor: 0.3,
  zoomDuration: 0.5,
  maxZoomLevel: 2.5,
  fadeTrail: true,
  trailColor: 'rgba(255, 255, 255, 0.8)',
  trailWidth: 3,
}

export function createCursorTracker(config: Partial<CursorTrackingConfig> = {}) {
  const cfg = { ...DEFAULT_CURSOR_CONFIG, ...config }
  const trail: CursorPosition[] = []
  let lastPosition: CursorPosition | null = null

  function addPosition(x: number, y: number, time: number): void {
    const smoothed = lastPosition
      ? {
          x: lastPosition.x + (x - lastPosition.x) * (1 - cfg.smoothingFactor),
          y: lastPosition.y + (y - lastPosition.y) * (1 - cfg.smoothingFactor),
          time,
        }
      : { x, y, time }

    trail.push(smoothed)
    if (trail.length > cfg.trailLength) trail.shift()
    lastPosition = smoothed
  }

  function getTrail(): CursorPosition[] {
    return [...trail]
  }

  function getCurrentPosition(): CursorPosition | null {
    return lastPosition ? { ...lastPosition } : null
  }

  function detectZoomTargets(
    canvasWidth: number,
    canvasHeight: number,
    dwellThreshold = 0.5,
  ): ZoomEffect[] {
    if (trail.length < 2) return []

    const zooms: ZoomEffect[] = []
    let segmentStart = 0

    for (let i = 1; i < trail.length; i++) {
      const dist = Math.hypot(
        trail[i].x - trail[i - 1].x,
        trail[i].y - trail[i - 1].y,
      )

      const movedOutsideRadius = dist > Math.min(canvasWidth, canvasHeight) * 0.05

      if (movedOutsideRadius || i === trail.length - 1) {
        const segment = trail.slice(segmentStart, i)
        const dwellTime = segment.length > 1
          ? segment[segment.length - 1].time - segment[0].time
          : 0

        if (dwellTime >= dwellThreshold) {
          const centerX = segment.reduce((s, p) => s + p.x, 0) / segment.length / canvasWidth
          const centerY = segment.reduce((s, p) => s + p.y, 0) / segment.length / canvasHeight
          const zoomLevel = Math.min(
            cfg.maxZoomLevel,
            1 + dwellTime * 0.5,
          )

          zooms.push({
            centerX,
            centerY,
            zoomLevel,
            duration: cfg.zoomDuration,
            startTime: segment[0].time,
          })
        }

        segmentStart = i
      }
    }

    return zooms
  }

  function clear(): void {
    trail.length = 0
    lastPosition = null
  }

  function getPositionAtTime(time: number): CursorPosition | null {
    if (trail.length === 0) return null
    if (time <= trail[0].time) return trail[0]
    if (time >= trail[trail.length - 1].time) return trail[trail.length - 1]

    for (let i = 0; i < trail.length - 1; i++) {
      if (time >= trail[i].time && time <= trail[i + 1].time) {
        const t = (time - trail[i].time) / (trail[i + 1].time - trail[i].time)
        return {
          x: trail[i].x + (trail[i + 1].x - trail[i].x) * t,
          y: trail[i].y + (trail[i + 1].y - trail[i].y) * t,
          time,
        }
      }
    }

    return trail[trail.length - 1]
  }

  return {
    addPosition,
    getTrail,
    getCurrentPosition,
    detectZoomTargets,
    getPositionAtTime,
    clear,
  }
}

export function drawCursorTrail(
  ctx: CanvasRenderingContext2D,
  trail: CursorPosition[],
  config: Partial<CursorTrackingConfig> = {},
): void {
  const cfg = { ...DEFAULT_CURSOR_CONFIG, ...config }
  if (trail.length < 2) return

  ctx.save()
  ctx.lineWidth = cfg.trailWidth
  ctx.lineCap = 'round'
  ctx.lineJoin = 'round'

  for (let i = 1; i < trail.length; i++) {
    const alpha = cfg.fadeTrail ? (i / trail.length) : 1
    const [r, g, b] = parseRGBA(cfg.trailColor)
    ctx.strokeStyle = `rgba(${r}, ${g}, ${b}, ${alpha})`
    ctx.beginPath()
    ctx.moveTo(trail[i - 1].x, trail[i - 1].y)
    ctx.lineTo(trail[i].x, trail[i].y)
    ctx.stroke()
  }

  const last = trail[trail.length - 1]
  ctx.fillStyle = cfg.trailColor
  ctx.beginPath()
  ctx.arc(last.x, last.y, cfg.trailWidth * 1.5, 0, Math.PI * 2)
  ctx.fill()

  ctx.restore()
}

function parseRGBA(color: string): [number, number, number] {
  const match = color.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)/)
  if (match) return [parseInt(match[1]), parseInt(match[2]), parseInt(match[3])]
  return [255, 255, 255]
}

export function applyZoomEffect(
  ctx: CanvasRenderingContext2D,
  zoom: ZoomEffect,
  currentTime: number,
  canvasWidth: number,
  canvasHeight: number,
  drawFrame: () => void,
): void {
  const elapsed = currentTime - zoom.startTime
  const progress = Math.min(elapsed / zoom.duration, 1)

  let zoomLevel = 1
  if (progress < 0.2) {
    zoomLevel = 1 + (zoom.zoomLevel - 1) * (progress / 0.2)
  } else if (progress > 0.8) {
    zoomLevel = 1 + (zoom.zoomLevel - 1) * ((1 - progress) / 0.2)
  } else {
    zoomLevel = zoom.zoomLevel
  }

  const focusX = zoom.centerX * canvasWidth
  const focusY = zoom.centerY * canvasHeight
  const scaledW = canvasWidth / zoomLevel
  const scaledH = canvasHeight / zoomLevel
  const cropX = Math.max(0, Math.min(focusX - scaledW / 2, canvasWidth - scaledW))
  const cropY = Math.max(0, Math.min(focusY - scaledH / 2, canvasHeight - scaledH))

  ctx.save()
  ctx.beginPath()
  ctx.rect(cropX, cropY, scaledW, scaledH)
  ctx.clip()

  ctx.translate(-cropX, -cropY)
  ctx.scale(zoomLevel, zoomLevel)

  drawFrame()

  ctx.restore()
}
