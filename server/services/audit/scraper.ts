import { chromium, type Browser } from 'playwright';

export interface WebGLTelemetry {
  canvasCount: number;
  webgl2: boolean;
  webgl1: boolean;
  threeJs: boolean;
  babylonJs: boolean;
  r3f: boolean;
  avgFps: number;
  minFps: number;
  frameCount: number;
  resourceBytes: number;
  resourceCount: number;
  largestResourceBytes: number;
  largestResourceUrl: string;
}

export interface AuditCapture {
  url: string;
  title: string;
  screenshotBase64: string;
  telemetry: WebGLTelemetry;
  viewport: { width: number; height: number };
  durationMs: number;
}

export const DEFAULT_VIEWPORT = { width: 1440, height: 900 };
export const NAVIGATION_TIMEOUT_MS = 30_000;
export const FPS_SAMPLE_DURATION_MS = 2_000;
const SCREENSHOT_QUALITY = 70;

// Client-side telemetry probe injected into the page. Measures WebGL/3D presence,
// renders ~2s of requestAnimationFrame frames, and sums network transfer sizes.
const TELEMETRY_PROBE = `(() => {
  const SAMPLE_MS = ${FPS_SAMPLE_DURATION_MS};
  const canvasEls = Array.from(document.querySelectorAll('canvas'));

  let webgl2 = false;
  let webgl1 = false;
  for (const c of canvasEls) {
    try {
      if (c.getContext('webgl2')) webgl2 = true;
      else if (c.getContext('webgl') || c.getContext('experimental-webgl')) webgl1 = true;
    } catch (_e) { /* context blocked */ }
  }

  const threeJs = !!window.THREE;
  const babylonJs = !!window.BABYLON;
  const r3f = !!window.__R3F__ || !!window.__REACT_THREE_FIBER__;

  const resources = performance.getEntriesByType('resource');
  let resourceBytes = 0;
  let largest = 0;
  let largestUrl = '';
  for (const r of resources) {
    const size = r.transferSize || 0;
    resourceBytes += size;
    if (size > largest) { largest = size; largestUrl = r.name; }
  }

  return new Promise((resolve) => {
    let frameCount = 0;
    const frameDurations = [];
    let last = performance.now();
    const start = performance.now();

    const loop = (t) => {
      const dt = t - last;
      last = t;
      frameCount++;
      if (dt > 0) frameDurations.push(dt);
      if (t - start < SAMPLE_MS) {
        requestAnimationFrame(loop);
      } else {
        const avgFps = Math.round((frameCount / (SAMPLE_MS / 1000)) * 10) / 10;
        const worstDt = frameDurations.length ? Math.min(...frameDurations) : 16.7;
        const minFps = Math.round((1000 / worstDt) * 10) / 10;
        resolve({
          canvasCount: canvasEls.length,
          webgl2,
          webgl1,
          threeJs,
          babylonJs,
          r3f,
          avgFps,
          minFps,
          frameCount,
          resourceBytes,
          resourceCount: resources.length,
          largestResourceBytes: largest,
          largestResourceUrl: largestUrl,
        });
      }
    };
    requestAnimationFrame(loop);
  });
})()`;

export async function scrapeWebsiteAudit(inputUrl: string): Promise<AuditCapture> {
  let browser: Browser | null = null;
  const startedAt = Date.now();
  try {
    browser = await chromium.launch({
      headless: true,
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-gpu',
        '--disable-dev-shm-usage',
        '--disable-background-timer-throttling',
      ],
    });

    const page = await browser.newPage({
      viewport: DEFAULT_VIEWPORT,
      deviceScaleFactor: 1,
    });

    await page.goto(inputUrl, {
      waitUntil: 'networkidle',
      timeout: NAVIGATION_TIMEOUT_MS,
    });

    const telemetry = (await page.evaluate(TELEMETRY_PROBE)) as WebGLTelemetry;

    const screenshotBuffer = await page.screenshot({
      fullPage: true,
      type: 'jpeg',
      quality: SCREENSHOT_QUALITY,
    });

    const title = await page.title();

    return {
      url: inputUrl,
      title,
      screenshotBase64: screenshotBuffer.toString('base64'),
      telemetry,
      viewport: { ...DEFAULT_VIEWPORT },
      durationMs: Date.now() - startedAt,
    };
  } finally {
    // Guarantee the browser process is torn down even if navigation/telemetry crashes,
    // preventing zombie headless-Chromium processes from leaking memory.
    if (browser) await browser.close();
  }
}
