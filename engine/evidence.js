const { createHash } = require('node:crypto');
const { source, evidence, finding, coverage, verdict, assessment } = require('../shared/assessment.mjs');

const hash = (value) => createHash('sha256').update(JSON.stringify(value)).digest('hex');
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
      ...new Set([
        ...v.rules.map((r) => r.description),
        ...a.findings.filter((f) => f.role === 'opponent').map((f) => f.text),
      ]),
    ],
    missing_coverage: v.missing,
    clinical_reasoning: [],
    suggested_alternatives: [],
    disclaimer: 'Consult a qualified clinician for individual treatment.',
  };
}
module.exports = { publicResult, hash, source, ledger, finding, coverage, verdict, assessment };
