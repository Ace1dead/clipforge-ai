import OpenAI from 'openai';
import type { AuditCapture } from './scraper.js';
import { WebsiteAuditSchema, type WebsiteAudit, type Improvement } from './schema.js';

const DEFAULT_MODEL = 'gpt-4o-mini';
const MAX_TOKENS = 4096;
const TEMPERATURE = 0.3;
const REQUEST_TIMEOUT_MS = 90_000;

const SYSTEM_PROMPT = `You are a brutally honest, highly advanced technical UI/UX engineer and 3D graphics performance auditor.

You analyze real screenshots of live websites and their raw in-browser performance telemetry, then produce a rigorous, technically-specific audit.

Rules you ALWAYS follow:
- Score ruthlessly on a 0-100 scale. 90+ is world-class; anything below ~70 needs hard, specific fixes.
- Critique concrete implementation details, never vague praise. Call out real anti-patterns when you see evidence:
  * layout thrashing / reflow-inducing properties vs GPU-composited transforms (translate3d, transform/opacity only).
  * heavy textures, non-power-of-two textures, missing mipmapping, poor texture atlasing, excessive draw calls.
  * un-optimized geometry, lack of Draco mesh / KTX2 texture compression, unbounded polygon budgets.
  * per-frame allocations, GC churn, lack of object pooling in update loops.
  * WebGL context-loss handling, missing canvas fallbacks for no-WebGL clients.
  * image/asset bloat, no lazy loading, blocking scripts before LCP paint.
- Provide actionable_improvements: each with a specific issue and a deeply explicit, step-by-step implementation-level solution.
- overall_score is the rounded average of the three subcategory scores.
- Derive every score from the screenshot evidence and telemetry given. Never invent scores with no basis in the supplied data.

Emit STRICT JSON only. No markdown fences. No prose outside the JSON object.`;

const TOPIC_LABEL = `Website topic / target audience:`;

// The exact JSON Schema mirror of the Zod schema, passed as a strict structured-output
// constraint so the model cannot drift from the core metrics blueprint.
export function buildJsonSchema(): Record<string, unknown> {
  const category = {
    type: 'object',
    additionalProperties: false,
    required: ['score', 'status', 'critique'],
    properties: {
      score: { type: 'integer', minimum: 0, maximum: 100 },
      status: { type: 'string' },
      critique: { type: 'string' },
    },
  };
  const improvement = {
    type: 'object',
    additionalProperties: false,
    required: ['id', 'priority', 'category', 'issue', 'solution'],
    properties: {
      id: { type: 'integer' },
      priority: { type: 'string', enum: ['High', 'Medium', 'Low'] },
      category: { type: 'string', enum: ['Theme', 'Interactivity', '3D Assets', 'Performance'] },
      issue: { type: 'string' },
      solution: { type: 'string' },
    },
  };
  return {
    type: 'object',
    additionalProperties: false,
    required: [
      'overall_score',
      'theme_alignment',
      'interactivity',
      'three_js_performance',
      'actionable_improvements',
    ],
    properties: {
      overall_score: { type: 'integer', minimum: 0, maximum: 100 },
      theme_alignment: category,
      interactivity: category,
      three_js_performance: category,
      actionable_improvements: { type: 'array', items: improvement },
    },
  };
}

/**
 * Salvage pass: rebuild the improvement list with enumerated repairs when the raw
 * model output contains only a small enum violation, so a single stray string
 * never discards an otherwise complete audit.
 */
function salvageImprovements(raw: unknown): Improvement[] | null {
  if (!Array.isArray(raw)) return null;
  const out: Improvement[] = [];
  for (const item of raw) {
    if (typeof item !== 'object' || item === null) continue;
    const rec = item as Record<string, unknown>;
    const priority: Improvement['priority'] = ['High', 'Medium', 'Low'].includes(rec.priority as string)
      ? (rec.priority as Improvement['priority'])
      : 'Medium';
    const category: Improvement['category'] = ['Theme', 'Interactivity', '3D Assets', 'Performance'].includes(rec.category as string)
      ? (rec.category as Improvement['category'])
      : 'Performance';
    out.push({
      id: typeof rec.id === 'number' ? rec.id : out.length,
      priority,
      category,
      issue: String(rec.issue ?? ''),
      solution: String(rec.solution ?? ''),
    });
  }
  return out.length ? out : null;
}

function coerce(data: unknown): WebsiteAudit {
  const parsed = WebsiteAuditSchema.safeParse(data);
  if (parsed.success) return parsed.data;

  if (typeof data === 'object' && data !== null) {
    const d = data as Record<string, unknown>;
    const salvage = salvageImprovements(d.actionable_improvements);
    if (salvage) {
      const repair = WebsiteAuditSchema.safeParse({ ...d, actionable_improvements: salvage });
      if (repair.success) return repair.data;
    }
  }
  throw new Error('AI response failed schema validation');
}

export class AuditConfigError extends Error {}
export class AuditProviderError extends Error {}

export async function evaluateWebsite(capture: AuditCapture, topic: string): Promise<WebsiteAudit> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    throw new AuditConfigError('OPENAI_API_KEY is not set. Configure it to run website audits.');
  }

  const client = new OpenAI({ apiKey });
  const dataUrl = `data:image/jpeg;base64,${capture.screenshotBase64}`;

  const telemetryText = JSON.stringify(capture.telemetry, null, 2);
  const userText = [
    `${TOPIC_LABEL} ${topic || 'unspecified'}`,
    `Audited URL: ${capture.url}`,
    `Page title: ${capture.title}`,
    '--- Raw performance telemetry (measured in-headless-browser) ---',
    telemetryText,
    '--- End telemetry ---',
  ].join('\n');

  const response = await client.chat.completions.create(
    {
      model: process.env.AUDIT_MODEL || DEFAULT_MODEL,
      messages: [
        { role: 'system', content: SYSTEM_PROMPT },
        { role: 'user', content: [
          { type: 'image_url', image_url: { url: dataUrl, detail: 'high' } },
          { type: 'text', text: userText },
        ] },
      ],
      max_tokens: MAX_TOKENS,
      temperature: TEMPERATURE,
      response_format: {
        type: 'json_schema',
        json_schema: {
          name: 'website_audit',
          strict: true,
          schema: buildJsonSchema(),
        },
      },
    },
    { signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS) },
  );

  const jsonText = response.choices?.[0]?.message?.content;
  if (!jsonText) throw new AuditProviderError('OpenAI returned an empty response');

  let parsed: unknown;
  try {
    parsed = JSON.parse(jsonText);
  } catch {
    // Rarely, a model wraps JSON in a code fence despite json_schema; strip it.
    const stripped = jsonText.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/i, '');
    parsed = JSON.parse(stripped);
  }

  return coerce(parsed);
}
