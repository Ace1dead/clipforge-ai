/**
 * Scene (shot) detection engine.
 * Pure helpers that turn per-frame visual descriptors (e.g. average RGB,
 * histogram bins, or edge density) into scene-change boundaries, then group
 * them into Scene ranges suitable for highlight scoring and cut planning.
 */

export type SceneBoundary = number

export interface Scene {
  start: number
  end: number
}

/** Mean absolute difference between each frame descriptor and the next. */
export function framesToDifferences(frames: number[][]): number[] {
  const out: number[] = new Array(frames.length).fill(0)
  for (let i = 0; i < frames.length - 1; i++) {
    const a = frames[i]
    const b = frames[i + 1]
    if (a.length !== b.length) continue
    let sum = 0
    for (let j = 0; j < a.length; j++) sum += Math.abs(a[j] - b[j])
    out[i] = sum / Math.max(1, a.length)
  }
  return out
}

/** Frame indices whose consecutive difference exceeds the threshold. */
export function detectSceneBoundaries(differences: number[], threshold: number): SceneBoundary[] {
  const out: SceneBoundary[] = []
  for (let i = 0; i < differences.length; i++) {
    if (differences[i] > threshold) out.push(i)
  }
  return out
}

/** Convert boundary frame indices into Scene ranges, in seconds. */
export function segmentScenes(
  boundaries: SceneBoundary[],
  totalDurationSec: number,
  frameDurationSec: number
): Scene[] {
  if (frameDurationSec <= 0 || totalDurationSec <= 0) return []
  const scenes: Scene[] = []
  let cursor = 0
  for (const b of boundaries) {
    const t = b * frameDurationSec
    if (t > cursor) scenes.push({ start: cursor, end: t })
    cursor = t
  }
  if (totalDurationSec > cursor) scenes.push({ start: cursor, end: totalDurationSec })
  return scenes
}

/** Simple engagement proxy: longer scenes are easier to cut and keep. */
export function scoreScene(scene: Scene, minScore = 0.1): number {
  const dur = scene.end - scene.start
  return minScore + Math.min(1, dur / 30)
}