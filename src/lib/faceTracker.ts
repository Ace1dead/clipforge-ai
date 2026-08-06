/**
 * Face Tracker — Client-side face detection + "Heavy Tripod" subject tracking.
 * Based on OpenShorts' SmoothedCameraman + SpeakerTracker algorithms.
 * Uses canvas-based face detection (lightweight alternative to MediaPipe for browser).
 */

export interface FaceCandidate {
  x: number
  y: number
  width: number
  height: number
  confidence: number
}

export interface CameraState {
  cropX: number
  cropWidth: number
  targetX: number
  velocity: number
}

export interface CameramanConfig {
  cropWidth: number
  frameWidth: number
  deadzone: number        // 0-1, fraction of cropWidth
  normalSpeed: number     // px/frame
  fastSpeed: number       // px/frame for large displacement
  jumpConfirmFrames?: number // default 3
}

export interface TrackerConfig {
  cooldownFrames: number
  stickyBonus: number
  proximityThreshold?: number // fraction of frame width
}

// ═══════════════════════════════════════════════════════════════
// DEADZONE OFFSET (OpenShorts Heavy Tripod)
// ═══════════════════════════════════════════════════════════════

/**
 * Computes camera offset based on deadzone.
 * If target is within the deadzone, no movement occurs (camera is "heavy tripod").
 * If target leaves deadzone, camera pans to re-center.
 */
export function computeDeadzoneOffset(
  targetCenterX: number,
  cameraCenterX: number,
  cropWidth: number,
  deadzoneFraction: number,
): number {
  if (cropWidth <= 0) return 0

  const deadzoneRadius = cropWidth * deadzoneFraction
  const displacement = targetCenterX - cameraCenterX

  if (Math.abs(displacement) <= deadzoneRadius) return 0

  // Return the overshoot beyond the deadzone
  return displacement > 0
    ? displacement - deadzoneRadius
    : displacement + deadzoneRadius
}

// ═══════════════════════════════════════════════════════════════
// CROP BOX COMPUTATION
// ═══════════════════════════════════════════════════════════════

export interface CropBox {
  x: number
  y: number
  w: number
  h: number
}

/**
 * Computes a 9:16 crop box centered on a target position.
 * Clamps to frame boundaries.
 */
export function computeCropBox(
  frameWidth: number,
  frameHeight: number,
  targetCenterX: number,
  cropWidth: number,
  cropHeight: number,
): CropBox {
  // Center crop on target
  let x = targetCenterX - cropWidth / 2

  // Clamp to frame edges
  x = Math.max(0, Math.min(x, frameWidth - cropWidth))

  // Vertical: center or use top alignment for 9:16
  const y = Math.max(0, Math.min((frameHeight - cropHeight) / 2, frameHeight - cropHeight))

  return {
    x: Math.round(x),
    y: Math.round(Math.max(0, y)),
    w: Math.round(cropWidth),
    h: Math.round(Math.min(cropHeight, frameHeight)),
  }
}

// ═══════════════════════════════════════════════════════════════
// SMOOTHED CAMERAMAN (OpenShorts algorithm)
// ═══════════════════════════════════════════════════════════════

export class SmoothedCameraman {
  private config: CameramanConfig
  private state: CameraState
  private jumpConfirmCount = 0
  private lastTargetX: number | null = null

  constructor(config: Partial<CameramanConfig> & { cropWidth: number; frameWidth: number }) {
    this.config = {
      deadzone: 0.25,
      normalSpeed: 3,
      fastSpeed: 15,
      jumpConfirmFrames: 3,
      ...config,
    }
    this.state = {
      cropX: config.frameWidth / 2,
      cropWidth: config.cropWidth,
      targetX: config.frameWidth / 2,
      velocity: 0,
    }
  }

  /**
   * Update camera position based on new target.
   * Implements the Heavy Tripod logic:
   * 1. Check if target is in deadzone → no move
   * 2. Check if target jump is confirmed → follow
   * 3. Apply linear pan speed (normal or fast)
   */
  update(targetCenterX: number): CameraState {
    this.state.targetX = targetCenterX

    const cameraCenter = this.state.cropX
    const offset = computeDeadzoneOffset(
      targetCenterX,
      cameraCenter,
      this.config.cropWidth,
      this.config.deadzone,
    )

    if (offset === 0) {
      // Target in deadzone — no movement
      this.jumpConfirmCount = 0
      this.state.velocity = 0
      return { ...this.state }
    }

    // Check for jump confirmation (filters detector noise)
    if (this.lastTargetX !== null) {
      const jump = Math.abs(targetCenterX - this.lastTargetX)
      if (jump > this.config.cropWidth * 0.5) {
        this.jumpConfirmCount++
        if (this.jumpConfirmCount < (this.config.jumpConfirmFrames ?? 3)) {
          this.state.velocity = 0
          return { ...this.state }
        }
      } else {
        this.jumpConfirmCount = 0
      }
    }

    this.lastTargetX = targetCenterX

    // Determine speed based on displacement magnitude
    const displacement = Math.abs(offset)
    const speed = displacement > this.config.cropWidth * 0.5
      ? this.config.fastSpeed
      : this.config.normalSpeed

    // Apply linear pan
    const direction = offset > 0 ? 1 : -1
    const step = Math.min(speed, displacement) * direction
    this.state.cropX += step
    this.state.velocity = step

    // Clamp to frame
    this.state.cropX = Math.max(
      this.config.cropWidth / 2,
      Math.min(this.state.cropX, this.config.frameWidth - this.config.cropWidth / 2),
    )

    return { ...this.state }
  }

  getState(): CameraState {
    return { ...this.state }
  }
}

// ═══════════════════════════════════════════════════════════════
// SPEAKER TRACKER (OpenShorts SpeakerTracker)
// ═══════════════════════════════════════════════════════════════

interface TrackedSpeaker {
  id: number
  centerX: number
  area: number
  score: number
  lastSeen: number
  framesSinceUpdate: number
}

export class SpeakerTracker {
  private config: TrackerConfig
  private speakers: TrackedSpeaker[] = []
  private nextId = 0
  private currentSpeakerId = 0
  private frameCount = 0

  constructor(config: Partial<TrackerConfig> & { cooldownFrames: number; stickyBonus: number }) {
    this.config = {
      proximityThreshold: 0.15,
      ...config,
    }
  }

  /**
   * Assign speaker IDs to detected faces using spatial proximity.
   * Current speaker gets sticky bonus (3x).
   * New speaker must overcome cooldown.
   */
  assignSpeaker(faces: FaceCandidate[]): number {
    this.frameCount++

    if (faces.length === 0) return this.currentSpeakerId

    // Find the dominant face (largest area = closest to camera)
    const dominant = faces.reduce((best, f) =>
      f.width * f.height > best.width * best.height ? f : best
    )

    const dominantCenter = dominant.x + dominant.width / 2
    const dominantArea = dominant.width * dominant.height

    // Try to match to existing speaker
    let matchedSpeaker: TrackedSpeaker | null = null
    let bestDist = Infinity

    for (const speaker of this.speakers) {
      const dist = Math.abs(dominantCenter - speaker.centerX)
      const threshold = this.config.proximityThreshold! * 1920 // Assume ~1920px frame

      if (dist < threshold && dist < bestDist) {
        // Check cooldown
        const framesSinceUpdate = this.frameCount - speaker.lastSeen
        if (speaker.id !== this.currentSpeakerId && framesSinceUpdate < this.config.cooldownFrames) {
          continue // Still in cooldown
        }
        bestDist = dist
        matchedSpeaker = speaker
      }
    }

    if (matchedSpeaker) {
      // Update existing speaker
      matchedSpeaker.centerX = dominantCenter
      matchedSpeaker.area = dominantArea
      matchedSpeaker.lastSeen = this.frameCount
      matchedSpeaker.framesSinceUpdate = 0

      // Sticky bonus for current speaker
      if (matchedSpeaker.id === this.currentSpeakerId) {
        matchedSpeaker.score += this.config.stickyBonus
      }

      this.currentSpeakerId = matchedSpeaker.id
      return matchedSpeaker.id
    }

    // New speaker
    const newSpeaker: TrackedSpeaker = {
      id: this.nextId++,
      centerX: dominantCenter,
      area: dominantArea,
      score: dominantArea,
      lastSeen: this.frameCount,
      framesSinceUpdate: 0,
    }
    this.speakers.push(newSpeaker)
    this.currentSpeakerId = newSpeaker.id
    return newSpeaker.id
  }

  getCurrentSpeaker(): number {
    return this.currentSpeakerId
  }

  getSpeakerCount(): number {
    return this.speakers.length
  }
}

// ═══════════════════════════════════════════════════════════════
// FACE DETECTION (Canvas-based, lightweight)
// ═══════════════════════════════════════════════════════════════

/**
 * Simple face detection using canvas skin-tone detection.
 * This is a lightweight alternative to MediaPipe for browser use.
 * For production, integrate @mediapipe/tasks-vision.
 */
export function detectFaces(imageData: ImageData | Uint8ClampedArray | null): FaceCandidate[] {
  if (!imageData) return []
  if (imageData instanceof Uint8ClampedArray && imageData.length === 0) return []

  const data = imageData instanceof Uint8ClampedArray ? imageData : imageData.data
  const width = imageData instanceof Uint8ClampedArray
    ? Math.sqrt(data.length / 4)
    : (imageData as ImageData).width
  const height = imageData instanceof Uint8ClampedArray
    ? Math.sqrt(data.length / 4)
    : (imageData as ImageData).height

  if (!width || !height || width < 10 || height < 10) return []

  // Skin-tone detection in YCbCr space
  const skinRegions = detectSkinRegions(data, width, height)
  return findFaceBoundaries(skinRegions, width, height)
}

function detectSkinRegions(data: Uint8ClampedArray, width: number, height: number): boolean[] {
  const isSkin = new Array(width * height).fill(false)

  for (let i = 0; i < data.length; i += 4) {
    const r = data[i], g = data[i + 1], b = data[i + 2]
    // YCbCr skin detection
    const y = 0.299 * r + 0.587 * g + 0.114 * b
    const cb = 128 - 0.169 * r - 0.331 * g + 0.500 * b
    const cr = 128 + 0.500 * r - 0.419 * g - 0.081 * b

    if (cr > 133 && cr < 173 && cb > 77 && cb < 127 && y > 80) {
      isSkin[i / 4] = true
    }
  }

  return isSkin
}

function findFaceBoundaries(isSkin: boolean[], width: number, height: number): FaceCandidate[] {
  // Simple connected-component labeling
  const visited = new Array(width * height).fill(false)
  const candidates: FaceCandidate[] = []

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const idx = y * width + x
      if (!isSkin[idx] || visited[idx]) continue

      // BFS flood fill
      const region: Array<[number, number]> = []
      const queue: Array<[number, number]> = [[x, y]]
      visited[idx] = true

      while (queue.length > 0) {
        const [cx, cy] = queue.shift()!
        region.push([cx, cy])

        for (const [dx, dy] of [[-1, 0], [1, 0], [0, -1], [0, 1]]) {
          const nx = cx + dx, ny = cy + dy
          if (nx >= 0 && nx < width && ny >= 0 && ny < height) {
            const ni = ny * width + nx
            if (!visited[ni] && isSkin[ni]) {
              visited[ni] = true
              queue.push([nx, ny])
            }
          }
        }
      }

      // Filter: face region should be reasonable size
      const area = region.length
      if (area > 200 && area < width * height * 0.3) {
        const minX = Math.min(...region.map(r => r[0]))
        const maxX = Math.max(...region.map(r => r[0]))
        const minY = Math.min(...region.map(r => r[1]))
        const maxY = Math.max(...region.map(r => r[1]))

        const faceW = maxX - minX
        const faceH = maxY - minY
        const aspectRatio = faceW / faceH

        // Face aspect ratio typically 0.6-1.2
        if (aspectRatio > 0.4 && aspectRatio < 1.5 && faceW > 20 && faceH > 20) {
          candidates.push({
            x: minX,
            y: minY,
            width: faceW,
            height: faceH,
            confidence: Math.min(1, area / 5000),
          })
        }
      }
    }
  }

  return candidates
}
