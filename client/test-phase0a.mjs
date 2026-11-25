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
    assert.deepEqual(form.getAll(key), value === undefined ? [] : Array.isArray(value) ? value : [String(value)]);
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
  const payload = { success: true, consultationId: id, result: state.final_response };
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
