/**
 * WebCodecs Hardware-Accelerated Export — H.264 MP4 via user's NVENC/QSV/VideoToolbox.
 * Falls back to MediaRecorder (WebM) → ffmpeg.wasm (MP4) when WebCodecs is unavailable.
 */

export interface WebCodecsExportOpts {
  canvas: HTMLCanvasElement
  fps: number
  duration: number
  bitrate?: number        // bits per second, default 8 Mbps
  onProgress?: (p: number) => void
  signal?: AbortSignal
}

export interface WebCodecsCapabilities {
  webCodecsSupported: boolean
  h264Supported: boolean
  hardwareAcceleration: 'hardware' | 'software' | 'unknown'
  mp4MuxerSupported: boolean
}

// ─── Capability Detection ────────────────────────────────────

export function detectWebCodecsCapabilities(): WebCodecsCapabilities {
  const webCodecsSupported = typeof VideoEncoder !== 'undefined'
  const mp4MuxerSupported = typeof globalThis.Mp4Muxer !== 'undefined'

  let h264Supported = false
  let hardwareAcceleration: 'hardware' | 'software' | 'unknown' = 'unknown'

  if (webCodecsSupported) {
    try {
      const config: VideoEncoderConfig = {
        codec: 'avc1.42001f',  // Baseline profile, Level 3.1
        width: 1920,
        height: 1080,
        bitrate: 8_000_000,
        framerate: 30,
      }
      // Check if H.264 is supported at all
      VideoEncoder.isConfigSupported(config).then(result => {
        h264Supported = result.supported
      })
    } catch { /* ignore */ }
  }

  return { webCodecsSupported, h264Supported, hardwareAcceleration, mp4MuxerSupported }
}

// ─── WebCodecs Export Pipeline ───────────────────────────────

export async function exportWithWebCodecs(opts: WebCodecsExportOpts): Promise<Blob> {
  const { canvas, fps, duration, bitrate = 8_000_000, onProgress, signal } = opts

  // Check for Mp4Muxer — if not available, throw so caller falls back
  if (typeof (globalThis as any).Mp4Muxer === 'undefined') {
    throw new Error('Mp4Muxer not loaded')
  }
  const Mp4Muxer = (globalThis as any).Mp4Muxer

  const stream = canvas.captureStream(0) // Manual frame pushing
  const track = stream.getVideoTracks()[0]

  // Collect audio tracks if present
  const audioTracks: MediaStreamTrack[] = []

  const videoChunks: EncodedVideoChunk[] = []
  let frameCount = 0
  const totalFrames = Math.ceil(duration * fps)

  // Create muxer for MP4 output
  const muxer = new Mp4Muxer.Muxer({
    video: {
      codec: 'avc',
      width: canvas.width,
      height: canvas.height,
    },
    audio: false,  // We'll add audio separately if needed
    fastStart: 'in-memory',
  })

  const outputBuffer = new Mp4Muxer.Stream({
    type: 'buffer',
    onChunk: (chunk: Uint8Array) => {
      // Collect chunks for final Blob
      videoChunks.push(chunk as any)
    },
  })
  muxer.output = outputBuffer

  // Create VideoEncoder
  let encoderResolve: (() => void) | null = null
  let encoderReject: ((e: Error) => void) | null = null

  const encoder = new VideoEncoder({
    output: (chunk: EncodedVideoChunk, metadata?: EncodedVideoChunkMetadata) => {
      const data = new Uint8Array(chunk.byteLength)
      chunk.copyTo(data)

      muxer.writeVideoFrame({
        type: chunk.type as 'key' | 'delta',
        timestamp: chunk.timestamp,
        duration: chunk.duration,
        data,
      })

      frameCount++
      onProgress?.(Math.min(0.95, frameCount / totalFrames))
    },
    error: (e: DOMException) => {
      encoderReject?.(new Error(`Encoder error: ${e.message}`))
    },
  })

  // Configure encoder with hardware acceleration preference
  await encoder.configure({
    codec: 'avc1.42001f',
    width: canvas.width,
    height: canvas.height,
    bitrate,
    framerate: fps,
    latencyMode: 'quality',
    hardwareAcceleration: 'prefer-hardware',
  })

  // Encode frames
  const ctx = canvas.getContext('2d')
  if (!ctx) throw new Error('Canvas context unavailable')

  return new Promise<Blob>((resolve, reject) => {
    encoderResolve = () => {
      try {
        muxer.finalize()
        const mp4Data = outputBuffer.toUint8Array()
        resolve(new Blob([mp4Data], { type: 'video/mp4' }))
      } catch (e) {
        reject(e instanceof Error ? e : new Error(String(e)))
      }
    }
    encoderReject = reject

    signal?.addEventListener('abort', () => {
      encoder.abort()
      reject(new Error('Export cancelled'))
    })

    // Frame pump — draw each frame and encode
    let lastTime = 0
    const frameInterval = 1 / fps

    const pumpFrame = () => {
      if (signal?.aborted) return

      const currentTime = frameCount * frameInterval
      if (currentTime >= duration) {
        // Done encoding
        encoder.flush().then(() => {
          encoderResolve?.()
        }).catch(reject)
        return
      }

      // Draw frame to canvas (caller should handle draw callback in the canvas)
      // This is a simplified version — in production, the caller would
      // update the canvas content before each pumpFrame call

      const frame = new VideoFrame(canvas, {
        timestamp: currentTime * 1_000_000,  // microseconds
        duration: frameInterval * 1_000_000,
      })

      if (encoder.encodeQueueSize < 30) {
        encoder.encode(frame, { keyFrame: frameCount % (fps * 2) === 0 })
        frame.close()
        requestAnimationFrame(pumpFrame)
      } else {
        // Backpressure — wait for encoder to catch up
        frame.close()
        setTimeout(pumpFrame, 10)
      }
    }

    requestAnimationFrame(pumpFrame)
  })
}

// ─── Fallback: MediaRecorder (WebM) ──────────────────────────

export async function exportWithMediaRecorder(
  stream: MediaStream,
  mime: string,
  bitrate: number,
  audioBitrate: number,
  onProgress?: (p: number) => void,
  signal?: AbortSignal
): Promise<Blob> {
  const recorder = new MediaRecorder(stream, {
    mimeType: mime || undefined,
    videoBitsPerSecond: bitrate,
    audioBitsPerSecond: audioBitrate,
  })

  const chunks: BlobPart[] = []
  recorder.ondataavailable = (e) => { if (e.data.size > 0) chunks.push(e.data) }

  return new Promise<Blob>((resolve, reject) => {
    recorder.onstop = () => resolve(new Blob(chunks, { type: mime || 'video/webm' }))
    recorder.onerror = () => reject(new Error('MediaRecorder error'))

    signal?.addEventListener('abort', () => {
      recorder.stop()
      reject(new Error('Export cancelled'))
    })

    recorder.start()
  })
}

// ─── Convenience: Check if hardware export is worth trying ───

export function shouldTryHardwareExport(): boolean {
  if (typeof VideoEncoder === 'undefined') return false
  // Check for discrete GPU hints (not definitive but useful)
  const canvas = document.createElement('canvas')
  const gl = canvas.getContext('webgl2') || canvas.getContext('webgl')
  if (gl) {
    const debugInfo = gl.getExtension('WEBGL_debug_renderer_info')
    if (debugInfo) {
      const renderer = gl.getParameter(debugInfo.UNMASKED_RENDERER_WEBGL)
      // Discrete GPUs typically have these in their name
      if (/NVIDIA|AMD|Radeon|GeForce|RTX|GTX/i.test(renderer)) return true
    }
  }
  return false
}
