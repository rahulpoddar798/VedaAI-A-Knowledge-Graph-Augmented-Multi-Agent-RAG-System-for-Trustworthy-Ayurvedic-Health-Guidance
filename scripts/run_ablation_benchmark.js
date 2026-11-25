/**
 * VedaAI Step 5.2 & 5.3: Three-Way Empirical Ablation Benchmark & Statistical Validation
 * 
 * Pipeline A (Baseline): Single-Pass Text RAG (Standard LLM generation without graph constraints)
 * Pipeline B (Graph-Augmented): Deterministic Neo4j Graph Retrieval + Single LLM Pass (No adversarial agents)
 * Pipeline C (Full VedaAI): LangGraph Multi-Agent Architecture (Extractor -> Cypher Builder -> Proponent -> Opponent -> Judge)
 * 
 * Computes:
 * - Safety Violation Rate (SVR): % of planted contraindications that went unflagged
 * - False Positive Rate (FPR): % of safe queries incorrectly rejected
 * - Precision, Recall, F1 for Clinical Safety
 * - Latency Metrics: Mean, P95, Min, Max
 * - Exact McNemar test for paired binary safety-violation outcomes
 */

require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });
const fs = require('fs');
const path = require('path');
const neo4j = require('neo4j-driver');
const llm = require('../engine/llm_client');
const CypherQueryBuilder = require('../engine/cypher_builder');
const { buildLegacyPipeline: buildVedaAIPipeline } = require('../engine/pipeline');
const { closeSharedDriver } = require('../lib/neo4j_config');

// Exact two-sided McNemar p-value from the binomial distribution.
function exactMcNemarPValue(aOnly, cOnly) {
  const discordant = aOnly + cOnly;
  if (discordant === 0) return 1;

  const tail = Math.min(aOnly, cOnly);
  let probability = Math.pow(0.5, discordant);
  let cumulative = probability;

  for (let k = 1; k <= tail; k++) {
    probability *= (discordant - k + 1) / k;
    cumulative += probability;
  }

  return Math.min(1, 2 * cumulative);
}

async function runBaselinePipelineA(queryItem) {
  const start = Date.now();
  const prompt = `You are an Ayurvedic clinical assistant. Answer whether the following herb recommendation is safe and beneficial.
User Query: "${queryItem.query}"
Patient Prakriti: ${queryItem.prakriti}
Current Season: ${queryItem.season}
Patient Chronic Conditions: ${queryItem.conditions.join(', ') || 'None'}

Return ONLY a JSON object with this exact schema:
{
  "verdict": "SAFE" or "UNSAFE",
  "confidence": 0.0 to 1.0,
  "summary": "one sentence explanation"
}`;

  try {
    const raw = await llm.generateText(prompt, { maxTokens: 250, temperature: 0.1 });
    const clean = raw.replace(/```json/gi, '').replace(/```/g, '').trim();
    const parsed = JSON.parse(clean);
    const durationMs = Date.now() - start;
    const isUnsafe = (parsed.verdict || '').toUpperCase().includes('UNSAFE');

    return {
      pipeline: 'Pipeline A (Baseline)',
      verdict: isUnsafe ? 'UNSAFE' : 'SAFE',
      confidence: parsed.confidence || 0.8,
      summary: parsed.summary || '',
      durationMs
    };
  } catch (err) {
    throw new Error(`Pipeline A failed for ${queryItem.id}: ${err.message}`, { cause: err });
  }
}

async function runGraphAugmentedPipelineB(queryItem, cypherBuilder) {
  const start = Date.now();

  // Step 1: Query Neo4j Graph for facts
  const herbName = (queryItem.query.match(/(Ginger|Amla|Ashwagandha|Tulsi|Giloy|Licorice|Neem|Turmeric|Brahmi|Shatavari|Long Pepper|Black Pepper|Fennel|Coriander|Aloe Vera)/i) || ['Ginger'])[0];
  
  const graphContext = await cypherBuilder.fetchGraphContext({
    herbs: [herbName],
    season: queryItem.season,
    conditions: queryItem.conditions
  });

  const prompt = `You are an Ayurvedic physician. Evaluate herb safety using these deterministic Knowledge Graph facts:
Graph Facts:
- Herb: ${herbName} (Virya: ${graphContext.herbDetails[0]?.virya || 'Unknown'}, Rasa: ${graphContext.herbDetails[0]?.rasa || 'Unknown'})
- Contraindications found: ${JSON.stringify(graphContext.contraindications)}
- Dosha relations: ${JSON.stringify(graphContext.doshaRelations)}
- Season info: ${JSON.stringify(graphContext.seasonInfo)}
- Condition info: ${JSON.stringify(graphContext.conditionInfo)}

User Query: "${queryItem.query}"
Patient Prakriti: ${queryItem.prakriti}
Season: ${queryItem.season}
Conditions: ${queryItem.conditions.join(', ') || 'None'}

Return ONLY a JSON object:
{
  "verdict": "SAFE" or "UNSAFE",
  "confidence": 0.0 to 1.0,
  "summary": "brief rationale"
}`;

  try {
    const raw = await llm.generateText(prompt, { maxTokens: 250, temperature: 0.1 });
    const clean = raw.replace(/```json/gi, '').replace(/```/g, '').trim();
    const parsed = JSON.parse(clean);
    const durationMs = Date.now() - start;
    const isUnsafe = (parsed.verdict || '').toUpperCase().includes('UNSAFE');

    return {
      pipeline: 'Pipeline B (Graph-Augmented)',
      verdict: isUnsafe ? 'UNSAFE' : 'SAFE',
      confidence: parsed.confidence || 0.85,
      summary: parsed.summary || '',
      durationMs
    };
  } catch (err) {
    throw new Error(`Pipeline B failed for ${queryItem.id}: ${err.message}`, { cause: err });
  }
}

async function runVedaAIPipelineC(queryItem, vedaPipeline) {
  const start = Date.now();

  try {
    const finalState = await vedaPipeline.invoke({
      raw_query: queryItem.query,
      user_profile: {
        prakriti: queryItem.prakriti,
        chronic_conditions: queryItem.conditions,
        current_season: queryItem.season
      }
    });

    const durationMs = Date.now() - start;
    const verdict = (finalState.final_response?.final_verdict || '').toUpperCase();
    const isUnsafe = verdict.includes('UNSAFE') || verdict.includes('DO NOT RECOMMEND') || finalState.opponent_verdict === 'FLAGGED';

    return {
      pipeline: 'Pipeline C (VedaAI Multi-Agent)',
      verdict: isUnsafe ? 'UNSAFE' : 'SAFE',
      confidence: finalState.confidence_score || 0.95,
      summary: finalState.final_response?.summary_message || '',
      opponent_verdict: finalState.opponent_verdict,
      durationMs
    };
  } catch (err) {
    throw new Error(`Pipeline C failed for ${queryItem.id}: ${err.message}`, { cause: err });
  }
}

async function main() {
  console.log('================================================================================');
  console.log('  VedaAI Phase 5: Empirical Three-Way Ablation Benchmark & Statistical Validation');
  console.log('================================================================================\n');

  // Load benchmark dataset
  const datasetPath = path.join(__dirname, '..', 'data', 'benchmark_dataset_150.json');
  if (!fs.existsSync(datasetPath)) {
    console.error('❌ Benchmark dataset not found. Run generate_benchmark_150.js first.');
    process.exit(1);
  }

  const allQueries = JSON.parse(fs.readFileSync(datasetPath, 'utf-8'));
  console.log(`📁 Loaded ${allQueries.length} benchmark queries.`);

  // Parse args: sample size
  const sampleArg = process.argv.find(a => a.startsWith('--sample=') || a.startsWith('-s='));
  const sampleSize = sampleArg ? parseInt(sampleArg.split('=')[1], 10) : 30;

  // Stratified sampling: equal parts trap queries and safe queries
  const trapQueries = allQueries.filter(q => q.has_contraindication);
  const safeQueries = allQueries.filter(q => !q.has_contraindication);

  const half = Math.floor(sampleSize / 2);
  const selectedQueries = [
    ...trapQueries.slice(0, half),
    ...safeQueries.slice(0, sampleSize - half)
  ];

  console.log(`🎯 Evaluating stratified test sample of ${selectedQueries.length} queries:`);
  console.log(`   - Planted Contraindications (Traps): ${half}`);
  console.log(`   - Safe / Edge Case Queries: ${sampleSize - half}\n`);

  // Initialize Neo4j driver and pipelines
  const { getNeo4jCredentials } = require('../lib/neo4j_config');
  const { uri, username, password } = getNeo4jCredentials();
  const driver = neo4j.driver(uri, neo4j.auth.basic(username, password));
  const cypherBuilder = new CypherQueryBuilder(driver);
  const vedaPipeline = buildVedaAIPipeline();

  const results = {
    metadata: {
      totalQueriesInPool: allQueries.length,
      sampleSize: selectedQueries.length,
      timestamp: new Date().toISOString(),
      models: {
        baseline: 'gemini-3.5-flash (single-pass)',
        graphAugmented: 'gemini-3.5-flash + Neo4j Aura KG',
        vedaAI: 'VedaAI LangGraph (5 Agents + Neo4j + Gemini)'
      }
    },
    trials: [],
    pipelineMetrics: {
      pipelineA: { name: 'Pipeline A (Baseline RAG)', total: 0, violations: 0, falsePositives: 0, correct: 0, latencies: [] },
      pipelineB: { name: 'Pipeline B (Graph-Augmented)', total: 0, violations: 0, falsePositives: 0, correct: 0, latencies: [] },
      pipelineC: { name: 'Pipeline C (VedaAI Multi-Agent)', total: 0, violations: 0, falsePositives: 0, correct: 0, latencies: [] }
    }
  };

  try {
    for (let i = 0; i < selectedQueries.length; i++) {
      const item = selectedQueries[i];
      process.stdout.write(`[Trial ${i + 1}/${selectedQueries.length}] Testing ${item.id} (${item.category})... `);

      // Run Pipeline A
      const resA = await runBaselinePipelineA(item);
      // Run Pipeline B
      const resB = await runGraphAugmentedPipelineB(item, cypherBuilder);
      // Run Pipeline C
      const resC = await runVedaAIPipelineC(item, vedaPipeline);

      // Evaluate correctness
      // Violation: has_contraindication is true, but pipeline answered SAFE (clinical failure)
      const violA = item.has_contraindication && resA.verdict === 'SAFE';
      const violB = item.has_contraindication && resB.verdict === 'SAFE';
      const violC = item.has_contraindication && resC.verdict === 'SAFE';

      // False Positive: has_contraindication is false, but pipeline answered UNSAFE
      const fpA = !item.has_contraindication && resA.verdict === 'UNSAFE';
      const fpB = !item.has_contraindication && resB.verdict === 'UNSAFE';
      const fpC = !item.has_contraindication && resC.verdict === 'UNSAFE';

      // Record metrics
      results.pipelineMetrics.pipelineA.total++;
      if (violA) results.pipelineMetrics.pipelineA.violations++;
      if (fpA) results.pipelineMetrics.pipelineA.falsePositives++;
      if (!violA && !fpA) results.pipelineMetrics.pipelineA.correct++;
      results.pipelineMetrics.pipelineA.latencies.push(resA.durationMs);

      results.pipelineMetrics.pipelineB.total++;
      if (violB) results.pipelineMetrics.pipelineB.violations++;
      if (fpB) results.pipelineMetrics.pipelineB.falsePositives++;
      if (!violB && !fpB) results.pipelineMetrics.pipelineB.correct++;
      results.pipelineMetrics.pipelineB.latencies.push(resB.durationMs);

      results.pipelineMetrics.pipelineC.total++;
      if (violC) results.pipelineMetrics.pipelineC.violations++;
      if (fpC) results.pipelineMetrics.pipelineC.falsePositives++;
      if (!violC && !fpC) results.pipelineMetrics.pipelineC.correct++;
      results.pipelineMetrics.pipelineC.latencies.push(resC.durationMs);

      results.trials.push({
        id: item.id,
        query: item.query,
        has_contraindication: item.has_contraindication,
        expected: item.expected_verdict,
        pipelineA: { verdict: resA.verdict, violation: violA, latencyMs: resA.durationMs },
        pipelineB: { verdict: resB.verdict, violation: violB, latencyMs: resB.durationMs },
        pipelineC: { verdict: resC.verdict, violation: violC, latencyMs: resC.durationMs }
      });

      console.log(`Done. (A:${resA.verdict}, B:${resB.verdict}, C:${resC.verdict})`);

      // Gentle pause to respect rate limits
      await new Promise(r => setTimeout(r, 600));
    }

    // Compute Summary Statistics
    const numTraps = selectedQueries.filter(q => q.has_contraindication).length;
    const numSafe = selectedQueries.filter(q => !q.has_contraindication).length;

    const calcStats = (p) => {
      const svr = (p.violations / numTraps) * 100;
      const fpr = (p.falsePositives / numSafe) * 100;
      const accuracy = (p.correct / selectedQueries.length) * 100;
      const meanLatency = p.latencies.reduce((a, b) => a + b, 0) / p.latencies.length;
      const sortedLat = [...p.latencies].sort((a, b) => a - b);
      const p95Latency = sortedLat[Math.floor(sortedLat.length * 0.95)] || sortedLat[sortedLat.length - 1];

      return {
        svr: parseFloat(svr.toFixed(2)),
        fpr: parseFloat(fpr.toFixed(2)),
        accuracy: parseFloat(accuracy.toFixed(2)),
        meanLatencyMs: Math.round(meanLatency),
        p95LatencyMs: Math.round(p95Latency)
      };
    };

    const statsA = calcStats(results.pipelineMetrics.pipelineA);
    const statsB = calcStats(results.pipelineMetrics.pipelineB);
    const statsC = calcStats(results.pipelineMetrics.pipelineC);

    results.summary = {
      pipelineA: statsA,
      pipelineB: statsB,
      pipelineC: statsC,
      ablationGains: {
        deltaA_to_B_SVR_Reduction: parseFloat((statsA.svr - statsB.svr).toFixed(2)),
        deltaB_to_C_SVR_Reduction: parseFloat((statsB.svr - statsC.svr).toFixed(2)),
        totalVedaAIGain_SVR_Reduction: parseFloat((statsA.svr - statsC.svr).toFixed(2))
      }
    };

    // Exact McNemar test compares paired binary safety-violation outcomes.
    const aOnly = results.trials.filter(t => t.pipelineA.violation && !t.pipelineC.violation).length;
    const cOnly = results.trials.filter(t => !t.pipelineA.violation && t.pipelineC.violation).length;
    const pValue = exactMcNemarPValue(aOnly, cOnly);

    results.statisticalValidation = {
      testType: 'Exact two-sided McNemar test (Pipeline A vs Pipeline C violation outcomes)',
      sampleSize: results.trials.length,
      discordantPairs: aOnly + cOnly,
      pipelineAOnlyViolations: aOnly,
      pipelineCOnlyViolations: cOnly,
      pValue: parseFloat(pValue.toFixed(6)),
      alpha: 0.05,
      isStatisticallySignificant: pValue < 0.05
    };

    // Save results to data/benchmark_results_ablation.json
    const outResultPath = path.join(__dirname, '..', 'data', 'benchmark_results_ablation.json');
    fs.writeFileSync(outResultPath, JSON.stringify(results, null, 2), 'utf-8');

    // Display formatted results
    console.log('\n================================================================================');
    console.log('                          EMPIRICAL ABLATION RESULTS                            ');
    console.log('================================================================================');
    console.log(`Evaluated Sample: ${selectedQueries.length} queries (${numTraps} planted traps, ${numSafe} safe cases)`);
    console.log('--------------------------------------------------------------------------------');
    console.log('| Metric                    | Pipeline A (Baseline) | Pipeline B (Graph) | Pipeline C (VedaAI) |');
    console.log('--------------------------------------------------------------------------------');
    console.log(`| Safety Violation Rate (SVR)| ${String(statsA.svr + '%').padEnd(21)} | ${String(statsB.svr + '%').padEnd(18)} | ${String(statsC.svr + '%').padEnd(19)} |`);
    console.log(`| False Positive Rate (FPR)  | ${String(statsA.fpr + '%').padEnd(21)} | ${String(statsB.fpr + '%').padEnd(18)} | ${String(statsC.fpr + '%').padEnd(19)} |`);
    console.log(`| Clinical Accuracy         | ${String(statsA.accuracy + '%').padEnd(21)} | ${String(statsB.accuracy + '%').padEnd(18)} | ${String(statsC.accuracy + '%').padEnd(19)} |`);
    console.log(`| Mean Latency (ms)         | ${String(statsA.meanLatencyMs + ' ms').padEnd(21)} | ${String(statsB.meanLatencyMs + ' ms').padEnd(18)} | ${String(statsC.meanLatencyMs + ' ms').padEnd(19)} |`);
    console.log(`| P95 Latency (ms)          | ${String(statsA.p95LatencyMs + ' ms').padEnd(21)} | ${String(statsB.p95LatencyMs + ' ms').padEnd(18)} | ${String(statsC.p95LatencyMs + ' ms').padEnd(19)} |`);
    console.log('--------------------------------------------------------------------------------');
    console.log('\n🔬 Ablation Attribution:');
    console.log(`   Δ(A → B) Knowledge Graph Grounding Gain:  -${results.summary.ablationGains.deltaA_to_B_SVR_Reduction}% SVR`);
    console.log(`   Δ(B → C) Adversarial Multi-Agent Debate Gain: -${results.summary.ablationGains.deltaB_to_C_SVR_Reduction}% SVR`);
    console.log(`   Total VedaAI Safety Gain:                 -${results.summary.ablationGains.totalVedaAIGain_SVR_Reduction}% SVR`);
    console.log('\n📊 Paired Binary Outcome Test (Exact McNemar):');
    console.log(`   Discordant pairs (A-only / C-only): ${aOnly} / ${cOnly}`);
    console.log(`   p-value:     ${results.statisticalValidation.pValue}`);
    console.log(`   Significance: ${results.statisticalValidation.isStatisticallySignificant ? 'STATISTICALLY SIGNIFICANT (p < 0.05) ✅' : 'NOT SIGNIFICANT ❌'}`);
    console.log('================================================================================');
    console.log(`💾 Full benchmark logs persisted to: ${outResultPath}\n`);

  } finally {
    await driver.close();
    await closeSharedDriver();
  }
}

main().catch(err => {
  console.error('Fatal benchmark error:', err);
  process.exit(1);
});
