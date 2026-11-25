import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { test } from 'node:test';
import { fileURLToPath } from 'node:url';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { createServer } from 'vite';

test('assessment and transparency render only evidence belonging to the selected live record', async t => {
  const server = await createServer({ root: fileURLToPath(new URL('.', import.meta.url)),
    server: { middlewareMode: true, hmr: false }, appType: 'custom' });
  t.after(() => server.close());
  const { mapConsultation, appendClinicalProfile, clinicalProfile } = await server.ssrLoadModule('/src/data/consultation.ts');
  const { AIAssessmentScreen } = await server.ssrLoadModule('/src/screens/AIAssessmentScreen.tsx');
  const { AgentTransparencyScreen } = await server.ssrLoadModule('/src/screens/AgentTransparencyScreen.tsx');
  const { DEFAULT_PROFILE } = await server.ssrLoadModule('/src/data/mockData.ts');
  const form = new FormData();
  const profile = { ...DEFAULT_PROFILE, medications: ['fixture medication'], season: 'Winter' };
  appendClinicalProfile(form, profile);
  for (const [key, value] of Object.entries(clinicalProfile(profile))) {
    assert.deepEqual(form.getAll(Array.isArray(value) ? key + '[]' : key), value === undefined ? [] : Array.isArray(value) ? value : [String(value)]);
  }
  assert.equal(form.has('fullName'), false);

  const { buildVedaAIPipeline } = await import('../engine/assessment_workflow.js');
  const workflow = buildVedaAIPipeline({
    graph: async () => [], tables: async () => [{ kind: 'association', method: 'table', title: 'Fixture source',
      location: 'line 19', sourceId: 'fixture', excerpt: 'Source row fixture' }],
    documents: async () => { throw new Error('offline'); },
    provider: { generateJSON: async (_, data) => ({ ids: [data.evidence[0].id] }) }
  });
  const id = randomUUID();
  const state = await workflow.invoke({ consultationId: id, raw_query: 'Ginger' });
  const payload = { success: true, followUpToken: 'x'.repeat(43), consultationId: id, result: state.final_response };
  const live = mapConsultation(payload, 'Fixture question', profile);
  const { emptySession, receiveConsultation } = await server.ssrLoadModule('/src/data/consultation.ts');
  assert.deepEqual(emptySession, { records: [], active: null });
  const session = receiveConsultation(emptySession, live);
  assert.equal(session.active, live);
  assert.deepEqual(session.records, [live]);
  assert.equal(receiveConsultation(session, { ...live, isSampleData: true }), session);
  const page = renderToStaticMarkup(createElement(AIAssessmentScreen, { consultation: live, allConsultations: [live] }));
  for (const phrase of ['Source row fixture', 'line 19', 'expert review required', 'not assessed', 'ev-', 'selected'])
    assert.ok(page.toLowerCase().includes(phrase.toLowerCase()), phrase);
  assert.doesNotMatch(page, /model confidence|reliability|retrieval coverage/i);
  for (const category of ['blocked', 'restricted', 'expert_review_required', 'insufficient_evidence']) {
    const example = structuredClone(payload);
    example.result.assessment.verdict.category = category;
    example.result.final_verdict = category.toUpperCase();
    assert.equal(mapConsultation(example, '', profile).status, category);
  }
  const stages = renderToStaticMarkup(createElement(AgentTransparencyScreen, { consultation: live }));
  assert.match(stages, /documents.{0,40}unavailable/);
  assert.doesNotMatch(stages, /Judge|latency/);
  for (const mutate of [
    p => p.result.assessment.findings[0].evidenceIds.push('foreign'),
    p => p.result.assessment.verdict.coverage[0].evidenceIds.push('foreign'),
    p => p.result.assessment.ledger[0].consultationId = randomUUID(),
    p => p.consultationId = randomUUID(),
    p => p.result.final_verdict = 'PERMITTED',
    p => p.success = false
  ]) {
    const invalid = structuredClone(payload);
    mutate(invalid);
    assert.throws(() => mapConsultation(invalid, '', profile));
  }
  const { ConsultationHistoryScreen } = await server.ssrLoadModule('/src/screens/ConsultationHistoryScreen.tsx');
  const history = renderToStaticMarkup(createElement(ConsultationHistoryScreen, { consultations: [] }));
  assert.doesNotMatch(history, /Ginger|Amalaki|Omeprazole/);
  const { HealthProfileScreen } = await server.ssrLoadModule('/src/screens/HealthProfileScreen.tsx');
  const blankProfile = { ...DEFAULT_PROFILE, ageGroup: '', biologicalSex: '', dietaryPreference: '', prakriti: '', season: '', conditions: [], allergies: [], medications: [] };
  const profileMarkup = renderToStaticMarkup(createElement(HealthProfileScreen, { profile: blankProfile, onSaveProfile: () => {}, onNavigate: () => {} }));
  assert.ok(profileMarkup.includes('<option value="" selected="">Not specified</option>') || profileMarkup.includes('Not specified'));
});

test('graph screen consumes the read-only graph API and distinguishes empty and unavailable responses', async t => {
  const { createApp } = await import('../server.js');
  let mode = 'ready';
  let closed = 0;
  const driver = { session(config) {
    assert.equal(config.defaultAccessMode, 'READ');
    return { close: async () => { closed++; }, executeRead: (fn, options) => {
      assert.equal(options.timeout, 5000);
      return fn({ run(query, params) {
        assert.match(query, /LIMIT \$limit/);
        assert.equal(params.limit.toNumber(), 24);
        if (mode === 'error') throw new Error('private provider detail');
        return { records: mode === 'empty' ? [] : [{ toObject: () => ({
          endpoints: [{ key: 'internal1', label: 'Fixture herb', type: 'Herb', attribution: 'Fixture attribution' },
            { key: 'internal2', label: 'Fixture dosha', type: 'Dosha' }],
          predicate: 'PACIFIES', citation: 'Fixture source'
        }) }] };
      } });
    } };
  } };
  const app = createApp({ driver });
  const http = await new Promise(resolve => { const listener = app.listen(0, '127.0.0.1', () => resolve(listener)); });
  t.after(() => new Promise(resolve => http.close(resolve)));
  const server = await createServer({ root: fileURLToPath(new URL('.', import.meta.url)), server: { middlewareMode: true, hmr: false }, appType: 'custom' });
  t.after(() => server.close());
  const { fetchGraph } = await server.ssrLoadModule('/src/data/graph.ts');
  const { GraphView } = await server.ssrLoadModule('/src/screens/KnowledgeGraphScreen.tsx');
  const fetchHttp = globalThis.fetch;
  t.mock.method(globalThis, 'fetch', (url, options) => fetchHttp('http://127.0.0.1:' + http.address().port + url, options));
  const graph = await fetchGraph();
  const page = renderToStaticMarkup(createElement(GraphView, { graph }));
  assert.match(page, /Fixture herb/);
  assert.match(page, /Fixture source/);
  assert.doesNotMatch(page, /internal1/);
  mode = 'empty';
  assert.deepEqual(await fetchGraph(), { nodes: [], edges: [] });
  mode = 'error';
  await assert.rejects(fetchGraph, /Graph catalog unavailable/);
  assert.equal(closed, 3);
  const { DrugHerbCheckerScreen } = await server.ssrLoadModule('/src/screens/DrugHerbCheckerScreen.tsx');
  for (const medication of ['Warfarin', 'Unlisted medication']) {
    const checker = renderToStaticMarkup(createElement(DrugHerbCheckerScreen, { profile: { medications: [medication] } }));
    assert.match(checker, /Insufficient evidence/);
    assert.match(checker, /Demonstration/);
    assert.ok(checker.includes(medication));
    assert.doesNotMatch(checker, /No known interaction|Documented interaction/);
  }
});
