require('dotenv').config();
const assert = require('assert');
const { buildVedaAIPipeline } = require('../engine/pipeline');
const { calculateEmpiricalConfidence } = require('../engine/agents');
const { closeSharedDriver } = require('../lib/neo4j_config');
const { loadIndex, cosineSimilarity } = require('../engine/vector_store');

async function runCase(pipeline, name, query, user_profile) {
  console.log(`\nRunning Solution A case: ${name}`);
  const result = await pipeline.invoke({ raw_query: query, user_profile });
  assert.strictEqual(result.agent_trace?.length, 5, `${name}: expected five Gemini agent calls`);
  assert.deepStrictEqual(
    result.agent_trace.map(item => item.agent),
    ['entity_extractor', 'hybrid_retrieval_planner', 'proponent', 'opponent', 'judge'],
    `${name}: agent call trace is incomplete or out of order`
  );
  assert(result.graph_facts?.vectorMatches?.length > 0, `${name}: expected vector search matches`);
  assert(Number.isFinite(result.graph_facts.vectorMatches[0].similarityScore), `${name}: expected cosine score`);
  assert(result.graph_facts?.seasonInfo, `${name}: expected Neo4j season retrieval`);
  assert(Number.isFinite(result.confidence_score) && result.confidence_score >= 0 && result.confidence_score <= 1,
    `${name}: expected calibrated confidence in [0,1]`);
  if (name === 'natural symptom query') {
    assert(result.graph_facts?.safeCandidates?.length > 0, 'Symptom case should preserve graph-screened safe candidates.');
    assert(!result.final_response?.final_verdict?.includes('UNSAFE'), 'Symptom recommendation should not be rejected when safe alternatives exist.');
  }
  console.log(JSON.stringify({
    case: name,
    verdict: result.final_response?.final_verdict,
    confidence: result.confidence_score,
    topVectorMatch: result.graph_facts.vectorMatches[0],
    graphCounts: {
      herbs: result.graph_facts.herbDetails?.length || 0,
      candidates: result.graph_facts.candidateHerbs?.length || 0,
      doshaRelations: result.graph_facts.doshaRelations?.length || 0,
      contraindications: result.graph_facts.contraindications?.length || 0
    },
    agentTrace: result.agent_trace
  }, null, 2));
  return result;
}

async function main() {
  if (!process.env.GEMINI_API_KEY) throw new Error('GEMINI_API_KEY must be configured for live Solution A verification.');
  if (!process.env.NEO4J_URI || !process.env.NEO4J_PASSWORD) throw new Error('Neo4j Aura credentials must be configured for live verification.');
  const chunks = loadIndex();
  assert(chunks.length >= 25, 'Expected at least one embedded profile for each of the 25 catalog herbs.');
  assert(chunks.every(chunk => chunk.embedding?.length === 3072), 'Every stored embedding must be 3072-dimensional.');
  assert(cosineSimilarity(chunks[0].embedding, chunks[0].embedding) > 0.999, 'Cosine similarity implementation failed identity check.');

  const pipeline = buildVedaAIPipeline();
  try {
    const symptom = await runCase(
      pipeline,
      'natural symptom query',
      'What is good for anxiety and sleep?',
      { prakriti: 'Vata', chronic_conditions: [], current_season: 'Hemanta' }
    );
    const contraindication = await runCase(
      pipeline,
      'Ginger summer acid reflux contraindication',
      'Can I take Ginger in summer with acid reflux?',
      { prakriti: 'Pitta-Vata', chronic_conditions: ['Acid Reflux'], current_season: 'Grishma' }
    );
    assert(contraindication.graph_facts.herbDetails?.length > 0, 'Contraindication case did not resolve Ginger in Neo4j.');
    assert(contraindication.opponent_flags?.length > 0, 'Contraindication case did not produce safety flags.');
    assert(contraindication.graph_facts.doshaRelations?.length > 0, 'Contraindication case did not traverse herb-dosha graph paths.');
    const calculated = calculateEmpiricalConfidence({
      graphFacts: contraindication.graph_facts,
      vectorMatches: contraindication.graph_facts.vectorMatches,
      opponentFlags: contraindication.opponent_flags,
      judgeCertainty: contraindication.judge_certainty
    });
    assert.strictEqual(calculated, contraindication.confidence_score, 'Displayed confidence does not match the empirical fusion function.');
    assert.notStrictEqual(symptom.confidence_score, 0.95, 'Confidence appears to be a legacy hardcoded score.');
    console.log('\nSolution A live integration checks passed.');
  } finally {
    await closeSharedDriver();
  }
}

main().catch(error => {
  console.error('Solution A verification failed:', error.stack || error.message);
  process.exitCode = 1;
});
