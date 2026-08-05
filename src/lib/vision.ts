/**
 * Computer Vision Module — Face/object detection + smart reframing.
 * Uses @mediapipe/tasks-vision for face detection (BlazeFace) and object detection.
 * All processing runs client-side via WebGL/WebGPU.
 */

import { FaceDetector, FilesetResolver, type Detection } from '@mediapipe/tasks-vision'

export interface BoundingBox {
  x: number      // 0-1 normalized
  y: number
  width: number
  height: number
  confidence: number
}

export interface FrameDetections {
  frameIndex: number
  timestamp: number   // seconds
  faces: BoundingBox[]
  objects: BoundingBox[]
}

export interface TrackingPath {
  detections: FrameDetections[]
  smoothedPath: BoundingBox[]   // smoothed center-point trajectory
  targetAspect: { w: number; h: number }
  sourceAspect: { w: number; h: number }
}

// ─── Face Detector (lazy singleton) ───────────────────────────

let faceDetector: FaceDetector | null = null
let detectorReady = false
let detectorPromise: Promise<void> | null = null

export async function initFaceDetector(): Promise<void> {
  if (detectorReady) return
  if (detectorPromise) return detectorPromise

  detectorPromise = (async () => {
    try {
      const vision = await FilesetResolver.forVisionTasks(
        'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@latest/wasm'
      )
      faceDetector = await FaceDetector.createFromOptions(vision, {
        baseOptions: {
          modelAssetPath: 'https://storage.googleapis.com/mediapipe-models/face_detector/blaze_face/float16/latest/blaze_face.tflite',
          delegate: 'GPU',
        },
        runningMode: 'VIDEO',
        minDetectionConfidence: 0.5,
        minSuppressionThreshold: 0.3,
      })
      detectorReady = true
    } catch (e) {
      console.warn('[Vision] Failed to initialize face detector:', e)
      detectorPromise = null
    }
  })()

  return detectorPromise
}

export function isFaceDetectorReady(): boolean {
  return detectorReady
}

// ─── Frame Sampling ──────────────────────────────────────────

export function sampleFrameTimestamps(duration: number, sampleRateHz = 2): number[] {
  const timestamps: number[] = []
  const interval = 1 / sampleRateHz
  for (let t = 0; t < duration; t += interval) {
    timestamps.push(t)
  }
  return timestamps
}

// ─── Detection ───────────────────────────────────────────────

export function detectFacesInFrame(
  video: HTMLVideoElement,
  timestamp: number,
  frameIndex: number
): FrameDetections | null {
  if (!faceDetector || !detectorReady) return null

  try {
    const result = faceDetector.detectForVideo(video, timestamp * 1000)
    const faces: BoundingBox[] = (result.detections ?? []).map((d: Detection) => ({
      x: d.boundingBox?.originX ?? 0,
      y: d.boundingBox?.originY ?? 0,
      width: d.boundingBox?.width ?? 0,
      height: d.boundingBox?.height ?? 0,
      confidence: d.categories?.[0]?.score ?? 0,
    }))

    return {
      frameIndex,
      timestamp,
      faces,
      objects: [],  // Extend with ObjectDetector if needed
    }
  } catch {
    return null
  }
}

// ─── Temporal Smoothing (Kalman-lite) ────────────────────────

export interface SmoothingOptions {
  windowSize: number       // moving average window (frames)
  holdFrames: number       // hold last known position on miss
  velocityDamping: number  // 0-1, how much to dampen velocity changes
}

const DEFAULT_SMOOTHING: SmoothingOptions = {
  windowSize: 5,
  holdFrames: 8,
  velocityDamping: 0.7,
}

export function smoothDetections(
  detections: (FrameDetections | null)[],
  opts: SmoothingOptions = DEFAULT_SMOOTHING
): BoundingBox[] {
  const validFrames = detections.filter((d): d is FrameDetections => d !== null)
  if (validFrames.length === 0) return []

  const smoothed: BoundingBox[] = []
  const history: BoundingBox[] = []

  let lastKnown: BoundingBox | null = null
  let missCount = 0

  for (const frame of validFrames) {
    // Get best face (largest, highest confidence)
    const bestFace = frame.faces.sort((a, b) =>
      (b.confidence * b.width * b.height) - (a.confidence * a.width * a.height)
    )[0] ?? null

    if (bestFace) {
      missCount = 0
      history.push(bestFace)
      if (history.length > opts.windowSize) history.shift()

      // Moving average
      const avg: BoundingBox = {
        x: history.reduce((s, h) => s + h.x, 0) / history.length,
        y: history.reduce((s, h) => s + h.y, 0) / history.length,
        width: history.reduce((s, h) => s + h.width, 0) / history.length,
        height: history.reduce((s, h) => s + h.height, 0) / history.length,
        confidence: bestFace.confidence,
      }

      // Apply velocity damping
      if (lastKnown) {
        const dx = avg.x - lastKnown.x
        const dy = avg.y - lastKnown.y
        avg.x = lastKnown.x + dx * (1 - opts.velocityDamping)
        avg.y = lastKnown.y + dy * (1 - opts.velocityDamping)
      }

      lastKnown = avg
      smoothed.push({ ...avg })
    } else if (lastKnown && missCount < opts.holdFrames) {
      // Hold last known position
      missCount++
      smoothed.push({ ...lastKnown })
    }
  }

  return smoothed
}

// ─── Smart Crop Path Generation ──────────────────────────────

export interface CropFrame {
  timestamp: number
  cropX: number      // pixels in source video
  cropY: number
  cropW: number
  cropH: number
}

export function generateCropPath(
  smoothedPath: BoundingBox[],
  sourceWidth: number,
  sourceHeight: number,
  targetWidth: number,
  targetHeight: number,
  frameDuration: number,
  timestamps: number[]
): CropFrame[] {
  if (smoothedPath.length === 0) return []

  const targetRatio = targetWidth / targetHeight
  const sourceRatio = sourceWidth / sourceHeight

  // Determine crop dimensions
  let cropW: number, cropH: number
  if (targetRatio > sourceRatio) {
    // Target is wider than source — crop height
    cropW = sourceWidth
    cropH = sourceWidth / targetRatio
  } else {
    // Target is taller than source — crop width
    cropH = sourceHeight
    cropW = sourceHeight * targetRatio
  }

  const crops: CropFrame[] = []

  for (let i = 0; i < smoothedPath.length; i++) {
    const face = smoothedPath[i]
    const timestamp = timestamps[i] ?? (i * frameDuration)

    // Center crop on face center
    const faceCenterX = face.x + face.width / 2
    const faceCenterY = face.y + face.height / 2

    // Convert normalized to pixel coordinates
    const pixelX = faceCenterX * sourceWidth
    const pixelY = faceCenterY * sourceHeight

    // Clamp crop to source bounds
    let cropX = pixelX - cropW / 2
    let cropY = pixelY - cropH / 2
    cropX = Math.max(0, Math.min(cropX, sourceWidth - cropW))
    cropY = Math.max(0, Math.min(cropY, sourceHeight - cropH))

    crops.push({ timestamp, cropX, cropY, cropW, cropH })
  }

  // Interpolate between frames for smooth panning
  return interpolateCrops(crops, timestamps)
}

function interpolateCrops(crops: CropFrame[], timestamps: number[]): CropFrame[] {
  if (crops.length < 2) return crops

  const result: CropFrame[] = []
  let cropIdx = 0

  for (const t of timestamps) {
    // Find surrounding crops
    while (cropIdx < crops.length - 1 && crops[cropIdx + 1].timestamp <= t) cropIdx++
    const nextIdx = Math.min(cropIdx + 1, crops.length - 1)

    const c0 = crops[cropIdx]
    const c1 = crops[nextIdx]
    const dt = c1.timestamp - c0.timestamp
    const alpha = dt > 0 ? Math.max(0, Math.min(1, (t - c0.timestamp) / dt)) : 0

    // Ease-in-out interpolation
    const ease = alpha < 0.5 ? 2 * alpha * alpha : 1 - Math.pow(-2 * alpha + 2, 2) / 2

    result.push({
      timestamp: t,
      cropX: c0.cropX + (c1.cropX - c0.cropX) * ease,
      cropY: c0.cropY + (c1.cropY - c0.cropY) * ease,
      cropW: c0.cropW + (c1.cropW - c0.cropW) * ease,
      cropH: c0.cropH + (c1.cropH - c0.cropH) * ease,
    })
  }

  return result
}

// ─── Multi-Person Layout ─────────────────────────────────────

export interface LayoutRegion {
  x: number      // normalized 0-1
  y: number
  width: number
  height: number
  personIndex: number
}

export function computeMultiPersonLayout(
  detections: FrameDetections[],
  targetWidth: number,
  targetHeight: number
): LayoutRegion[] | null {
  // Find frames with 2+ faces
  const multiFace = detections.find(d => d.faces.length >= 2)
  if (!multiFace || multiFace.faces.length < 2) return null

  const numPeople = Math.min(multiFace.faces.length, 4) // max 4
  const targetRatio = targetWidth / targetHeight

  if (numPeople === 2) {
    // Side-by-side split
    const halfW = 0.5
    return multiFace.faces.slice(0, 2).map((f, i) => ({
      x: i * halfW,
      y: 0,
      width: halfW,
      height: 1,
      personIndex: i,
    }))
  }

  if (numPeople === 3) {
    // Top: 1 person, Bottom: 2 persons
    return [
      { x: 0.25, y: 0, width: 0.5, height: 0.5, personIndex: 0 },
      { x: 0, y: 0.5, width: 0.5, height: 0.5, personIndex: 1 },
      { x: 0.5, y: 0.5, width: 0.5, height: 0.5, personIndex: 2 },
    ]
  }

  // 4 persons: 2×2 grid
  return [
    { x: 0, y: 0, width: 0.5, height: 0.5, personIndex: 0 },
    { x: 0.5, y: 0, width: 0.5, height: 0.5, personIndex: 1 },
    { x: 0, y: 0.5, width: 0.5, height: 0.5, personIndex: 2 },
    { x: 0.5, y: 0.5, width: 0.5, height: 0.5, personIndex: 3 },
  ]
}

// ─── Cleanup ─────────────────────────────────────────────────

export function disposeFaceDetector(): void {
  if (faceDetector) {
    faceDetector.close()
    faceDetector = null
    detectorReady = false
    detectorPromise = null
  }
}
