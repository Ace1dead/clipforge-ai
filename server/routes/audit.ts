import { Router } from 'express';
import { scrapeWebsiteAudit } from '../services/audit/scraper.js';
import { evaluateWebsite, AuditConfigError, AuditProviderError } from '../services/audit/evaluator.js';

const router = Router();

// POST /api/audit-website
// Body: { url: string (http/https), topic: string (max 200 chars) }
router.post('/audit-website', async (req, res) => {
  try {
    const { url, topic } = (req.body ?? {}) as { url?: unknown; topic?: unknown };

    // ---- Request payload validation ----
    const urlOk = typeof url === 'string' && /^https?:\/\//i.test(url);
    const topicOk =
      typeof topic === 'string' &&
      topic.length > 0 &&
      topic.length <= 200;

    if (!urlOk || !topicOk) {
      res.status(400).json({
        error: 'Invalid request',
        message: 'Both "url" (must start with http:// or https://) and "topic" (string, 1-200 chars) are required.',
        fields: {
          url: urlOk ? 'ok' : 'invalid or missing',
          topic: topicOk ? 'ok' : 'invalid or missing (1-200 chars)',
        },
      });
      return;
    }

    // ---- Layer 1: headless scrape + telemetry (30s timeout handled inside) ----
    let capture;
    try {
      capture = await scrapeWebsiteAudit(url as string);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      // Playwright navigation timeouts surface as "Timeout ... exceeded" or net:: errors.
      res.status(504).json({
        error: 'Audit timed out',
        message: `Could not load ${url}. ${msg}`,
      });
      return;
    }

    // ---- Layer 2: structured AI evaluation ----
    let audit;
    try {
      audit = await evaluateWebsite(capture, (topic as string).slice(0, 200));
    } catch (err) {
      if (err instanceof AuditConfigError) {
        res.status(502).json({ error: 'Audit provider unavailable', message: err.message });
        return;
      }
      if (err instanceof AuditProviderError) {
        res.status(502).json({ error: 'Audit provider error', message: err.message });
        return;
      }
      // No API key configured, provider may not be available.
      throw err;
    }

    res.json({
      url: capture.url,
      title: capture.title,
      telemetry: capture.telemetry,
      audit,
    });
  } catch (err) {
    // Catch-all: the live server process must never crash on this route.
    const msg = err instanceof Error ? err.message : String(err);
    console.error('[AUDIT] Unexpected error:', msg);
    res.status(500).json({ error: 'Audit failed', message: msg });
  }
});

export default router;