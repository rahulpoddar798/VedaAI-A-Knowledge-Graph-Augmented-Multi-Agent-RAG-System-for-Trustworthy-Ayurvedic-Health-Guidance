import type { ConsultationRecord, PatientProfile, SafetyStatus } from '../types/veda';

export function clinicalProfile(profile: PatientProfile) {
  const { prakriti, vikriti, season, conditions, medications, allergies, ageGroup, biologicalSex,
    dietaryPreference, avoidAlcoholExtracts } = profile;
  return { prakriti, vikriti, season, conditions: conditions.length ? conditions : undefined, medications: medications.length ? medications : undefined, allergies: allergies.length ? allergies : undefined, ageGroup, biologicalSex,
    dietaryPreference, avoidAlcoholExtracts };
}

export function appendClinicalProfile(form: FormData, profile: PatientProfile) {
  for (const [key, value] of Object.entries(clinicalProfile(profile))) {
    if (Array.isArray(value)) value.forEach(item => form.append(key, item));
    else if (value !== undefined) form.append(key, String(value));
  }
}

const mapVerdictToStatus = (verdict: string): SafetyStatus => {
  const v = verdict.toUpperCase();
  if (v === 'BLOCKED') return 'blocked';
  if (v === 'RESTRICTED' || v === 'EXPERT_REVIEW_REQUIRED') return 'caution';
  if (v.includes('OUT_OF_DOMAIN')) return 'out_of_domain';
  if (v.includes('UNSAFE') || v.includes('DO NOT RECOMMEND') || v.includes('CONTRAINDICATED'))
    return 'flagged';
  if (v.includes('CAUTION')) return 'caution';
  if (v.includes('SAFE') || v.includes('RECOMMENDED') || v.includes('INDICATED'))
    return 'verified';
  return 'insufficient_evidence';
};

interface PublicConsultation {
  consultationId: string;
  confidenceScore?: number | null;
  result: {
    assessment?: ConsultationRecord['assessment'];
    final_verdict: string;
    summary_message: string;
    evaluated_herbs?: string[];
    safety_warnings?: string[];
    clinical_reasoning?: string[];
    uncertainty_note?: string;
    missing_coverage?: string[];
    disclaimer?: string;
    suggested_alternatives?: ConsultationRecord['alternatives'];
  };
}

export function mapConsultation(response: PublicConsultation, query: string, profile: PatientProfile): ConsultationRecord {
  const { consultationId: id, result } = response;
  if (!id || !result?.final_verdict) throw new Error('Incomplete consultation response.');
  const warnings = result.safety_warnings || [];
  function referenced(role: 'proponent' | 'opponent') {
    const a = result.assessment;
    const ids = new Set(a?.findings.filter(f=>f.role===role).flatMap(f=>f.evidenceIds));
    return (a?.ledger || []).filter(e=>ids.has(e.id)).map(e=>({id:e.id,claim:e.excerpt,
      source:[e.title,e.location,e.kind,e.verification].filter(Boolean).join(' / '),provenanceType:'Retrieved record' as const}));
  }
  function evidence(claim: string, index: number) {
    return { id: id + '-' + index, claim, source: 'Consultation assessment', provenanceType: 'Clinical assessment' as const };
  }
  return {
    assessment: result.assessment, id, timestamp: new Date().toLocaleTimeString(), querySummary: query.trim().slice(0, 76), fullQuery: query.trim(),
    status: mapVerdictToStatus(result.final_verdict), verdictLabel: result.final_verdict,
    herbsEvaluated: result.evaluated_herbs || [], prakritiSnapshot: profile.prakriti, seasonSnapshot: profile.season,
    evidenceQuality: null, retrievalCoverage: null,
    modelConfidence: typeof response.confidenceScore === 'number' ? Math.round(response.confidenceScore * 100) : null,
    missingInformation: [...(result.uncertainty_note ? [result.uncertainty_note] : []), ...(result.missing_coverage || [])],
    safetyWarnings: warnings, supportingEvidence: result.assessment ? referenced('proponent') : (result.clinical_reasoning || []).filter(line => !warnings.includes(line)).map(evidence),
    contradictingEvidence: result.assessment ? referenced('opponent') : warnings.map(evidence), clinicalSummary: result.summary_message, agentStages: [],
    alternatives: result.suggested_alternatives || [], disclaimer: result.disclaimer || '', isSampleData: false
  };
}
