# Phase 0B remediation

## Consultation UI

Live history and profile are scoped to the current page session. Prompt shortcuts fill the editor. The read-only example and label presets require explicit selection. A consultation response passes the same assessment schema used on the server, including ledger ownership and reference checks, before it can enter history. Assessment and execution views display the returned policy outcome, coverage, source records, selections and public stages. The clinical rule registry ships empty and the repository contains no reviewed primary-source corpus.

## Catalog views

`GET /api/graph` reads up to 24 relationships between public catalog labels in a five-second Neo4j read transaction. IDs in the projection are local to the response. A zero-row result returns an empty graph and a failed read returns HTTP 503. The graph and herb explorers display the actual catalog with the available attribution. Ontology edges remain unverified.

A read-only inspection of the configured database returned Herb, Condition, Season and Dosha labels, with PACIFIES, AGGRAVATES, TREATS, CONTRAINDICATED_IN, ASSOCIATED_WITH and DOMINANT_IN relationships. The committed IMPPAT tables describe plants, reported uses and formulations. Neither source supplies a verified drug?herb interaction dataset. The demonstration checker displays insufficient evidence for each selection.

## Assessment and follow-up contracts

The server checks the envelope consultation ID against the verdict, scrubs the complete public assessment, and validates its references again. Coverage includes a separate row for attributable primary-source passages. Missing profile fields remain missing on both image and text routes.

Follow-up answers are templates over the originating assessment. The handler receives the original submitted profile and up to eight completed server-side turns. It supports source requests, requested ledger IDs, reported profile fields, and repeating the prior answer. The API returns the original verdict, restrictions and validated evidence IDs. Client-provided history and clinical context are ignored. Concurrent turns for the same record return HTTP 409. No follow-up extends trace expiry.
