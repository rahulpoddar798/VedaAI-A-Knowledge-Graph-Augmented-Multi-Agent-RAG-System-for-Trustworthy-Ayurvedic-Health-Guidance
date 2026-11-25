const test = require('node:test');
const assert = require('node:assert/strict');
const { randomUUID } = require('node:crypto');
const fs = require('node:fs/promises'),
  path = require('node:path'),
  os = require('node:os');
const { buildVedaAIPipeline } = require('../engine/pipeline');
const { ledger, assessment } = require('../engine/evidence');
const { applicableRules, conflicts, decide } = require('../engine/policy');
const documents = require('../engine/documents');
const { createApp } = require('../server');
const identity = {
  kind: 'derived',
  method: 'graph',
  title: 'Fixture catalog',
  sourceId: 'fixture',
  location: 'item 1',
  excerpt: 'Fixture herb',
  fact: { subject: 'Fixture', predicate: 'catalog_identity', object: 'Fixture botanical' },
};
const paper = {
  kind: 'research',
  method: 'vector',
  title: 'Synthetic source',
  sourceId: 'fixture-paper',
  location: 'offset 0',
  excerpt: 'Synthetic source passage',
};
const rule = {
  id: 'fixture-only',
  version: '1',
  validation: 'approved',
  source: 'Software test fixture only',
  population: 'exact reported context',
  herb: 'Fixture',
  field: 'chronic_conditions',
  value: 'Fixture condition',
  outcome: 'blocked',
  description: 'Fixture block',
  expertApprovalRequired: true,
};
const reported = { chronic_conditions: ['Fixture condition'] };
const fail = () => {
  throw Error('private provider failure');
};
const cases = [
  {
    name: 'support without safety clearance',
    docs: [paper],
    profile: { medications: [] },
    status: 'insufficient_evidence',
    check: (a) =>
      assert.equal(a.findings[0].evidenceIds[0], a.ledger.find((e) => e.kind === 'research').id),
  },
  {
    name: 'validated critical fixture rule',
    graph: [identity],
    profile: reported,
    rules: [rule],
    status: 'blocked',
    check: (a) => assert.equal(a.verdict.rules[0].version, '1'),
  },
  {
    name: 'medication history omitted',
    status: 'insufficient_evidence',
    dimension: ['medications', 'not_assessed'],
  },
  {
    name: 'interaction data unavailable',
    profile: { medications: ['fixture'] },
    status: 'insufficient_evidence',
    dimension: ['interactions', 'insufficient_evidence'],
  },
  {
    name: 'conflicting source records',
    docs: ['supports', 'opposes'].map((predicate) => ({
      ...paper,
      fact: { subject: 'Fixture', predicate, object: 'same endpoint' },
    })),
    status: 'expert_review_required',
    check: (a) =>
      assert.ok(
        a.verdict.coverage.some(
          (c) => c.status === 'conflicting_evidence' && c.evidenceIds.length === 2,
        ),
      ),
  },
  {
    name: 'empty retrieval',
    status: 'insufficient_evidence',
    dimension: ['source_availability', 'insufficient_evidence'],
  },
  {
    name: 'unsupported claim',
    docs: [paper],
    bad: true,
    status: 'insufficient_evidence',
    stage: ['proponent', 'invalid'],
  },
  {
    name: 'override rejected',
    graph: [identity],
    rules: [rule],
    profile: reported,
    bad: true,
    status: 'blocked',
    stage: ['opponent', 'invalid'],
  },
  {
    name: 'provider unavailable',
    docs: [paper],
    outage: true,
    status: 'insufficient_evidence',
    stage: ['proponent', 'unavailable'],
  },
  {
    name: 'graph unavailable',
    graphFailure: true,
    docs: [paper],
    status: 'insufficient_evidence',
    stage: ['graph', 'unavailable'],
  },
  {
    name: 'missing source location',
    docs: [{ ...paper, location: null }],
    status: 'insufficient_evidence',
    check: (a) => assert.equal(a.ledger[0].verification, 'missing_provenance'),
  },
  {
    name: 'pending rule stays inactive',
    graph: [identity],
    profile: reported,
    rules: [{ ...rule, validation: 'pending' }],
    status: 'insufficient_evidence',
  },
  {
    name: 'versioned restriction',
    graph: [identity],
    profile: reported,
    rules: [{ ...rule, version: '2', outcome: 'restricted' }],
    status: 'restricted',
  },
  {
    name: 'real IMPPAT exact retrieval',
    real: true,
    status: 'insufficient_evidence',
    check: (a) =>
      assert.ok(
        a.ledger.some(
          (e) =>
            e.fact?.subject === 'Zingiber officinale' &&
            e.fact.object.toLowerCase() === 'nausea' &&
            e.verification === 'source_traceable',
        ),
      ),
  },
];
function pipeline(c) {
  return buildVedaAIPipeline({
    graph: c.graphFailure ? fail : async () => c.graph || [],
    tables: c.real ? undefined : async () => [],
    documents: async () => c.docs || [],
    rules: c.rules || [],
    provider: {
      generateJSON: async (prompt, { evidence }) => {
        if (c.outage) fail();
        if (c.bad) return { ids: [], verdict: 'SAFE', reply: 'UNSUPPORTED_FIXTURE' };
        return {
          ids: prompt.includes('for proponent')
            ? evidence
                .filter((e) => ['association', 'research'].includes(e.kind))
                .slice(0, 1)
                .map((e) => e.id)
            : [],
        };
      },
    },
  });
}
test('stratified consultation development evaluation', async (t) => {
  const results = [];
  for (const c of cases)
    await t.test(c.name, async () => {
      const start = performance.now();
      const s = await pipeline(c).invoke({
        raw_query: 'Ginger for nausea',
        user_profile: c.profile || {},
      });
      const a = assessment.parse(s.assessment);
      const ids = new Set(a.ledger.map((e) => e.id));
      const references = a.findings.flatMap((f) => f.evidenceIds);
      results.push({
        expected: c.status,
        actual: a.verdict.category,
        ms: performance.now() - start,
        refs: references.length,
        validRefs: references.filter((id) => ids.has(id)).length,
        unsupportedLeak: JSON.stringify(a).includes('UNSUPPORTED_FIXTURE'),
        expectedCritical: c.status === 'blocked',
        detectedCritical: a.verdict.rules.some((r) => r.outcome === 'blocked'),
        gap: c.dimension && c.dimension[1] !== 'assessed',
        gapDetected:
          c.dimension &&
          a.verdict.coverage.some((r) => r.dimension === c.dimension[0] && r.status === c.dimension[1]),
        realHit:
          c.real &&
          a.ledger.some((e) => e.fact?.subject === 'Zingiber officinale' && e.fact.object === 'nausea'),
      });
      assert.equal(a.verdict.category, c.status);
      assert.ok(!JSON.stringify(a).includes('UNSUPPORTED_FIXTURE'));
      if (c.dimension)
        assert.ok(
          a.verdict.coverage.some((r) => r.dimension === c.dimension[0] && r.status === c.dimension[1]),
        );
      if (c.stage) assert.ok(a.stages.some((r) => r.name === c.stage[0] && r.status === c.stage[1]));
      c.check?.(a);
      const replay = decide({
        consultationId: s.consultationId,
        createdAt: s.createdAt,
        profile: s.user_profile,
        entries: s.entries,
        checks: s.checks,
        coverage: s.coverage,
        findings: s.findings,
      });
      assert.deepEqual(replay, s.verdict);
      assert.equal(Reflect.set(replay, 'category', 'permitted'), false);
    });
  const errors = results.filter((r) => r.actual !== r.expected);
  t.diagnostic(
    JSON.stringify({
      completed: results.length,
      expectedCases: cases.length,
      executionFailures: cases.length - results.length,
      referencedIds: results.reduce((s, r) => s + r.refs, 0),
      validReferences: results.reduce((s, r) => s + r.validRefs, 0),
      unsupportedClaimLeaks: results.filter((r) => r.unsupportedLeak).length,
      criticalFlagsDetected: results.filter((r) => r.expectedCritical && r.detectedCritical).length,
      expectedCritical: results.filter((r) => r.expectedCritical).length,
      gapsDetected: results.filter((r) => r.gap && r.gapDetected).length,
      expectedGaps: results.filter((r) => r.gap).length,
      imppatHitAt24: results.filter((r) => r.realHit).length,
      wrongCategory: errors.length,
      falseBlocks: errors.filter((r) => r.actual === 'blocked').length,
      falsePermits: errors.filter((r) => r.actual === 'permitted').length,
      meanMs: Math.round(results.reduce((n, r) => n + r.ms, 0) / results.length),
    }),
  );
});
test('ledger deduplication, identity boundaries and DTO validation', () => {
  const id = randomUUID(),
    time = new Date().toISOString(),
    entries = ledger(id, time, [paper, paper, { ...paper, kind: 'interpretation' }]);
  assert.equal(entries.length, 2);
  assert.ok(entries.some((e) => e.verification === 'unverified'));
  assert.ok(!ledger(randomUUID(), time, [paper]).some((e) => entries.some((old) => old.id === e.id)));
  assert.throws(() => ledger(id, time, [{ ...paper, method: 'untrusted' }]));
  assert.throws(() =>
    assessment.parse({ verdict: { category: 'permitted' }, ledger: [], findings: [], stages: [] }),
  );
});
test('HTTP intake and follow-up retain original adjudication', async (t) => {
  const app = createApp({ pipeline: pipeline(cases[1]) }),
    server = app.listen(0, '127.0.0.1');
  t.after(() => new Promise((done) => server.close(done)));
  await new Promise((done) => server.once('listening', done));
  const post = (route, body, token) =>
    fetch('http://127.0.0.1:' + server.address().port + '/api/' + route, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: 'Bearer ' + token } : {}) },
      body: JSON.stringify(body),
    });
  assert.equal((await post('chat', { query: '' })).status, 400);
  const result = await (
    await post('chat', { query: 'Ginger', conditions: reported.chronic_conditions })
  ).json();
  assert.equal(result.result.final_verdict, 'BLOCKED');
  assert.equal(result.consultationId, result.result.assessment.verdict.consultationId);
  const follow = await (
    await post('follow-up', {
      consultationId: result.consultationId,
      followUpQuery: 'What dose of Fixture?',
    }, result.followUpToken)
  ).json();
  assert.equal(follow.data.status, 'RESTRICTED');
  assert.equal(follow.data.final_verdict, 'BLOCKED');
  assert.deepEqual(follow.data.restrictions, result.result.safety_warnings);
  const second = await (await post('chat', { query: 'Ginger' })).json();
  for (const token of [undefined, second.followUpToken]) {
    const denied = (await (await post('follow-up', {
      consultationId: result.consultationId, followUpQuery: 'Repeat'
    }, token)).json()).data;
    assert.equal(denied.status, 'INSUFFICIENT_CONTEXT');
    assert.equal(denied.final_verdict, undefined);
    assert.deepEqual(denied.evidenceIds, []);
  }
  const citation = result.result.assessment.ledger[0].id;
  const followRequest = (record, question, extra = {}) => post('follow-up', {
    consultationId: record.consultationId, followUpQuery: question, ...extra
  }, record.followUpToken);
  assert.equal((await followRequest(second, 'Show evidence', { evidenceIds: [citation] })).status, 400);
  const sources = (await (await followRequest(result, 'Show evidence', { evidenceIds: [citation] })).json()).data;
  assert.deepEqual(sources.evidenceIds, [citation]);
  assert.match(sources.reply, /BLOCKED/);
  const repeat = (await (await followRequest(result, 'Repeat', {
    history: [{ role: 'assistant', content: 'untrusted history' }]
  })).json()).data;
  assert.deepEqual(repeat, sources);
  const secondReply = (await (await followRequest(second, 'Repeat')).json()).data;
  assert.equal(secondReply.status, 'INSUFFICIENT_CONTEXT');
  const profile = (await (await followRequest(result, 'What patient context was used?', {
    consultationContext: { conditions: ['untrusted condition'] }
  })).json()).data;
  assert.match(profile.reply, /chronic_conditions/);
  assert.doesNotMatch(profile.reply, /untrusted/);

  assert.equal(
    (
      await (
        await post('follow-up', { consultationId: randomUUID(), followUpQuery: 'What dose?' })
      ).json()
    ).data.status,
    'INSUFFICIENT_CONTEXT',
  );
});
test('document ingestion, preservation, idempotence and ranked lookup', async (t) => {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), 'veda-source-'));
  t.after(() => fs.rm(dir, { recursive: true, force: true }));
  const file = path.join(dir, 'fixture.txt'),
    text = 'Synthetic original passage.',
    meta = { kind: 'research', title: 'Fixture' };
  const v = Array(3072).fill(0);
  v[0] = 1;
  await fs.writeFile(file, text);
  const id = await documents.ingest(file, meta, dir, async () => [v]);
  assert.equal(await documents.ingest(file, meta, dir, fail), id);
  const [hit] = await documents.search('fixture', dir, async () => v);
  assert.equal(hit.excerpt, text);
  assert.equal(hit.relevance, 1);
  assert.equal(hit.metadata.page, undefined);
  assert.equal(await fs.readFile(path.join(dir, hit.sourceId + '.txt'), 'utf8'), text);
});

test('policy regression suite enforces patient context matching and provenance on ontology edges', async (t) => {
  const mkGraph = (subject, predicate, object, extra = {}) => ({
    kind: 'derived',
    method: 'graph',
    title: predicate === 'CONTRAINDICATED_IN' ? 'VedaAI herb catalog' : 'VedaAI project ontology',
    sourceId: predicate === 'CONTRAINDICATED_IN' ? 'vedaai-catalog' : null,
    location: extra.location || 'Zingiber officinale',
    excerpt: `${subject} | ${predicate} | ${object}`,
    fact: { subject, predicate, object },
  });
  const runPolicy = (graphRows, profile) =>
    buildVedaAIPipeline({
      graph: async () => graphRows,
      tables: async () => [],
      documents: async () => [],
      provider: { generateJSON: async () => ({ ids: [] }) },
    }).invoke({ raw_query: 'Ginger guidance', user_profile: profile });

  const aggPitta = mkGraph('Ginger', 'AGGRAVATES', 'Pitta');
  const pacifyPitta = mkGraph('Ginger', 'PACIFIES', 'Pitta');
  const pacifyVata = mkGraph('Ginger', 'PACIFIES', 'Vata');
  const condPitta = mkGraph('Acid Reflux', 'ASSOCIATED_WITH', 'Pitta', { location: 'condition:Acid Reflux' });
  const condKapha = mkGraph('Obesity', 'ASSOCIATED_WITH', 'Kapha', { location: 'condition:Obesity' });
  const seasonGrishma = mkGraph('Grishma', 'DOMINANT_IN', 'Pitta', { location: 'season:Grishma' });
  const seasonShishira = mkGraph('Shishira', 'DOMINANT_IN', 'Kapha', { location: 'season:Shishira' });
  const contraGrishma = mkGraph('Ginger', 'CONTRAINDICATED_IN', 'Grishma');

  await t.test('1. matching AGGRAVATES relationship and matching patient context', async () => {
    const statePrakriti = await runPolicy([aggPitta], { prakriti: 'Pitta-Vata' });
    const a1 = assessment.parse(statePrakriti.assessment);
    assert.equal(a1.verdict.category, 'expert_review_required');
    assert.equal(a1.verdict.rules.length, 1);
    assert.equal(a1.verdict.rules[0].ruleId, 'legacy-context-review');
    assert.equal(a1.verdict.rules[0].outcome, 'expert_review_required');
    const prakritiRow = a1.ledger.find((e) => e.kind === 'patient' && e.location === 'prakriti');
    const aggRow = a1.ledger.find((e) => e.fact?.predicate === 'AGGRAVATES');
    assert.ok(a1.verdict.rules[0].evidenceIds.includes(aggRow.id));
    assert.ok(a1.verdict.rules[0].evidenceIds.includes(prakritiRow.id));

    const stateCondSeason = await runPolicy([aggPitta, condPitta, seasonGrishma], {
      prakriti: 'Kapha',
      chronic_conditions: ['Acid Reflux'],
      current_season: 'Summer',
    });
    const a2 = assessment.parse(stateCondSeason.assessment);
    assert.equal(a2.verdict.category, 'expert_review_required');
    const reviewRule = a2.verdict.rules.find((r) => r.ruleId === 'legacy-context-review');
    assert.ok(reviewRule);
    assert.equal(reviewRule.outcome, 'expert_review_required');
    for (const loc of ['chronic_conditions', 'current_season']) {
      const p = a2.ledger.find((e) => e.kind === 'patient' && e.location === loc);
      assert.ok(reviewRule.evidenceIds.includes(p.id), `Missing patient ID for ${loc}`);
    }
    assert.ok(reviewRule.evidenceIds.includes(a2.ledger.find((e) => e.fact?.predicate === 'ASSOCIATED_WITH').id));
    assert.ok(reviewRule.evidenceIds.includes(a2.ledger.find((e) => e.fact?.predicate === 'DOMINANT_IN').id));
  });

  await t.test('2. AGGRAVATES relationship without matching patient context', async () => {
    const state = await runPolicy([aggPitta, condKapha, seasonShishira], {
      prakriti: 'Kapha',
      chronic_conditions: ['Obesity'],
      current_season: 'Winter',
      medications: [],
    });
    const a = assessment.parse(state.assessment);
    assert.equal(a.verdict.rules.some((r) => r.ruleId === 'legacy-context-review'), false);
    assert.equal(a.verdict.category, 'insufficient_evidence');
    assert.equal(applicableRules({ prakriti: 'Kapha', current_season: 'Shishira' }, a.ledger).length, 0);
  });

  await t.test('3. missing patient context never causes false clearance or false context match', async () => {
    const state = await runPolicy([aggPitta, contraGrishma, seasonGrishma], {});
    const a = assessment.parse(state.assessment);
    assert.equal(a.verdict.rules.length, 0);
    assert.equal(a.verdict.category, 'insufficient_evidence');
    for (const dim of ['medications', 'allergies', 'chronic_conditions', 'current_season']) {
      assert.ok(a.verdict.coverage.some((c) => c.dimension === dim && c.status === 'not_assessed'));
    }
  });

  await t.test('4. conflicting PACIFIES and AGGRAVATES relationships stay visible and require review', async () => {
    const stateSame = await runPolicy([pacifyPitta, aggPitta], { prakriti: 'Kapha', medications: [] });
    const aSame = assessment.parse(stateSame.assessment);
    assert.equal(aSame.verdict.category, 'expert_review_required');
    const conflictFinding = aSame.findings.find((f) => f.category === 'conflict');
    assert.ok(conflictFinding);
    assert.equal(conflictFinding.evidenceIds.length, 2);
    assert.ok(
      aSame.verdict.coverage.some(
        (c) => c.status === 'conflicting_evidence' && c.expertReview && c.evidenceIds.length === 2,
      ),
    );
    const stateDiff = await runPolicy([pacifyVata, aggPitta], { prakriti: 'Kapha', medications: [] });
    const aDiff = assessment.parse(stateDiff.assessment);
    assert.equal(aDiff.findings.some((f) => f.category === 'conflict'), false);
    assert.equal(aDiff.verdict.category, 'insufficient_evidence');
    assert.equal(conflicts(aSame.ledger).length, 1);
  });

  await t.test('5. seasonal contraindication with matching season', async () => {
    for (const seasonInput of ['Grishma', 'Summer']) {
      const state = await runPolicy([contraGrishma], { current_season: seasonInput });
      const a = assessment.parse(state.assessment);
      assert.equal(a.verdict.category, 'expert_review_required');
      const seasonRule = a.verdict.rules.find((r) => r.ruleId === 'legacy-season-edge');
      assert.ok(seasonRule);
      assert.equal(seasonRule.outcome, 'expert_review_required');
      assert.ok(seasonRule.evidenceIds.includes(a.ledger.find((e) => e.fact?.predicate === 'CONTRAINDICATED_IN').id));
      assert.ok(seasonRule.evidenceIds.includes(a.ledger.find((e) => e.kind === 'patient' && e.location === 'current_season').id));
    }
  });

  await t.test('6. seasonal contraindication with a different season', async () => {
    const state = await runPolicy([contraGrishma], { current_season: 'Shishira', medications: [] });
    const a = assessment.parse(state.assessment);
    assert.equal(a.verdict.rules.some((r) => r.ruleId === 'legacy-season-edge'), false);
    assert.equal(a.verdict.category, 'insufficient_evidence');
  });

  await t.test('7. approved rule still blocks from source-traceable table evidence when graph is unavailable', async () => {
    const assocFixture = {
      kind: 'association',
      method: 'table',
      title: 'IMPPAT_TherapeuticUse_Plant_Association.tsv',
      sourceId: 'fixture-sha',
      location: 'line 1',
      excerpt: 'Fixture | Root | nausea',
      fact: { subject: 'Fixture', predicate: 'HAS_REPORTED_USE', object: 'nausea' },
    };
    const state = await buildVedaAIPipeline({
      graph: fail,
      tables: async () => [assocFixture],
      documents: async () => [],
      rules: [rule],
      provider: { generateJSON: async () => ({ ids: [] }) },
    }).invoke({ raw_query: 'Fixture herb', user_profile: reported });
    const a = assessment.parse(state.assessment);
    assert.equal(a.verdict.category, 'blocked');
    assert.ok(a.stages.some((s) => s.name === 'graph' && s.status === 'unavailable'));
    assert.equal(a.verdict.rules[0].ruleId, rule.id);
    assert.ok(a.verdict.rules[0].evidenceIds.includes(a.ledger.find((e) => e.kind === 'association').id));
  });
});
