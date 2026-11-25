# VedaAI implementation changes

**26 November 2026 · Evidence-first consultation update**

VedaAI now records the evidence and gaps behind each consultation and computes the final safety verdict in application code. Previously, an LLM Judge issued the verdict and the server could revise it. The Proponent and Opponent now select evidence IDs for consideration, and the same decision policy applies to text and in-domain image consultations.

For example, the live Ginger regression previously returned an unsafe verdict. It now returns `EXPERT_REVIEW_REQUIRED` because the seasonal caution comes from the project ontology and lacks documented clinical approval. A follow-up asking for a dose retains that restriction.

## What changed and where

| Change | Effect | Main files |
| --- | --- | --- |
| Hybrid retrieval | Neo4j supplies catalog identities and context-relevant relationships. IMPPAT plant metadata, reported uses and formulations retain their separate meanings. A reported use alone cannot establish efficacy or safety. | [Structured retrieval](engine/structured_sources.js), [IMPPAT importer](scripts/import_imppat.js) |
| Source documents | A new ingestion path preserves UTF-8 originals, indexes attributed passages and returns excerpts with source locations. The old graph-generated summaries are excluded from primary-source retrieval. | [Document ingestion and search](engine/documents.js) |
| Evidence Ledger | Each retrieved record carries a consultation-scoped ID, excerpt or fact, source locator, retrieval method and verification status. Response validation checks that cited IDs belong to the consultation. | [Evidence and response schemas](engine/evidence.js) |
| Safety coverage | The workflow records which dimensions were assessed, which lack evidence and which require review. An omitted medication list remains a visible gap. | [Coverage tracker and verdict policy](engine/policy.js) |
| Rules and verdicts | Versioned rules run independently of the model. Project-authored seasonal and constitutional cautions can trigger expert review. Model output cannot override a blocking rule. | [Rule registry](engine/rule_registry.js), [LangGraph workflow](engine/assessment_workflow.js) |
| API and follow-ups | The consultation response exposes the verdict, findings, sources, coverage and public stage statuses. Follow-ups resolve the original server-side record. | [API routes](server.js), [follow-up handler](engine/followup_agent.js) |
| Frontend | The assessment screen displays the backend verdict, source excerpts and coverage gaps. The transparency screen displays recorded execution stages. The live patient profile starts blank. | [Assessment screen](client/src/screens/AIAssessmentScreen.tsx), [transparency screen](client/src/screens/AgentTransparencyScreen.tsx), [consultation mapping](client/src/data/consultation.ts) |
| Image and label handling | Catalog identity and safety are evaluated separately. A matched ingredient with no graph flag receives an insufficient-evidence result. | [Label audit](engine/label_audit.js), [public response sanitizer](lib/response_sanitizer.js) |

## Verification recorded during implementation

| Check | Result |
| --- | --- |
| Evidence, workflow, API and document ingestion suite | 18 tests passed. Across 14 evaluation cases, all expected verdict categories matched and all 6 finding references resolved. |
| Phase 0A regressions | 13 backend tests and 1 React rendering test passed. |
| Security and integration | 10 tests passed with network access, including live Neo4j and Gemini. The initial network-isolated run failed at database readiness. |
| Historical local suite | 36 checks passed. |
| Frontend | Lint, TypeScript compilation and the production build passed. |
| Database migration | The dry run validated 4,154 plants, 94,261 reported-use associations and 541 formulation records. Neo4j planned all three import statements using `EXPLAIN`. Live data and schema writes remain pending. |

## What remains open

- The production clinical rule registry is empty. Affirmative treatment recommendations require expert-approved rules, patient-specific coverage criteria and matched evidence. Synthetic fixtures exercise the blocking and restriction paths.
- Document ingestion currently accepts UTF-8 text. PDF extraction, scanned-page OCR, a reviewed primary-source corpus and independently annotated retrieval evaluation remain open.
- The implementation remains local and undeployed. Production browser navigation, load testing, authenticated patient isolation and distributed retention still require verification or implementation.

The architecture guide contains the full file inventory, schema and verdict contracts, migration procedure, rollback guidance and commands for running the application and tests. [Architecture and operating guide](EVIDENCE_ARCHITECTURE.md)
