/**
 * VedaAI — Phase 0A Security, Information-Leakage Remediation & Functional Verification Suite
 *
 * Uses Node's built-in test runner cleanly on an ephemeral localhost port without
 * mutating repository data files or calling external paid APIs in deterministic unit tests,
 * plus live end-to-end API smoke verification when credentials are configured.
 */

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const os = require('os');
const path = require('path');

const { createApp } = require('../server');
const { TraceStore } = require('../lib/trace_store');
const { getNeo4jCredentials, closeSharedDriver } = require('../lib/neo4j_config');
const { detectImageSignature } = require('../lib/security');
const { scrubInternalText } = require('../lib/response_sanitizer');

const FORBIDDEN_OUTPUT_PATTERNS = [
  /-\[:[A-Z_]+/i,
  /\]->\(/,
  /<-\[:/,
  /\bOPTIONAL\s+MATCH\b/i,
  /\bUNWIND\s+\$/i,
  /\bgemini-[a-z0-9._-]+/i,
  /\btest-db\b/i,
  /neo4j\+s:\/\//i,
  /\.databases\.neo4j\.io/i,
  /\bNeo4j\b/i,
  /\bLangGraph\b/i,
  /\bStateGraph\b/i,
  /[A-Za-z]:\\(?:Users|home|engine|scripts|node_modules)/i,
  /\/(?:Users|home|engine|scripts|node_modules)\//i,
  /\bat\s+[A-Za-z0-9_.]+\s+\([^)]+\.(?:js|ts):\d+:\d+\)/
];

function assertNoSensitiveLeakage(payload, label) {
  const serialized = typeof payload === 'string' ? payload : JSON.stringify(payload);
  for (const pattern of FORBIDDEN_OUTPUT_PATTERNS) {
    assert.equal(
      pattern.test(serialized),
      false,
      `${label} leaked forbidden pattern ${pattern}: ${serialized.slice(0, 400)}`
    );
  }
}

async function startTestServer(app) {
  return new Promise(resolve => {
    const server = app.listen(0, '127.0.0.1', () => {
      const { port } = server.address();
      resolve({
        server,
        baseUrl: `http://127.0.0.1:${port}`
      });
    });
  });
}

function makeMockPipelineState() {
  return {
    raw_query: 'Can I take Ginger in summer with acid reflux?',
    canonical_entities: {
      mentioned_herbs: ['Ginger'],
      symptoms: ['digestion'],
      query_season: 'Grishma',
      patient_prakriti: 'Pitta-Vata',
      patient_conditions: ['Acid Reflux'],
      query_intent: 'herb_safety_check',
      profile_merged: true
    },
    retrieval_plan: {
      graph_symptom_terms: ['digestion', 'dyspepsia'],
      vector_query: 'Ginger Pitta Grishma Acid Reflux'
    },
    agent_trace: [
      { agent: 'entity_extractor', provider: 'Google Gemini API', model: 'gemini-3.5-flash-lite', completed: true },
      { agent: 'hybrid_retrieval_planner', provider: 'Google Gemini API', model: 'gemini-3.5-flash-lite', completed: true },
      { agent: 'proponent', provider: 'Google Gemini API', model: 'gemini-3.5-flash-lite', completed: true },
      { agent: 'opponent', provider: 'Google Gemini API', model: 'gemini-3.5-flash-lite', completed: true },
      { agent: 'judge', provider: 'Google Gemini API', model: 'gemini-3.5-flash-lite', completed: true }
    ],
    graph_available: true,
    proponent_draft: {
      verdict: 'SUPPORTS',
      reasoning: [
        'Ginger traditionally supports digestive warmth in sluggish Kapha/Vata states according to botanical monographs.',
        'Summary note grounded in Neo4j Aura Knowledge Graph (cosine 0.842).'
      ]
    },
    opponent_verdict: 'FLAGGED',
    opponent_flags: ['SEASONAL_CONTRAINDICATION_DETECTED', 'MORBIDITY_CLASH_PITTA'],
    judge_certainty: 0.91,
    confidence_score: 0.785,
    graph_facts: {
      herbDetails: [{ name: 'Ginger', botanical_name: 'Zingiber officinale', virya: 'Ushna' }],
      doshaRelations: [{ herb: 'Ginger', relationship: 'AGGRAVATES', dosha: 'Pitta' }],
      seasonInfo: [{ season_sanskrit: 'Grishma', dominant_dosha: 'Pitta' }],
      conditionInfo: [{ condition: 'Acid Reflux', dosha: 'Pitta', strength: 5 }],
      contraindications: [{ herb: 'Ginger', season_sanskrit: 'Grishma', reason: 'Aggravates heat' }],
      collisionPaths: [
        '(Ginger)-[:CONTRAINDICATED_IN]->(Grishma)',
        '(Acid Reflux)-[:ASSOCIATED_WITH]->(Pitta)<-[:AGGRAVATES]-(Ginger)'
      ],
      collisionReasoning: [
        'Ginger has a seasonal contraindication during summer heat and may irritate Acid Reflux.'
      ],
      alternatives: [{ herb_name: 'Fennel', botanical_name: 'Foeniculum vulgare', virya: 'Sheeta', why_safe: 'Cooling carminative' }],
      vectorMatches: [{ id: 'graph-herb-01', title: 'Ginger profile', text: '...', similarityScore: 0.842 }]
    },
    final_response: {
      final_verdict: 'UNSAFE — DO NOT RECOMMEND',
      judge_certainty: 0.91,
      confidence_score: 0.785,
      summary_message: 'Daily Ginger is not advised during summer because (Ginger)-[:CONTRAINDICATED_IN]->(Grishma) per Neo4j Aura and gemini-3.5-flash-lite.',
      risk_explanation: 'Collision detected: (Ginger)-[:AGGRAVATES]->(Pitta) worsens Acid Reflux in summer heat.',
      suggested_alternatives: [
        {
          herb_name: 'Fennel',
          botanical_name: 'Foeniculum vulgare',
          virya: 'Sheeta',
          why_safe: 'Cooling option from LangGraph that balances Pitta.'
        }
      ],
      graph_evidence_summary: [
        '(Ginger)-[:CONTRAINDICATED_IN]->(Grishma)',
        'Ginger profile (cosine 0.842)'
      ],
      evidence_confidence: {
        graph: true,
        top_vector_similarity: 0.842,
        judge_certainty: 0.91
      },
      disclaimer: 'Consult a registered BAMS practitioner before starting herbal remedies.'
    }
  };
}

function makeMockDriver(shouldFail = false) {
  return {
    session() {
      return {
        async run(cypher) {
          if (shouldFail) {
            throw new Error('Neo4j Aura connection refused at C:\\Users\\rahul\\OneDrive\\secret\\db.js neo4j+s://test-db.databases.neo4j.io');
          }
          if (cypher.includes('MATCH (h:Herb)')) {
            return {
              records: [
                {
                  toObject: () => ({
                    name: 'Ginger',
                    botanical_name: 'Zingiber officinale',
                    sanskrit_name: 'Shunthi/Adrak',
                    virya: 'Ushna',
                    rasa: 'Katu,Madhura',
                    therapeutic_uses: 'dyspepsia,nausea',
                    pacifies: ['Vata', 'Kapha'],
                    aggravates: ['Pitta']
                  })
                }
              ]
            };
          }
          return { records: [{ get: () => ({ toInt: () => 1 }) }] };
        },
        async close() {}
      };
    }
  };
}

test('Neo4j credentials helper rejects missing config and uses zero hardcoded fallbacks', () => {
  assert.throws(
    () => getNeo4jCredentials({ NEO4J_URI: 'neo4j+s://example.databases.neo4j.io', NEO4J_PASSWORD: 'secret' }),
    /NEO4J_USERNAME/
  );
  assert.throws(
    () => getNeo4jCredentials({ NEO4J_URI: 'neo4j+s://YOUR_INSTANCE_ID.databases.neo4j.io', NEO4J_USERNAME: 'u', NEO4J_PASSWORD: 'p' }),
    /explicitly configured/
  );
  const creds = getNeo4jCredentials({
    NEO4J_URI: 'neo4j+s://example.databases.neo4j.io',
    NEO4J_USERNAME: 'custom_user',
    NEO4J_PASSWORD: 'custom_password'
  });
  assert.deepEqual(creds, {
    uri: 'neo4j+s://example.databases.neo4j.io',
    username: 'custom_user',
    password: 'custom_password'
  });
});

test('Backend codebases contain no hardcoded Neo4j username or instance fallbacks', () => {
  const filesToCheck = [
    'server.js',
    'engine/agents.js',
    'engine/vision_agent.js',
    'engine/followup_agent.js',
    'engine/label_audit.js',
    'scripts/run_ablation_benchmark.js'
  ];
  for (const rel of filesToCheck) {
    const content = fs.readFileSync(path.join(__dirname, '..', rel), 'utf8');
    assert.equal(
      /NEO4J_USERNAME\s*\|\||neo4j\+s:\/\/[\w-]+\.databases\.neo4j\.io/.test(content),
      false,
      `${rel} must not contain hardcoded instance identifier or username fallback`
    );
  }
});

test('Image magic-byte signature detector distinguishes genuine vs spoofed buffers', () => {
  const realPng = fs.readFileSync(path.join(__dirname, '..', 'test_assets', 'ashwagandha_label.png'));
  assert.equal(detectImageSignature(realPng), 'image/png');
  assert.equal(detectImageSignature(Buffer.from([0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10])), 'image/jpeg');
  assert.equal(detectImageSignature(Buffer.from('<svg xmlns="http://www.w3.org/2000/svg"></svg>')), null);
  assert.equal(detectImageSignature(Buffer.from('MZfake-executable-bytes')), null);
});

test('Text scrubber preserves plain English words like "match" while scrubbing Cypher and bare Aura IDs', () => {
  const clean = scrubInternalText('Result matches your Dosha and (Ginger)-[:CONTRAINDICATED_IN]->(Grishma).');
  assert.ok(clean.includes('Result matches your Dosha'));
  assert.ok(clean.includes('Ginger is contraindicated during Grishma'));
  assertNoSensitiveLeakage(clean, 'scrubInternalText');

  const oldUri = process.env.NEO4J_URI;
  process.env.NEO4J_URI = 'neo4j+s://ab12cd34.databases.neo4j.io';
  try {
    const scrubbedBareId = scrubInternalText('Failure on instance ab12cd34 inside handler.');
    assert.equal(scrubbedBareId.includes('ab12cd34'), false);
    assert.ok(scrubbedBareId.includes('[database]'));
  } finally {
    if (oldUri === undefined) delete process.env.NEO4J_URI;
    else process.env.NEO4J_URI = oldUri;
  }
});

test('Public API removes infrastructure IDs, raw traces, Cypher, and model IDs while storing traces server-side', async () => {
  const traceStore = new TraceStore();
  const tempFeedback = path.join(os.tmpdir(), `vedaai-feedback-${Date.now()}.jsonl`);

  const app = createApp({
    legacyTestAdapter: true,
    pipeline: { invoke: async () => makeMockPipelineState() },
    visionAgent: {
      analyzeImage: async () => ({
        product_name: 'Ashwagandha Root Powder',
        is_ayurvedic_or_herbal: true,
        detected_herbs: ['Indian Ginseng'],
        ingredients_detected: ['Withania somnifera'],
        formulation_type: 'Powder/Churna',
        visual_confidence: 0.94,
        extracted_ocr_text: 'Ashwagandha Root Churna',
        summary: 'Verified via gemini-flash-lite-latest against Neo4j Aura.',
        graph_membership: {
          status: 'VERIFIED_CANONICAL_HERBS',
          verified_herbs: [
            { canonical_name: 'Indian Ginseng', botanical_name: 'Withania somnifera', sanskrit_name: 'Ashwagandha', virya: 'Ushna' }
          ],
          unverified_herbs: []
        }
      })
    },
    labelAudit: {
      auditLabel: async () => ({
        extraction: {
          product_name: 'Trikatu Blend',
          formulation_type: 'Capsule',
          visual_confidence: 0.91,
          extracted_ocr_text: 'Ginger 150mg',
          summary: 'Checked against Neo4j Aura.',
          is_supplement_label: true
        },
        ingredients: {
          verified: [
            {
              printed_name: 'Shunthi',
              common_name: 'Ginger',
              uncertain: false,
              status: 'verified',
              canonical_name: 'Ginger',
              botanical_name: 'Zingiber officinale',
              sanskrit_name: 'Shunthi/Adrak',
              virya: 'Ushna',
              rasa: 'Katu,Madhura'
            }
          ],
          unverified: [],
          uncertain: []
        },
        auditedIngredients: [
          {
            printed_name: 'Shunthi',
            common_name: 'Ginger',
            uncertain: false,
            status: 'verified',
            canonical_name: 'Ginger',
            botanical_name: 'Zingiber officinale',
            sanskrit_name: 'Shunthi/Adrak',
            virya: 'Ushna',
            rasa: 'Katu,Madhura',
            safety: {
              verdict: 'FLAGGED',
              flags: ['SEASONAL_CONTRAINDICATION'],
              paths: [
                '(Ginger)-[:CONTRAINDICATED_IN]->(Grishma)',
                '(Ginger)-[:AGGRAVATES]->(Pitta)'
              ],
              reasoning: ['Ginger is contraindicated during Grishma due to (Ginger)-[:AGGRAVATES]->(Pitta).']
            }
          }
        ],
        summary: { totalExtracted: 1, verified: 1, unverified: 0, uncertain: 0, flagged: 1, safe: 0 }
      })
    },
    followUpHandler: async () => ({
      reply: 'Use cooling water instead of Ginger per Neo4j Aura.',
      dosage_and_anupana: 'Warm water',
      pathya_apathya: 'Light cooling meals',
      precautions: 'Consult BAMS doctor',
      suggested_followups: ['Can I take Fennel tea?']
    }),
    driver: makeMockDriver(false),
    checkDbHealth: async () => true,
    traceStore,
    feedbackFilePath: tempFeedback,
    allowedOrigins: ['http://localhost:3000']
  });

  const { server, baseUrl } = await startTestServer(app);
  try {
    // 1. GET /api/status must not leak instance IDs, node counts, or model config
    const statusRes = await fetch(`${baseUrl}/api/status`);
    assert.equal(statusRes.status, 200);
    const statusBody = await statusRes.json();
    assert.deepEqual(statusBody, { status: 'online', catalogReady: true });
    assert.equal(statusRes.headers.get('x-content-type-options'), 'nosniff');
    assert.equal(statusRes.headers.get('x-frame-options'), 'DENY');
    assert.equal(statusRes.headers.get('x-powered-by'), null);
    assert.ok(statusRes.headers.get('content-security-policy')?.includes("default-src 'self'"));
    assert.ok(statusRes.headers.get('cache-control')?.includes('no-store'));

    // 2. POST /api/chat returns patient-safe result & hides trace/Cypher/model IDs
    const chatRes = await fetch(`${baseUrl}/api/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ query: 'Can I take Ginger in summer?', prakriti: 'Pitta', season: 'Grishma', conditions: ['Acid Reflux'] })
    });
    assert.equal(chatRes.status, 200);
    const chatBody = await chatRes.json();
    assert.equal(chatBody.success, true);
    assert.equal(chatBody.trace, undefined);
    assert.equal(chatBody.result.graph_evidence_summary, undefined);
    assert.equal(chatBody.result.evidence_confidence, undefined);
    assert.equal(chatBody.result.judge_certainty, undefined);
    assert.equal(chatBody.result.final_verdict, 'UNSAFE — DO NOT RECOMMEND');
    assert.ok(chatBody.result.clinical_reasoning.length > 0);
    assertNoSensitiveLeakage(chatBody, 'POST /api/chat');

    // Verify internal trace was retained server-side and is NOT accessible over HTTP
    const storedTrace = traceStore.getTrace(chatBody.consultationId);
    assert.ok(storedTrace);
    assert.equal(storedTrace.payload.agentExecutions.length, 5);
    assert.ok(storedTrace.payload.graphFacts.collisionPaths.length > 0);
    const fakeTraceEndpoint = await fetch(`${baseUrl}/api/trace/${chatBody.consultationId}`);
    assert.equal(fakeTraceEndpoint.status, 404);

    // 3. POST /api/label-audit hides raw Cypher safety.paths & preserves clinical verdict
    const realPng = fs.readFileSync(path.join(__dirname, '..', 'test_assets', 'ashwagandha_label.png'));
    const fdAudit = new FormData();
    fdAudit.append('image', new Blob([realPng], { type: 'image/png' }), 'ashwagandha_label.png');
    fdAudit.append('prakriti', 'Pitta');
    fdAudit.append('season', 'Grishma');
    const auditRes = await fetch(`${baseUrl}/api/label-audit`, { method: 'POST', body: fdAudit });
    assert.equal(auditRes.status, 200);
    const auditBody = await auditRes.json();
    assert.equal(auditBody.auditedIngredients[0].safety.verdict, 'FLAGGED');
    assert.equal(auditBody.auditedIngredients[0].safety.paths, undefined);
    assert.equal(auditBody.auditedIngredients[0].safety.flags, undefined);
    assertNoSensitiveLeakage(auditBody, 'POST /api/label-audit');

    // 4. POST /api/consult-with-image hides trace & internal graph membership jargon
    const fdConsult = new FormData();
    fdConsult.append('image', new Blob([realPng], { type: 'image/png' }), 'ashwagandha_label.png');
    fdConsult.append('query', 'Is this safe?');
    const consultImgRes = await fetch(`${baseUrl}/api/consult-with-image`, { method: 'POST', body: fdConsult });
    assert.equal(consultImgRes.status, 200);
    const consultImgBody = await consultImgRes.json();
    assert.equal(consultImgBody.trace, undefined);
    assert.ok(consultImgBody.scan.detected_herbs.includes('Indian Ginseng'));
    assertNoSensitiveLeakage(consultImgBody, 'POST /api/consult-with-image');

    // 4b. Unverified herbal photo produces well-formed query and blocks positive clearance
    const { buildVedaAIPipeline } = require('../engine/pipeline');
    const traceApp = createApp({
      pipeline: buildVedaAIPipeline({
        graph: async () => [],
        tables: async () => [],
        documents: async () => [],
        provider: { generateJSON: async () => ({ ids: [] }) }
      }),
      visionAgent: {
        analyzeImage: async () => ({
          product_name: 'Unlisted Extract',
          is_ayurvedic_or_herbal: true,
          detected_herbs: [],
          ingredients_detected: ['Unlisted extract'],
          formulation_type: 'Capsule',
          visual_confidence: 0.85,
          extracted_ocr_text: 'Unlisted extract',
          summary: 'Herbal extract',
          graph_membership: { status: 'INSUFFICIENT_DATA', verified_herbs: [], unverified_herbs: ['Unlisted extract'] }
        })
      },
      driver: makeMockDriver(false),
      checkDbHealth: async () => true
    });
    const unverifiedServer = await startTestServer(traceApp);
    try {
      const fdUnverified = new FormData();
      fdUnverified.append('image', new Blob([realPng], { type: 'image/png' }), 'unlisted.png');
      const unverifiedRes = await fetch(`${unverifiedServer.baseUrl}/api/consult-with-image`, { method: 'POST', body: fdUnverified });
      assert.equal(unverifiedRes.status, 200);
      const unverifiedBody = await unverifiedRes.json();
      assert.equal(unverifiedBody.result.final_verdict, 'EXPERT_REVIEW_REQUIRED');
      assert.ok(!JSON.stringify(unverifiedBody).includes('Can I take ?'));
      assertNoSensitiveLeakage(unverifiedBody, 'POST /api/consult-with-image unverified');
    } finally {
      await new Promise(resolve => unverifiedServer.server.close(resolve));
    }

    // 5. POST /api/follow-up & /api/feedback
    const followRes = await fetch(`${baseUrl}/api/follow-up`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ consultationId: chatBody.consultationId, followUpQuery: 'What should I drink instead?' })
    });
    assert.equal(followRes.status, 200);
    const followBody = await followRes.json();
    assertNoSensitiveLeakage(followBody, 'POST /api/follow-up');

    const fbRes = await fetch(`${baseUrl}/api/feedback`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ query: 'Ginger', verdict: 'UNSAFE', feedback: 'accurate' })
    });
    assert.equal(fbRes.status, 200);
    assert.deepEqual(Object.keys(JSON.parse(fs.readFileSync(tempFeedback, 'utf8'))).sort(), ['feedback', 'timestamp']);
  } finally {
    await new Promise(resolve => server.close(resolve));
    if (fs.existsSync(tempFeedback)) fs.unlinkSync(tempFeedback);
  }
});

test('CORS policy allows configured origins only and rejects unauthorized origins with 403', async () => {
  const app = createApp({
    driver: makeMockDriver(false),
    checkDbHealth: async () => true,
    allowedOrigins: ['https://app.vedaai.example']
  });
  const { server, baseUrl } = await startTestServer(app);
  try {
    const blocked = await fetch(`${baseUrl}/api/status`, {
      headers: { Origin: 'https://evil.attacker.example' }
    });
    assert.equal(blocked.status, 403);
    assert.equal(blocked.headers.get('access-control-allow-origin'), null);

    const allowed = await fetch(`${baseUrl}/api/status`, {
      headers: { Origin: 'https://app.vedaai.example' }
    });
    assert.equal(allowed.status, 200);
    assert.equal(allowed.headers.get('access-control-allow-origin'), 'https://app.vedaai.example');
  } finally {
    await new Promise(resolve => server.close(resolve));
  }
});

test('Invalid inputs and spoofed image signatures are rejected cleanly', async () => {
  const app = createApp({
    driver: makeMockDriver(false),
    checkDbHealth: async () => true
  });
  const { server, baseUrl } = await startTestServer(app);
  try {
    // Empty query rejected
    const badChat1 = await fetch(`${baseUrl}/api/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ query: '   ' })
    });
    assert.equal(badChat1.status, 400);

    // Unexpected arbitrary field rejected by strict schema
    const badChat2 = await fetch(`${baseUrl}/api/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ query: 'Ginger?', injectedField: true })
    });
    assert.equal(badChat2.status, 400);

    // Malformed JSON rejected safely
    const badJson = await fetch(`${baseUrl}/api/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: '{not-valid-json'
    });
    assert.equal(badJson.status, 400);
    assertNoSensitiveLeakage(await badJson.json(), 'malformed JSON error');

    // Invalid feedback enum rejected
    const badFb = await fetch(`${baseUrl}/api/feedback`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ feedback: 'arbitrary_untrusted_payload' })
    });
    assert.equal(badFb.status, 400);

    // Spoofed PNG upload (HTML/SVG script labeled as image/png) -> 415
    const spoofedForm = new FormData();
    spoofedForm.append('image', new Blob(['<svg><script>alert(1)</script></svg>'.repeat(50)], { type: 'image/png' }), 'evil.png');
    const spoofedRes = await fetch(`${baseUrl}/api/label-audit`, { method: 'POST', body: spoofedForm });
    assert.equal(spoofedRes.status, 415);

    // Base64 SVG disguised inside data URI -> 415
    const b64SvgRes = await fetch(`${baseUrl}/api/scan`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ imageBase64: `data:image/svg+xml;base64,${Buffer.from('<svg/>').toString('base64')}` })
    });
    assert.equal(b64SvgRes.status, 415);

    // JPEG bytes declared as image/png -> 415 mismatch
    const mismatchedForm = new FormData();
    const fakeJpeg = Buffer.concat([Buffer.from([0xff, 0xd8, 0xff, 0xe0]), Buffer.alloc(1200, 0x11)]);
    mismatchedForm.append('image', new Blob([fakeJpeg], { type: 'image/png' }), 'mismatched.png');
    const mismatchRes = await fetch(`${baseUrl}/api/scan`, { method: 'POST', body: mismatchedForm });
    assert.equal(mismatchRes.status, 415);
  } finally {
    await new Promise(resolve => server.close(resolve));
  }
});

test('Internal exceptions do not expose filesystem paths, URIs, or stack traces', async () => {
  const leakyErr = new Error('Fatal DB crash at C:\\Users\\rahul\\OneDrive\\Desktop\\veda_original\\engine\\agents.js neo4j+s://test-db.databases.neo4j.io');
  const traceStore = new TraceStore();
  const consultationId = require('node:crypto').randomUUID();
  traceStore.saveTrace(consultationId, 'consultation', { consultationContext: { evaluated_herbs: ['Tulsi'] } });
  const app = createApp({
    traceStore,
    pipeline: { invoke: async () => { throw leakyErr; } },
    visionAgent: { analyzeImage: async () => { throw leakyErr; } },
    labelAudit: { auditLabel: async () => { throw leakyErr; } },
    followUpHandler: async () => { throw leakyErr; },
    driver: makeMockDriver(true),
    checkDbHealth: async () => { throw leakyErr; }
  });
  const { server, baseUrl } = await startTestServer(app);
  try {
    const statusErr = await (await fetch(`${baseUrl}/api/status`)).json();
    assertNoSensitiveLeakage(statusErr, 'GET /api/status 503');

    const herbsRes = await fetch(`${baseUrl}/api/herbs`);
    assert.equal(herbsRes.status, 500);
    assertNoSensitiveLeakage(await herbsRes.json(), 'GET /api/herbs 500');

    const chatRes = await fetch(`${baseUrl}/api/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ query: 'Is Ginger safe?' })
    });
    assert.equal(chatRes.status, 500);
    assertNoSensitiveLeakage(await chatRes.json(), 'POST /api/chat 500');

    const followRes = await fetch(`${baseUrl}/api/follow-up`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ consultationId, followUpQuery: 'Dosage?' })
    });
    assert.equal(followRes.status, 500);
    assertNoSensitiveLeakage(await followRes.json(), 'POST /api/follow-up 500');
  } finally {
    await new Promise(resolve => server.close(resolve));
  }
});

test('Rate limiting returns HTTP 429 and Retry-After when thresholds are exceeded', async () => {
  const realPng = fs.readFileSync(path.join(__dirname, '..', 'test_assets', 'tulsi_label.png'));
  const app = createApp({
    legacyTestAdapter: true,
    pipeline: { invoke: async () => makeMockPipelineState() },
    visionAgent: {
      analyzeImage: async () => ({
        product_name: 'Tulsi',
        is_ayurvedic_or_herbal: true,
        detected_herbs: ['Holy Basil'],
        ingredients_detected: ['Ocimum tenuiflorum'],
        formulation_type: 'Capsule',
        visual_confidence: 0.9,
        extracted_ocr_text: 'Tulsi',
        summary: 'Tulsi leaf',
        graph_membership: { status: 'VERIFIED_CANONICAL_HERBS', verified_herbs: [], unverified_herbs: [] }
      })
    },
    driver: makeMockDriver(false),
    checkDbHealth: async () => true,
    rateLimits: {
      ai: { windowMs: 60000, max: 2 },
      vision: { windowMs: 60000, max: 1 }
    }
  });
  const { server, baseUrl } = await startTestServer(app);
  try {
    for (let i = 0; i < 2; i++) {
      const ok = await fetch(`${baseUrl}/api/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query: 'Can I take Ginger?' })
      });
      assert.equal(ok.status, 200);
    }
    const limitedAi = await fetch(`${baseUrl}/api/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ query: 'Can I take Ginger?' })
    });
    assert.equal(limitedAi.status, 429);
    assert.ok(limitedAi.headers.get('retry-after'));

    const fd1 = new FormData();
    fd1.append('image', new Blob([realPng], { type: 'image/png' }), 'tulsi.png');
    const okVision = await fetch(`${baseUrl}/api/scan`, { method: 'POST', body: fd1 });
    assert.equal(okVision.status, 200);

    const fd2 = new FormData();
    fd2.append('image', new Blob([realPng], { type: 'image/png' }), 'tulsi.png');
    const limitedVision = await fetch(`${baseUrl}/api/scan`, { method: 'POST', body: fd2 });
    assert.equal(limitedVision.status, 429);
  } finally {
    await new Promise(resolve => server.close(resolve));
  }
});

const hasLiveEnv = Boolean(
  process.env.NEO4J_URI &&
  process.env.NEO4J_USERNAME &&
  process.env.NEO4J_PASSWORD &&
  process.env.GEMINI_API_KEY &&
  !process.env.GEMINI_API_KEY.includes('YOUR_GEMINI_API_KEY')
);

test(
  'Live integration preserves clinical consultation & label-audit behavior without information leaks',
  { skip: !hasLiveEnv },
  async () => {
    const app = createApp();
    const { server, baseUrl } = await startTestServer(app);
    try {
      const statusRes = await fetch(`${baseUrl}/api/status`);
      assert.equal(statusRes.status, 200);
      const statusBody = await statusRes.json();
      assert.deepEqual(statusBody, { status: 'online', catalogReady: true });

      const herbsRes = await fetch(`${baseUrl}/api/herbs`);
      assert.equal(herbsRes.status, 200);
      const herbsBody = await herbsRes.json();
      assert.ok(herbsBody.count >= 25);
      assertNoSensitiveLeakage(herbsBody, 'Live GET /api/herbs');

      const chatRes = await fetch(`${baseUrl}/api/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          query: 'Can I take Ginger daily for digestion in summer with acid reflux?',
          prakriti: 'Pitta-Vata',
          season: 'Grishma',
          conditions: ['Acid Reflux']
        })
      });
      assert.equal(chatRes.status, 200);
      const chatBody = await chatRes.json();
      assert.equal(chatBody.success, true);
      assert.equal(chatBody.trace, undefined);
      assert.ok(
        chatBody.result.final_verdict === 'EXPERT_REVIEW_REQUIRED' &&
        chatBody.result.assessment.verdict.rules.some(r=>r.ruleId==='legacy-season-edge'),
        `Expected expert review for an unvalidated seasonal edge, got: ${chatBody.result.final_verdict}`
      );
      assertNoSensitiveLeakage(chatBody, 'Live POST /api/chat');

      const followUp = await fetch(baseUrl + '/api/follow-up', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ consultationId: chatBody.consultationId, followUpQuery: 'What dose of Ginger?' })
      });
      assert.equal(followUp.status, 200);
      const followData = (await followUp.json()).data;
      assert.equal(followData.status, 'RESTRICTED');
      assert.equal(followData.dosage_and_anupana, '');

      const labelPng = fs.readFileSync(path.join(__dirname, '..', 'test_assets', 'ashwagandha_label.png'));
      const fd = new FormData();
      fd.append('image', new Blob([labelPng], { type: 'image/png' }), 'ashwagandha_label.png');
      fd.append('prakriti', 'Kapha');
      fd.append('season', 'Vasanta');
      fd.append('conditions', 'Obesity');

      const auditRes = await fetch(`${baseUrl}/api/label-audit`, { method: 'POST', body: fd });
      assert.equal(auditRes.status, 200);
      const auditBody = await auditRes.json();
      assert.equal(auditBody.success, true);
      assert.ok(auditBody.extraction?.is_supplement_label);
      assert.ok(Array.isArray(auditBody.auditedIngredients));
      assertNoSensitiveLeakage(auditBody, 'Live POST /api/label-audit');
    } finally {
      await new Promise(resolve => server.close(resolve));
      await closeSharedDriver();
    }
  }
);
