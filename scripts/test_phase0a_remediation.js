const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { Readable } = require('node:stream');
const { crc32 } = require('node:zlib');
const { once } = require('node:events');
const { createApp } = require('../server');
const { TraceStore } = require('../lib/trace_store');
const { MAX_IMAGE_BYTES } = require('../lib/security');
const vision = require('../engine/vision_agent');
const label = require('../engine/label_audit');
const { handleClinicalFollowUp } = require('../engine/followup_agent');
const { sanitizeLabelAudit, sanitizeConsultationResult } = require('../lib/response_sanitizer');
const root = path.join(__dirname, '..');
const tulsi = fs.readFileSync(path.join(root, 'test_assets/tulsi_label.png'));

async function api(t, deps = {}) {
  const app = createApp({ legacyTestAdapter: true, traceStore: new TraceStore(), ...deps });
  const server = app.listen(0, '127.0.0.1');
  await once(server, 'listening');
  t.after(() => new Promise(resolve => server.close(resolve)));
  return (route, options) => fetch('http://127.0.0.1:' + server.address().port + '/api/' + route, options);
}
function json(body) {
  return { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) };
}
function form(image = tulsi) {
  const fields = new FormData();
  fields.append('image', new Blob([image], { type: 'image/png' }), 'label.png');
  return fields;
}
function agentWithResponse(agent, output) {
  const instance = Object.create(agent);
  instance.candidateModels = ['fixture-a', 'fixture-b'];
  instance.genAI = { getGenerativeModel: () => ({
    generateContent: async () => {
      if (!output) throw new Error('fixture provider unavailable');
      return { response: { text: () => JSON.stringify(output) } };
    }
  }) };
  return instance;
}
test('the same herbal fixture distinguishes provider outage from completed negative classification', async t => {
  const call = await api(t, { visionAgent: agentWithResponse(vision), labelAudit: agentWithResponse(label) });
  for (const route of ['scan', 'consult-with-image', 'label-audit']) {
    const response = await call(route, { method: 'POST', body: form() });
    assert.equal(response.status, 503);
    const data = await response.json();
    assert.equal(data.status, 'ANALYSIS_UNAVAILABLE');
    if (route === 'label-audit') assert.deepEqual(data.extraction, { extraction_failed: true });
    else assert.deepEqual(data.scan, { status: 'ANALYSIS_UNAVAILABLE' });
    assert.equal(data.isOutOfDomain, undefined);
  }
  const electronics = fs.readFileSync(path.join(root, 'test_assets/electronics_out_of_domain.png'));
  const completed = agentWithResponse(vision, { is_ayurvedic_or_herbal: false, detected_herbs: [], ingredients_detected: [] });
  assert.equal((await completed.analyzeImage(electronics, 'image/png')).status, 'OUT_OF_DOMAIN');
});

function state(verdict = 'SAFE — RECOMMENDED') {
  return { canonical_entities: { mentioned_herbs: ['Tulsi'] }, graph_available: true,
    graph_facts: { alternatives: [{ herb: 'Mint' }] }, confidence_score: 0.76,
    final_response: { final_verdict: verdict, summary_message: 'Original assessment statement.',
      clinical_reasoning: ['Adjudicated explanation.'], suggested_alternatives: [{ herb_name: 'Mint' }] } };
}

test('mixed formulations keep every ingredient and cannot receive a whole-product clearance', async t => {
  const mixed = agentWithResponse(vision, { is_ayurvedic_or_herbal: true, detected_herbs: ['Tulsi'],
    ingredients_detected: ['Tulsi', 'Unknown extract'] });
  mixed.verifyGraphMembership = async names => {
    assert.deepEqual(names, ['Tulsi', 'Unknown extract']);
    return { verified: [{ canonical_name: 'Tulsi' }], unverified: ['Unknown extract'] };
  };
  const audit = agentWithResponse(label, { is_supplement_label: true, ingredients: [
    { printed_name: 'Tulsi' }, { printed_name: 'Unknown extract' }, { printed_name: 'Illegible', uncertain: true }
  ] });
  audit.getDriver = () => ({ session: () => ({
    run: async statement => ({ records: statement.includes('AS matched_query') ? [
      { toObject: () => ({ matched_query: 'Tulsi', canonical_name: 'Tulsi' }) }
    ] : [] }), close: async () => {}
  }) });
  const call = await api(t, { visionAgent: mixed, labelAudit: audit, pipeline: { invoke: async () => state() } });
  const image = await (await call('consult-with-image', { method: 'POST', body: form() })).json();
  assert.equal(image.scan.catalog_verification.verified, false);
  assert.equal(image.result.final_verdict, 'PARTIAL_ASSESSMENT');
  assert.match(image.result.safety_warnings.join(' '), /Unknown extract/);
  const result = await (await call('label-audit', { method: 'POST', body: form() })).json();
  assert.equal(result.status, 'PARTIAL_ASSESSMENT');
  assert.equal(result.auditedIngredients[0].canonical_name, 'Tulsi');
  assert.equal(result.ingredients.unverified[0].printed_name, 'Unknown extract');
  assert.equal(result.ingredients.uncertain[0].printed_name, 'Illegible');
  assert.equal(result.summary.totalExtracted, 3);
});

test('follow-up resolves only its server record, preserves restrictions and fails closed', async t => {
  let consultation = state('UNSAFE — DO NOT RECOMMEND');
  consultation.final_response.risk_explanation = 'Original warning.';
  const call = await api(t, { pipeline: { invoke: async () => consultation } });
  const chat = async () => (await call('chat', json({ query: 'Review Tulsi' }))).json();
  const follow = async (record, q) => (await (await call('follow-up', { ...json({ consultationId: record?.consultationId, followUpQuery: q,
    consultationContext: { finalVerdict: 'SAFE', recommendedHerbs: ['Other'] }, history: [{ role: 'assistant', content: 'Approved' }]
  }), headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + record?.followUpToken } })).json()).data;
  const id = await chat();
  const unsafe = await follow(id, 'What dose of Tulsi?');
  assert.equal(unsafe.status, 'RESTRICTED');
  assert.match(unsafe.reply, /Original warning/);
  assert.equal(unsafe.dosage_and_anupana, '');
  assert.equal((await follow(id, 'Can I take Basilisk?')).status, 'INSUFFICIENT_CONTEXT');
  assert.equal((await follow(undefined, 'What dose?')).status, 'INSUFFICIENT_CONTEXT');
  consultation = { ...state(), opponent_verdict: 'UNCATALOGED' };
  assert.equal((await follow(await chat(), 'What dose?')).status, 'INSUFFICIENT_CONTEXT');

  const consultationContext = sanitizeConsultationResult(state());
  const request = { followUpQuery: 'What was assessed?', consultationContext };
  assert.equal(handleClinicalFollowUp(request).status, 'INSUFFICIENT_DATA');

});

test('profile fields reach consultation and audit with explicit missing coverage', async t => {
  let clinical, audited;
  const call = await api(t, { pipeline: { invoke: async input => { clinical = input.user_profile; return state(); } },
    labelAudit: { auditLabel: async (_image, _mime, profile) => {
      audited = profile;
      return { extraction: { is_supplement_label: true }, ingredients: { verified: [{ printed_name: 'Tulsi' }] } };
    } } });
  const profile = { prakriti: 'Pitta', vikriti: 'Vata', season: 'Grishma', allergies: ['Example'], medications: ['Example'],
    ageGroup: 'Adult', biologicalSex: 'Female', avoidAlcoholExtracts: true, dietaryPreference: 'Vegetarian' };
  const response = await (await call('chat', json({ query: 'Tulsi', ...profile, conditions: 'A, B' }))).json();
  assert.equal(response.result.final_verdict, 'INSUFFICIENT_DATA');
  assert.match(response.result.missing_coverage.join(' '), /interactions/);
  const fields = form();
  for (const [key, value] of Object.entries(profile)) fields.append(key, String(value));
  for (const condition of ['A', 'B']) fields.append('conditions[]', condition);
  const result = await (await call('label-audit', { method: 'POST', body: fields })).json();
  assert.equal(result.status, 'INSUFFICIENT_DATA');
  for (const [key, value] of Object.entries(profile)) {
    assert.deepEqual(clinical[key === 'season' ? 'current_season' : key], value);
    assert.deepEqual(audited[key], value);
  }
  assert.deepEqual(clinical.chronic_conditions, ['A', 'B']);
  assert.deepEqual(audited.conditions, ['A', 'B']);
});

test('parser and upload boundaries cover multipart, chunked streams, JSON and base64 padding', async t => {
  const call = await api(t, { visionAgent: { analyzeImage: async () => ({ is_ayurvedic_or_herbal: false }) },
    rateLimits: { vision: { max: 40 } } });
  const post = body => call('scan', { method: 'POST', body });
  // Insert a valid PNG ancillary chunk before IEND to make an exact-limit image.
  const extra = Buffer.alloc(MAX_IMAGE_BYTES - tulsi.length);
  extra.writeUInt32BE(extra.length - 12);
  extra.write('tEXt', 4);
  extra.write('Comment', 8);
  extra.fill(32, 16, extra.length - 4);
  extra.writeUInt32BE(crc32(extra.subarray(4, -4)), extra.length - 4);
  const full = Buffer.concat([tulsi.subarray(0, -12), extra, tulsi.subarray(-12)]);
  assert.equal((await post(form(full))).status, 200);
  assert.equal((await call('scan', json({ imageBase64: full.toString('base64') }))).status, 200);
  const tooBig = Buffer.concat([full, Buffer.alloc(1)]);
  assert.equal((await post(form(tooBig))).status, 413);
  assert.equal((await call('scan', json({ imageBase64: tooBig.toString('base64') }))).status, 413);
  const excessive = form();
  for (let i = 0; i < 74; i++) excessive.append('conditions', 'test');
  assert.equal((await post(excessive)).status, 413);
  const longField = form();
  longField.append('query', 'a'.repeat(4097));
  assert.equal((await post(longField)).status, 413);
  const chunked = async fields => {
    const req = new Request('http://localhost', { method: 'POST', body: fields });
    return call('scan', { method: 'POST', headers: { 'content-type': req.headers.get('content-type') },
      body: Readable.fromWeb(req.body), duplex: 'half' });
  };
  assert.equal((await chunked(form())).status, 200);
  assert.equal((await chunked(form(Buffer.alloc(MAX_IMAGE_BYTES + 300 * 1024)))).status, 413);
  assert.equal((await post(form(Buffer.alloc(MAX_IMAGE_BYTES + 300 * 1024)))).status, 413);
  const broken = await call('scan', { method: 'POST', headers: { 'content-type': 'multipart/form-data' }, body: 'incomplete' });
  assert.equal(broken.status, 400);
  assert.equal((await call('chat', json({ query: 'a'.repeat(270000) }))).status, 413);
  assert.equal((await call('chat', { method: 'POST', headers: { 'Content-Type': 'application/json; charset=iso-8859-1' }, body: '{}' })).status, 415);
});

test('DTOs reject unrelated nested fields and never adopt contradictory draft reasoning', () => {
  const input = state('UNSAFE — DO NOT RECOMMEND');
  input.proponent_draft = { reasoning: ['Draft claims safety'] };
  input.final_response.clinical_reasoning = ['Unrestricted use'];
  input.final_response.risk_explanation = 'Verified warning';
  const result = sanitizeConsultationResult(input);
  assert.deepEqual(result.clinical_reasoning, ['Verified warning']);
  assert.ok(!JSON.stringify(result).includes('Draft claims'));
  assert.equal(sanitizeLabelAudit({ extraction: {} }).status, 'ANALYSIS_UNAVAILABLE');
  const audit = sanitizeLabelAudit({ extraction: { is_supplement_label: true, secret: 'private' }, summary: { secret: 'private' },
    ingredients: { verified: [{ status: { secret: 'private' }, safety: { verdict: { secret: 'private' } } }] } });
  assert.ok(!JSON.stringify(audit).includes('private'));
  assert.ok(Object.values(audit.summary).every(Number.isInteger));
});

test('index loads once across real ranking calls and rejects invalid reloads', async t => {
  const store = require('../engine/vector_store');
  const chunks = JSON.parse(fs.readFileSync(store.INDEX_PATH, 'utf8')).chunks;
  const vector = chunks[0].embedding;
  const expected = chunks.slice().sort((a,b) => store.cosineSimilarity(vector,b.embedding) - store.cosineSimilarity(vector,a.embedding)).slice(0,3).map(c => c.id);
  const sdk = require('@google/generative-ai').GoogleGenerativeAI;
  const oldKey = process.env.GEMINI_API_KEY;
  process.env.GEMINI_API_KEY = 'offline-fixture';
  t.after(() => { if (oldKey === undefined) delete process.env.GEMINI_API_KEY; else process.env.GEMINI_API_KEY = oldKey; });
  t.mock.method(sdk.prototype, 'getGenerativeModel', () => ({ embedContent: async () => ({ embedding: { values: vector } }) }));
  const original = fs.readFileSync;
  let reads = 0;
  t.mock.method(fs, 'readFileSync', function(file, ...args) {
    if (file === store.INDEX_PATH) reads++;
    return original.call(this, file, ...args);
  });
  for (let i = 0; i < 2; i++) assert.deepEqual((await store.search('fixture')).map(c => c.id), expected);
  assert.equal(reads, 1);
  store.loadIndex(undefined, { reload: true });
  assert.equal(reads, 2);
  assert.throws(() => store.loadIndex(path.join(root, 'package.json')), /Invalid classical/);
  assert.throws(() => store.loadIndex(path.join(root, 'missing-fixture.json')), /ENOENT/);
});

test('database session closes after rejection and the lifecycle owner can close and reopen', async t => {
  const db = require('../lib/neo4j_config');
  const Builder = require('../engine/cypher_builder');
  const config = { NEO4J_URI: 'bolt://localhost', NEO4J_USERNAME: 'fixture', NEO4J_PASSWORD: '  exact  ' };
  assert.equal(db.getNeo4jCredentials(config).password, config.NEO4J_PASSWORD);
  const old = Object.fromEntries(Object.keys(config).map(key => [key, process.env[key]]));
  Object.assign(process.env, config);
  t.after(async () => {
    await db.closeSharedDriver();
    for (const [key, value] of Object.entries(old)) {
      if (value === undefined) delete process.env[key]; else process.env[key] = value;
    }
  });
  const driver = db.getSharedDriver();
  let closes = 0;
  t.mock.method(driver, 'session', () => ({
    run: async () => { if (!closes) throw Error('fixture failure'); return { records: [] }; },
    close: async () => { closes++; }
  }));
  const builder = new Builder(driver);
  await assert.rejects(builder.execute('RETURN 1'), /fixture failure/);
  assert.deepEqual(await builder.execute('RETURN 1'), []);
  assert.equal(closes, 2);
  assert.equal(driver, db.getSharedDriver());
  const server = createApp().listen(0, '127.0.0.1');
  await once(server, 'listening');
  await require('../server').stopServer(server);
  assert.equal(server.listening, false);
  assert.notEqual(driver, db.getSharedDriver());
});

test('local asset refresh preserves unrelated files and rejects unsafe manifest entries', t => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'veda-publish-'));
  t.after(() => fs.rmSync(dir, { recursive: true, force: true }));
  const assets = path.join(dir, 'assets');
  fs.mkdirSync(assets);
  fs.writeFileSync(path.join(assets, 'unrelated.js'), 'preserve');
  fs.writeFileSync(path.join(assets, 'index-aaaaaaaa.js'), 'old');
  const manifest = path.join(dir, '.veda-managed-assets.json');
  fs.writeFileSync(manifest, JSON.stringify(['index-aaaaaaaa.js']));
  const publish = () => require('./publish_client').publishClient(path.join(root, 'client/dist'), dir);
  publish();
  publish();
  assert.equal(fs.readFileSync(path.join(assets, 'unrelated.js'), 'utf8'), 'preserve');
  assert.ok(!fs.existsSync(path.join(assets, 'index-aaaaaaaa.js')));
  fs.writeFileSync(manifest, JSON.stringify(['../unrelated.js']));
  assert.throws(publish, /Invalid managed/);
});

test('logs contain correlation metadata only and idle traces expire', async t => {
  const { logServerError } = require('../lib/security');
  const calls = [];
  t.mock.method(console, 'error', line => calls.push(JSON.parse(line)));
  logServerError('/api/chat', Error('fixture private provider message'), 'fixture-request');
  assert.deepEqual(calls, [{ event: 'request_failed', requestId: 'fixture-request', operation: '/api/chat', status: 500 }]);
  const store = new TraceStore({ maxEntries: 1, ttlMs: 15 });
  store.saveTrace('one', 'consultation', {});
  store.saveTrace('two', 'consultation', {});
  assert.equal(store.getTrace('one'), null);
  await new Promise(resolve => setTimeout(resolve, 40));
  assert.equal(store.entries.size, 0);
});

test('shared capacity rejects concurrent work and releases after completion or parser errors', async t => {
  let started, finish;
  const running = new Promise(resolve => { started = resolve; });
  const completed = new Promise(resolve => { finish = resolve; });
  const call = await api(t, { maxClinicalRequests: 1, pipeline: { invoke: async () => {
    started();
    await completed;
    return state();
  } } });
  const pending = call('chat', json({ query: 'Tulsi' }));
  await running;
  try {
    assert.equal((await call('scan', { method: 'POST', body: form() })).status, 429);
  } finally {
    finish();
  }
  assert.equal((await pending).status, 200);
  assert.equal((await call('chat', { method: 'POST', headers: { 'content-type': 'application/json' }, body: '{' })).status, 400);
  assert.equal((await call('chat', json({ query: 'Tulsi' }))).status, 200);
});

test('complete public tree contains no configured Aura identifier or connection URI', () => {
  const directory = path.join(root, 'public');
  const instance = process.env.NEO4J_URI?.match(/:\/\/([a-z0-9-]+)\.databases\.neo4j\.io/i)?.[1];
  for (const file of fs.readdirSync(directory, { recursive: true, withFileTypes: true })) {
    if (!file.isFile()) continue;
    const bytes = fs.readFileSync(path.join(file.parentPath, file.name));
    assert.doesNotMatch(bytes.toString('latin1'), /(?:bolt|neo4j)\+(?:s|ssc):\/\/|\.databases\.neo4j\.io/i, file.name);
    if (instance) assert.ok(!bytes.includes(Buffer.from(instance)), file.name);
  }
});

test('invalid structured provider output tries the next configured model', async () => {
  const llm = Object.create(require('../engine/llm_client'));
  llm.isConfigured = true;
  llm.candidateModels = ['fixture-1', 'fixture-2'];
  const outputs = ['incomplete', '{"valid":true}'];
  llm.genAI = { getGenerativeModel: () => ({ generateContent: async () => ({
    response: { text: () => outputs.shift() }
  }) }) };
  assert.deepEqual(await llm.generateJSON('fixture', {}), { valid: true });
  assert.equal(llm.modelName, 'fixture-2');
});

test('image catalog failure is visible and missing demographic fields stay omitted', async t => {
  const agent = agentWithResponse(label, { is_supplement_label: true, ingredients: ['Tulsi'] });
  agent.verifyIngredients = async () => ({ verified: [], unverified: [], uncertain: [] });
  let observed;
  agent.runSafetyAudit = async (_, profile) => { observed = profile; throw Error('private diagnostic'); };
  const call = await api(t, { labelAudit: agent });
  const response = await call('label-audit', { method: 'POST', body: form() });
  assert.equal(response.status, 503);
  assert.equal((await response.json()).status, 'CATALOG_UNAVAILABLE');
  assert.equal(observed.season, undefined);
  assert.equal(observed.prakriti, undefined);
});

test('a consultation bearer expires with its trace and gives no access to another trace', async () => {
  const store = new TraceStore({ ttlMs: 20 });
  const token = store.saveConsultation('one', 'consultation', { marker: 'one' });
  const other = store.saveConsultation('two', 'consultation', { marker: 'two' });
  assert.equal(store.authorizedConsultation('one', 'Bearer ' + token).marker, 'one');
  assert.equal(store.authorizedConsultation('one', 'Bearer ' + other), null);
  assert.equal(store.authorizedConsultation('one', ''), null);
  assert.ok(!JSON.stringify(store.getTrace('one')).includes(token));
  await new Promise(done => setTimeout(done, 30));
  assert.equal(store.authorizedConsultation('one', 'Bearer ' + token), null);
});
