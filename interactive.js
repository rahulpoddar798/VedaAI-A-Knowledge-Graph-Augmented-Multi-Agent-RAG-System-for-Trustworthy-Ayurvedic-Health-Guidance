require('dotenv').config();
const readline = require('readline');
const { buildVedaAIPipeline } = require('./engine/pipeline');
const { closeDriver } = require('./engine/agents');

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

const pipeline = buildVedaAIPipeline();

console.log('\n═════════════════════════════════════════════════════════════════');
console.log('  🌿 VedaAI Interactive Clinical Chat (LangGraph + Neo4j + Gemini)');
console.log('═════════════════════════════════════════════════════════════════');
console.log('Type your question below, or type "exit" to quit.\n');

function ask(questionText) {
  return new Promise(resolve => rl.question(questionText, resolve));
}

async function loop() {
  while (true) {
    const query = await ask('💬 Enter your Ayurvedic health question: ');
    if (!query || query.trim().toLowerCase() === 'exit') {
      console.log('\nExiting VedaAI. Goodbye! 👋');
      break;
    }

    const prakriti = await ask('   👤 Your Prakriti (e.g. Vata, Pitta, Kapha, or leave blank): ') || 'Pitta-Vata';
    const conditions = await ask('   🏥 Existing health conditions (e.g. Acid Reflux, none): ') || '';
    const season = await ask('   ☀️  Current season (e.g. Summer/Grishma, Winter/Shishira, or leave blank): ') || 'Grishma';

    console.log('\n⏳ Running Multi-Agent Reasoning Pipeline...\n');

    try {
      const startTime = Date.now();
      const finalState = await pipeline.invoke({
        raw_query: query,
        user_profile: {
          prakriti: prakriti.trim(),
          chronic_conditions: conditions ? conditions.split(',').map(c => c.trim()) : [],
          current_season: season.trim()
        }
      });

      const durationMs = Date.now() - startTime;
      const res = finalState.final_response;

      console.log('─────────────────────────────────────────────────────────────────');
      console.log(`📋 RESULT: ${res.final_verdict}`);
      console.log(`📊 Calibrated Confidence: ${(finalState.confidence_score * 100).toFixed(0)}% | Latency: ${durationMs}ms`);
      console.log(`💬 Summary: ${res.summary_message}`);

      if (res.risk_explanation) {
        console.log(`\n⚠️  Physiological Risk Mechanism:\n   ${res.risk_explanation}`);
      }

      if (res.suggested_alternatives && res.suggested_alternatives.length > 0) {
        console.log('\n🌿 Safe Cooling Alternatives (From Knowledge Graph):');
        res.suggested_alternatives.forEach(alt => {
          console.log(`   • ${alt.herb_name} (${alt.botanical_name || 'Botanical'}): ${alt.why_safe}`);
        });
      }

      if (res.graph_evidence_summary && res.graph_evidence_summary.length > 0) {
        console.log('\n🔗 Knowledge Graph Paths Traversed:');
        res.graph_evidence_summary.forEach(p => {
          console.log(`   • ${p}`);
        });
      }

      console.log('─────────────────────────────────────────────────────────────────\n');
    } catch (err) {
      console.error('Error during execution:', err.message);
    }
  }

  await closeDriver();
  rl.close();
}

loop().catch(async (e) => {
  console.error(e);
  await closeDriver();
  rl.close();
});
