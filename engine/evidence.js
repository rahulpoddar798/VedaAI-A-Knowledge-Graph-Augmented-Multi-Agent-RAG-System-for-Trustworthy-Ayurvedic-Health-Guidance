const { createHash } = require('node:crypto');
const { z } = require('zod');

const hash = (value) => createHash('sha256').update(JSON.stringify(value)).digest('hex');
const field = z.string().min(1).max(4096);
const kind = z.enum([
  'classical',
  'research',
  'association',
  'rule',
  'patient',
  'derived',
  'interpretation',
]);
const source = z.object({
  kind,
  sourceId: field.nullable(),
  title: field.nullable(),
  location: field.nullable(),
  excerpt: field,
  method: z.enum(['graph', 'table', 'vector', 'input', 'registry', 'analysis']),
  fact: z.object({ subject: field, predicate: field, object: field }).nullable().default(null),
  metadata: z
    .object({
      documentId: field,
      chunkId: field,
      author: field,
      edition: field,
      page: z.number().int().positive(),
      section: field,
      verse: field,
      translation: field,
      plantPart: field,
    })
    .partial()
    .default({}),
  relevance: z.number().finite().nullable().default(null),
});
const evidence = source.extend({
  id: field,
  consultationId: z.uuid(),
  retrievedAt: z.iso.datetime(),
  verification: z.enum(['source_traceable', 'missing_provenance', 'self_reported', 'unverified']),
});
function ledger(consultationId, retrievedAt, rows) {
  const entries = new Map();
  for (const row of rows) {
    const item = source.parse(row);
    const { relevance, method, ...identity } = item;
    const id = 'ev-' + hash([consultationId, identity]);
    const verification =
      item.method === 'analysis'
        ? 'unverified'
        : item.kind === 'patient'
          ? 'self_reported'
          : ['derived', 'interpretation'].includes(item.kind)
            ? 'unverified'
            : item.sourceId && item.title && item.location
              ? 'source_traceable'
              : 'missing_provenance';
    entries.set(
      id,
      evidence.parse({ ...item, id, relevance, consultationId, retrievedAt, verification }),
    );
  }
  return [...entries.values()].sort((a, b) => a.id.localeCompare(b.id));
}
const finding = z.object({
  role: z.enum(['proponent', 'opponent']),
  category: z.enum([
    'reported_use',
    'research',
    'traditional',
    'review',
    'conflict',
    'missing',
    'inference',
  ]),
  evidenceIds: z.array(field).min(1).max(8),
  text: field,
});
const coverage = z.object({
  dimension: field,
  status: z.enum([
    'assessed',
    'not_assessed',
    'insufficient_evidence',
    'conflicting_evidence',
    'not_applicable',
    'requires_expert_review',
  ]),
  evidenceIds: z.array(field),
  findings: z.array(field),
  reason: field,
  missing: z.array(field),
  expertReview: z.boolean(),
});
const flag = z.object({
  ruleId: field,
  version: field,
  outcome: z.enum(['blocked', 'restricted', 'expert_review_required', 'permitted']),
  evidenceIds: z.array(field),
  description: field,
});
const verdict = z.object({
  id: field,
  consultationId: z.uuid(),
  policyVersion: field,
  category: z.enum([
    'blocked',
    'restricted',
    'expert_review_required',
    'insufficient_evidence',
    'permitted',
  ]),
  rules: z.array(flag),
  evidenceIds: z.array(field),
  coverage: z.array(coverage),
  missing: z.array(field),
  explanation: field,
  createdAt: z.iso.datetime(),
  expertReview: z.boolean(),
});
const stage = z.object({
  name: field,
  status: z.enum(['completed', 'unavailable', 'empty', 'invalid', 'skipped']),
});
const assessment = z
  .object({ verdict, ledger: z.array(evidence), findings: z.array(finding), stages: z.array(stage) })
  .superRefine((a, ctx) => {
    const ids = new Set(a.ledger.map((e) => e.id));
    const refs = [
      ...a.verdict.evidenceIds,
      ...[...a.findings, ...a.verdict.coverage, ...a.verdict.rules].flatMap((v) => v.evidenceIds),
    ];
    if (
      ids.size !== a.ledger.length ||
      refs.some((id) => !ids.has(id)) ||
      a.ledger.some((e) => e.consultationId !== a.verdict.consultationId)
    )
      ctx.addIssue({ code: 'custom', message: 'Invalid consultation evidence reference' });
  });
function publicResult(value) {
  const a = assessment.parse(value);
  const v = a.verdict;
  const status = v.category.toUpperCase();
  return {
    assessment: a,
    final_verdict: status,
    status,
    summary_message: v.explanation,
    evaluated_herbs: [
      ...new Set(
        a.ledger.filter((e) => e.fact?.predicate === 'catalog_identity').map((e) => e.fact.subject),
      ),
    ],
    safety_warnings: [
      ...v.rules.map((r) => r.description),
      ...a.findings.filter((f) => f.role === 'opponent').map((f) => f.text),
    ],
    missing_coverage: v.missing,
    clinical_reasoning: [],
    suggested_alternatives: [],
    disclaimer: 'Consult a qualified clinician for individual treatment.',
  };
}
module.exports = { publicResult, hash, source, ledger, finding, coverage, verdict, assessment };
