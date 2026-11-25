export type ScreenId =
  | 'overview'
  | 'consultation'
  | 'assessment'
  | 'agents'
  | 'history'
  | 'interactions'
  | 'label-analyzer'
  | 'herbs'
  | 'knowledge-graph'
  | 'profile'
  | 'admin'
  | 'landing'
  | 'auth';

export type SafetyStatus =
  | 'verified'
  | 'flagged'
  | 'caution'
  | 'uncertain'
  | 'unverified'
  | 'insufficient_evidence'
  | 'out_of_domain'
  | 'blocked';

export interface PatientProfile {
  fullName: string;
  ageGroup: string;
  biologicalSex: string;
  prakriti: string;
  vikriti: string;
  season: string;
  conditions: string[];
  allergies: string[];
  medications: string[];
  dietaryPreference: string;
  avoidAlcoholExtracts: boolean;
  notes?: string;
}

export interface OcrBoundingBox {
  id: string;
  label: string;
  category: 'product' | 'verified' | 'flagged' | 'uncertain' | 'unverified';
  x: number; // percentage 0-100
  y: number;
  width: number;
  height: number;
  ingredientRef?: string;
  confidence: number;
}

export interface AuditIngredient {
  id: string;
  printed_name: string;
  common_name?: string | null;
  dosage_printed?: string;
  uncertain?: boolean;
  status: 'verified' | 'unverified' | 'uncertain';
  reason?: string;
  canonical_name?: string;
  botanical_name?: string;
  sanskrit_name?: string;
  virya?: string;
  rasa?: string;
  vipaka?: string;
  provenance?: string;
  ocrBoxId?: string;
  safety?: {
    verdict: 'SAFE' | 'FLAGGED' | 'CAUTION' | 'INSUFFICIENT_EVIDENCE';
    flags: string[];
    paths: string[];
    reasoning: string[];
  };
}

export interface LabelAuditResult {
  status?: 'ASSESSED' | 'OUT_OF_DOMAIN' | 'PARTIAL_ASSESSMENT' | 'INSUFFICIENT_DATA';
  missing_coverage?: string[];
  isSampleData?: boolean;
  sampleLabelTitle?: string;
  durationMs: number;
  extraction: {
    product_name: string;
    manufacturer?: string;
    formulation_type?: string;
    visual_confidence: number | null;
    extracted_ocr_text?: string;
    summary?: string;
    is_supplement_label: boolean;
  };
  ocrBoxes?: OcrBoundingBox[];
  ingredients: {
    verified: AuditIngredient[];
    unverified: AuditIngredient[];
    uncertain: AuditIngredient[];
  };
  auditedIngredients: AuditIngredient[];
  summary: {
    totalExtracted: number;
    verified: number;
    unverified: number;
    uncertain: number;
    flagged: number;
    safe: number;
  };
}

export interface HerbItem {
  name: string;
  botanical_name: string;
  sanskrit_name: string;
  common_name?: string;
  rasa: string;
  virya: 'Ushna' | 'Sheeta' | string;
  vipaka?: string;
  guna?: string;
  family?: string;
  system_of_medicine?: string;
  therapeutic_uses?: string;
  synonyms?: string;
  pacifies: string[];
  aggravates: string[];
  contraindicated_seasons?: string[];
  evidence_tier?: 'Classical + Preclinical' | 'Classical + Clinical Monograph' | 'Traditional Textual Only';
  safety_note?: string;
  source?: string;
}

export interface AgentStage {
  id: 'entity_extractor' | 'retrieval_planner' | 'proponent' | 'opponent' | 'judge';
  name: string;
  role: string;
  status: 'completed' | 'warning' | 'blocked' | 'pending';
  latencyMs: number;
  summary: string;
  outputLabel: 'Generated Analysis' | 'Verified Graph Output' | 'Arbitrated Verdict';
  outputs: Array<{ label: string; value: string; kind: 'verified' | 'generated' | 'warning' }>;
  evidenceRefs: string[];
}

export interface AssessmentEvidenceItem {
  id: string;
  claim: string;
  source: string;
  cypherPath?: string;
  provenanceType: 'Knowledge Graph' | 'Classical Text' | 'Hybrid RAG' | 'Clinical assessment' | 'Retrieved record';
}

export interface EvidenceAssessment {
  verdict: { category: string; expertReview: boolean; coverage: { dimension: string; status: string; reason: string }[] };
  ledger: { id: string; kind: string; title: string | null; location: string | null; excerpt: string; verification: string; metadata: Record<string, string | number> }[];
  findings: { role: 'proponent' | 'opponent'; text: string; evidenceIds: string[] }[];
  stages: { name: string; status: string }[];
}
export interface ConsultationRecord {
  assessment?: EvidenceAssessment;
  id: string;
  timestamp: string;
  querySummary: string;
  fullQuery: string;
  status: SafetyStatus;
  verdictLabel: string;
  herbsEvaluated: string[];
  prakritiSnapshot: string;
  seasonSnapshot: string;
  isSampleData?: boolean;
  evidenceQuality: number | null;
  retrievalCoverage: number | null;
  modelConfidence: number | null;
  missingInformation: string[];
  safetyWarnings: string[];
  supportingEvidence: AssessmentEvidenceItem[];
  contradictingEvidence: AssessmentEvidenceItem[];
  clinicalSummary: string;
  disclaimer: string;
  agentStages: AgentStage[];
  alternatives?: Array<{
    herb_name: string;
    botanical_name?: string;
    virya?: string;
    why_safe: string;
  }>;
}

export interface DrugHerbInteraction {
  id: string;
  herb: string;
  herbBotanical: string;
  medication: string;
  medicationClass: string;
  status: 'documented' | 'potential' | 'no_known_interaction' | 'insufficient_data';
  severity: 'High' | 'Moderate' | 'Unknown' | 'Low';
  mechanism: string;
  clinicalGuidance: string;
  graphPath?: string;
  sources: string[];
  missingEvidenceNote?: string;
}

export interface KGNode {
  id: string;
  label: string;
  sublabel?: string;
  type: 'Herb' | 'Dosha' | 'Season' | 'Condition' | 'Drug';
  x: number;
  y: number;
  properties: Record<string, string>;
}

export interface KGEdge {
  id: string;
  source: string;
  target: string;
  type: 'PACIFIES' | 'AGGRAVATES' | 'CONTRAINDICATED_IN' | 'TREATS' | 'DOMINANT_IN' | 'ASSOCIATED_WITH' | 'INTERACTS_WITH';
  reason?: string;
  provenance: string;
}

export interface AdminReviewItem {
  id: string;
  title: string;
  category: 'Source Verification' | 'Safety Rule' | 'Clinician Feedback' | 'Ontology Schema';
  status: 'Pending Review' | 'Approved' | 'Requires Revision';
  submittedBy: string;
  submittedAt: string;
  version: string;
  detail: string;
  cypherImpact?: string;
}
