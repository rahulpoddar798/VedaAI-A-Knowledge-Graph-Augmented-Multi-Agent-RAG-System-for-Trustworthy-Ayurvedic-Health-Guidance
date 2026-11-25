const llm = require('./llm_client');
const CypherQueryBuilder = require('./cypher_builder');
const vectorStore = require('./vector_store');
const { getSharedDriver } = require('../lib/neo4j_config');

function getCypherBuilder() {
  return new CypherQueryBuilder(getSharedDriver());
}

function traceCall(state, agent) {
  return [...(state.agent_trace || []), {
    agent,
    provider: 'Google Gemini API',
    model: llm.modelName,
    operation: 'generateJSON',
    completed: true
  }];
}

function asArray(value) {
  if (Array.isArray(value)) return value.filter(item => typeof item === 'string' && item.trim()).map(item => item.trim());
  if (typeof value === 'string' && value.trim()) return [value.trim()];
  return [];
}

function clamp01(value, fallback = 0.85) {
  const number = Number(value);
  return Number.isFinite(number) ? Math.max(0, Math.min(1, number)) : fallback;
}

function calculateEmpiricalConfidence({ graphFacts, vectorMatches, opponentFlags, judgeCertainty }) {
  const hasDirectTreats = graphFacts?.candidateHerbs?.some(h => (h.direct_score || 0) > 0)
    || (graphFacts?.herbDetails?.length || 0) > 0;
  const collisionPenalty = (opponentFlags || []).length * 0.15;
  const sGraph = Math.max(0.2, Math.min(1.0, (hasDirectTreats ? 0.9 : 0.5) - collisionPenalty));
  const topVectorScore = vectorMatches?.[0]?.similarityScore ?? 0.65;
  const sVector = Math.max(0.0, Math.min(1.0, Number(topVectorScore) || 0));
  const sLLM = Math.max(0.1, Math.min(1.0, clamp01(judgeCertainty, 0.85)));
  return Number(((0.40 * sGraph) + (0.35 * sVector) + (0.25 * sLLM)).toFixed(3));
}

/** Agent 1: LLM-based extraction and profile merge. */
async function entityExtractorNode(state) {
  console.log('\n🤖 [AGENT 1: Entity Extractor] Calling Gemini...');
  const prompt = llm.loadPrompt('entity_extractor', 'v1');
  const extracted = await llm.generateJSON(prompt, {
    raw_query: state.raw_query,
    user_profile: state.user_profile || {}
  });
  const entities = {
    mentioned_herbs: asArray(extracted.mentioned_herbs),
    symptoms: asArray(extracted.symptoms),
    query_season: extracted.query_season || state.user_profile?.current_season || null,
    patient_prakriti: extracted.patient_prakriti || state.user_profile?.prakriti || 'Unknown',
    patient_conditions: asArray(extracted.patient_conditions || state.user_profile?.chronic_conditions),
    query_intent: ['general_inquiry', 'symptom_recommendation', 'herb_safety_check'].includes(extracted.query_intent)
      ? extracted.query_intent
      : (asArray(extracted.mentioned_herbs).length ? 'herb_safety_check' : 'symptom_recommendation'),
    profile_merged: true
  };
  return { canonical_entities: entities, agent_trace: traceCall(state, 'entity_extractor') };
}

/** Agent 2: LLM retrieval planning, followed by parallel Neo4j and vector retrieval. */
async function cypherQueryBuilderNode(state) {
  console.log('\n🤖 [AGENT 2: Hybrid Retrieval Planner] Calling Gemini and querying both stores...');
  const entities = state.canonical_entities || {};
  const retrievalPlan = await llm.generateJSON(
    `You are VedaAI's hybrid retrieval planner. Produce search terms only; do not make clinical claims. Expand symptoms into close clinical synonyms, preserve herb names and season, and create a concise vector search query. Return JSON with graph_symptom_terms (string array) and vector_query (string).`,
    { query: state.raw_query, extracted_entities: entities }
  );
  const graphSymptoms = [...new Set([...entities.symptoms, ...asArray(retrievalPlan.graph_symptom_terms)])];
  const builder = getCypherBuilder();
  const vectorQuery = typeof retrievalPlan.vector_query === 'string' && retrievalPlan.vector_query.trim()
    ? retrievalPlan.vector_query.trim()
    : state.raw_query;

  const [graphContext, vectorMatches] = await Promise.all([
    builder.fetchGraphContext({
      herbs: entities.mentioned_herbs || [],
      symptoms: graphSymptoms,
      season: entities.query_season,
      conditions: entities.patient_conditions || [],
      intent: entities.query_intent
    }),
    vectorStore.search(vectorQuery, 5)
  ]);
  graphContext.vectorMatches = vectorMatches;
  graphContext.retrievalTerms = graphSymptoms;
  console.log(`   Neo4j returned ${graphContext.herbDetails.length} requested herb(s) and ${graphContext.candidateHerbs.length} symptom candidate(s); vector search returned ${vectorMatches.length} chunks.`);
  return {
    retrieval_plan: { ...retrievalPlan, vector_query: vectorQuery, graph_symptom_terms: graphSymptoms },
    graph_facts: graphContext,
    graph_available: graphContext.graphAvailable,
    agent_trace: traceCall(state, 'hybrid_retrieval_planner')
  };
}

/** Agent 3: LLM Proponent builds an evidence-constrained therapeutic argument. */
async function proponentNode(state) {
  console.log('\n🤖 [AGENT 3: Proponent] Calling Gemini...');
  const prompt = llm.loadPrompt('proponent', 'v1');
  const draft = await llm.generateJSON(prompt, {
    query: state.raw_query,
    patient_profile: state.canonical_entities,
    neo4j_facts: state.graph_facts,
    classical_retrieval_passages: state.graph_facts?.vectorMatches || []
  });
  return {
    proponent_draft: {
      ...draft,
      reasoning: asArray(draft.reasoning),
      initial_confidence: clamp01(draft.initial_confidence)
    },
    agent_trace: traceCall(state, 'proponent')
  };
}

function graphSafetyAudit(state) {
  const facts = state.graph_facts || {};
  const entities = state.canonical_entities || {};
  const targetHerbs = facts.herbDetails?.length ? facts.herbDetails : (facts.candidateHerbs || []);
  const flags = [];
  const paths = [];
  const reasoning = [];
  const safeCandidates = [];
  const cautionedCandidates = [];
  const prakriti = String(entities.patient_prakriti || '').toLowerCase();
  const conditionDoshas = new Set((facts.conditionInfo || []).map(item => String(item.dosha).toLowerCase()));
  const seasonDoshas = new Set((facts.seasonInfo || []).map(item => String(item.dominant_dosha).toLowerCase()));

  for (const herb of targetHerbs) {
    const herbFlags = [];
    const herbPaths = [];
    const herbReasoning = [];
    for (const contraindication of facts.contraindications || []) {
      if (contraindication.herb !== herb.name) continue;
      herbFlags.push('SEASONAL_CONTRAINDICATION_DETECTED');
      herbPaths.push(`(${contraindication.herb})-[:CONTRAINDICATED_IN]->(${contraindication.season_sanskrit || contraindication.season_english})`);
      herbReasoning.push(contraindication.reason || `${contraindication.herb} has a graph-recorded seasonal contraindication.`);
    }
    for (const relation of facts.doshaRelations || []) {
      if (relation.herb !== herb.name || relation.relationship !== 'AGGRAVATES') continue;
      const dosha = String(relation.dosha || '').toLowerCase();
      herbPaths.push(`(${herb.name})-[:AGGRAVATES]->(${relation.dosha})`);
      if (seasonDoshas.has(dosha)) {
        herbFlags.push(`SEASONAL_DOSHA_AMPLIFICATION_${dosha.toUpperCase()}`);
        herbReasoning.push(`${herb.name} aggravates ${relation.dosha}, which is dominant in the selected season.`);
      }
      if (conditionDoshas.has(dosha)) {
        herbFlags.push(`MORBIDITY_CLASH_${dosha.toUpperCase()}`);
        herbReasoning.push(`A selected health condition is associated with ${relation.dosha}, which this herb aggravates in the graph.`);
      }
      if (prakriti.includes(dosha)) {
        herbFlags.push(`CONSTITUTIONAL_CLASH_${dosha.toUpperCase()}`);
        herbReasoning.push(`The selected Prakriti includes ${relation.dosha}, which this herb aggravates in the graph.`);
      }
    }
    if (entities.query_intent === 'symptom_recommendation') {
      if (herbFlags.length) {
        cautionedCandidates.push({ herb: herb.name, flags: [...new Set(herbFlags)], paths: herbPaths, reasoning: herbReasoning });
      } else {
        safeCandidates.push(herb);
      }
    } else {
      flags.push(...herbFlags);
      paths.push(...herbPaths);
      reasoning.push(...herbReasoning);
    }
  }
  if (entities.query_intent === 'symptom_recommendation') {
    if (cautionedCandidates.length) flags.push('UNSAFE_CANDIDATES_FILTERED');
    if (!safeCandidates.length) {
      flags.push(...cautionedCandidates.flatMap(candidate => candidate.flags));
      paths.push(...cautionedCandidates.flatMap(candidate => candidate.paths));
      reasoning.push(...cautionedCandidates.flatMap(candidate => candidate.reasoning));
    }
  }
  return {
    flags: [...new Set(flags)],
    paths: [...new Set(paths)],
    reasoning: [...new Set(reasoning)],
    safeCandidates,
    cautionedCandidates
  };
}

/** Agent 4: Gemini adversarial auditor, with graph-derived flags as a hard safety guard. */
async function opponentNode(state) {
  console.log('\n🤖 [AGENT 4: Opponent] Calling Gemini to cross-examine the proposal...');
  const prompt = llm.loadPrompt('opponent', 'v1');
  const graphAudit = graphSafetyAudit(state);
  const audit = await llm.generateJSON(prompt, {
    query: state.raw_query,
    patient_profile: state.canonical_entities,
    proponent_claims: state.proponent_draft,
    neo4j_contraindications_and_paths: {
      contraindications: state.graph_facts?.contraindications || [],
      doshaRelations: state.graph_facts?.doshaRelations || [],
      seasonInfo: state.graph_facts?.seasonInfo || [],
      conditionInfo: state.graph_facts?.conditionInfo || [],
      graph_guard_flags: graphAudit.flags,
      graph_guard_paths: graphAudit.paths
    }
  });
  const safetyFlags = [...new Set([...asArray(audit.safety_flags), ...graphAudit.flags])];
  const intent = state.canonical_entities?.query_intent;
  const isUnknownNamedHerb = intent === 'herb_safety_check'
    && (state.canonical_entities?.mentioned_herbs?.length || 0) > 0
    && (state.graph_facts?.herbDetails?.length || 0) === 0;
  const verdict = isUnknownNamedHerb
    ? 'UNCATALOGED'
    : (intent === 'symptom_recommendation' && graphAudit.safeCandidates.length > 0
      ? 'VERIFIED'
      : (safetyFlags.length || audit.verdict === 'FLAGGED' ? 'FLAGGED' : 'VERIFIED'));
  const opponent = {
    ...audit,
    verdict,
    safety_flags: safetyFlags,
    collision_paths: [...new Set([...asArray(audit.contraindication_paths), ...graphAudit.paths])],
    reasoning: [...new Set([...asArray(audit.reasoning), ...graphAudit.reasoning])]
  };
  return {
    opponent_verdict: verdict,
    opponent_flags: safetyFlags,
    graph_facts: {
      ...state.graph_facts,
      safeCandidates: graphAudit.safeCandidates,
      cautionedCandidates: graphAudit.cautionedCandidates,
      collisionPaths: opponent.collision_paths,
      collisionReasoning: opponent.reasoning,
      opponentAudit: opponent
    },
    agent_trace: traceCall(state, 'opponent')
  };
}

/** Agent 5: LLM Judge adjudicates every request; deterministic guard enforces graph-flag priority. */
async function judgeNode(state) {
  console.log('\n🤖 [AGENT 5: Judge] Calling Gemini for final adjudication...');
  const prompt = llm.loadPrompt('judge', 'v1');
  const result = await llm.generateJSON(prompt, {
    query: state.raw_query,
    patient_profile: state.canonical_entities,
    graph_facts: state.graph_facts,
    proponent_argument: state.proponent_draft,
    opponent_audit: state.graph_facts?.opponentAudit,
    opponent_flags: state.opponent_flags,
    safe_alternatives: state.graph_facts?.alternatives || [],
    vector_evidence: state.graph_facts?.vectorMatches || []
  });
  const intent = state.canonical_entities?.query_intent;
  let finalVerdict = result.final_verdict || 'CAUTION_REQUIRED';
  if (intent === 'general_inquiry') finalVerdict = 'SYSTEM READY — AYURVEDIC CLINICAL ADVISOR';
  else if (intent === 'herb_safety_check' && state.opponent_verdict === 'UNCATALOGED') {
    finalVerdict = 'SUBSTANCE NOT IN KNOWLEDGE BASE';
  } else if (state.canonical_entities?.query_intent === 'symptom_recommendation' && state.graph_facts?.safeCandidates?.length) {
    finalVerdict = 'CLINICALLY INDICATED — RECOMMENDED HERBS';
  } else if (intent === 'symptom_recommendation' && !(state.graph_facts?.candidateHerbs?.length)) {
    finalVerdict = 'CAUTION_REQUIRED';
  } else if (state.opponent_flags?.length) {
    finalVerdict = 'UNSAFE — DO NOT RECOMMEND';
  }
  // A deterministic override also supersedes the model's explanation.
  const guarded = finalVerdict !== result.final_verdict &&
    /unsafe|caution|not in knowledge base/i.test(finalVerdict);
  const finalResponse = {
    ...result,
    final_verdict: finalVerdict,
    summary_message: guarded ? 'The safety assessment does not support recommending this substance.' : result.summary_message || 'The available graph and text evidence was reviewed for this profile.',
    risk_explanation: (guarded ? null : result.risk_explanation) || (state.opponent_flags?.length ? state.graph_facts?.collisionReasoning?.join(' ') : null),
    suggested_alternatives: state.canonical_entities?.query_intent === 'symptom_recommendation' && state.graph_facts?.safeCandidates?.length
      ? state.graph_facts.safeCandidates.slice(0, 3).map(herb => ({
        herb_name: herb.name,
        botanical_name: herb.botanical_name,
        virya: herb.virya,
        why_safe: 'Passed the structured graph safety screen for the supplied profile.'
      }))
      : (Array.isArray(result.suggested_alternatives) ? result.suggested_alternatives : []),
    graph_evidence_summary: Array.isArray(result.graph_evidence_summary)
      ? result.graph_evidence_summary
      : [...(state.graph_facts?.collisionPaths || []), ...(state.graph_facts?.vectorMatches || []).map(match => `${match.title} (cosine ${match.similarityScore.toFixed(3)})`)],
    disclaimer: result.disclaimer || 'Educational decision support only. Consult a qualified practitioner for personal care.'
  };
  return {
    final_response: finalResponse,
    judge_certainty: clamp01(result.judge_certainty ?? result.confidence_score),
    agent_trace: traceCall(state, 'judge')
  };
}

/** Final formatter applies the empirical evidence fusion after the Judge completes. */
async function outputFormatterNode(state) {
  const confidence = calculateEmpiricalConfidence({
    graphFacts: state.graph_facts,
    vectorMatches: state.graph_facts?.vectorMatches,
    opponentFlags: state.opponent_flags,
    judgeCertainty: state.judge_certainty
  });
  const finalResponse = {
    ...state.final_response,
    confidence_score: confidence,
    evidence_confidence: {
      graph: Boolean(state.graph_facts?.herbDetails?.length || state.graph_facts?.candidateHerbs?.some(h => (h.direct_score || 0) > 0)),
      top_vector_similarity: state.graph_facts?.vectorMatches?.[0]?.similarityScore ?? null,
      judge_certainty: state.judge_certainty
    }
  };
  return { final_response: finalResponse, confidence_score: confidence };
}

module.exports = {
  entityExtractorNode,
  cypherQueryBuilderNode,
  proponentNode,
  opponentNode,
  judgeNode,
  outputFormatterNode,
  calculateEmpiricalConfidence,
  graphSafetyAudit,
};
