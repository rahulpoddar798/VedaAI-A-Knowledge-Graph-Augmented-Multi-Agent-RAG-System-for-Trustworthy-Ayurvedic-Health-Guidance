import { assessment } from '../../../shared/assessment.mjs';
import { z } from 'zod';
import type { ConsultationRecord, PatientProfile } from '../types/veda';

export function clinicalProfile(profile: PatientProfile) {
  const { prakriti, vikriti, season, conditions, medications, allergies, ageGroup, biologicalSex,
    dietaryPreference, avoidAlcoholExtracts } = profile;
  return { prakriti, vikriti, season, conditions: conditions.length ? conditions : undefined, medications: medications.length ? medications : undefined, allergies: allergies.length ? allergies : undefined, ageGroup, biologicalSex,
    dietaryPreference, avoidAlcoholExtracts: avoidAlcoholExtracts || undefined };
}

export function appendClinicalProfile(form: FormData, profile: PatientProfile) {
  for (const [key, value] of Object.entries(clinicalProfile(profile))) {
    if (Array.isArray(value)) value.forEach(item => form.append(key + '[]', item));
    else if (value !== undefined) form.append(key, String(value));
  }
}

const responseSchema = z.object({
  success: z.literal(true),
  consultationId: z.uuid(),
  isOutOfDomain: z.boolean().optional(),
  followUpToken: z.string().regex(/^[A-Za-z0-9_-]{43}$/).optional(),
  result: z.object({
    final_verdict: z.string(),
    summary_message: z.string(),
    disclaimer: z.string(),
    evaluated_herbs: z.array(z.string()).default([]),
    assessment: assessment.optional(),
    safety_warnings: z.array(z.string()).default([]),
    missing_coverage: z.array(z.string()).default([]),
  })
});

export function mapConsultation(payload: unknown, query: string, profile: PatientProfile): ConsultationRecord {
  const parsed = responseSchema.safeParse(payload);
  if (!parsed.success) throw new Error('Invalid consultation response or evidence references.');
  const { consultationId: id, result, isOutOfDomain } = parsed.data;
  const a = result.assessment;
  const category = a?.verdict.category;
  if (a ? (!parsed.data.followUpToken || a.verdict.consultationId !== id || category === 'permitted' ||
      result.final_verdict !== category?.toUpperCase() || isOutOfDomain) :
      (!isOutOfDomain || result.final_verdict !== 'OUT_OF_DOMAIN')) {
    throw new Error('Inconsistent consultation verdict.');
  }
  return {
    assessment: a, id, followUpToken: parsed.data.followUpToken, timestamp: new Date(a?.verdict.createdAt ?? Date.now()).toLocaleString(),
    querySummary: query.trim().slice(0, 76), fullQuery: query.trim(),
    status: category && category !== 'permitted' ? category : 'out_of_domain', verdictLabel: result.final_verdict,
    herbsEvaluated: result.evaluated_herbs, prakritiSnapshot: profile.prakriti, seasonSnapshot: profile.season,
    missingInformation: result.missing_coverage, safetyWarnings: result.safety_warnings,
    clinicalSummary: result.summary_message, disclaimer: result.disclaimer, isSampleData: false
  };
}

export const emptySession: { records: ConsultationRecord[]; active: ConsultationRecord | null } = {
  records: [], active: null
};

export function receiveConsultation(session: typeof emptySession, record: ConsultationRecord) {
  if (record.isSampleData !== false) return session;
  return { records: [record, ...session.records.filter(item => item.id !== record.id)], active: record };
}

const followUp = z.object({
  status: z.enum(['ANSWERED', 'RESTRICTED', 'INSUFFICIENT_CONTEXT', 'INSUFFICIENT_DATA', 'ANALYSIS_UNAVAILABLE']),
  reply: z.string().min(1), evidenceIds: z.array(z.string()).max(5),
  final_verdict: z.string().optional(), restrictions: z.array(z.string()).optional()
});

export function followUpText(payload: unknown, record: ConsultationRecord) {
  const data = followUp.parse(payload);
  const ids = new Set(record.assessment?.ledger.map(entry => entry.id));
  if ((!data.final_verdict && data.status !== 'INSUFFICIENT_CONTEXT') ||
      (data.final_verdict && data.final_verdict !== record.verdictLabel) ||
      data.evidenceIds.some(id => !ids.has(id))) throw new Error('Invalid follow-up response.');
  return [data.reply, ...data.evidenceIds].join(' ');
}
