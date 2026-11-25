import assert from 'node:assert/strict';
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
  appendClinicalProfile(form, DEFAULT_PROFILE);
  for (const [key, value] of Object.entries(clinicalProfile(DEFAULT_PROFILE))) {
    assert.deepEqual(form.getAll(key), Array.isArray(value) ? value : [String(value)]);
  }
  assert.equal(form.has('fullName'), false);

  const assessmentPayload = {
    verdict: {category:'expert_review_required',expertReview:true,coverage:[{dimension:'interactions',status:'not_assessed',reason:'Medication list unavailable.'}]},
    ledger:[{id:'ev-fixture',title:'Fixture source',location:'line 19',kind:'association',verification:'source_traceable',excerpt:'Source row fixture',metadata:{}}],
    findings:[{role:'proponent',text:'Selected record',evidenceIds:['ev-fixture']}],stages:[{name:'documents',status:'unavailable'}]
  };
  const live=mapConsultation({consultationId:'record',result:{assessment:assessmentPayload,final_verdict:'EXPERT_REVIEW_REQUIRED',summary_message:'Expert review required.'}},'Fixture question',DEFAULT_PROFILE);
  const page=renderToStaticMarkup(createElement(AIAssessmentScreen,{consultation:live,allConsultations:[live]}));
  for (const phrase of ['Source row fixture','line 19','Medication list unavailable.','expert review required','ev-fixture']) assert.ok(page.toLowerCase().includes(phrase.toLowerCase()));
  const stages=renderToStaticMarkup(createElement(AgentTransparencyScreen,{consultation:live}));
  assert.ok(stages.includes('documents') && stages.includes('unavailable'));
  for (const [herb, other] of [['Tulsi', 'Fennel'], ['Fennel', 'Tulsi']]) {
    const record = mapConsultation({ consultationId: 'id-' + herb, result: {
      final_verdict: 'CAUTION_REQUIRED', evaluated_herbs: [herb], summary_message: 'Assessment for ' + herb,
      safety_warnings: ['Warning for ' + herb], uncertainty_note: 'Uncertainty for ' + herb,
      clinical_reasoning: ['Finding for ' + herb]
    } }, 'Consult about ' + herb, DEFAULT_PROFILE);
    assert.equal(record.id, 'id-' + herb);
    const assessment = renderToStaticMarkup(createElement(AIAssessmentScreen, { consultation: record, allConsultations: [record] }));
    for (const field of ['Warning for ', 'Uncertainty for ', 'Finding for ', 'Assessment for ']) {
      assert.ok(assessment.includes(field + herb));
    }
    assert.equal(assessment.includes(other), false);
    assert.ok(assessment.includes('Not available'));
    const transparency = renderToStaticMarkup(createElement(AgentTransparencyScreen, { consultation: record }));
    assert.ok(transparency.includes('Not available') && transparency.includes(herb));
    assert.ok(!transparency.includes('Total pipeline latency') && !transparency.includes('Ginger'));
  }

  const { HealthProfileScreen } = await server.ssrLoadModule('/src/screens/HealthProfileScreen.tsx');
  const blankProfile = { ...DEFAULT_PROFILE, ageGroup: '', biologicalSex: '', dietaryPreference: '', prakriti: '', season: '', conditions: [], allergies: [], medications: [] };
  const profileMarkup = renderToStaticMarkup(createElement(HealthProfileScreen, { profile: blankProfile, onSaveProfile: () => {}, onNavigate: () => {} }));
  assert.ok(profileMarkup.includes('<option value="" selected="">Not specified</option>') || profileMarkup.includes('Not specified'));
});
