const { hash, coverage, verdict } = require('./evidence');
const { version, ruleSchema, registry, guard, contextGuard } = require('./rule_registry');

const SEASON_ALIASES = Object.freeze({
  vasanta: 'vasanta',
  spring: 'vasanta',
  grishma: 'grishma',
  summer: 'grishma',
  varsha: 'varsha',
  monsoon: 'varsha',
  sharada: 'sharada',
  autumn: 'sharada',
  hemanta: 'hemanta',
  'pre-winter': 'hemanta',
  'early winter': 'hemanta',
  shishira: 'shishira',
  winter: 'shishira',
  'late winter': 'shishira',
});

const DOSHAS = new Set(['vata', 'pitta', 'kapha']);

function canonicalSeason(value) {
  const clean = String(value || '')
    .trim()
    .toLowerCase();
  if (!clean) return '';
  if (SEASON_ALIASES[clean]) return SEASON_ALIASES[clean];
  for (const token of clean.split(/[^a-z-]+/)) {
    if (SEASON_ALIASES[token]) return SEASON_ALIASES[token];
  }
  return clean;
}

function sameSeason(a, b) {
  const ca = canonicalSeason(a);
  const cb = canonicalSeason(b);
  return Boolean(ca && cb && ca === cb);
}

function doshaTokens(value) {
  return String(value || '')
    .toLowerCase()
    .split(/[^a-z]+/)
    .filter((token) => DOSHAS.has(token));
}

function applicableRules(profile = {}, entries = [], rules = registry) {
  const hits = [];
  const lower = (s) =>
    String(s || '')
      .trim()
      .toLowerCase();
  const patientRecord = (field) => entries.find((e) => e.kind === 'patient' && e.location === field);
  const patientSeason = patientRecord('current_season');
  const patientPrakriti = patientRecord('prakriti');
  const patientConditions = patientRecord('chronic_conditions');

  for (const candidate of rules) {
    const r = ruleSchema.parse(candidate);
    if (r.validation !== 'approved') continue;
    const identity = entries.find(
      (e) =>
        ((e.method === 'graph' && e.fact?.predicate === 'catalog_identity') ||
          (e.kind === 'association' && e.verification === 'source_traceable')) &&
        lower(e.fact?.subject) === lower(r.herb),
    );
    const patient = patientRecord(r.field);
    if (!identity || !patient || !profile[r.field]?.some((v) => lower(v) === lower(r.value))) continue;
    hits.push({
      ruleId: r.id,
      version: r.version,
      description: r.description,
      outcome: r.outcome,
      evidenceIds: [...new Set([identity.id, patient.id])],
    });
  }
  for (const e of entries.filter(
    (e) =>
      e.method === 'graph' &&
      e.fact?.predicate === 'CONTRAINDICATED_IN' &&
      sameSeason(e.fact.object, profile.current_season),
  )) {
    hits.push({
      ruleId: guard.id,
      version,
      description: guard.description,
      outcome: guard.outcome,
      evidenceIds: [...new Set([e.id, ...(patientSeason ? [patientSeason.id] : [])])],
    });
  }
  const prakritiDoshas = doshaTokens(profile.prakriti);
  const reportedConditions = Array.isArray(profile.chronic_conditions)
    ? profile.chronic_conditions.map(lower).filter(Boolean)
    : [];
  for (const e of entries.filter((e) => e.method === 'graph' && e.fact?.predicate === 'AGGRAVATES')) {
    const dosha = lower(e.fact.object);
    if (!dosha) continue;
    const supportIds = [e.id];
    let matched = false;

    if (prakritiDoshas.includes(dosha)) {
      matched = true;
      if (patientPrakriti) supportIds.push(patientPrakriti.id);
    }

    const conditionEdges = entries.filter(
      (c) =>
        c.method === 'graph' &&
        c.fact?.predicate === 'ASSOCIATED_WITH' &&
        lower(c.fact.object) === dosha &&
        reportedConditions.includes(lower(c.fact.subject)),
    );
    if (conditionEdges.length) {
      matched = true;
      for (const edge of conditionEdges) supportIds.push(edge.id);
      if (patientConditions) supportIds.push(patientConditions.id);
    }

    const seasonEdges = entries.filter(
      (s) =>
        s.method === 'graph' &&
        s.fact?.predicate === 'DOMINANT_IN' &&
        lower(s.fact.object) === dosha &&
        sameSeason(s.fact.subject, profile.current_season),
    );
    if (seasonEdges.length) {
      matched = true;
      for (const edge of seasonEdges) supportIds.push(edge.id);
      if (patientSeason) supportIds.push(patientSeason.id);
    }

    if (!matched) continue;
    hits.push({
      ruleId: contextGuard.id,
      version,
      description: contextGuard.description,
      outcome: contextGuard.outcome,
      evidenceIds: [...new Set(supportIds)],
    });
  }
  return hits;
}
function conflicts(entries) {
  const opposing = { PACIFIES: 'AGGRAVATES', supports: 'opposes' };
  const result = [];
  for (const e of entries.filter((e) => e.fact && Object.hasOwn(opposing, e.fact.predicate))) {
    for (const other of entries.filter(
      (o) =>
        o.fact?.subject === e.fact.subject &&
        o.fact.object === e.fact.object &&
        o.fact.predicate === opposing[e.fact.predicate],
    )) {
      result.push({
        role: 'opponent',
        category: 'conflict',
        evidenceIds: [e.id, other.id],
        text: 'Retrieved records express opposing relationships for the same subject and target.',
      });
    }
  }
  return result;
}
function track(profile, entries, findings, stages, unresolved = [], checks = []) {
  const rows = [];
  function add(dimension, status, reason, evidenceIds = [], missing = []) {
    rows.push(
      coverage.parse({
        dimension,
        status,
        reason,
        evidenceIds,
        missing,
        findings: [reason],
        expertReview: ['requires_expert_review', 'conflicting_evidence'].includes(status),
      }),
    );
  }
  for (const key of ['medications', 'allergies', 'chronic_conditions', 'current_season']) {
    const record = entries.find((e) => e.kind === 'patient' && e.location === key);
    add(
      key,
      record ? 'assessed' : 'not_assessed',
      record ? 'Patient report recorded.' : 'Patient information unavailable.',
      record ? [record.id] : [],
      record ? [] : [key],
    );
  }
  const noMeds = Array.isArray(profile.medications) && !profile.medications.length;
  add(
    'interactions',
    noMeds ? 'not_applicable' : 'insufficient_evidence',
    noMeds ? 'Patient reported no current medications.' : 'Interaction coverage is unavailable.',
    entries.filter((e) => e.location === 'medications').map((e) => e.id),
    noMeds ? [] : ['Interaction assessment'],
  );
  for (const d of [
    'contraindications',
    'dose_and_formulation',
    'special_populations',
    'allergen_suitability',
  ])
    add(d, 'insufficient_evidence', 'Validated patient-specific coverage is unavailable.', [], [d]);
  for (const check of checks)
    add(
      'rule_' + check.ruleId + '_' + rows.length,
      check.outcome === 'expert_review_required' ? 'requires_expert_review' : 'assessed',
      check.description,
      check.evidenceIds,
    );
  if (unresolved.length)
    add(
      'ingredient_identity',
      'requires_expert_review',
      'Some ingredient identities remain unresolved.',
      [],
      unresolved,
    );
  const passages = entries.filter(e => ['classical', 'research'].includes(e.kind) && e.verification === 'source_traceable');
  add('primary_source_passages', passages.length ? 'assessed' : 'insufficient_evidence',
    passages.length ? 'Attributable source passages retrieved.' : 'No attributable primary-source passage was retrieved.',
    passages.map(e => e.id), passages.length ? [] : ['Primary-source passages']);
  const cited = entries.filter(
    (e) =>
      e.verification === 'source_traceable' && ['classical', 'research', 'association'].includes(e.kind),
  );
  add(
    'source_availability',
    cited.length ? 'assessed' : 'insufficient_evidence',
    cited.length ? 'Attributable records retrieved.' : 'No attributable source retrieved.',
    cited.map((e) => e.id),
    cited.length ? [] : ['Source evidence'],
  );
  for (const f of findings.filter((f) => ['review', 'conflict'].includes(f.category)))
    add(
      'finding_' + rows.length,
      f.category === 'conflict' ? 'conflicting_evidence' : 'requires_expert_review',
      f.text,
      f.evidenceIds,
    );
  for (const s of stages.filter((s) => ['unavailable', 'invalid'].includes(s.status)))
    add(s.name, 'not_assessed', 'Stage ' + s.status + '.', [], [s.name]);
  return rows;
}
function immutable(value) {
  for (const child of Object.values(value)) if (child && typeof child === 'object') immutable(child);
  return Object.freeze(value);
}
function decide({ consultationId, createdAt, profile, entries, findings, checks, coverage: rows }) {
  const category = checks.some((r) => r.outcome === 'blocked')
    ? 'blocked'
    : checks.some((r) => r.outcome === 'expert_review_required') || rows.some((r) => r.expertReview)
      ? 'expert_review_required'
      : checks.some((r) => r.outcome === 'restricted')
        ? 'restricted'
        : 'insufficient_evidence';
  const explanation = {
    blocked: 'An approved rule blocks a recommendation.',
    restricted: 'An approved rule restricts this recommendation.',
    expert_review_required: 'Expert review is required before a recommendation can be made.',
    insufficient_evidence:
      'Available evidence and safety coverage are insufficient for a recommendation.',
  }[category];
  return immutable(
    verdict.parse({
      id: 'v-' + hash([version, consultationId, profile, entries, findings, checks, rows]),
      consultationId,
      createdAt,
      policyVersion: version,
      category,
      rules: checks,
      evidenceIds: entries.map((e) => e.id),
      coverage: rows,
      missing: [...new Set(rows.flatMap((r) => r.missing))],
      explanation,
      expertReview: category === 'expert_review_required' || rows.some((r) => r.expertReview),
    }),
  );
}
module.exports = { ruleSchema, registry, guard, conflicts, applicableRules, track, decide };
