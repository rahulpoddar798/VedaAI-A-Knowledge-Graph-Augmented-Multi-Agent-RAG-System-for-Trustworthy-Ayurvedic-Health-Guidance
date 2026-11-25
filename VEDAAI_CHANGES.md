# VedaAI implementation changes

**26 November 2026 · Evidence-first consultation update**

VedaAI now records the evidence and gaps behind each consultation and computes the final safety verdict in application code. Previously, an LLM Judge issued the verdict and the server could revise it. The Proponent and Opponent now select evidence IDs for consideration, and the same decision policy applies to text and in-domain image consultations.

For example, the live Ginger regression previously returned an unsafe verdict. It now returns `EXPERT_REVIEW_REQUIRED` because the seasonal caution comes from the project ontology and lacks documented clinical approval. A follow-up asking for a dose retains that restriction.

## What changed and where

| Change | Effect | Main files |
| --- | --- | --- |
| Hybrid retrieval | Neo4j supplies catalog identities, canonical `CONTRAINDICATED_IN` targets, and context-matching `AGGRAVATES`/`PACIFIES`, `Condition -> Dosha` (`ASSOCIATED_WITH`), and `Season -> Dosha` (`DOMINANT_IN`) edges. IMPPAT plant metadata, reported uses and formulations retain their separate meanings. A reported use alone cannot establish efficacy or safety. | [Structured retrieval](engine/structured_sources.js), [IMPPAT importer](scripts/import_imppat.js) |
| Source documents | A new ingestion path preserves UTF-8 originals, indexes attributed passages and returns excerpts with source locations. The old graph-generated summaries are excluded from primary-source retrieval. No primary-source corpus is committed in `data/source_documents/` yet. | [Document ingestion and search](engine/documents.js) |
| Evidence Ledger | Each retrieved record carries a consultation-scoped ID, excerpt or fact, source locator, retrieval method and verification status. Response validation checks that cited IDs belong to the consultation. | [Evidence and response schemas](engine/evidence.js) |
| Safety coverage | The workflow records which dimensions were assessed, which lack evidence and which require review. An omitted medication list remains a visible gap. | [Coverage tracker and verdict policy](engine/policy.js) |
| Rules and verdicts | Versioned rules run independently of the model and can still fire from source-traceable table records when Neo4j is unavailable. Context-matched ontology edges verify `AGGRAVATES` against actual Prakriti, `ASSOCIATED_WITH` conditions, or `DOMINANT_IN` season (with Sanskrit/English normalization) and preserve supporting evidence IDs. | [Rule registry](engine/rule_registry.js), [LangGraph workflow](engine/assessment_workflow.js) |
| API and follow-ups | Consultation responses scrub internal tokens/bare Aura IDs via `scrubInternalText`, preserve clean wording for unidentified herbal images, expose public findings/coverage/stages, and anchor follow-ups to server-side records. | [API routes](server.js), [follow-up handler](engine/followup_agent.js), [public response sanitizer](lib/response_sanitizer.js) |
| Frontend | The assessment screen displays the backend verdict, source excerpts and coverage gaps; transparency displays recorded stages; live `"No Flag"` label filters handle `INSUFFICIENT_EVIDENCE`; optional profile selects start unselected (`""`) alongside blank clinical state. | [Assessment screen](client/src/screens/AIAssessmentScreen.tsx), [transparency screen](client/src/screens/AgentTransparencyScreen.tsx), [label analyzer](client/src/screens/ProductLabelAnalyzer.tsx), [health profile](client/src/screens/HealthProfileScreen.tsx), [consultation mapping](client/src/data/consultation.ts) |
| Image and label handling | Catalog identity and safety are evaluated separately. A matched ingredient with no graph flag receives an insufficient-evidence result. | [Label audit](engine/label_audit.js), [public response sanitizer](lib/response_sanitizer.js) |

## Verification recorded during review

| Check | Result |
| --- | --- |
| Evidence, workflow, policy regression, API and document ingestion suite (`npm.cmd run test:evidence`) | 26 tests passed (`0` failed, `0` skipped). Covers 14 stratified cases (`meanMs: 51`), ledger/DTO checks, HTTP/follow-up routes, document search, and 7 policy regression subtests covering matching/non-matching `AGGRAVATES`, missing context, conflicts, seasons, and graph-outage fallback. |
| Phase 0A regressions (`npm.cmd run test:remediation`) | 13 backend tests and 1 client React SSR rendering test passed (`0` failed, `0` skipped). |
| Security and integration (`npm.cmd run test:security`) | 10 tests passed (`0` failed, `0` skipped), including bare Aura ID scrubbing, unverified herbal image consultation, and live Neo4j + Gemini integration. |
| Historical local suite (`npm.cmd test`) | 36 static/legacy checks passed (`0` failed). Historical prototype check only. |
| Frontend install, build & lint | Root `npm.cmd ci`, `npm.cmd run build:web` (`1.51s`), `tsc --noEmit`, and `oxlint` (`0` warnings/errors on 24 files) passed. Note: `npm.cmd --prefix client ci` failed with Windows `EPERM (-4048)` unlinking `.node` files held by a pre-existing external `CodexSandboxOffline` Vite process (`PID 7216`); `npm.cmd --prefix client install --no-save` restored `client/node_modules` without altering `client/package-lock.json`. |
| Database migration (`scripts/import_imppat.js`) | Dry run validated 4,154 plants, 94,261 reported-use associations and 541 formulation records. `--check-db` planned all three import statements with `EXPLAIN`. Live `--apply` writes remain pending. |

## What remains open

- The production clinical rule registry is empty. Affirmative treatment recommendations require expert-approved rules, patient-specific coverage criteria and matched evidence. Synthetic fixtures exercise the blocking and restriction paths.
- Document ingestion currently accepts UTF-8 text. PDF extraction, scanned-page OCR, a reviewed primary-source corpus and independently annotated retrieval evaluation remain open.
- The implementation remains local and undeployed. Production browser navigation, load testing, authenticated patient isolation and distributed retention still require verification or implementation.

The architecture guide contains the full file inventory, schema and verdict contracts, migration procedure, rollback guidance and commands for running the application and tests. [Architecture and operating guide](EVIDENCE_ARCHITECTURE.md)
