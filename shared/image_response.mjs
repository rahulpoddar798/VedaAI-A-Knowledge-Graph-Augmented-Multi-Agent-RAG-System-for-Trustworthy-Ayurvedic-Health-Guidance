import { z } from 'zod';

const text = z.string().max(32768);
const names = z.array(text).max(80);
const confidence = z.number().min(0).max(1).nullable();
const identity = z.object({
  canonical_name: text, botanical_name: text, sanskrit_name: text, virya: text
});
export const scanSchema = z.object({
  status: z.enum(['OUT_OF_DOMAIN', 'INSUFFICIENT_DATA', 'PARTIAL_ASSESSMENT', 'ASSESSED']),
  product_name: text, is_ayurvedic_or_herbal: z.boolean(), detected_herbs: names,
  ingredients_detected: names, formulation_type: text, visual_confidence: confidence,
  extracted_ocr_text: text, summary: text,
  catalog_verification: z.object({
    verified: z.boolean(), status_label: text, verified_herbs: z.array(identity).max(80), unverified_herbs: names
  })
});
const ingredient = identity.partial().extend({
  printed_name: text, common_name: text.nullable(), uncertain: z.boolean(),
  status: z.enum(['verified', 'unverified', 'uncertain']), reason: text.optional(), rasa: text.optional(),
  safety: z.object({ verdict: z.enum(['FLAGGED', 'CAUTION', 'INSUFFICIENT_EVIDENCE']), reasoning: names }).optional()
});
const items = z.array(ingredient).max(40);
const count = z.number().int().min(0).max(40);
export const auditSchema = z.object({
  status: z.enum(['OUT_OF_DOMAIN', 'INSUFFICIENT_DATA', 'PARTIAL_ASSESSMENT']),
  extraction: z.object({
    extraction_failed: z.literal(false), product_name: text, formulation_type: text, visual_confidence: confidence,
    extracted_ocr_text: text, summary: text, is_supplement_label: z.boolean()
  }),
  ingredients: z.object({ verified: items, unverified: items, uncertain: items }),
  auditedIngredients: items,
  summary: z.object({ totalExtracted: count, verified: count, unverified: count, uncertain: count, flagged: count, safe: z.literal(0) }),
});
export const auditResponse = auditSchema.extend({
  success: z.literal(true), auditId: z.uuid(), durationMs: z.number().int().nonnegative(), missing_coverage: names
});
