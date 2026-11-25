const { Annotation } = require('@langchain/langgraph');

/**
 * Global state schema for VedaAI Multi-Agent pipeline
 * Matches specification from Master Implementation Blueprint
 */
const VedaAIState = Annotation.Root({
  // Raw user inquiry
  raw_query: Annotation({
    reducer: (x, y) => y ?? x ?? "",
    default: () => ""
  }),

  // Persistent user profile (Prakriti, chronic morbidities, etc.)
  user_profile: Annotation({
    reducer: (x, y) => y ?? x ?? {},
    default: () => ({})
  }),

  // Normalized clinical entities extracted by Agent 1
  canonical_entities: Annotation({
    reducer: (x, y) => y ?? x ?? {},
    default: () => ({})
  }),

  // Structured graph facts retrieved from Neo4j Aura by Agent 2
  graph_facts: Annotation({
    reducer: (x, y) => y ?? x ?? {},
    default: () => ({})
  }),

  // Boolean flag whether target entities were found in verified graph
  graph_available: Annotation({
    reducer: (x, y) => y ?? x ?? false,
    default: () => false
  }),

  // Therapeutic pro-arguments emitted by Agent 3 (Proponent)
  proponent_draft: Annotation({
    reducer: (x, y) => y ?? x ?? {},
    default: () => ({})
  }),

  // Safety audit verdict emitted by Agent 4 (Opponent)
  opponent_verdict: Annotation({
    reducer: (x, y) => y ?? x ?? "PENDING",
    default: () => "PENDING"
  }),

  // Array of safety flags raised by Opponent
  opponent_flags: Annotation({
    reducer: (x, y) => y ?? x ?? [],
    default: () => []
  }),

  // LLM execution trace for the five stages (used for observability/tests)
  agent_trace: Annotation({
    reducer: (x, y) => y ?? x ?? [],
    default: () => []
  }),

  // LLM retrieval plan produced by Agent 2
  retrieval_plan: Annotation({
    reducer: (x, y) => y ?? x ?? {},
    default: () => ({})
  }),

  // Judge's uncalibrated certainty estimate
  judge_certainty: Annotation({
    reducer: (x, y) => y ?? x ?? 0,
    default: () => 0
  }),

  // Final synthesized response from Judge / Formatter
  final_response: Annotation({
    reducer: (x, y) => y ?? x ?? {},
    default: () => ({})
  }),

  // Calibrated confidence score (0.0 to 1.0)
  confidence_score: Annotation({
    reducer: (x, y) => y ?? x ?? 0.0,
    default: () => 0.0
  })
});

module.exports = { VedaAIState };
