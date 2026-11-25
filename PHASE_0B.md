# Phase 0B remediation

## Consultation UI

Live history and profile are scoped to the current page session. Prompt shortcuts fill the editor. The read-only example and label presets require explicit selection. A consultation response passes the same assessment schema used on the server, including ledger ownership and reference checks, before it can enter history. Assessment and execution views display the returned policy outcome, coverage, source records, selections and public stages. The clinical rule registry ships empty and the repository contains no reviewed primary-source corpus.

## Catalog views

`GET /api/graph` reads up to 24 relationships between public catalog labels in a five-second Neo4j read transaction. IDs in the projection are local to the response. A zero-row result returns an empty graph and a failed read returns HTTP 503. The graph and herb explorers display the actual catalog with the available attribution. Ontology edges remain unverified.

A read-only inspection of the configured database returned Herb, Condition, Season and Dosha labels, with PACIFIES, AGGRAVATES, TREATS, CONTRAINDICATED_IN, ASSOCIATED_WITH and DOMINANT_IN relationships. The committed IMPPAT tables describe plants, reported uses and formulations. Neither source supplies a verified drug-herb interaction dataset. The demonstration checker displays insufficient evidence for each selection.

## Assessment and follow-up contracts

The server checks the envelope consultation ID against the verdict, scrubs the complete public assessment, and validates its references again. Coverage includes a separate row for attributable primary-source passages. Missing profile fields remain missing on both image and text routes.

Follow-up answers are templates over the originating assessment. The handler receives the original submitted profile and up to eight completed server-side turns. It supports source requests, requested ledger IDs, reported profile fields, and repeating the prior answer. The API returns the original verdict, restrictions and validated evidence IDs. Client-provided history and clinical context are ignored. Concurrent turns for the same record return HTTP 409. No follow-up extends trace expiry.

## Patient identity and persistence design

The configured services are the Neo4j knowledge catalog and Gemini. Inspection of the repository, environment variable names and local configuration found no patient database, managed identity tenant, encryption-key configuration or database migrations for patient records. The UI's role choice is a demonstration preference. The feedback JSONL contains a timestamp and feedback enum. It cannot reconstruct a patient's history.

**Current boundary.** Profile and history exist in React memory until page reload. The server retains up to 200 process-local traces with an absolute 24-hour TTL, subject to earlier eviction or restart. Follow-up is the sole API for reading an existing consultation. Use a distinct random 256-bit bearer credential scoped to one trace, returned once by the creating response, kept in page memory, and checked against a digest stored alongside that trace. Require both the credential and consultation ID. No account recovery or cross-device history is possible. A bearer credential establishes possession only. Use TLS for any network deployment.

**Proposed storage.** Provision managed PostgreSQL in the approved residency region, private networking, TLS, KMS encryption of primary data and backups, separate runtime and migration identities and a tested restore procedure. Store a patient principal, versioned profile snapshots, consultations, immutable verdict and ledger snapshots, and bounded follow-up turns under non-null patient ownership. Commit each assessment and its provenance atomically. Keep the knowledge catalog free of patient data.

**Authentication and authorization.** Use an OIDC provider and server-side sign-in callback with PKCE, issuer/audience checks, state and nonce. Derive ownership from the verified issuer and subject. Use an opaque rotated HttpOnly, Secure, SameSite cookie, server-side revocation and CSRF protection for writes. Require a session for chat, image consultation, label audit, scan, follow-up and all new profile/history/export/delete routes. Limit status and public catalog routes to catalog metadata. Keep feedback anonymous or bind it to the authenticated owner if it gains patient fields. Apply ownership checks in each query and PostgreSQL row-level security under a non-bypass runtime role. Enforce reviewer grants and assignments server-side, require reviewer MFA, audit access metadata, and prohibit client-assigned roles.

**Proposed pilot retention.** Expire identity sessions after 15 minutes idle or eight hours absolute, revoke on logout and credential changes. Discard uploads after processing. Expire anonymous traces at their existing absolute TTL. For an opt-in pilot, propose 30 days for identifiable consultations and profiles after last use, daily expiry/deletion jobs and 30-day rolling encrypted backups. Reapply deletion tombstones on restore. The data owner must approve retention periods, consent, deletion exceptions, residency and provider processing terms before enabling durable records. Exclude clinical text, uploads and bearer credentials from logs.

**Provisioning and acceptance.** Supply the database, encryption key, OIDC tenant/client and reviewer provisioning workflow through deployment secret management. Test owner-only read/write/list/export/delete, reviewer assignment and revocation, session expiry, denied cross-patient references, interrupted writes, purge and restore before exposing persistent endpoints. Production patient authentication, persistent history and reviewer authorization remain pending.

## API migration and verification

Text and in-domain image consultations return `followUpToken`. Send it as `Authorization: Bearer <followUpToken>` to `POST /api/follow-up` with `consultationId`, `followUpQuery` and optionally up to five original `evidenceIds`. Out-of-domain images do not establish a follow-up context. A different, missing or expired credential receives the same insufficient-context result. Existing UUID-only clients must start a new assessment. Graph outages on image verification return HTTP 503 with `CATALOG_UNAVAILABLE`. Label and scan results use allowlisted output schemas. Configure the exact frontend origin in `CORS_ALLOWED_ORIGINS` when serving from a custom address.

| Check in the remediation checkout | Observed result |
| --- | --- |
| Root and client `npm ci` | 108 and 47 packages installed, respectively. Both npm audits reported zero vulnerabilities. |
| `npm run build:web` | TypeScript and Vite passed, production assets published locally. |
| `npm run test:evidence` | 26 passed, zero failures or skips. |
| `npm run test:remediation` | 15 backend and two React/API integration tests passed, zero failures or skips. |
| `npm run test:security` | 10 passed with zero skips, including live Neo4j/Gemini consultation, follow-up and label audit. |
| `npm test` | 36 of 36 legacy checks passed. |
| Client lint | Passed with no diagnostics. |
| Live catalog HTTP | 22 nodes and 24 relationships in the bounded graph response, 25 herbs in the catalog. |
| Headless Edge, production build | Empty history, example prompt isolation, both catalog explorers, live consultation, evidence and stages, reopening history and credential-bound follow-up passed. The first run used an unlisted ephemeral origin and received HTTP 403. The successful run used that exact loopback origin in the test server allowlist. |
| Vite development server | Browser-facing assessment schema and Zod module requests both returned HTTP 200. |

### Changed files

- Frontend state and contracts: `client/src/App.tsx`, `client/src/data/{consultation,graph,mockData}.ts`, `client/src/types/veda.ts`, `client/tsconfig.app.json`.
- Screens under `client/src/screens/`: AIAssessmentScreen, AgentTransparencyScreen, AuthScreen, ConsultationScreen, ConsultationHistoryScreen, DrugHerbCheckerScreen, HealthProfileScreen, HerbExplorerScreen, KnowledgeGraphScreen, LandingScreen, OverviewScreen and ProductLabelAnalyzer (all TSX).
- Shared UI: `client/src/components/layout/AppShell.tsx` and `client/src/components/ui/SafetyBadge.tsx`.
- API and engine: `server.js` and `engine/{assessment_workflow,catalog_graph,evidence,followup_agent,label_audit,policy,vision_agent}.js`. The existing structured source readers continue to serve the assessment workflow.
- Validation and security: `shared/{assessment,catalog,image_response}.mjs`, `lib/{response_sanitizer,security,trace_store}.js`.
- Tests: `client/test-phase0a.mjs` and `scripts/{test_evidence,test_phase0a_remediation,test_phase0a_security}.js`.
- Delivery and documentation: `.gitattributes` pins the Vite input HTML line endings, `public/index.html`, `public/.veda-managed-assets.json`, the generated JS/CSS in `public/assets/`, `EVIDENCE_ARCHITECTURE.md` and this file.
