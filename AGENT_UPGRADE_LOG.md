# Agent Upgrade Log

Chronological record of self-upgrades applied to the clipforge-ai codebase by
the orchestration pipeline. Each entry captures the winning genes, unfit
mutations, and fitness verifications.

---

## 2026-08-06 — Silence / jump-cut clipping engine + scene detection

**Tier:** Large (Engine) · **GATE 1** approved · **GATE 2** pending commit

### Objective
Add the self-owned clipping-engine primitives missing from the repo's classic
ai-clipper feature matrix: silent-gap jump-cutting, scene/shot-boundary
detection, and a transcript-aligned (time-based) cut planner, driven by the
existing `analyzeEnergy` curve.

### Winning genes (kept)
- **Pure, testable engine modules** in `src/lib/editor/`:
  - `silence.ts` — `autoThreshold` (quiet-25% noise floor), `detectSilences`
    (merges adjacent quiet windows, respects `minSilenceSec`), `cutBySilences`
    (margin-expanded gap removal + `minCutSec` floor).
  - `scene.ts` — `framesToDifferences`, `detectSceneBoundaries`,
    `segmentScenes`, `scoreScene`.
  - `jumpcut.ts` — `buildJumpCutPlan(clipStart, clipEnd, silences, margin`,
    intersects silence spans with a clip window and returns the ordered kept
    sub-ranges.
- `video.ts#renderJumpCut` — renders each kept sub-range with `renderComposition`
  then stitches via ffmpeg concat demuxer; rebases `draw` time by
  `seg.start - clipBase` so captions/hooks stay aligned to the original timeline.
- `ffmpeg.ts#concatSegments` — `-f concat -c copy` path, single-blob fast path.
- `server/routes/scene.ts` — own-engine `/api/scene` mirroring the client
  algorithm (server-side validation + rate-limited).
- AutoClip: computes silences from the 1s energy curve during analysis, adds a
  "Jump-cut N silences" `Toggle`, and routes export through `renderJumpCut`.
- **Vitest** added (dev-only) as the first real test harness; `npm test`.

### Unfit mutations (rejected)
- Rendering a silence-mapped time curve through the single `renderComposition`
  — abandoned: render loop drives `master.currentTime` linearly, can't skip.
- `Infinity`/`NaN` / unbounded `energy` passthrough on the scene route —
  rejected by security review (CRITICAL DoS): now capped at 20k samples,
  `Number.isFinite`-validated, all scalars range-checked, and rate-limited.

### Fitness
- 17 unit tests green (silence ×7, scene ×5, jumpcut ×5).
- Full client+server `npm run build` clean; oxlint clean; tsc (app+server) clean.
- Security review CRITICAL fixed; re-verified with typecheck + lint.

### Files
- new: `src/lib/editor/{silence,scene,jumpcut}.ts` + `.test.ts`,
  `server/routes/scene.ts`
- edited: `src/lib/{video,ffmpeg}.ts`, `src/pages/AutoClip.tsx`,
  `server/index.ts`, `package.json`

---