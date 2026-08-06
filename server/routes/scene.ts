import { Router } from 'express';

const router = Router();

/**
 * POST /api/scene
 * Client-driven "own engine" scene / silence analysis endpoint.
 *
 * The browser already computes a per-window RMS energy curve via
 * `analyzeEnergy` (src/lib/audio.ts). This endpoint turns that curve into a
 * concrete cut list so a clip can be exported server-side or validated before
 * burning captions. It mirrors the client-side silent-gap algorithm.
 *
 * Body: { energy: number[], windowSec: number, totalDuration: number,
 *          threshold?: number, minSilenceSec?: number, marginSec?: number,
 *          minCutSec?: number }
 * Returns: { silences: {start,end}[], cuts: {start,end}[] }
 */

interface Silence { start: number; end: number }
interface Cut { start: number; end: number }

interface SceneResult {
  silences: Silence[];
  cuts: Cut[];
}

function detectSilences(
  energy: number[],
  windowSec: number,
  threshold: number,
  minSilenceSec: number
): Silence[] {
  const out: Silence[] = [];
  let start: number | null = null;
  for (let i = 0; i < energy.length; i++) {
    const t = i * windowSec;
    const silent = energy[i] <= threshold;
    if (silent && start === null) {
      start = t;
    } else if (!silent && start !== null) {
      const len = t - start;
      if (len >= minSilenceSec) out.push({ start, end: t });
      start = null;
    }
  }
  if (start !== null) {
    const len = energy.length * windowSec - start;
    if (len >= minSilenceSec) out.push({ start, end: energy.length * windowSec });
  }
  return out;
}

function cutBySilences(
  totalDuration: number,
  silences: Silence[],
  marginSec: number,
  minCutSec: number
): Cut[] {
  const forbidden = silences.map((s) => ({
    start: Math.max(0, s.start - marginSec),
    end: s.end + marginSec,
  }));
  const cuts: Cut[] = [];
  let cursor = 0;
  for (const gap of forbidden) {
    if (gap.start > cursor) {
      const len = gap.start - cursor;
      if (len >= minCutSec) cuts.push({ start: cursor, end: gap.start });
    }
    cursor = Math.max(cursor, gap.end);
  }
  if (totalDuration - cursor >= minCutSec) cuts.push({ start: cursor, end: totalDuration });
  return cuts;
}

router.post('/', (req, res) => {
  const {
    energy,
    windowSec = 0.5,
    totalDuration,
    threshold,
    minSilenceSec = 0.4,
    marginSec = 0.1,
    minCutSec = 0.5,
  } = req.body ?? {};

  // --- Input validation (bounds CPU/memory + rejects non-finite/garbage) ---
  const validateFinite = (v: unknown): v is number =>
    typeof v === 'number' && Number.isFinite(v) && v >= 0;
  const validatePositive = (v: unknown): v is number =>
    typeof v === 'number' && Number.isFinite(v) && v > 0;

  if (
    !Array.isArray(energy) || energy.length === 0 ||
    energy.length > 20000 || !energy.every((v) => typeof v === 'number' && Number.isFinite(v))
  ) {
    res.status(400).json({ error: 'energy: number[] (1..20000 finite numbers) is required' });
    return;
  }
  if (!validatePositive(windowSec)) {
    res.status(400).json({ error: 'windowSec must be a positive finite number' });
    return;
  }
  if (totalDuration !== undefined && !validatePositive(totalDuration)) {
    res.status(400).json({ error: 'totalDuration must be a positive finite number' });
    return;
  }
  if (threshold !== undefined && !validateFinite(threshold)) {
    res.status(400).json({ error: 'threshold must be a finite number >= 0' });
    return;
  }
  if (!validateFinite(minSilenceSec)) {
    res.status(400).json({ error: 'minSilenceSec must be a finite number >= 0' });
    return;
  }
  if (!validateFinite(marginSec)) {
    res.status(400).json({ error: 'marginSec must be a finite number >= 0' });
    return;
  }
  if (!validateFinite(minCutSec)) {
    res.status(400).json({ error: 'minCutSec must be a finite number >= 0' });
    return;
  }

  const dur = totalDuration ?? energy.length * windowSec;

  // Adaptive floor from the quietest 25% (mirror of client autoThreshold).
  const thresh = threshold !== undefined
    ? threshold
    : (() => {
        const sorted = [...energy].sort((a, b) => a - b);
        const idx = Math.min(sorted.length - 1, Math.max(0, Math.floor(sorted.length * 0.25)));
        const quiet = sorted[idx];
        const peak = sorted[sorted.length - 1];
        return Math.max(quiet * 1.5, peak * 0.05);
      })();

  const silences = detectSilences(energy, windowSec, thresh, minSilenceSec);
  const cuts = cutBySilences(dur, silences, marginSec, minCutSec);
  res.json({ silences, cuts });
});

export default router;