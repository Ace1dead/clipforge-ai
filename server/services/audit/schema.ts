import { z } from 'zod';

// Hard schema enforcing the exact core-metrics blueprint for structured AI output.
// Any response deviating from this shape is rejected before it reaches the client.

export const AuditCategorySchema = z.object({
  score: z.number().int().min(0).max(100),
  status: z.string(),
  critique: z.string(),
});

export const ImprovementSchema = z.object({
  id: z.number().int(),
  priority: z.enum(['High', 'Medium', 'Low']),
  category: z.enum(['Theme', 'Interactivity', '3D Assets', 'Performance']),
  issue: z.string(),
  solution: z.string(),
});

export const WebsiteAuditSchema = z.object({
  overall_score: z.number().int().min(0).max(100),
  theme_alignment: AuditCategorySchema,
  interactivity: AuditCategorySchema,
  three_js_performance: AuditCategorySchema,
  actionable_improvements: z.array(ImprovementSchema).min(1),
});

export type WebsiteAudit = z.infer<typeof WebsiteAuditSchema>;
export type AuditCategory = z.infer<typeof AuditCategorySchema>;
export type Improvement = z.infer<typeof ImprovementSchema>;