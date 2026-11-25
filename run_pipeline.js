require('dotenv').config();
const { buildVedaAIPipeline } = require('./engine/pipeline');
const { closeDriver } = require('./engine/agents');

async function run() {
  const query = process.argv[2] || 'Can I take Ginger for digestion in summer with acid reflux?';
  const prakriti = process.argv[3] || 'Pitta-Vata';
  const conditions = process.argv[4] ? process.argv[4].split(',') : ['Acid Reflux'];
  const season = process.argv[5] || 'Grishma';

  console.log('═════════════════════════════════════════════════════════════════');
  console.log('  VedaAI — Phase 2 LangGraph Multi-Agent Engine (Dynamic Execution)');
  console.log('═════════════════════════════════════════════════════════════════');
  console.log(`📌 Query: "${query}"`);
  console.log(`👤 Profile: Prakriti=${prakriti}, Conditions=${conditions.join(', ')}, Season=${season}`);

  const pipeline = buildVedaAIPipeline();

  try {
    const startTime = Date.now();
    const finalState = await pipeline.invoke({
      raw_query: query,
      user_profile: {
        prakriti: prakriti,
        chronic_conditions: conditions,
        current_season: season
      }
    });

    const durationMs = Date.now() - startTime;

    console.log('\n═════════════════════════════════════════════════════════════════');
    console.log('  📋 FINAL CALIBRATED RESPONSE');
    console.log('═════════════════════════════════════════════════════════════════');

    const res = finalState.final_response;
    console.log(`\nVerdict:    ${res.final_verdict}`);
    console.log(`Confidence: ${(finalState.confidence_score * 100).toFixed(0)}%`);
    console.log(`Latency:    ${durationMs} ms`);
    console.log(`Summary:    ${res.summary_message}`);

    if (res.risk_explanation) {
      console.log(`\n⚠️  Physiological Risk Mechanism:`);
      console.log(`   ${res.risk_explanation}`);
    }

    if (res.suggested_alternatives && res.suggested_alternatives.length > 0) {
      console.log(`\n🌿 Verified Safe Cooling Alternatives (From Knowledge Graph):`);
      res.suggested_alternatives.forEach(alt => {
        console.log(`   • ${alt.herb_name} (${alt.botanical_name || 'Botanical'}): ${alt.why_safe}`);
      });
    }

    if (res.graph_evidence_summary && res.graph_evidence_summary.length > 0) {
      console.log(`\n🔗 Neo4j Graph Paths Traversed:`);
      res.graph_evidence_summary.forEach(p => {
        console.log(`   • ${p}`);
      });
    }

    console.log(`\n⚖️  Disclaimer: ${res.disclaimer}`);
    console.log('═════════════════════════════════════════════════════════════════\n');
  } finally {
    await closeDriver();
  }
}

run().catch(err => {
  console.error('Fatal execution error:', err);
  process.exit(1);
});
