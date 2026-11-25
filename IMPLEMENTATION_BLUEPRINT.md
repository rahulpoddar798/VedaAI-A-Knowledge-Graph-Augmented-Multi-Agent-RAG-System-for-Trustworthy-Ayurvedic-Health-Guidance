# VedaAI Technical Audit & Implementation Blueprint

**Audit Scope:** Complete read-only technical audit of `c:\Users\rahul\OneDrive\Desktop\websites\veda_original` covering frontend, backend, AI orchestration, data persistence, security, role-based information abstraction, and 12-screen Stitch alignment.  
**Verification Standard:** Every file path, symbol, endpoint, schema, and behavior reported as current state was directly observed in source files, prompts, Cypher seeds, JSON datasets, and configuration files. Proposed target schemas, API contracts, and migration phases are explicitly separated under **Recommendations / Target Design**.

---

## Executive Summary

VedaAI has a working **AI core and interactive frontend prototype**:
- **Verified Working End-to-End Paths:** `GET /api/status`, `GET /api/herbs`, `POST /api/chat` (5-stage LangGraph pipeline + Neo4j + Gemini + 3072-d vector cosine search), `POST /api/scan`, `POST /api/consult-with-image`, `POST /api/follow-up`, `POST /api/label-audit`, and append-only `POST /api/feedback`.
- **Verified Frontend Structure:** `client/src/` has been refactored from a single-file prototype into a Tailwind v4 + React 19 + TypeScript application (`AppShell`, UI primitives, `mockData.ts`, and 13 screens — the 12 Stitch screens plus `OverviewScreen`).
- **Critical Production & Architectural Gaps:**
  1. **No operational database or persistence layer:** Users, authentication, health profiles, consultation history, follow-up threads, drug–herb interaction pairs, and admin governance reviews live purely in React memory (`App.tsx`, `AdminPortalScreen.tsx`) backed by `mockData.ts`, except `data/clinical_feedback.jsonl` (flat append-only file).
  2. **Zero authentication or RBAC:** `AuthScreen.tsx` performs client-only state transitions; `server.js` exposes every endpoint publicly without authentication, rate limiting, or schema validation.
  3. **Patient-facing leakage of internal telemetry & graph internals:** `/api/chat` and `/api/consult-with-image` return raw `trace` internals (`agentExecutions`, Gemini model IDs, `retrievalPlan`, raw `graphFacts`), `/api/status` exposes Neo4j Aura instance ID (`[instance redacted]`), and patient UI screens render raw Cypher syntax and infrastructure identifiers.
  4. **Missing backend domains for 5 major screens:** Drug–Herb Interaction Checker (`:Drug` / `:INTERACTS_WITH` do not exist in Neo4j), Knowledge Graph Explorer (100% static SVG mock), Health Profile persistence, Consultation History persistence, and Admin Review Queue/Versioning governance.
  5. **Critical live UI integration defect:** `ConsultationScreen.tsx:203` hardcodes `agentStages: SAMPLE_CONSULTATIONS[0].agentStages` on live consultation responses, causing `AgentTransparencyScreen` to show static mock Ginger stages even after live queries.

---

## 1. Existing System Architecture

### 1.1 High-Level Deployment & Runtime Topology (Verified)

```
┌────────────────────────────────────────────────────────────────────────────┐
│ Client Browser (React 19 + TypeScript + Vite 8 + Tailwind CSS v4)          │
│  - Dev: client/vite.config.ts -> port 3000, proxies /api -> localhost:4000 │
│  - Prod: Built via `npm run build:web` -> copied to public/ -> static HTML │
└───────────────────────────────┬────────────────────────────────────────────┘
                                │ HTTP JSON / Multipart FormData (/api/*)
                                ▼
┌────────────────────────────────────────────────────────────────────────────┐
│ Monolithic Express 5 Server (server.js, PORT = process.env.PORT || 4000)   │
│  - cors() wildcard, express.json({ limit: '15mb' }), multer memory (10MB)  │
│  - Route handlers inline; direct calls to Neo4j driver & engine singletons │
└──────┬─────────────────────────┬────────────────────────┬──────────────────┘
       │                         │                        │
       ▼                         ▼                        ▼
┌───────────────────┐  ┌──────────────────────┐  ┌───────────────────────────┐
│ LangGraph Pipeline│  │ Standalone AI Agents │  │ Local Filesystem Storage  │
│ engine/pipeline.js│  │ - vision_agent.js    │  │ - data/classical_         │
│ engine/state.js   │  │ - label_audit.js     │  │   embeddings.json (3072-d)│
│ engine/agents.js  │  │ - followup_agent.js  │  │ - data/clinical_feedback. │
│ (5 Agents + Calc) │  │ (prompts/*/v1.txt)   │  │   jsonl (append-only log) │
└────────┬──────────┘  └─────────┬────────────┘  └───────────────────────────┘
         │                       │
         ├───────────┬───────────┤
         ▼           ▼           ▼
┌─────────────────┐  ┌──────────────────────────┐
│ Google Gemini   │  │ Neo4j Aura Cloud Graph   │
│ @google/        │  │ neo4j-driver ^6.2.0      │
│ generative-ai   │  │ 25 :Herb, 3 :Dosha,      │
│ Flash-Lite +    │  │ 6 :Season, 12 :Condition │
│ embedding-001   │  │ Separate drivers per mod │
└─────────────────┘  └──────────────────────────┘
```

### 1.2 Verified vs. Assumed Runtime Properties

| Layer | Verified Current State | Missing / Assumed (Not Implemented) |
| :--- | :--- | :--- |
| **Web Hosting** | `server.js` serves static assets from `public/` (`scripts/publish_client.js` copies `client/dist/` into `public/`) | `publish_client.js` does not prune old assets: `steps/376/output.txt` shows 8+ stale hashed `.js`/`.css` files left in `public/assets/`. |
| **Process Model** | Single Node.js CommonJS process; CLI scripts (`run_pipeline.js`, `interactive.js`, `query_herb.js`, `demo.js`) run separately | No process manager, cluster mode, health probes separating liveness/readiness, or graceful Neo4j driver shutdown on `SIGINT`/`SIGTERM`. |
| **Operational DB** | None; Neo4j is read-only at runtime except offline seed/enrich scripts | No PostgreSQL / MongoDB / SQLite / Firestore for users, profiles, consultation history, label audits, or admin workflows. |
| **Offline Seed Graph** | `local_graph.js` parses `data/vedaai_seed.cypher` into memory for CLI scripts (`query_herb.js`, `demo.js`) | `server.js` has **no** `local_graph.js` runtime fallback; if Neo4j Aura is unreachable, backend AI safety checks fail or return incomplete graph context. |

---

## 2. Frontend Architecture

### 2.1 Stack, Build & Design Tokens (`client/`)

- **Dependencies (`client/package.json`):** React `^19.3.1`, TypeScript `~7.0.2`, Vite `^8.3.6`, `@tailwindcss/vite`, `lucide-react`, `clsx`, `tailwind-merge`. **Notable absence:** zero routing library (`react-router-dom`), zero form/validation library (`zod`/`react-hook-form`), zero API client/cache library (`@tanstack/react-query`), zero test runner.
- **Typography & Theme (`client/index.html`, `client/src/index.css`):** Loads `Lora` (editorial serif) and `DM Sans` (UI sans) and defines botanical design tokens (`--color-forest: #173D32`, `--color-deep-teal: #164B45`, `--color-warm-ivory: #F7F5EE`, `--color-pale-sage: #E8EFE8`, `--color-antique-gold: #B79A5B`, semantic clinical colors). Unused Vite boilerplate remains in `client/src/App.css`.
- **Linting & TS (`client/.oxlintrc.json`, `client/tsconfig.app.json`):** Strict TypeScript (`noUnusedLocals`, `noUnusedParameters`, `erasableSyntaxOnly`, `target: es2023`) and `oxlint` rules (`react/rules-of-hooks`, `react/only-export-components`).

### 2.2 Routing, Navigation & State Management

- **Navigation Mechanism (`client/src/App.tsx:28-194`, `client/src/types/veda.ts:1-14`):** Pure React `useState<ScreenId>('label-analyzer')`. `landing` and `auth` render standalone full-viewport pages; the other 11 `ScreenId` values (`overview`, `consultation`, `assessment`, `agents`, `history`, `interactions`, `label-analyzer`, `herbs`, `knowledge-graph`, `profile`, `admin`) render inside `<AppShell>`.
  - **Gap:** Refreshing the browser resets the user back to `label-analyzer`, destroys edited profiles/consultations/admin actions, and provides no deep links or browser Back/Forward history.
- **Role State (`client/src/App.tsx:31`):** `userRole` is `'Patient' | 'Clinical Reviewer'`, mutable client-side by `AuthScreen.tsx:86-100`, with **no route gating** — `AppShell.tsx:41-68` renders `Agent Transparency` and `Admin & Expert Portal` to all users including `'Patient'`.
- **State Ownership:**
  - Root (`App.tsx:30-83`): `profile` (initialized from `DEFAULT_PROFILE`), `backendOnline` (`GET /api/status`), `herbs` (`GET /api/herbs` merged onto `HERBS_CATALOG`), `consultations` (`SAMPLE_CONSULTATIONS`), `activeConsultation`.
  - Screen-local state: `ProductLabelAnalyzer.tsx` holds `auditResult`, `uploadedFile`, `expandedIds`, `activeBoxId`; `HealthProfileScreen.tsx` maintains a `draft` copy; `ConsultationScreen.tsx` maintains transient `followUps`, `feedback`, `attachedFile`; `AdminPortalScreen.tsx` maintains local mutable `items` initialized from `ADMIN_REVIEW_QUEUE`.

### 2.3 Shared UI Components (`client/src/components/`)

- `AppShell.tsx`: Persistent desktop sidebar (`w-[264px]`) + mobile slide-over drawer. Exposes `KG-RAG` tag (`line 103`), `"Neo4j Aura Online"` vs `"Sample Prototype Mode"` connection pill (`line 167`), and quick buttons to `landing` and `auth`.
- `PageHeader.tsx`: Standardized header (`eyebrow`, `Lora` `<h1>`, description, badge, action buttons).
- `SafetyBadge.tsx`: Semantic status pills mapping 8 states (`verified`, `flagged`, `caution`, `uncertain`, `unverified`, `insufficient_evidence`, `out_of_domain`, `blocked`).
- `StatePanels.tsx`: Reusable `LoadingPanel`, `EmptyPanel`, `ErrorPanel`, and `SampleNoticeBanner`. Missing: React `<ErrorBoundary>` and toast/notification queue.

### 2.4 Existing Frontend API Integration & Observed Bugs

Only **three** frontend files execute `fetch()` calls; the remaining screens consume static `mockData.ts` or in-memory state:

1. `client/src/App.tsx:44-78`: Calls `GET /api/status` and `GET /api/herbs` on mount. Merges live Neo4j herb rows with `HERBS_CATALOG` by lowercase `name`, backfilling `evidence_tier` (`'Classical + IMPPAT 2.0'`) and `safety_note` from `mockData.ts`. Any herb missing from `HERBS_CATALOG` lacks `safety_note`, `vipaka`, and `contraindicated_seasons` in `HerbExplorerScreen` because `GET /api/herbs` does not return `vipaka`, `guna`, `therapeutic_uses`, or contraindications.
2. `client/src/screens/ConsultationScreen.tsx:100-305`:
   - Calls `POST /api/chat` or `POST /api/consult-with-image` (Multipart `FormData`).
   - Calls `POST /api/follow-up` (`lines 245-260`) and `POST /api/feedback` (`lines 293-301`, silently swallows network errors at `lines 302-304`).
   - **Verified Defect #1 (`line 109`):** When `!backendOnline && !attachedFile`, any arbitrary user query clones `SAMPLE_CONSULTATIONS[0]` (Ginger/Acid Reflux) with the new query string, risking misleading sample safety warnings if a user mistakes offline fallback for real evaluation (partially mitigated by `SampleNoticeBanner`).
   - **Verified Defect #2 (`line 203`):** On **live** backend success, constructs `ConsultationRecord` with `agentStages: SAMPLE_CONSULTATIONS[0].agentStages`, completely discarding `json.trace` from `/api/chat` and `/api/consult-with-image`!
   - **Verified Defect #3 (`lines 178-179`):** Computes `evidenceQuality` and `retrievalCoverage` via client arithmetic heuristics instead of reading `json.result.evidence_confidence` or retrieval counts.
   - **Verified Defect #4 (`lines 138-151`):** Transmits only `prakriti`, `season`, and `conditions` — omitting `vikriti`, `allergies`, `medications`, `ageGroup`, `biologicalSex`, `dietaryPreference`, `avoidAlcoholExtracts`.
3. `client/src/screens/ProductLabelAnalyzer.tsx:145-223`:
   - Always posts `FormData` directly to `POST /api/label-audit` (even if `backendOnline` was false at startup) sending `image`, `prakriti`, `season`, `conditions` (again omitting `medications`, `allergies`, `vikriti`, `avoidAlcoholExtracts`).
   - Live response normalization (`lines 171-213`) produces `verified`, `unverified`, `uncertain` rows without `ocrBoxes` (so interactive bounding boxes disappear on uploaded real images) and without `dosage_printed` or `provenance` fields from `label_audit.js`.

---

## 3. Backend Architecture (`server.js`)

### 3.1 Server Initialization, Middleware & Error Handling

- **Framework:** Express `^5.3.0` (`package.json`), listening on `process.env.PORT || 4000` (with Neo4j driver initialized inside `server.js` alongside independent drivers inside `engine/agents.js`, `engine/vision_agent.js`, `engine/label_audit.js`, and `engine/followup_agent.js`).
- **Middleware:**
  - `cors()`: Unconfigured wildcard origin access.
  - `express.json({ limit: '15mb' })`: Oversized JSON body limit across all routes (needed only for `POST /api/scan` `imageBase64`).
  - `express.static(path.join(__dirname, 'public'))`: Serves compiled frontend.
  - `multer` (`memoryStorage()`, `fileSize: 10 * 1024 * 1024`, MIME filter `ALLOWED_IMAGE_TYPES` + `handleMulterError` error handler).
- **Error Handling & Validation:** No schema validation library. Routes perform ad-hoc truthy checks and wrap logic in `try/catch`, returning `res.status(500).json({ error: err.message })`, exposing internal Neo4j/Gemini/filesystem stack messages to clients.

### 3.2 Complete Inventory of Existing Endpoints (`server.js`)

| Route | Line Range | Method | Request Inputs | Internal Calls / DB Ops | Response & Exposure Notes |
| :--- | :--- | :--- | :--- | :--- | :--- |
| `/api/status` | `65–94` | `GET` | None | Neo4j node/edge counts; env check | **Leaks** Neo4j Aura `instanceId` (`process.env.AURA_INSTANCEID \|\| '[instance redacted]'`), counts, model strings. |
| `/api/herbs` | `99–123` | `GET` | None | Neo4j `MATCH (h:Herb)` + `PACIFIES`/`AGGRAVATES` | Returns subset of `:Herb` properties; omits `vipaka`, `guna`, `therapeutic_uses`, `CONTRAINDICATED_IN`, `TREATS`. |
| `/api/chat` | `128–182` | `POST` | JSON `{ query, prakriti, conditions, season }` | `buildVedaAIPipeline().invoke(...)` | Returns `{ success, durationMs, result, confidenceScore, trace }`. **Exposes full `trace`** (`canonicalEntities`, `retrievalPlan`, `agentExecutions`, `proponentDraft`, `opponentVerdict`, `opponentFlags`, `graphFacts`). |
| `/api/scan` | `188–214` | `POST` | Multipart `image` OR JSON `imageBase64` | `visionAgent.analyzeImage(...)` | Returns `{ success, scan }`. Unauthenticated; runs multimodal Gemini + Neo4j check. |
| `/api/consult-with-image` | `220–302` | `POST` | Multipart `image` + `{ query, prakriti, conditions, season }` | `visionAgent.analyzeImage(...)` -> Out-of-domain gate -> `pipeline.invoke(...)` | Stops before pipeline if `OUT_OF_DOMAIN`; otherwise injects `detected_herbs` into query and returns full `trace`. |
| `/api/follow-up` | `308–329` | `POST` | JSON `{ followUpQuery, consultationContext, history }` | `handleClinicalFollowUp(...)` | Direct Neo4j herb fact lookup + Gemini JSON (or deterministic heuristic fallback). |
| `/api/label-audit` | `336–381` | `POST` | Multipart `image` + `{ prakriti, season, conditions }` | `labelAuditAgent.auditLabel(...)` | Defaults `prakriti: 'Tridoshic'`, `season: 'Hemanta'`. Returns `{ success, durationMs, extraction, ingredients, auditedIngredients, summary }`. |
| `/api/feedback` | `387–414` | `POST` | JSON `{ query, verdict, feedback, notes }` | `fs.appendFileSync` to `data/clinical_feedback.jsonl` | Unauthenticated synchronous file append; no payload size/type validation beyond Express 15 MB limit. |

### 3.3 Missing Backend Layers

- **No Controller / Service / Repository layering:** `server.js` directly mixes HTTP parsing, Neo4j queries, and file writes.
- **No AuthN / AuthZ middleware:** Zero JWT verification, cookie sessions, API keys, or role decorators.
- **No Connection Lifecycle Governance:** At least 5 separate `neo4j.driver(...)` instances are created across modules; none share a central pool (`db/neo4j.js`) and HTTP server shutdown does not close open drivers.

---

## 4. AI Orchestration Architecture (`engine/` & `prompts/`)

### 4.1 LLM Client (`engine/llm_client.js`) & Prompt Registry (`prompts/`)

- **`LLMClient` singleton (`engine/llm_client.js:1-107`):** Wraps `@google/generative-ai` (`^0.24.1`).
  - Configured fallback chain: `['gemini-3.5-flash-lite', 'gemini-flash-lite-latest']`.
  - `loadPrompt(category, version='v1')` reads `prompts/<category>/<version>.txt` from disk. Prompt files exist for: `entity_extractor/v1.txt`, `proponent/v1.txt`, `opponent/v1.txt`, `judge/v1.txt`, `vision_agent/v1.txt`, `label_audit/v1.txt`. (Note: **Stage 2 Retrieval Planner** and **Follow-Up Agent** use inline hardcoded prompts inside `engine/agents.js` and `engine/followup_agent.js` rather than versioned files under `prompts/`!)
  - `generateText()` uses `temperature: 0.1`, `maxTokens: 300`; `generateJSON()` sets `responseMimeType: 'application/json'` and retries up to **3 rounds** with `1500ms * attempt` backoff on transient errors (`500`, `502`, `503`, `504`, `429`, `RESOURCE_EXHAUSTED`).

### 4.2 Main LangGraph Workflow (`engine/pipeline.js`, `engine/state.js`, `engine/agents.js`)

`buildVedaAIPipeline()` compiles a **strictly linear** LangGraph `StateGraph(VedaAIState)`:
```
START -> entity_extractor -> cypher_builder -> proponent -> opponent -> judge -> output_formatter -> END
```
> **Verified Discrepancy vs. Documentation:** Although `VedaAI_Phase5_Empirical_Benchmarking_Report.md:29` mentions `"Dynamic Early-Exit"`, `engine/pipeline.js` contains zero conditional edges (`addConditionalEdges` is not used). All 6 nodes always execute sequentially; `general_inquiry` handling occurs via branching logic inside nodes.

`VedaAIState` (`engine/state.js:1-87`) carries: `raw_query`, `user_profile`, `canonical_entities`, `graph_facts`, `graph_available`, `proponent_draft`, `opponent_verdict`, `opponent_flags`, `agent_trace`, `retrieval_plan`, `judge_certainty`, `final_response`, `confidence_score`.

#### Stage-by-Stage Execution (`engine/agents.js`)
1. **Agent 1 — Entity Extractor (`entityExtractorNode`, `prompts/entity_extractor/v1.txt`):** Normalizes herb synonyms (e.g., `Adrak/Sonth -> Ginger`, `Ashwagandha -> Indian Ginseng`), extracts `symptoms`, `query_season`, `patient_prakriti`, `patient_conditions`, and classifies `query_intent` (`general_inquiry | symptom_recommendation | herb_safety_check`), merging `user_profile`.
   - **Gap:** Ignores patient `medications`, `allergies`, `vikriti`, and `avoidAlcoholExtracts` because `user_profile` schema only passes `prakriti`, `chronic_conditions`, `current_season`.
2. **Agent 2 — Hybrid Retrieval Planner (`cypherQueryBuilderNode`, inline prompt + `engine/cypher_builder.js` + `engine/vector_store.js`):**
   - Uses inline LLM call to translate user query/entities into `graph_symptom_terms` and `vector_query`.
   - Executes `Promise.all([builder.fetchGraphContext(...), vectorStore.search(vectorQuery, 5)])`.
   - `CypherQueryBuilder` runs parameterized Cypher across `:Herb`, `:Dosha`, `:Season`, `:Condition` (`getHerbDetails`, `getHerbDoshaRelations`, `getSeasonDominance`, `getConditionAssociations`, `getSeasonalContraindications`, `findSafeAlternatives`, `getHerbsForSymptoms` via static `termMap` + `[:TREATS]` + `therapeutic_uses` `CONTAINS`).
3. **Agent 3 — Proponent Agent (`proponentNode`, `prompts/proponent/v1.txt`):** Formulates Ayurvedic pharmacological rationale (`SUPPORTS | NEUTRAL | INSUFFICIENT_DATA`) using only supplied Neo4j facts and vector passages; explicitly instructed not to fabricate Samhita verse numbers or attribute graph summaries to primary texts.
4. **Agent 4 — Adversarial Safety Validator (`graphSafetyAudit` + `opponentNode`, `prompts/opponent/v1.txt`):**
   - **Deterministic Graph Guard (`graphSafetyAudit`):** Evaluates `contraindications` and `doshaRelations` (`AGGRAVATES`) against season `dominant_dosha`, condition `associated_dosha`, and `patient_prakriti`, deterministically generating flags (`SEASONAL_CONTRAINDICATION_DETECTED`, `SEASONAL_DOSHA_AMPLIFICATION_*`, `MORBIDITY_CLASH_*`, `CONSTITUTIONAL_CLASH_*`, `UNSAFE_CANDIDATES_FILTERED`).
   - Merges LLM flags (`prompts/opponent/v1.txt`) with deterministic flags and enforces status `UNCATALOGED | VERIFIED | FLAGGED` so LLM hallucinations cannot suppress graph contraindications.
5. **Agent 5 — Clinical Arbitrator (`judgeNode`, `prompts/judge/v1.txt`):** Synthesizes verdict, `summary_message`, `risk_explanation`, `suggested_alternatives`, `graph_evidence_summary`, `judge_certainty`, with deterministic safety overrides:
   - `general_inquiry` -> `"SYSTEM READY — AYURVEDIC CLINICAL ADVISOR"`
   - `herb_safety_check` + `UNCATALOGED` -> `"SUBSTANCE NOT IN KNOWLEDGE BASE"`
   - `symptom_recommendation` + non-empty `safeCandidates` -> `"CLINICALLY INDICATED — RECOMMENDED HERBS"`
   - Empty `safeCandidates` -> `"CAUTION_REQUIRED"`
   - Non-empty `opponent_flags` -> `"UNSAFE — DO NOT RECOMMEND"`
6. **Confidence Fusion (`outputFormatterNode` & `calculateEmpiricalConfidence`):**
   $$\text{Confidence} = 0.40 \cdot S_{\text{graph}} + 0.35 \cdot S_{\text{vector}} + 0.25 \cdot S_{\text{LLM}}$$
   - `S_graph`: base `0.9` if direct `treats` or `herbDetails` else `0.5`, minus `0.15 * flags.length`, clamped `[0.2, 1.0]`. (Note: When safety flags trigger, `S_graph` decreases, which slightly *reduces* final confidence on flagged unsafe cases rather than keeping certainty high on proven hazards!)
   - `S_vector`: top `similarityScore ?? 0.65`.
   - `S_LLM`: `clamp01(judgeCertainty, 0.85)` clamped `[0.1, 1.0]`.

### 4.3 Standalone Agents (Outside Main `StateGraph`)

- **Multimodal Vision Agent (`engine/vision_agent.js`, `prompts/vision_agent/v1.txt`):** Uses broader model fallback `['gemini-flash-lite-latest', 'gemini-3.5-flash-lite', 'gemini-3-flash-preview', 'gemini-2.5-flash-lite']`, runs `verifyGraphMembership()` in Neo4j (`VERIFIED_CANONICAL_HERBS | UNVERIFIED_IN_KNOWLEDGE_BASE | OUT_OF_DOMAIN`).
  - **Critical Reliability/Safety Defect:** Contains a naive UTF-8 byte heuristic fallback (`textPreview.includes('USB')`, etc.) that parses raw PNG/JPEG binary bytes when Gemini fails/is unconfigured.
- **Label Audit Agent (`engine/label_audit.js`, `prompts/label_audit/v1.txt`):** `extractIngredients()` -> `verifyIngredients()` (splits into `verified`, `unverified`, `uncertain`) -> `runSafetyAudit()` (checks `CONTRAINDICATED_IN`, `SEASONAL_DOSHA_CLASH`, `CONDITION_CLASH`, `CONSTITUTIONAL_CLASH`).
  - **Verified Gaps:** Defaults missing context to `prakriti: 'Tridoshic'`, `season: 'Hemanta'`; ignores OCR bounding boxes; ignores dosage thresholds (`dosage_printed` does not exist in `label_audit/v1.txt`); ignores allergies and prescription drugs (`Drug–Herb` interactions).
- **Clinical Follow-Up Agent (`engine/followup_agent.js`):** Queries Neo4j for `herbFacts`, calls `llm.generateJSON()` with an inline prompt, and falls back to keyword string-matching heuristics (`dosage_and_anupana`, `pathya_apathya`, `precautions`, `suggested_followups`) if Gemini fails.

---

## 5. Database and Data-Flow Architecture

### 5.1 Neo4j Knowledge Graph (`data/vedaai_seed.cypher`, `scripts/generate_cypher.js`, `scripts/enrich_neo4j_aura.js`)

| Entity / Relation | Verified Seed Count (`vedaai_seed.cypher`) | Properties / Edges Verified | Critical Schema Gaps |
| :--- | :--- | :--- | :--- |
| `:Herb` | **25 nodes** (fixed list `TARGET_HERBS` in `generate_cypher.js:13-39`) | `name`, `botanical_name`, `sanskrit_name`, `common_name`, `rasa`, `virya`, `vipaka`, `guna`, `family`, `system_of_medicine`, `therapeutic_uses`, `synonyms`, `source` | Only 25 out of 4,154 plants in `Plant_Information_IMPPAT.tsv`; missing compound-level nodes (e.g., glycyrrhizin, piperine), dosage thresholds, pregnancy flags, safety evidence tiers. |
| `:Dosha` | **3 nodes** (`Vata`, `Pitta`, `Kapha`) | `name`, `season_dominance`, `qualities` | Static. |
| `:Season` | **6 nodes** (`Vasanta`, `Grishma`, `Varsha`, `Sharada`, `Hemanta`, `Shishira`) | `name`, `english`, `months` + `[:DOMINANT_IN]` -> `:Dosha` | Static. |
| `:Condition` | **12 nodes** (`Acid Reflux`, `GERD`, `Inflammation`, `Anxiety`, `Arthritis`, `Constipation`, `Obesity`, `Diabetes`, `Respiratory Issues`, `Skin Disorders`, `Insomnia`, `Hypertension`) | `name` + `[:ASSOCIATED_WITH {strength}]` -> `:Dosha` | Missing pregnancy, renal/hepatic impairment, bleeding disorders, thyroid disease. |
| **Herb Edges** | `AGGRAVATES` / `PACIFIES` (line `438–474`), `CONTRAINDICATED_IN` (4 herbs: Ginger, Long Pepper, Black Pepper, Aloe vera at `477–480`), `TREATS` (`483–579` + duplicates) | `strength`, `reason`, `source` | `scripts/enrich_neo4j_aura.js` adds `TREATS` edges directly in Aura (e.g., `Respiratory Issues`, `Acid Reflux`, `GERD`, `Skin Disorders`), causing live Aura to drift from `vedaai_seed.cypher` & `local_graph.js`. |
| `:Drug` / `:Compound` | **0 nodes** | **DO NOT EXIST in Neo4j** | `INTERACTS_WITH` edges shown in `DrugHerbCheckerScreen` & `KnowledgeGraphScreen` exist **only** in frontend `mockData.ts`. |

Indexes created in `vedaai_seed.cypher:582-586`: `herb_name_idx`, `herb_botanical_idx`, `dosha_name_idx`, `season_name_idx`, `condition_name_idx`.

### 5.2 Vector Store & IMPPAT Source Files (`data/` & `engine/vector_store.js`)

- **Raw IMPPAT 2.0 TSVs (`data/`):**
  - `Plant_Information_IMPPAT.tsv` (4,155 lines, 541 KB)
  - `IMPPAT_TherapeuticUse_Plant_Association.tsv` (94,262 lines, 7.36 MB)
  - `IMPPAT_SingleHerbalFormulations.tsv` (542 lines, 304 KB — contains API formulation names, plant parts, and `References` ISBNs)
  - **Gap:** None of the 541 single-herbal formulations or 94k associations are loaded live at runtime beyond the 25 seeded herbs.
- **Embeddings Index (`data/classical_embeddings.json`, 1.01 MB, `scripts/seed_vector_store.js`, `engine/vector_store.js`):**
  - Generated via `gemini-embedding-001` (`dimensions: 3072`) from **25 graph-derived synthetic English summaries** generated via `local_graph.js` (`citationVerified: false`, `sourceType: "graph-derived-summary"`).
  - **Important Epistemic Fact:** `classical_embeddings.json` explicitly notes `"These are not primary-source quotations or verified Samhita passages"`.
  - **Performance Defect:** `vector_store.js` calls `fs.readFileSync(INDEX_PATH)` synchronously on **every** `search()`, re-parsing 1 MB of JSON and performing brute-force cosine math on the Node event loop.

### 5.3 Benchmark Reliability Caveat (`data/benchmark_results_ablation.json`)

- Inspection of `data/benchmark_results_ablation.json:11-12` and `VedaAI_Phase5_Empirical_Benchmarking_Report.md:24,31` verifies that the saved 20-query ablation file is marked:
  `"validityStatus": "UNVERIFIED: prior runner substituted verdicts after failures; saved trials do not indicate which outputs used fallbacks"` and `"sampleSelection": "First 10 contraindicated and first 10 safe items; not randomized"`.
- `scripts/run_ablation_benchmark.js` has since been updated to throw on errors and compute exact two-sided McNemar `pValue`, but a clean re-run over `benchmark_dataset_150.json` has not been saved into `benchmark_results_ablation.json`.

---

## 6. Mapping of All 12 Screens (+ Overview) to Backend Functionality

**Legend — Feature Classification:**  
1. **Fully implemented** (End-to-end UI + backend + real persistence/data)  
2. **Partially implemented** (Connected in part, missing persistence/fields/live updates, or degraded fidelity)  
3. **Not implemented** (UI absent or zero backend support)  
4. **Mocked or placeholder functionality** (Static `mockData.ts`, client-only state, or hardcoded simulations)

---

### Screen 01 — Landing Page (`b2064e8a77c248bc8fb948f12bdda573`)
- **React Page & Components:** `client/src/screens/LandingScreen.tsx`
- **Required Backend Endpoints:** Optional `GET /api/v1/public/catalog-stats` (sanitized herb count & methodology overview; zero infra IDs).
- **Existing Backend Endpoints:** None called.
- **Services / DB / AI Involved:** None (purely marketing/navigation entry screen).
- **Feature Classification:**
  - *Value proposition, 5-stage pipeline overview & disclaimers:* **Fully implemented** (static UI)
  - *Platform entry & navigation (`Enter Platform`, `Sign In`, `Launch Clinical Consultation`):* **Fully implemented** (React state route switches)
  - *Live platform metrics (herb count, monograph version):* **Not implemented** (hardcoded copy `"IMPPAT 2.0 & Charaka Samhita"`, `"5 Stages"`)
- **UI vs. Backend Mismatches:** Describes classical Charaka Samhita grounding, whereas vector corpus currently holds synthetic graph-derived summaries (`citationVerified: false`).

---

### Screen 02 — Authentication (`634129d23a4545fa957b540c6c15d008`)
- **React Page & Components:** `client/src/screens/AuthScreen.tsx`
- **Required Backend Endpoints:** `POST /api/v1/auth/register`, `POST /api/v1/auth/login`, `POST /api/v1/auth/refresh`, `POST /api/v1/auth/logout`, `POST /api/v1/auth/forgot-password`, `GET /api/v1/auth/me`.
- **Existing Backend Endpoints:** **None.**
- **Services / DB / AI Involved:** Requires User repository (DB), password hashing (`argon2`/`bcrypt`), JWT/session store, RBAC middleware. None exist.
- **Feature Classification:**
  - *Sign-in / Register UI & `@` check:* **Mocked or placeholder functionality** (pre-filled `'ananya.sharma@vedaai-demo.org'`, accepts any password and any email containing `'@'`, updates local React `userRole` only; explicit notice at line 154 confirms prototype status)
  - *Password recovery / Forgot password flow:* **Not implemented** (absent from `AuthScreen.tsx` even though requested in Stitch specs)
  - *Real authentication, token issuance & `'Admin'` role distinction:* **Not implemented** (only `'Patient'` and `'Clinical Reviewer'` exist in React UI)
- **UI vs. Backend Mismatches:** Stitch specs call for real registration validation, password recovery, and role-based routing; backend has zero identity concepts.

---

### Screen 03 — Main Consultation Dashboard (`c0b2d2c879c44672b959a4de081ad910`)
- **React Page & Components:** `client/src/screens/ConsultationScreen.tsx` (using `PageHeader`, `SafetyBadge`, `StatePanels`)
- **Required Backend Endpoints:** `POST /api/v1/consultations`, `POST /api/v1/consultations/:id/follow-ups`, `POST /api/v1/consultations/:id/feedback`.
- **Existing Backend Endpoints:** `POST /api/chat`, `POST /api/consult-with-image`, `POST /api/follow-up`, `POST /api/feedback`.
- **Services / DB / AI Involved:** `engine/pipeline.js` (`entity_extractor`, `cypher_builder`, `proponent`, `opponent`, `judge`, `output_formatter`), `vision_agent.js`, `followup_agent.js`, Neo4j `:Herb/:Dosha/:Season/:Condition`, `classical_embeddings.json`, `clinical_feedback.jsonl`.
- **Feature Classification:**
  - *Text consultation against LangGraph + Neo4j + Vector RAG:* **Partially implemented** (works live via `POST /api/chat`, but lacks DB persistence, drops profile allergies/medications/vikriti/alcohol preference, and falls back silently to `SAMPLE_CONSULTATIONS` when `!backendOnline`)
  - *Image + text multimodal consultation:* **Partially implemented** (works live via `POST /api/consult-with-image` with `OUT_OF_DOMAIN` gate, but omits persistent attachment storage and detailed ingredient-level label audit)
  - *Follow-up Q&A (`Anupana`, `Pathya/Apathya`, precautions):* **Partially implemented** (`POST /api/follow-up` works via Gemini + heuristic fallback, but chat turns live only in component state and wipe on screen change/new consultation)
  - *Clinician/User feedback submission:* **Partially implemented** (`POST /api/feedback` appends unvalidated JSONL without consultation ID link or user attribution; silently ignores errors on client)
  - *Safer alternatives, warnings & navigation to Assessment/Agents:* **Partially implemented** (verdicts & alternatives render from live response, **but** line 203 attaches mock `SAMPLE_CONSULTATIONS[0].agentStages` to live runs)
- **UI vs. Backend Mismatches:** UI displays `Agent Trace` link expecting live trace, but `ConsultationScreen.tsx:203` overwrites `agentStages` with hardcoded mock data.

---

### Screen 04 — Health Profile (`c64c84e08a08430f83539b7c9ae92f8d`)
- **React Page & Components:** `client/src/screens/HealthProfileScreen.tsx`
- **Required Backend Endpoints:** `GET /api/v1/profile`, `PUT /api/v1/profile`, `PATCH /api/v1/profile/verify` (clinician verification).
- **Existing Backend Endpoints:** **None.**
- **Services / DB / AI Involved:** Currently stored in `App.tsx` React `profile` state only (`DEFAULT_PROFILE`). Subset `{ prakriti, season, conditions }` forwarded to `/api/chat`, `/api/consult-with-image`, `/api/label-audit`, `/api/follow-up`.
- **Feature Classification:**
  - *Interactive editing of Prakriti, Ritu, conditions, medications, allergies, dietary pref, alcohol flag, notes:* **Partially implemented** (rich form edits React state, **not persisted** to DB or `localStorage`)
  - *Patient-reported vs. Clinically-verified provenance distinction:* **Not implemented** (no field in `PatientProfile` type or UI tracks whether Prakriti/Vikriti/conditions are self-reported or BAMS-verified)
  - *Vikriti editor:* **Not implemented** in form (`PatientProfile` has `vikriti`, `DEFAULT_PROFILE` sets it, `HealthProfileScreen.tsx` has no input to edit `vikriti`!)
  - *Propagation of medications, allergies, age, sex, `avoidAlcoholExtracts` into AI safety checks:* **Not implemented** (frontend omits them from API payloads; AI agents/prompts ignore them)
- **UI vs. Backend Mismatches:** Banner promises `"Label audits, consultations, and interaction checks will immediately use this context"`, yet `DrugHerbChecker` ignores most fields except display text, `/api/chat` ignores medications/allergies/`avoidAlcoholExtracts`, and reload erases all edits.

---

### Screen 05 — AI Assessment Dashboard (`57bd7d2ce1724287a1b0aeec3a373023`)
- **React Page & Components:** `client/src/screens/AIAssessmentScreen.tsx`
- **Required Backend Endpoints:** `GET /api/v1/consultations/:id/assessment` (role-filtered assessment payload without raw Cypher for Patients).
- **Existing Backend Endpoints:** Indirectly fed from `ConsultationScreen`'s mapping of `POST /api/chat` / `/api/consult-with-image`.
- **Services / DB / AI Involved:** `judgeNode`, `opponentNode`, `cypher_builder.js`, `calculateEmpiricalConfidence`.
- **Feature Classification:**
  - *Verdict banner, priority safety warnings & supporting vs. contradicting columns:* **Partially implemented** (works for live mapped consultation + sample cases, **but** live records map generic `'Neo4j Aura + Hybrid RAG'` / `'Opponent Safety Agent'` strings without `cypherPath` or per-claim source citations)
  - *Disaggregated metrics (`Evidence Quality`, `Retrieval Coverage`, `Model Confidence`):* **Partially implemented** / **Mocked or placeholder functionality** for live cases (`ConsultationScreen.tsx:178-179` computes `evidenceQuality` and `retrievalCoverage` locally with fixed formulas/numbers `90 : 72` instead of using real backend coverage metrics)
  - *Missing information & uncertainty callouts:* **Partially implemented** (rich on mock `SAMPLE_CONSULTATIONS`, generic 1-line check on live responses at `ConsultationScreen.tsx:182-185`)
  - *Patient vs. Clinician Cypher abstraction:* **Not implemented** (renders `ev.cypherPath` directly to all users)

---

### Screen 06 — Evidence & Agent Transparency Panel (`a6a575b9980b485b8510ec764163db7e`)
- **React Page & Components:** `client/src/screens/AgentTransparencyScreen.tsx`
- **Required Backend Endpoints:** `GET /api/v1/consultations/:id/audit-trace` (Clinician / Admin scoped; abstracted plain-language reasoning summary for Patient).
- **Existing Backend Endpoints:** `POST /api/chat` & `/api/consult-with-image` return raw `trace`.
- **Services / DB / AI Involved:** `entityExtractorNode`, `cypherQueryBuilderNode`, `proponentNode`, `opponentNode`, `judgeNode` populate `state.agent_trace`.
- **Feature Classification:**
  - *5-stage stepper (`Entity Extractor`, `Retrieval Planner`, `Proponent`, `Opponent`, `Judge`) with generated vs. verified tag separation:* **Mocked or placeholder functionality** in UI (`ConsultationScreen.tsx:203` forces `SAMPLE_CONSULTATIONS[0].agentStages`, and `AgentTransparencyScreen.tsx:28-30` falls back to `SAMPLE_CONSULTATIONS[0].agentStages`; real `trace.agentExecutions` from backend is **never rendered**!)
  - *Backend multi-agent trace capture (`trace.agentExecutions`, `proponentDraft`, `opponentFlags`):* **Partially implemented** in `agents.js` / `server.js` (missing per-stage `latencyMs`, structured retrieval chunk refs, and role-based redaction)
- **UI vs. Backend Mismatches:** Even though backend computes real `trace` data on `/api/chat`, frontend discards it and shows mock Ginger latencies (`310ms`, `245ms`, `620ms`, `540ms`, `410ms`).

---

### Screen 07 — Herb Explorer (`655b0363285c4ec7972a7cfcbb1e7cf1`)
- **React Page & Components:** `client/src/screens/HerbExplorerScreen.tsx`
- **Required Backend Endpoints:** `GET /api/v1/herbs` (paginated/filterable, full monograph fields), `GET /api/v1/herbs/:id`.
- **Existing Backend Endpoints:** `GET /api/herbs` (`server.js:99-123`).
- **Services / DB / AI Involved:** Neo4j `MATCH (h:Herb)` returning `name`, `botanical_name`, `sanskrit_name`, `virya`, `rasa`, `pacifies`, `aggravates`.
- **Feature Classification:**
  - *Herb list, search & Virya/Dosha client filtering:* **Partially implemented** (`App.tsx:55-75` loads live 25 herbs from `/api/herbs`, falls back to 15-herb `HERBS_CATALOG` if offline)
  - *Extended monograph metadata (`vipaka`, `therapeutic_uses`, `contraindicated_seasons`, `evidence_tier`, `safety_note`):* **Mocked or placeholder functionality** (sourced **only** from 15 hardcoded herbs in `mockData.ts:672-945`; `/api/herbs` does not query or return `vipaka`, `guna`, `therapeutic_uses`, `CONTRAINDICATED_IN`, or `evidence_tier`, leaving the remaining 10 Neo4j herbs without safety notes or therapeutic uses)
  - *Pagination / full IMPPAT 4,154-plant catalog:* **Not implemented** (only 25 Neo4j / 15 mock herbs)

---

### Screen 08 — Drug–Herb Interaction Checker (`eb3fe71330ae414987f1191ca101afcf`)
- **React Page & Components:** `client/src/screens/DrugHerbCheckerScreen.tsx`
- **Required Backend Endpoints:** `POST /api/v1/interactions/check`, `GET /api/v1/interactions/medications`, `GET /api/v1/interactions/herbs`.
- **Existing Backend Endpoints:** **None.**
- **Services / DB / AI Involved:** Zero backend or Neo4j support (`:Drug` nodes and `:INTERACTS_WITH` edges do not exist in Neo4j).
- **Feature Classification:**
  - *4-state epistemic UI (`documented`, `potential`, `no_known_interaction`, `insufficient_data`) & 5 curated pairs:* **Mocked or placeholder functionality** (driven 100% by `DRUG_HERB_INTERACTIONS` in `mockData.ts:1184-1260`; all other combinations return a hardcoded `'insufficient_data'` object)
  - *Herb dropdown synced to live 25 Neo4j herbs:* **Not implemented** (line 29 reads static `HERBS_CATALOG` rather than live `herbs` prop)
  - *Multi-medication / multi-herb profile batch screening & real pharmacological DB/KG:* **Not implemented** (merely prints `profile.medications` text string at line 163 without checking them)

---

### Screen 09 — Product Label Analyzer (`2ca7df95cec54ae3b41aed35649481cc`)
- **React Page & Components:** `client/src/screens/ProductLabelAnalyzer.tsx`
- **Required Backend Endpoints:** `POST /api/v1/label-audits`, `GET /api/v1/label-audits/:id`.
- **Existing Backend Endpoints:** `POST /api/label-audit` (`server.js:336-381`).
- **Services / DB / AI Involved:** `engine/label_audit.js` (`LabelAuditAgent`, `prompts/label_audit/v1.txt`) + Neo4j `:Herb/:Season/:Condition/:Dosha`.
- **Feature Classification:**
  - *Image upload (PNG/JPEG/WebP <= 10 MB), OCR extraction, Out-of-Domain gate (`is_supplement_label`), Verified/Unverified/Uncertain separation, Neo4j safety audit against `prakriti`/`season`/`conditions`:* **Fully implemented** core pipeline via `POST /api/label-audit` (minus persistence)
  - *Patient allergy, prescription drug interaction & `avoidAlcoholExtracts` audit:* **Not implemented** (`/api/label-audit` only receives and evaluates `prakriti`, `season`, `conditions`)
  - *Interactive OCR bounding-box overlay (`ocrBoxes`), dosage strength extraction & monograph provenance citations:* **Mocked or placeholder functionality** (`ocrBoxes`, `dosage_printed`, and `provenance` exist **only** on `SAMPLE_LABEL_AUDITS` presets in `mockData.ts`; live `label_audit.js` returns none of them)
  - *Saved label audit history:* **Not implemented**

---

### Screen 10 — Knowledge Graph Explorer (`a6e669a6eb1e4a25af30911b5c0d0fc5`)
- **React Page & Components:** `client/src/screens/KnowledgeGraphScreen.tsx`
- **Required Backend Endpoints:** `GET /api/v1/knowledge-graph/subgraph`, `GET /api/v1/knowledge-graph/nodes/:id/neighbors`, `GET /api/v1/knowledge-graph/search`.
- **Existing Backend Endpoints:** **None** (only flat herb list at `GET /api/herbs`).
- **Services / DB / AI Involved:** Zero backend calls.
- **Feature Classification:**
  - *Interactive SVG canvas, node-type toggles (`Herb`, `Dosha`, `Season`, `Condition`, `Drug`), zoom, node/edge inspection:* **Mocked or placeholder functionality** (reads static hardcoded 11 `KG_NODES` and 13 `KG_EDGES` from `mockData.ts:1262-1290`, including fake `m-furosemide` `:Drug` node and `INTERACTS_WITH` edge not in Neo4j)
  - *Live Neo4j subgraph search/traversal & edge provenance explorer:* **Not implemented**

---

### Screen 11 — Consultation History (`e93a2cd089c642df943d111dfaab2715`)
- **React Page & Components:** `client/src/screens/ConsultationHistoryScreen.tsx`
- **Required Backend Endpoints:** `GET /api/v1/consultations`, `GET /api/v1/consultations/:id`, `DELETE /api/v1/consultations/:id`.
- **Existing Backend Endpoints:** **None.**
- **Services / DB / AI Involved:** Reads `consultations` state in `App.tsx` initialized from 3 `SAMPLE_CONSULTATIONS`.
- **Feature Classification:**
  - *Client search & status filtering (`All`, `Flagged`, `Caution`, `Verified`), reopening into Consultation/Assessment:* **Partially implemented** (works for sample + in-memory session runs only)
  - *Database persistence, pagination, multi-user tenant isolation, export/archive:* **Not implemented** (history vanishes on browser reload)

---

### Screen 12 — Admin & Expert Dashboard (`c5753b26be4141dd9cafde42e7a08add`)
- **React Page & Components:** `client/src/screens/AdminPortalScreen.tsx`
- **Required Backend Endpoints:** `GET /api/v1/admin/reviews`, `PATCH /api/v1/admin/reviews/:id`, `GET /api/v1/admin/ontology/versions`, `GET /api/v1/admin/telemetry`, `GET /api/v1/admin/feedback`.
- **Existing Backend Endpoints:** None dedicated (`AdminPortalScreen` makes **zero** API calls; `POST /api/feedback` only writes `data/clinical_feedback.jsonl`).
- **Services / DB / AI Involved:** Reads `ADMIN_REVIEW_QUEUE` (`mockData.ts:1292-1326`) and mutates React state on confirmation modal.
- **Feature Classification:**
  - *Review queue UI & two-step confirmation dialog:* **Mocked or placeholder functionality** (changes vanish on reload; `cypherImpact` never executes or persists)
  - *Ontology/Prompt release versions (`v2.4.0`) & monitoring telemetry:* **Mocked or placeholder functionality** (`AdminPortalScreen.tsx:147-193` hardcodes `"Connected ([instance redacted])"`, `"25 Herb nodes · 12 Condition nodes · 5 Indexes"`, `"100%"`, `"data/clinical_feedback.jsonl"`)
  - *Actual Neo4j mutation governance, feedback triage & RBAC admin lock:* **Not implemented**

---

### Screen 13 (Additional Implemented Workspace Screen) — Overview (`OverviewScreen.tsx`)
- **React Page & Components:** `client/src/screens/OverviewScreen.tsx` (in `AppShell` navigation, outside the 12-screen Stitch list)
- **Existing Backend Integration:** Indirectly receives `herbCount` (`GET /api/herbs` or mock 15) and `backendOnline` (`GET /api/status`).
- **Feature Classification:** **Partially implemented** (combines live status/herb count with hardcoded `"179+ semantic safety edges"` at line 98 and mock/session `consultations`).

---

## 7. Implementation Gap Analysis & Role-Based Information Abstraction

### 7.1 Technical & Clinical Capability Gaps

1. **Zero Operational Persistence Layer:** Without a relational/document DB (PostgreSQL / SQLite / MongoDB), Authentication, Health Profile, Consultation History, Label Audit History, and Admin Review Queue cannot function beyond a single browser tab session.
2. **Incomplete Clinical Profile Consumption:** `PatientProfile` captures `vikriti`, `medications`, `allergies`, `ageGroup`, `biologicalSex`, `dietaryPreference`, `avoidAlcoholExtracts`, but backend routes only accept `{ prakriti, season, conditions }`. Notably, `Asava/Arishta` alcoholic formulation avoidance (`avoidAlcoholExtracts`) is never checked by `label_audit.js` even though `prompts/vision_agent/v1.txt:7` recognizes `Asava/Arishta`!
3. **Unbacked Pharmacovigilance & Knowledge Graph Modules:** `Drug–Herb Interaction Checker` and `Knowledge Graph Explorer` exist only in `mockData.ts`. Neo4j lacks `:Drug`, `:Compound`, and `:INTERACTS_WITH` entities/edges.
4. **Vector Grounding vs. Primary Texts:** `seed_vector_store.js` embeds 25 graph-derived summaries (`citationVerified: false`) rather than real Ayurvedic classical verses or pharmacopoeia citations, and `vector_store.js` reads/parses 1 MB synchronously on every query.
5. **Live Agent Transparency Disconnected:** `ConsultationScreen.tsx:203` discards real backend `trace` payloads and injects mock stages.
6. **Vision Reliability Fallback Risk:** `vision_agent.js` inspects raw image binary bytes for ASCII substrings (`'USB'`, etc.) when Gemini fails, risking false classification on corrupted or out-of-domain binary files.
7. **Benchmark Validation Pending:** `data/benchmark_results_ablation.json` carries `validityStatus: "UNVERIFIED"` from the previous buggy runner and needs clean re-execution.

### 7.2 Information Abstraction & Role Exposure Audit (Mandatory Architectural Requirement)

Currently, VedaAI exposes **backend implementation internals directly to patients** across both API responses and UI components:

| Exposed Internal Artifact | Verified Location(s) | Current Behavior | Security / UX Risk |
| :--- | :--- | :--- | :--- |
| **Raw `trace` object** (`agentExecutions`, Gemini model IDs `gemini-3.5-flash-lite`, `retrievalPlan`, `proponentDraft`, raw `graphFacts`) | `server.js` (`POST /api/chat`, `POST /api/consult-with-image`) | Returned in HTTP JSON to every caller | Exposes LLM architecture, prompt/planner tuning, internal graph dump to patients & unauthenticated clients |
| **Raw Cypher syntax & pattern notation** | `ProductLabelAnalyzer.tsx:993-1012`, `AIAssessmentScreen.tsx:191-194,228-231`, `DrugHerbCheckerScreen.tsx:204-209`, `KnowledgeGraphScreen.tsx:345-357`, `AgentTransparencyScreen.tsx:199` | Displays `(Ginger)-[:AGGRAVATES]->(Pitta)` & `MATCH (h:Herb...` inside patient views | Confuses patients with database query syntax instead of plain-language clinical explanations |
| **Neo4j Aura Instance ID (`[instance redacted]`)** | `server.js` (`GET /api/status`), `vision_agent.js`, `followup_agent.js`, `AdminPortalScreen.tsx:172` | Exposed in public API & hardcoded in UI | Leaks cloud infrastructure identifier and uses instance ID as username fallback |
| **Infra status & stack jargon** | `AppShell.tsx:103,167` (`KG-RAG`, `"Neo4j Aura Online"`), `AdminPortalScreen.tsx:174,191` (`"data/clinical_feedback.jsonl"`, `"5 Indexes"`) | Visible in main sidebar to Patients | Leaks storage paths, vector engine internals (`3072-d`, cosine), and graph topology to end users |
| **Raw exception messages** | `server.js` `res.status(500).json({ error: err.message })` | Direct JS/Neo4j/Gemini errors returned | May reveal URIs, rate limits, file paths, or driver stack details |

#### Target Role-Based Information Abstraction Matrix

Backend APIs must project different DTOs by authenticated role **on the server** — patients must never merely have fields hidden via CSS on the client.

| Information Category | **Patient Interface** | **Clinician Interface (`Clinical Reviewer` / BAMS)** | **Administrator Interface (`Admin`)** |
| :--- | :--- | :--- | :--- |
| **Clinical Verdict & Safety Warnings** | **Full visibility:** Plain-language verdict (`Safe`, `Caution`, `Avoid / Flagged`, `Not Enough Evidence`), high-priority risk callouts, safer alternatives | **Full visibility + detail:** Mechanisms, severity grade, cumulative `Ushna`/`Sheeta` load, comorbidity collision summary | Read-only anonymized aggregate counts only (no unsolicited PHI browsing) |
| **Uncertainty & Missing Data** | **Full visibility:** Clear gaps (`"Missing dose form"`, `"No interaction trials found — absence of flag ≠ safe"`) | **Full visibility + epistemic tier:** Evidence tier (`Clinical Monograph` vs. `Traditional Textual Only`), retrieval gap flags | Retrieval failure rate / uncataloged ingredient frequency metrics |
| **Evidence & Sources** | Human-readable attributions (`"IMPPAT 2.0 Botanical Profile"`, `"Seasonal Safety Rule: Summer / Grishma"`), supporting vs. caution bullets | Source IDs, structured relationship chains formatted clinically (e.g., *Ginger → Aggravates → Pitta (4/5)*), **plus** optional Cypher path drawer | Source ingestion metadata, TSV/dataset sync provenance |
| **Multi-Agent Reasoning** | Abstracted into plain-language **"Benefits Considered vs. Safety Checks vs. Final Rationale"**; **hide** agent JSON, model IDs, latencies, cosine scores | **Scoped Agent Transparency:** Proponent vs. Opponent disagreement summary, Judge arbitration override rationale, disaggregated Evidence/Coverage metrics | Full `AgentStage` execution timings, model fallback triggers (`gemini-3.5-flash-lite` vs `flash-lite-latest`), error traces |
| **Raw Cypher Queries & Schema Impact** | **Hidden completely** | **Optional / Read-only:** Standardized traversal path view in Knowledge Graph Explorer | **Full access:** Cypher impact previews, index status, schema version governance |
| **System Telemetry, DB IDs & Feedback Logs** | **Hidden completely** (show simple `"Clinical Safety Service Ready"` status) | Limited service health badge (`"Knowledge Base Online"`) | **Full access:** Aura instance health, node/edge/index counts, rate-limit metrics, prompt/ontology versions, moderation of `clinical_feedback` |

---

## 8. Security and Access-Control Gaps

1. **Missing Authentication & Identity Lifecycle (Critical):** Zero user store, zero password hashing, zero signed tokens/cookies (`AuthScreen.tsx` allows instant client-side impersonation of `Clinical Reviewer`).
2. **Broken / Absent Authorization & RBAC (Critical):** No Express auth middleware. Any unauthenticated client can hit `/api/chat`, `/api/label-audit`, `/api/feedback`, or `/api/status`. Switching `userRole` in React exposes `AdminPortalScreen` and `AgentTransparencyScreen` to any visitor.
3. **API DoS & Quota Exhaustion Risk (High):** Unauthenticated image upload (`/api/scan`, `/api/consult-with-image`, `/api/label-audit`) and LLM endpoints trigger multi-turn Gemini API calls with **zero rate limiting** (`express-rate-limit` absent) and a global **15 MB JSON body limit** (`server.js`). File uploads validate only `req.file.mimetype` header string, not file magic bytes (`PNG`/`JPEG`/`WebP` headers).
4. **Input Validation & Log Tampering (High):** `POST /api/feedback` writes arbitrary `req.body` strings synchronously (`fs.appendFileSync`) into `data/clinical_feedback.jsonl` without length limits, sanitization, or rate throttling, enabling disk exhaustion or JSONL log injection. All endpoints lack Zod/Joi schema validation. (Note: Existing Neo4j Cypher queries in `cypher_builder.js`, `label_audit.js`, `vision_agent.js`, `followup_agent.js`, `server.js` properly use `$param` bindings rather than string concatenation — keep this invariant!)
5. **Sensitive Infrastructure & AI Trace Leakage (Medium-High):**
   - `process.env.AURA_INSTANCEID || '[instance redacted]'` exposed in `GET /api/status`; `'[instance redacted]'` also hardcoded as default `NEO4J_USERNAME` in `vision_agent.js`, `followup_agent.js`, benchmark runner, and `AdminPortalScreen.tsx:172`.
   - Raw `err.message` returned in HTTP 500 JSON across all routes.
   - `CORS` allows `*` (`app.use(cors())`), exposing endpoints to arbitrary browser origins if cookies are later introduced. Missing security headers (`helmet`, strict CSP, `X-Content-Type-Options`).
6. **PHI / Sensitive Health Data Handling (High):** `PatientProfile` (name, age, sex, chronic diseases, medications, allergies, notes) and consultation queries travel over unauthenticated local/dev HTTP without encryption-at-rest, retention policy, consent metadata, or per-user access scoping.

---

## 9. Recommended API Contracts (Target `/api/v1`)

All protected endpoints require `Authorization: Bearer <accessToken>` (or `HttpOnly; SameSite=Lax; Secure` session cookie). Standard error envelope: `{ "success": false, "error": { "code": "...", "message": "...", "requestId": "..." } }`.

### 9.1 Authentication & Profile
- `POST /api/v1/auth/register` -> `{ email, password, fullName, requestedRole: 'patient' | 'clinician' }` (`clinician`/`admin` elevated only after verification; self-signup creates `'patient'`) -> `201 { user, accessToken }`
- `POST /api/v1/auth/login` -> `{ email, password }` -> `200 { user: { id, role, fullName }, accessToken }`
- `POST /api/v1/auth/refresh` / `POST /api/v1/auth/logout` / `POST /api/v1/auth/forgot-password`
- `GET /api/v1/auth/me` -> authenticated user summary
- `GET /api/v1/profile` & `PUT /api/v1/profile` -> `{ fullName, ageGroup, biologicalSex, prakriti, vikriti, season, conditions, allergies, medications, dietaryPreference, avoidAlcoholExtracts, notes }` -> returns fields tagged with `{ value, provenance: 'patient_reported' | 'clinician_verified', verifiedBy?, verifiedAt? }`.
- `PATCH /api/v1/patients/:patientId/profile/verify` (**Role: `clinician` | `admin`**) -> marks specific conditions/Prakriti as clinically verified.

### 9.2 Clinical Consultations, Assessments & Transparency
- `POST /api/v1/consultations` (JSON or `multipart/form-data` with optional `image`, using active DB profile merged with optional request overrides) -> `201`:
  - Returns **role-projected DTO**:
    - `Patient` receives: `{ id, timestamp, verdictLabel, status, clinicalSummary, safetyWarnings, missingInformation, supportingReasons (plain-language + sourceName), contradictingReasons (plain-language + sourceName), alternatives, disclaimers, assessmentMetrics: { evidenceAvailability, dataCompleteness } }` — **zero** `agentExecutions`, **zero** raw Cypher, **zero** model/embedding stats.
    - `Clinician` additionally receives: `structuredEvidencePaths`, `agentDebateSummary` (`proponent` vs `opponent` vs `judge` clinical synthesis), `confidenceBreakdown`.
- `GET /api/v1/consultations` (paginated `?page=1&limit=20&status=&q=`, scoped strictly to `req.user.id`) -> omits sensitive personal notes in summary rows.
- `GET /api/v1/consultations/:id` (owner check or authorized clinician)
- `GET /api/v1/consultations/:id/trace` (**Role: `clinician` | `admin`**, granular internal latencies/prompts/model IDs **`admin` only**)
- `POST /api/v1/consultations/:id/follow-ups` -> `{ followUpQuery }` -> `201 { turn: { id, role, content, dosageAndAnupana, pathyaApathya, precautions, createdAt } }`
- `POST /api/v1/consultations/:id/feedback` -> `{ rating: 'accurate' | 'discrepancy', notes }` -> inserts into DB `review_feedback` table (**never** raw filesystem append).

### 9.3 Label Audits & Scans
- `POST /api/v1/label-audits` (`multipart/form-data`: `image` <= 10 MB validated by magic bytes) -> persists audit record -> `201`:
  - Evaluates **every** ingredient against active patient `prakriti`, `season`, `conditions`, **plus** `allergies`, `medications` (via Drug–Herb edges), and `avoidAlcoholExtracts` (flagging `Asava`/`Arishta` or ethanol-extracted liquids).
  - Returns `ocrBoxes` only when grounded by real OCR coordinates (otherwise `ocrBoxes: []` rather than synthetic boxes), plus verified botanical provenance & role-projected safety reasoning.
- `GET /api/v1/label-audits` & `GET /api/v1/label-audits/:id` (user-scoped history).

### 9.4 Drug–Herb Interactions, Herbs & Knowledge Graph
- `GET /api/v1/interactions/catalog` -> `{ medications: [...], herbs: [...] }`
- `POST /api/v1/interactions/check` -> `{ herbIdOrName, medicationNames: string[] }` -> `200` returning per-pair `{ status: 'documented' | 'potential' | 'no_known_interaction' | 'insufficient_data', severity, mechanism, clinicalGuidance, sources, evidenceBoundaryNotice, structuredPath? }`.
- `GET /api/v1/herbs` (`?q=&virya=&dosha=&page=&limit=`) & `GET /api/v1/herbs/:slug` -> includes all Dravyaguna fields (`vipaka`, `guna`, `therapeutic_uses`, `contraindicated_seasons`, `evidence_tier`, `safety_note`, `API formulation references`).
- `GET /api/v1/knowledge-graph/subgraph` (**Role: `clinician` | `admin`**, or sanitized visual DTO for `patient` omitting Cypher syntax) -> `?rootId=&depth=1&nodeTypes=Herb,Dosha,Season,Condition,Drug` -> `{ nodes, edges }` queried dynamically from Neo4j.

### 9.5 Administration, Governance & Health
- `GET /api/v1/health` (public sanitized liveness `{ status: 'ok', serviceReady: boolean }` — **no** instance IDs or node counts).
- `GET /api/v1/admin/telemetry` (**Role: `admin`**) -> Neo4j node/edge/index stats, LLM provider error/retry counts, safety gate metrics.
- `GET /api/v1/admin/reviews`, `POST /api/v1/admin/reviews`, `PATCH /api/v1/admin/reviews/:id` (**Role: `clinician` (`approve feedback`) / `admin` (`publish ontology`)**) -> persisted workflow with explicit state transition audit log.
- `GET /api/v1/admin/ontology/versions` (**Role: `admin`**)

---

## 10. Recommended Implementation Order

| Phase | Scope & Core Deliverables | Key Files / Modules Targeted | Dependencies & Exit Criteria |
| :--- | :--- | :--- | :--- |
| **Phase 0: Hardening & Structural Cleanup** | Remove hardcoded `'[instance redacted]'` fallbacks; create central Neo4j singleton `db/neo4j.js` with `SIGTERM` shutdown; add `helmet`, strict `cors`, `zod` validation, `express-rate-limit`, sanitized error handler; fix `publish_client.js` to clean stale `public/assets/`; remove risky UTF-8 raw-byte fallback in `vision_agent.js`; cache `classical_embeddings.json` in memory once at boot (`vector_store.js`); align `vedaai_seed.cypher` with `enrich_neo4j_aura.js`. | `server.js`, `engine/agents.js`, `engine/vision_agent.js`, `engine/label_audit.js`, `engine/followup_agent.js`, `engine/vector_store.js`, `scripts/publish_client.js` | Zero secret/ID leaks in `/api/status`; clean `public/`; zero sync file reads per request; all rate limits active. |
| **Phase 1: Operational Database, Auth & RBAC** | Introduce PostgreSQL (or SQLite/Prisma/Knex for local dev -> Postgres prod) with tables: `users`, `sessions`, `patient_profiles`, `consultations`, `follow_up_turns`, `label_audits`, `clinical_feedback`, `admin_reviews`; implement JWT/cookie auth + `requireAuth` / `requireRole('patient'|'clinician'|'admin')` middleware; wire `AuthScreen.tsx` + React Router (`react-router-dom`) with protected routes. | New `server/db/`, `server/routes/v1/auth.js`, `server/middleware/auth.js`, `client/src/screens/AuthScreen.tsx`, `client/src/App.tsx`, `AppShell.tsx` | Real registration/login/forgot-password; `Patient` cannot load `/admin` or admin APIs (HTTP 403). |
| **Phase 2: Role-Based Trace & Cypher Abstraction** | Implement server-side DTO mappers (`projectConsultationForRole`, `projectLabelAuditForRole`); strip raw `trace`, model IDs, latencies, and Cypher syntax from Patient responses; fix `ConsultationScreen.tsx:203` bug so Clinician/Admin views show **real** LangGraph execution stages (`trace.agentExecutions`), real per-stage timings, and real `evidence_confidence`. | `server.js` / `v1/consultations.js`, `engine/agents.js`, `client/src/screens/ConsultationScreen.tsx`, `AIAssessmentScreen.tsx`, `AgentTransparencyScreen.tsx` | Automated contract tests verifying Patient payload contains zero Cypher strings, zero Neo4j IDs, zero model IDs. |
| **Phase 3: Persistent Health Profile & Consultation History** | Persist `HealthProfileScreen` via `GET/PUT /api/v1/profile`; add `vikriti` editor & patient-reported vs. clinician-verified badges; update `entityExtractorNode`, `graphSafetyAudit`, and `label_audit.js` to check `medications`, `allergies`, and `avoidAlcoholExtracts`; persist consultations, follow-ups, and history via `/api/v1/consultations` and remove unsafe silent demo fallback in `ConsultationScreen.tsx:109`. | `client/src/screens/HealthProfileScreen.tsx`, `ConsultationHistoryScreen.tsx`, `ConsultationScreen.tsx`, `engine/agents.js`, `engine/label_audit.js` | Reloading browser retains full profile edits and live consultation/follow-up history; `avoidAlcoholExtracts` flags `Asava/Arishta` labels. |
| **Phase 4: Drug–Herb Interaction Graph & Herb Catalog Enrichment** | Seed curated `:Drug` nodes & `:INTERACTS_WITH` edges + clinical monograph evidence sources into Neo4j; build `POST /api/v1/interactions/check` with strict 4-state semantics (`documented`, `potential`, `no_known_interaction`, `insufficient_data`); expand `GET /api/herbs` to return `vipaka`, `therapeutic_uses`, `contraindicated_seasons`, and monograph tiers for all 25+ herbs. | `data/` + `scripts/`, new `routes/v1/interactions.js`, `routes/v1/herbs.js`, `client/src/screens/DrugHerbCheckerScreen.tsx`, `HerbExplorerScreen.tsx` | Drug–Herb screen queries live backend across all 25 Neo4j herbs and active profile medications; cross-checked during `/api/v1/label-audits`. |
| **Phase 5: Live Knowledge Graph Explorer** | Build `GET /api/v1/knowledge-graph/subgraph` querying live Neo4j nodes/edges dynamically (`:Herb`, `:Dosha`, `:Season`, `:Condition`, `:Drug`); replace static `KG_NODES`/`KG_EDGES` in `KnowledgeGraphScreen.tsx`; gate raw Cypher query strings strictly to Clinician/Admin roles. | New `routes/v1/knowledge_graph.js`, `client/src/screens/KnowledgeGraphScreen.tsx` | Zero hardcoded SVG graph positions/edges; node selection dynamically fetches real Neo4j neighborhoods. |
| **Phase 6: Label Analyzer OCR Provenance & Dosage Safety** | Upgrade `prompts/label_audit/v1.txt` to extract `dosage_printed` and standardized form; optionally compute bounding boxes (via vision coordinates or Vision OCR) or cleanly hide box toggle when coordinates are unavailable (`ProductLabelAnalyzer.tsx`); cross-check detected ingredients with `profile.medications` & `profile.allergies`. | `prompts/label_audit/v1.txt`, `engine/label_audit.js`, `client/src/screens/ProductLabelAnalyzer.tsx` | Uploaded labels display extracted strength, drug-herb flags, allergy alerts, and saved audit records. |
| **Phase 7: Admin Governance Portal & Clean Benchmark Run** | Back `AdminPortalScreen` with persistent review queue DB + feedback moderation endpoints (ingesting historical `clinical_feedback.jsonl` into DB); restrict ontology/prompt release metadata and live telemetry to `admin`; execute clean `npm run benchmark` (without verdict substitution) and publish verified Phase 5 statistics. | New `routes/v1/admin.js`, `client/src/screens/AdminPortalScreen.tsx`, `scripts/run_ablation_benchmark.js` | End-to-end clinician discrepancy review queue + audited governance actions + reproducible benchmark report. |
