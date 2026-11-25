/**
 * Patient-safe DTO projections and text sanitizers.
 * Ensures unauthenticated public responses never expose raw Cypher syntax,
 * internal graph structures, Gemini model IDs, vector similarity metrics,
 * Neo4j Aura instance identifiers, or filesystem paths.
 */

const RELATIONSHIP_LABELS = {
  CONTRAINDICATED_IN: 'is contraindicated during',
  AGGRAVATES: 'may aggravate',
  PACIFIES: 'helps balance',
  ASSOCIATED_WITH: 'is associated with',
  TREATS: 'is traditionally indicated for',
  DOMINANT_IN: 'is dominant during',
  INTERACTS_WITH: 'may interact with'
};

/**
 * Rewrite accidental graph-pattern notation and scrub internal telemetry/model/path tokens.
 */
function scrubInternalText(input) {
  if (typeof input !== 'string') return '';
  let text = input;


  // Convert Cypher relationship chains like (Acid Reflux)-[:ASSOCIATED_WITH]->(Pitta)<-[:AGGRAVATES]-(Ginger)
  // and single hops like (Ginger)-[:CONTRAINDICATED_IN]->(Grishma) into plain prose.
  text = text.replace(
    /\(([A-Za-z0-9\s,'-]+)\)-\[:([A-Z_]+)(?:\s*\{[^}]*\})?\]->\(([A-Za-z0-9\s,'-]+)\)/g,
    (_m, src, rel, tgt) => {
      const phrase = RELATIONSHIP_LABELS[rel] || 'relates to';
      return `${src.trim()} ${phrase} ${tgt.trim()}`;
    }
  );
  text = text.replace(
    /\(([A-Za-z0-9\s,'-]+)\)<-\[:([A-Z_]+)(?:\s*\{[^}]*\})?\]-\(([A-Za-z0-9\s,'-]+)\)/g,
    (_m, tgt, rel, src) => {
      const phrase = RELATIONSHIP_LABELS[rel] || 'relates to';
      return `${src.trim()} ${phrase} ${tgt.trim()}`;
    }
  );
  // Strip any residual arrow edge notation or Cypher statement clauses
  text = text.replace(/(?:<)?-\[:[A-Z0-9_]+(?:\s*\{[^}]*\})?\]-(?:>)?/g, ' relates to ');
  text = text.replace(
    /\b(?:OPTIONAL\s+MATCH|MATCH|MERGE|CREATE|DETACH\s+DELETE)\s*\([A-Za-z0-9_]*:[A-Z][A-Za-z0-9_]*[^;\n]*/g,
    'botanical safety reference'
  );
  text = text.replace(/\bUNWIND\s+\$[A-Za-z0-9_]+[^;\n]*/g, 'botanical safety reference');
  text = text.replace(/\bRETURN\s+(?:DISTINCT\s+)?[a-z]+\.[a-z_]+[^;\n]*/g, '');

  // Strip vector similarity metrics like "(cosine 0.812)"
  text = text.replace(/\(\s*cosine\s*[0-9.]+\s*\)/gi, '');
  text = text.replace(/\bcosine\s*(?:similarity)?\s*(?:of|:|=)?\s*[0-9.]+\b/gi, '');

  // Strip Gemini / LLM model identifiers and provider strings
  text = text.replace(/\bgemini-[a-z0-9._-]+\b/gi, 'clinical AI assistant');
  text = text.replace(/\bGoogle Gemini API\b/gi, 'clinical reasoning engine');

  // Strip Neo4j Aura identifiers, URIs, and internal engine names
  text = text.replace(/\b(?:neo4j(?:\+s|\+ssc)?|bolt(?:\+s|\+ssc)?):\/\/[^\s"']+/gi, '[database]');
  text = text.replace(/\b[a-z0-9-]+\.databases\.neo4j\.io\b/gi, '[database]');
  text = text.replace(/\bNeo4j(?:\s+Aura)?(?:\s+Knowledge)?(?:\s+Graph)?\b/gi, 'botanical safety database');
  text = text.replace(/\bLangGraph(?:\s+StateGraph)?\b/gi, 'clinical safety assessment');
  text = text.replace(/\bStateGraph\b/g, 'clinical workflow');

  const auraId = process.env.NEO4J_URI?.match(/:\/\/([a-z0-9-]+)\.databases\.neo4j\.io/i)?.[1];
  if (auraId) text = text.replace(new RegExp('\\\\b' + auraId + '\\\\b', 'gi'), '[database]');

  // Strip Windows and POSIX filesystem paths
  text = text.replace(/[A-Za-z]:\\(?:[^\s"'<>|]+\\)*[^\s"'<>|]+/g, '[redacted]');
  text = text.replace(/(?:^|\s)\/(?:Users|home|var|srv|opt|tmp|app|engine|scripts|node_modules|data|prompts|usr|etc|root)\/[^\s"']+/g, ' [redacted]');

  return text.replace(/\s{2,}/g, ' ').trim();
}

function sanitizeStringArray(arr) {
  if (!Array.isArray(arr)) return [];
  return arr
    .filter(item => typeof item === 'string' && item.trim())
    .map(item => scrubInternalText(item))
    .filter(Boolean);
}

/**
 * Project LangGraph state into a patient-safe plain-language consultation payload.
 */
function sanitizeConsultationResult(finalState) {
  const raw = finalState?.final_response || {};
  const collisionReasons = sanitizeStringArray(finalState?.graph_facts?.collisionReasoning);
  const scrubbedRisk = raw.risk_explanation ? scrubInternalText(raw.risk_explanation) : null;
  const safetyWarnings = [...new Set([
    ...(scrubbedRisk ? [scrubbedRisk] : []),
    ...collisionReasons
  ])];

  const restricted = /unsafe|caution|contraindicated|do not recommend|not in knowledge base/i.test(raw.final_verdict || '');
  const clinicalReasoning = restricted ? safetyWarnings : sanitizeStringArray(raw.clinical_reasoning);
  const isUncataloged = finalState?.opponent_verdict === 'UNCATALOGED';
  const uncertaintyNote = isUncataloged
    ? 'One or more mentioned substances are not present in the cataloged Ayurvedic monograph database; safety cannot be confirmed from missing records.'
    : (!finalState?.graph_available
      ? 'Limited structured monograph data was found for this query; review with a qualified clinician.'
      : null);

  const facts = finalState?.graph_facts || {};
  const allowedNames = new Set([...(facts.safeCandidates || []), ...(facts.alternatives || [])]
    .map(item => String(item.herb_name || item.herb || item.name || '').toLowerCase()));
  const alternatives = Array.isArray(raw.suggested_alternatives)
    ? raw.suggested_alternatives.map(alt => ({
      herb_name: scrubInternalText(String(alt?.herb_name || '')),
      botanical_name: scrubInternalText(String(alt?.botanical_name || '')),
      virya: scrubInternalText(String(alt?.virya || '')),
      why_safe: scrubInternalText(String(alt?.why_safe || ''))
    })).filter(a => a.herb_name && allowedNames.has(a.herb_name.toLowerCase()))
    : [];

  return {
    final_verdict: scrubInternalText(String(raw.final_verdict || 'CAUTION_REQUIRED')),
    summary_message: scrubInternalText(
      String(raw.summary_message || 'The available clinical and botanical guidance has been reviewed for your profile.')
    ),
    risk_explanation: scrubbedRisk,
    evaluated_herbs: sanitizeStringArray(finalState?.canonical_entities?.query_intent === 'symptom_recommendation'
      ? (facts.candidateHerbs || []).map(item => item.name) : finalState?.canonical_entities?.mentioned_herbs),
    clinical_reasoning: clinicalReasoning,
    safety_warnings: safetyWarnings,
    suggested_alternatives: alternatives,
    uncertainty_note: uncertaintyNote,
    disclaimer: scrubInternalText(
      String(raw.disclaimer || 'Educational clinical decision support only. Consult a registered practitioner before starting or stopping any botanical product.')
    )
  };
}

/**
 * Sanitize vision scan metadata for public /api/scan and /api/consult-with-image responses.
 */
function sanitizeVisionScan(visionResult) {
  if (visionResult?.status === 'ANALYSIS_UNAVAILABLE') return { status: 'ANALYSIS_UNAVAILABLE' };
  if (!visionResult || typeof visionResult !== 'object') return null;
  const membership = visionResult.graph_membership || {};
  const verified = Array.isArray(membership.verified_herbs)
    ? membership.verified_herbs.map(h => ({
      canonical_name: scrubInternalText(String(h?.canonical_name || '')),
      botanical_name: scrubInternalText(String(h?.botanical_name || '')),
      sanskrit_name: scrubInternalText(String(h?.sanskrit_name || '')),
      virya: scrubInternalText(String(h?.virya || ''))
    }))
    : [];

  const statusLabel = membership.unverified_herbs?.length && verified.length ? 'Partially verified'
    : !visionResult.is_ayurvedic_or_herbal
    ? 'Non-Herbal Item'
    : (verified.length > 0 ? 'Catalog Herbs Matched' : 'Unverified Herbal Product');

  return {
    status: !visionResult.is_ayurvedic_or_herbal ? 'OUT_OF_DOMAIN' : !verified.length ? 'INSUFFICIENT_DATA'
      : membership.unverified_herbs?.length ? 'PARTIAL_ASSESSMENT' : 'ASSESSED',
    product_name: scrubInternalText(String(visionResult.product_name || 'Unknown Herb')),
    is_ayurvedic_or_herbal: Boolean(visionResult.is_ayurvedic_or_herbal),
    detected_herbs: sanitizeStringArray(visionResult.detected_herbs),
    ingredients_detected: sanitizeStringArray(visionResult.ingredients_detected),
    formulation_type: scrubInternalText(String(visionResult.formulation_type || 'Unknown')),
    visual_confidence: Number.isFinite(visionResult.visual_confidence) ? visionResult.visual_confidence : null,
    extracted_ocr_text: scrubInternalText(String(visionResult.extracted_ocr_text || '')),
    summary: statusLabel,
    catalog_verification: {
      verified: verified.length > 0 && !membership.unverified_herbs?.length,
      status_label: statusLabel,
      verified_herbs: verified,
      unverified_herbs: sanitizeStringArray(membership.unverified_herbs)
    }
  };
}

function sanitizeIngredientItem(item) {
  const clean = {
    printed_name: scrubInternalText(String(item?.printed_name || '')),
    common_name: item?.common_name ? scrubInternalText(String(item.common_name)) : null,
    uncertain: Boolean(item?.uncertain),
    status: ['verified', 'uncertain'].includes(item?.status) ? item.status : 'unverified'
  };
  if (item?.reason) clean.reason = scrubInternalText(String(item.reason));
  if (item?.canonical_name) clean.canonical_name = scrubInternalText(String(item.canonical_name));
  if (item?.botanical_name) clean.botanical_name = scrubInternalText(String(item.botanical_name));
  if (item?.sanskrit_name) clean.sanskrit_name = scrubInternalText(String(item.sanskrit_name));
  if (item?.virya) clean.virya = scrubInternalText(String(item.virya));
  if (item?.rasa) clean.rasa = scrubInternalText(String(item.rasa));

  if (item?.safety) {
    clean.safety = {
      verdict: ['FLAGGED', 'CAUTION'].includes(item.safety.verdict) ? item.safety.verdict : 'INSUFFICIENT_EVIDENCE',
      reasoning: sanitizeStringArray(item.safety.reasoning)
    };
  }
  return clean;
}

/**
 * Project label audit result without exposing internal Cypher paths or flag codes.
 */
function sanitizeLabelAudit(auditResult) {
  const ext = auditResult?.extraction || {};
  if (ext.extraction_failed) return { status: 'ANALYSIS_UNAVAILABLE', extraction: { extraction_failed: true } };
  const verified = (auditResult?.ingredients?.verified || []).map(sanitizeIngredientItem);
  const unverified = (auditResult?.ingredients?.unverified || []).map(sanitizeIngredientItem);
  const uncertain = (auditResult?.ingredients?.uncertain || []).map(sanitizeIngredientItem);
  const auditedIngredients = (auditResult?.auditedIngredients || []).map(sanitizeIngredientItem);

  return {
    status: !ext.is_supplement_label ? 'OUT_OF_DOMAIN' : !verified.length ? 'INSUFFICIENT_DATA'
      : unverified.length || uncertain.length ? 'PARTIAL_ASSESSMENT' : 'INSUFFICIENT_DATA',
    extraction: {
      extraction_failed: false,
      product_name: scrubInternalText(String(ext.product_name || 'Unreadable')),
      formulation_type: ext.formulation_type ? scrubInternalText(String(ext.formulation_type)) : 'Unknown',
      visual_confidence: Number.isFinite(ext.visual_confidence) ? ext.visual_confidence : null,
      extracted_ocr_text: scrubInternalText(String(ext.extracted_ocr_text || '')),
      summary: ext.is_supplement_label ? 'Label ingredient extraction completed.' : 'Image classified outside label scope.',
      is_supplement_label: Boolean(ext.is_supplement_label)
    },
    ingredients: {
      verified,
      unverified,
      uncertain
    },
    auditedIngredients,
    summary: {
      totalExtracted: verified.length + unverified.length + uncertain.length,
      verified: verified.length, unverified: unverified.length, uncertain: uncertain.length,
      flagged: auditedIngredients.filter(item => item.safety?.verdict === 'FLAGGED').length,
      safe: auditedIngredients.filter(item => item.safety?.verdict === 'SAFE').length
    }
  };
}

/**
 * Sanitize follow-up clinical response strings.
 */
function sanitizeFollowUp(data) {
  if (!data || typeof data !== 'object') return { status: 'ANALYSIS_UNAVAILABLE' };
  return {
    status: ['ANSWERED', 'RESTRICTED', 'INSUFFICIENT_CONTEXT', 'INSUFFICIENT_DATA', 'ANALYSIS_UNAVAILABLE'].includes(data.status) ? data.status : 'ANSWERED',
    reply: scrubInternalText(String(data.reply || '')),
    dosage_and_anupana: scrubInternalText(String(data.dosage_and_anupana || '')),
    pathya_apathya: scrubInternalText(String(data.pathya_apathya || '')),
    precautions: scrubInternalText(String(data.precautions || '')),
    suggested_followups: sanitizeStringArray(data.suggested_followups)
  };
}

module.exports = {
  scrubInternalText,
  sanitizeConsultationResult,
  sanitizeVisionScan,
  sanitizeLabelAudit,
  sanitizeFollowUp
};
