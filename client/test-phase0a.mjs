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
  for (const phrase of ['Source row fixture', 'line 19', 'expert review required', 'not assessed', 'ev-', 'selected', 'Derived &amp; Policy'])
    assert.ok(page.toLowerCase().includes(phrase.toLowerCase()), phrase);
  assert.doesNotMatch(page, /model confidence|reliability|retrieval coverage/i);
  assert.doesNotMatch(page, /\b(proponent|opponent)\b/i);
  assert.doesNotMatch(page, /\bOntology\b/i);
  assert.doesNotMatch(page, /Policy v\d|legacy-|documentId|chunkId|src:|\bsim\s+0\.|>\s*ev-[a-f0-9]+/i);
  assert.match(page, /Supporting evidence|Critical review/i);
  assert.match(page, /Ref #1/);
  // Also test rich metadata/policy/relevance masking
  const maskedFixture = structuredClone(payload);
  maskedFixture.result.assessment.findings.push({
    role: 'proponent', category: 'traditional', evidenceIds: [maskedFixture.result.assessment.ledger[0].id],
    text: 'Classical excerpt support note.'
  });
  maskedFixture.result.assessment.ledger[0].metadata = {
    documentId: 'internal-doc-999', chunkId: 'chunk-abc-123', author: 'Acharya Charaka', page: 42
  };
  maskedFixture.result.assessment.ledger[0].relevance = 0.912;
  const maskedRecord = mapConsultation(maskedFixture, 'Metadata masking check', profile);
  const maskedView = renderToStaticMarkup(createElement(AIAssessmentScreen, {
    consultation: maskedRecord, allConsultations: [maskedRecord], onSelectConsultation: () => {}, onNavigate: () => {}
  }));
  assert.match(maskedView, /Author:.*Acharya Charaka/);
  assert.match(maskedView, /Page:.*42/);
  assert.match(maskedView, /Supporting evidence/);
  assert.match(maskedView, /Critical review/);
  assert.doesNotMatch(maskedView, /internal-doc-999|chunk-abc-123|documentId|chunkId|\bsim\s+0\.912|\b(proponent|opponent)\b/i);
  // Ensure strict Assessed count excludes not_applicable rows when present
  const naExample = structuredClone(payload);
  naExample.result.assessment.verdict.coverage.forEach(c => {
    c.status = c.dimension === 'interactions' ? 'not_applicable' : 'not_assessed';
  });
  naExample.result.assessment.verdict.coverage[0].status = 'assessed';
  const naRecord = mapConsultation(naExample, 'N/A coverage count check', profile);
  const naView = renderToStaticMarkup(createElement(AIAssessmentScreen, {
    consultation: naRecord, allConsultations: [naRecord], onSelectConsultation: () => {}, onNavigate: () => {}
  }));
  assert.match(naView, />1<\/p>/);
  assert.match(naView, /1 not applicable/i);

  const loadingView = renderToStaticMarkup(createElement(AIAssessmentScreen, {
    consultation: null, allConsultations: [], onSelectConsultation: () => {}, onNavigate: () => {}, isLoading: true
  }));
  assert.match(loadingView, /Loading clinical assessment/i);
  const errorView = renderToStaticMarkup(createElement(AIAssessmentScreen, {
    consultation: null, allConsultations: [], onSelectConsultation: () => {}, onNavigate: () => {}, error: 'Service temporarily unavailable.'
  }));
  assert.match(errorView, /Assessment unavailable/);
  assert.match(errorView, /Service temporarily unavailable\./);
  const emptyView = renderToStaticMarkup(createElement(AIAssessmentScreen, {
    consultation: null, allConsultations: [], onSelectConsultation: () => {}, onNavigate: () => {}
  }));
  assert.match(emptyView, /No assessment selected/);
  const insufficientWorkflow = buildVedaAIPipeline({
    graph: async () => [], tables: async () => [], documents: async () => [],
    provider: { generateJSON: async () => ({ ids: [] }) }
  });
  const insId = randomUUID();
  const insState = await insufficientWorkflow.invoke({ consultationId: insId, raw_query: 'Unknown herb' });
  const insRecord = mapConsultation({ success: true, followUpToken: 'y'.repeat(43), consultationId: insId, result: insState.final_response }, 'Unknown herb', profile);
  const insView = renderToStaticMarkup(createElement(AIAssessmentScreen, {
    consultation: insRecord, allConsultations: [insRecord], onSelectConsultation: () => {}, onNavigate: () => {}
  }));
  assert.match(insView, /Safety clearance has not been established/);
  assert.match(insView, /No evidence was selected\. Safety remains unestablished\./);
  assert.doesNotMatch(insView, /model confidence|reliability|retrieval coverage/i);
  for (const category of ['blocked', 'restricted', 'expert_review_required', 'insufficient_evidence']) {
    const example = structuredClone(payload);
    example.result.assessment.verdict.category = category;
    example.result.final_verdict = category.toUpperCase();
    assert.equal(mapConsultation(example, '', profile).status, category);
  }
  const stages = renderToStaticMarkup(createElement(AgentTransparencyScreen, { consultation: live }));
  assert.match(stages, /documents.{0,40}unavailable/);
  assert.doesNotMatch(stages, /Judge|latency/);
  assert.doesNotMatch(stages, /\b(proponent|opponent|langgraph)\b/i);
  assert.match(stages, /Supporting evidence specialist/);
  assert.match(stages, /Critical safety review specialist/);
  assert.match(stages, /Source unavailable/);
  const emptyStages = renderToStaticMarkup(createElement(AgentTransparencyScreen, { consultation: null }));
  assert.match(emptyStages, /No consultation selected/);
  const loadingStages = renderToStaticMarkup(createElement(AgentTransparencyScreen, { consultation: null, isLoading: true }));
  assert.match(loadingStages, /Loading consultation workflow trace/i);
  const errorStages = renderToStaticMarkup(createElement(AgentTransparencyScreen, { consultation: null, error: 'Trace fetch failed.' }));
  assert.match(errorStages, /Process trace unavailable/);
  assert.match(errorStages, /Trace fetch failed\./);
  const { AdminPortalScreen } = await server.ssrLoadModule('/src/screens/AdminPortalScreen.tsx');
  const adminView = renderToStaticMarkup(createElement(AdminPortalScreen, { backendOnline: false }));
  assert.match(adminView, /Demonstration Review Queue/i);
  assert.match(adminView, /Release History \(Demo\)/i);
  assert.doesNotMatch(adminView, /changes safety review status in the audit log/i);
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
