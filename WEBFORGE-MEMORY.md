# WEBFORGE-MEMORY.md — ClipForge AI Build Log

## Project
Client-side clone of crayo.ai — **ClipForge AI** at `E:\Projects\clipforge-ai`.
Vite 8 + React 19 + TS + Tailwind v4. 23 features, all fully client-side.

## Build Status: COMPLETE ✅
- `npm run build` (tsc -b && vite build) → clean, ~2.8s, 401KB JS (121KB gzip)
- Playwright click-through of ALL 18 tool pages + landing + login/signup + dashboard + pricing + calculators + editor → **0 console errors**
- Full pipeline verified in browser:
  - Video Compressor: upload 4s WebM → metadata → renderComposition → **641KB compressed WebM download**
  - Editor: upload → captions script → 8+ caption styles → **full export → sample_4s_final.webm download**
  - AI Images offline provider: 4 procedural blob images + success toast
  - Online pollinations 403 → graceful error toast (no crash)

## Architecture Decisions (winning genes)
- **MediaToolShell** (`src/components/MediaToolShell.tsx`): single-file tools = dropzone → config → process → progress → result-download. Config supports `(p: Picked) => ReactNode` render-prop. `onPicked` + `onUrlLoad` hooks for metadata prefetch.
- **video.ts renderComposition()**: rAF loop → canvas → `captureStream(fps)` → MediaRecorder → WebM. Supports trim, multi-sources w/ cell/fit/offsetY, `draw()` callback for captions/bg-removal, audioLayers, AbortSignal, progress.
- **TTS**: SpeechSynthesis (browser) + StreamElements `https://api.streamelements.com/kappa/v2/speech?voice=&text=` for 27 voices.
- **AI images**: `image.pollinations.ai/prompt/...` (Flux, nologo) with deterministic offline `proceduralImage()` fallback — never blocks offline.
- **Reddit**: allorigins CORS proxy → reddit JSON API.
- **localStorage store.ts**: users/projects/session (keys cf_users/cf_session/cf_projects). Demo signup gives 3 credits.
- **Styling**: Tailwind v4 `@theme` tokens in `src/styles/index.css` (canvas `#07080a`, bg `#0c0e12`, surface/elevated/raised, accent `#5e6ad2`+`#8b5cf6`), utilities: gradient-text, accent-gradient, card, glass, grid-bg.
- Caption styles: 18 CAPTION_STYLES in `src/lib/captions.ts` rendered word-group style w/ pop/neon/karaoke/typewriter/glitch animations.

## TS Landmines (unfit mutations — DO NOT repeat)
1. `verbatimModuleSyntax` → `import type` required for type-only imports (ReactNode, CSSProperties, etc.)
2. `erasableSyntaxOnly` → NO TS enums (use union types + object maps)
3. lucide-react v1.28.0 has **NO `Cut` icon** → use `Slice`. Verified: Slice✓ Wand2✓ Scale✓ Trim✗
4. TS 6 lib: `Uint8Array` defaults to `Uint8Array<ArrayBufferLike>` — Blob rejects it. Use `Uint8Array<ArrayBuffer>[]` or `as BlobPart[]`.
5. lazy `import('lamejs')` ESM interop: encoder lives at `mod.Mp3Encoder ?? mod.default?.Mp3Encoder` — verify with a narrowing check.
6. Do NOT wrap BrowserRouter twice (main.tsx already provides it).
7. PowerShell WriteAllText with here-strings DOUBLE-ENCODED `·` (→ `Â·`) in some files — write files with Node `fs.writeFileSync(path, c, 'utf8')` instead, and re-scan bytes C3 82 C2 B7.
8. CheckItem/Card/Badge needed optional props (size/className/style) — extend ui primitives instead of fighting.
9. `noUnusedLocals/Parameters = false` in tsconfig.app.json — deliberate.

## FIXME/Backlog
- pollinations API rate-limits (403) — offline fallback covers it; future: retry w/ backoff.
- RedditStory/AutoClip network features need live network to fully verify.
- VideoCutter page h1 was "Video Sliceter" typo — fixed via rename.