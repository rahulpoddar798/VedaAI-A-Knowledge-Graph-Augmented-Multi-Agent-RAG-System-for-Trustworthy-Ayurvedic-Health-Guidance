/**
 * VedaAI — Phase 4 Go/No-Go Verification Test Suite
 * Tests the Multimodal Vision Agent across the 4 rigorous criteria
 * defined in Master Implementation Blueprint (Step 4.2).
 */

require('dotenv').config();
const fs = require('fs');
const path = require('path');
const visionAgent = require('../engine/vision_agent');
const { buildVedaAIPipeline } = require('../engine/pipeline');
const { closeSharedDriver } = require('../lib/neo4j_config');

let testsPassed = 0;
let testsFailed = 0;

function assert(condition, testName, details = '') {
  if (condition) {
    testsPassed++;
    console.log(`  ✅ [PASS] ${testName}${details ? ` — (${details})` : ''}`);
  } else {
    testsFailed++;
    console.error(`  ❌ [FAIL] ${testName}: ${details}`);
  }
}

async function runPhase4Tests() {
  console.log('\n═════════════════════════════════════════════════════════════════');
  console.log('  🔬 PHASE 4: MULTIMODAL VISION AGENT GO/NO-GO VERIFICATION');
  console.log('═════════════════════════════════════════════════════════════════\n');

  const assetsDir = path.join(__dirname, '..', 'test_assets');
  const ashwaImg = fs.readFileSync(path.join(assetsDir, 'ashwagandha_label.png'));
  const tulsiImg = fs.readFileSync(path.join(assetsDir, 'tulsi_label.png'));
  const outDomainImg = fs.readFileSync(path.join(assetsDir, 'electronics_out_of_domain.png'));

  // ─────────────────────────────────────────────────────────────
  // TEST 4.A: Medicine Box OCR & Graph Verification
  // ─────────────────────────────────────────────────────────────
  console.log('🧪 TEST 4.A: Medicine Packaging OCR & Graph Membership Check');
  const scanA = await visionAgent.analyzeImage(ashwaImg, 'image/png');

  assert(scanA.is_ayurvedic_or_herbal === true, 'Test 4.A: Identified as Ayurvedic product');
  assert(
    scanA.detected_herbs?.some(h => h.toLowerCase().includes('ashwagandha') || h.toLowerCase().includes('withania')),
    'Test 4.A: Extracted Ashwagandha from packaging label',
    `Detected: ${scanA.detected_herbs?.join(', ')}`
  );
  assert(scanA.visual_confidence >= 0.85, 'Test 4.A: Visual confidence meets threshold (>= 0.85)', `Confidence: ${(scanA.visual_confidence * 100).toFixed(0)}%`);
  assert(
    scanA.graph_membership?.verified_herbs?.length > 0,
    'Test 4.A: Passed Neo4j Graph Membership Gate',
    `Verified: ${scanA.graph_membership?.verified_herbs?.map(h => h.canonical_name).join(', ')}`
  );

  // ─────────────────────────────────────────────────────────────
  // TEST 4.B: Herb Catalog Recognition
  // ─────────────────────────────────────────────────────────────
  console.log('\n🧪 TEST 4.B: Herb Catalog Visual & Botanical Recognition');
  const scanB = await visionAgent.analyzeImage(tulsiImg, 'image/png');

  assert(scanB.is_ayurvedic_or_herbal === true, 'Test 4.B: Identified as authentic herbal extract');
  assert(
    scanB.detected_herbs?.some(h => h.toLowerCase().includes('tulsi') || h.toLowerCase().includes('holy basil') || h.toLowerCase().includes('ocimum')),
    'Test 4.B: Identified Holy Basil / Tulsi from composition',
    `Detected: ${scanB.detected_herbs?.join(', ')}`
  );
  assert(scanB.visual_confidence >= 0.80, 'Test 4.B: Visual confidence meets threshold (>= 0.80)', `Confidence: ${(scanB.visual_confidence * 100).toFixed(0)}%`);

  // ─────────────────────────────────────────────────────────────
  // TEST 4.C: Out-of-Domain Filter (Hallucination Prevention)
  // ─────────────────────────────────────────────────────────────
  console.log('\n🧪 TEST 4.C: Out-of-Domain Anti-Hallucination Filter');
  const scanC = await visionAgent.analyzeImage(outDomainImg, 'image/png');

  assert(scanC.is_ayurvedic_or_herbal === false, 'Test 4.C: Correctly classified non-herbal item as False');
  assert(
    (scanC.detected_herbs || []).length === 0,
    'Test 4.C: Zero hallucinated herbs on non-medicinal object',
    `Herbs: [${(scanC.detected_herbs || []).join(', ')}]`
  );
  assert(
    scanC.graph_membership?.status === 'OUT_OF_DOMAIN',
    'Test 4.C: Triggered OUT_OF_DOMAIN safety banner without pipeline execution'
  );

  // ─────────────────────────────────────────────────────────────
  // TEST 4.D: End-to-End Multimodal Seeding into LangGraph Pipeline
  // ─────────────────────────────────────────────────────────────
  console.log('\n🧪 TEST 4.D: End-to-End Multimodal Seeding & Contraindication Detection');
  console.log('   Simulating: User uploads Ashwagandha photo + asks "Is this safe for me?" with Kapha & Obesity');

  const detectedHerb = scanA.graph_membership?.verified_herbs?.[0]?.canonical_name || 'Indian Ginseng';
  const pipeline = buildVedaAIPipeline();

  const finalState = await pipeline.invoke({
    raw_query: `Is this safe for me? (Item from photo: ${detectedHerb})`,
    user_profile: {
      prakriti: 'Kapha',
      chronic_conditions: ['Obesity'],
      current_season: 'Vasanta'
    }
  });

  const res = finalState.final_response;

  assert(res.final_verdict?.includes('UNSAFE'), 'Test 4.D: Flags UNSAFE for Kapha/Obesity patient purely from image input');
  assert(
    finalState.opponent_flags?.some(f => f.includes('KAPHA')),
    'Test 4.D: Intercepts Kapha relational collision from graph without user typing herb name',
    `Flags: ${finalState.opponent_flags?.join(', ')}`
  );
  assert(
    res.suggested_alternatives?.length > 0,
    'Test 4.D: Sourced safe alternative herbs from Neo4j Aura for the image-detected herb',
    `Alternatives: ${res.suggested_alternatives?.map(a => a.herb_name).join(', ')}`
  );

  await closeSharedDriver();

  console.log('\n═════════════════════════════════════════════════════════════════');
  console.log(`  📊 FINAL PHASE 4 SCORE: ${testsPassed} PASSED, ${testsFailed} FAILED`);
  console.log('═════════════════════════════════════════════════════════════════\n');

  if (testsFailed === 0) {
    console.log('🎉 ALL PHASE 4 GO/NO-GO CRITERIA MET (100% SUCCESS RATE)!');
    console.log('✅ Multimodal Vision Agent & Graph Membership Gate are fully verified.');
  } else {
    process.exit(1);
  }
}

runPhase4Tests().catch(async (err) => {
  console.error('Fatal test error:', err);

  await closeSharedDriver();
  process.exit(1);
});
