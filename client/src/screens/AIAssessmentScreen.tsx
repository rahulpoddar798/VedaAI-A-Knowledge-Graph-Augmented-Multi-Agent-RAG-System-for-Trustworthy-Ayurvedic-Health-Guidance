import React, { useMemo, useState } from 'react';
import {
  AlertTriangle,
  ArrowLeft,
  BookOpen,
  CheckCircle2,
  Cpu,
  Database,
  FileText,
  Filter,
  GitBranch,
  HelpCircle,
  Info,
  Layers,
  Scale,
  ShieldAlert,
  ShieldCheck,
  Sparkles,
  UserCheck
} from 'lucide-react';
import { PageHeader } from '../components/ui/PageHeader';
import { SafetyBadge } from '../components/ui/SafetyBadge';
import { EmptyPanel, ErrorPanel, LoadingPanel } from '../components/ui/StatePanels';
import type { ConsultationRecord, EvidenceAssessment, SafetyStatus, ScreenId } from '../types/veda';

interface AIAssessmentScreenProps {
  consultation: ConsultationRecord | null;
  allConsultations: ConsultationRecord[];
  onSelectConsultation: (c: ConsultationRecord) => void;
  onNavigate: (screen: ScreenId) => void;
  isLoading?: boolean;
  error?: string | null;
  onRetry?: () => void;
}

type LedgerFilter = 'all' | 'source_traceable' | 'derived' | 'patient' | 'missing_provenance';
type LedgerEntry = EvidenceAssessment['ledger'][number];
type CoverageRow = EvidenceAssessment['verdict']['coverage'][number];
type PolicyRule = EvidenceAssessment['verdict']['rules'][number];
type FindingItem = EvidenceAssessment['findings'][number];

const ENTRY_KIND_LABEL: Record<LedgerEntry['kind'], string> = {
  classical: 'Classical text',
  research: 'Research study',
  association: 'Database association',
  rule: 'Clinical policy',
  patient: 'Patient context',
  derived: 'Derived relationship',
  interpretation: 'Clinical review note'
};

const SAFE_METADATA_FIELDS: ReadonlyArray<{
  key: keyof LedgerEntry['metadata'];
  label: string;
}> = [
  { key: 'author', label: 'Author' },
  { key: 'edition', label: 'Edition' },
  { key: 'section', label: 'Section' },
  { key: 'verse', label: 'Verse' },
  { key: 'page', label: 'Page' },
  { key: 'translation', label: 'Translation' },
  { key: 'plantPart', label: 'Plant part' }
];

function findingDisplayLabel(finding: FindingItem): string {
  const roleLabel = finding.role === 'opponent' ? 'Critical review' : 'Supporting evidence';
  switch (finding.category) {
    case 'review':
      return finding.role === 'opponent' ? 'Critical review' : `${roleLabel} — Clinical review`;
    case 'conflict':
      return `${roleLabel} — Source conflict`;
    case 'missing':
      return `${roleLabel} — Coverage gap`;
    case 'reported_use':
      return `${roleLabel} — Reported use`;
    case 'traditional':
      return `${roleLabel} — Classical source`;
    case 'research':
      return `${roleLabel} — Research`;
    case 'inference':
      return `${roleLabel} — Clinical synthesis`;
    default:
      return roleLabel;
  }
}

function formatCoverageDimension(dimension: string): string {
  if (dimension.startsWith('rule_')) return 'Clinical policy check';
  if (dimension.startsWith('finding_')) return 'Evidence review note';
  return dimension.replaceAll('_', ' ');
}

function formatMissingNote(note: string): string {
  return note.replaceAll('_', ' ');
}

const VERDICT_META: Record<
  SafetyStatus,
  {
    stripe: string;
    heading: string;
    cardTint: string;
  }
> = {
  blocked: {
    stripe: 'bg-[#B64040]',
    heading: 'Blocked by Approved Clinical Policy',
    cardTint: 'border-[#E7BABA] bg-[#FBEAEA]/60 text-[#7B2828]'
  },
  flagged: {
    stripe: 'bg-[#B64040]',
    heading: 'Safety Flagged — Contraindication Identified',
    cardTint: 'border-[#E7BABA] bg-[#FBEAEA]/60 text-[#7B2828]'
  },
  restricted: {
    stripe: 'bg-[#B79A5B]',
    heading: 'Restricted Clinical Recommendation',
    cardTint: 'border-[#EAD0A1] bg-[#FDF4E6]/70 text-[#7B5212]'
  },
  expert_review_required: {
    stripe: 'bg-[#B79A5B]',
    heading: 'Clinical Expert Review Required',
    cardTint: 'border-[#EAD0A1] bg-[#FDF4E6]/70 text-[#7B5212]'
  },
  caution: {
    stripe: 'bg-[#B79A5B]',
    heading: 'Caution Advised Pending Review',
    cardTint: 'border-[#EAD0A1] bg-[#FDF4E6]/70 text-[#7B5212]'
  },
  insufficient_evidence: {
    stripe: 'bg-[#758078]',
    heading: 'Insufficient Evidence for Clinical Clearance',
    cardTint: 'border-[#DDE4DE] bg-[#F7F5EE] text-[#4C5750]'
  },
  out_of_domain: {
    stripe: 'bg-[#B79A5B]',
    heading: 'Outside Ayurvedic Clinical Domain',
    cardTint: 'border-[#EAD0A1] bg-[#FDF4E6]/70 text-[#7B5212]'
  },
  verified: {
    stripe: 'bg-[#173D32]',
    heading: 'Verified Assessment Record',
    cardTint: 'border-[#B8DEC9] bg-[#E8F5EE]/50 text-[#1D6347]'
  },
  uncertain: {
    stripe: 'bg-[#B79A5B]',
    heading: 'Uncertain Evidence Status',
    cardTint: 'border-[#EAD0A1] bg-[#FDF4E6]/70 text-[#7B5212]'
  },
  unverified: {
    stripe: 'bg-[#356B91]',
    heading: 'Unverified Catalog Record',
    cardTint: 'border-[#C6D8E6] bg-[#EEF3F7]/70 text-[#2C5877]'
  }
};

const COVERAGE_STYLE: Record<
  CoverageRow['status'],
  { label: string; classes: string; Icon: React.ComponentType<{ className?: string }> }
> = {
  assessed: {
    label: 'assessed',
    classes: 'bg-[#E8F5EE] text-[#1D6347] border-[#B8DEC9]',
    Icon: CheckCircle2
  },
  not_applicable: {
    label: 'not applicable',
    classes: 'bg-[#E8EFE8] text-[#164B45] border-[#C9D8CC]',
    Icon: Info
  },
  not_assessed: {
    label: 'not assessed',
    classes: 'bg-[#F2F4F2] text-[#4C5750] border-[#D3DBD4]',
    Icon: HelpCircle
  },
  insufficient_evidence: {
    label: 'insufficient evidence',
    classes: 'bg-[#F7F5EE] text-[#5B6660] border-[#DDE4DE]',
    Icon: Info
  },
  requires_expert_review: {
    label: 'requires expert review',
    classes: 'bg-[#FDF4E6] text-[#945F14] border-[#EAD0A1]',
    Icon: AlertTriangle
  },
  conflicting_evidence: {
    label: 'conflicting evidence',
    classes: 'bg-[#FBEAEA] text-[#9A2E2E] border-[#E7BABA]',
    Icon: ShieldAlert
  }
};

const VERIFICATION_STYLE: Record<
  LedgerEntry['verification'],
  { label: string; classes: string }
> = {
  source_traceable: {
    label: 'source traceable',
    classes: 'bg-[#E8F5EE] text-[#1D6347] border-[#B8DEC9]'
  },
  self_reported: {
    label: 'self reported',
    classes: 'bg-[#E8EFE8] text-[#164B45] border-[#C9D8CC]'
  },
  unverified: {
    label: 'unverified',
    classes: 'bg-[#FDF4E6] text-[#945F14] border-[#EAD0A1]'
  },
  missing_provenance: {
    label: 'missing provenance',
    classes: 'bg-[#FBEAEA] text-[#9A2E2E] border-[#E7BABA]'
  }
};

const RULE_OUTCOME_STYLE: Record<PolicyRule['outcome'], string> = {
  blocked: 'bg-[#FBEAEA] text-[#9A2E2E] border-[#E7BABA]',
  restricted: 'bg-[#FDF4E6] text-[#945F14] border-[#EAD0A1]',
  expert_review_required: 'bg-[#FDF4E6] text-[#945F14] border-[#EAD0A1]',
  permitted: 'bg-[#E8F5EE] text-[#1D6347] border-[#B8DEC9]'
};

function formatLedgerTitle(entry: LedgerEntry): string {
  if (entry.kind === 'rule') return 'Approved clinical policy rule';
  if (entry.method === 'registry') return 'Clinical safety policy check';
  return entry.title || 'Source title unavailable';
}

function formatLedgerLocation(entry: LedgerEntry): string {
  if (entry.kind === 'rule' || entry.method === 'registry') {
    return 'Clinical policy registry';
  }
  if (!entry.location) return 'Location unavailable';
  if (entry.kind === 'patient') {
    return entry.location.replaceAll('_', ' ');
  }
  if (entry.location.startsWith('condition:')) {
    return `Condition: ${entry.location.slice('condition:'.length)}`;
  }
  if (entry.location.startsWith('season:')) {
    return `Season: ${entry.location.slice('season:'.length)}`;
  }
  return entry.location;
}

export const AIAssessmentScreen: React.FC<AIAssessmentScreenProps> = ({
  consultation,
  allConsultations,
  onSelectConsultation,
  onNavigate,
  isLoading = false,
  error = null,
  onRetry
}) => {
  const [ledgerFilter, setLedgerFilter] = useState<LedgerFilter>('all');
  const [activeEvidenceId, setActiveEvidenceId] = useState<string | null>(null);

  const assessment = consultation?.assessment;

  const ledgerRefMap = useMemo(() => {
    const map = new Map<string, { refNumber: number; title: string; location: string }>();
    const entries = assessment?.ledger ?? [];
    entries.forEach((entry, index) => {
      map.set(entry.id, {
        refNumber: index + 1,
        title: formatLedgerTitle(entry),
        location: formatLedgerLocation(entry)
      });
    });
    return map;
  }, [assessment]);

  const filteredLedger = useMemo(() => {
    const entries = assessment?.ledger ?? [];
    switch (ledgerFilter) {
      case 'source_traceable':
        return entries.filter(e => e.verification === 'source_traceable');
      case 'derived':
        return entries.filter(
          e => e.kind === 'derived' || e.kind === 'rule' || e.kind === 'interpretation'
        );
      case 'patient':
        return entries.filter(e => e.kind === 'patient');
      case 'missing_provenance':
        return entries.filter(e => e.verification === 'missing_provenance');
      case 'all':
      default:
        return entries;
    }
  }, [assessment, ledgerFilter]);

  const ledgerCounts = useMemo(() => {
    const entries = assessment?.ledger ?? [];
    return {
      all: entries.length,
      source_traceable: entries.filter(e => e.verification === 'source_traceable').length,
      derived: entries.filter(
        e => e.kind === 'derived' || e.kind === 'rule' || e.kind === 'interpretation'
      ).length,
      patient: entries.filter(e => e.kind === 'patient').length,
      missing_provenance: entries.filter(e => e.verification === 'missing_provenance').length
    };
  }, [assessment]);

  const coverageSummary = useMemo(() => {
    const rows = assessment?.verdict.coverage ?? [];
    return {
      assessed: rows.filter(r => r.status === 'assessed').length,
      notApplicable: rows.filter(r => r.status === 'not_applicable').length,
      gaps: rows.filter(
        r => r.status === 'not_assessed' || r.status === 'insufficient_evidence'
      ).length,
      review: rows.filter(
        r => r.status === 'requires_expert_review' || r.status === 'conflicting_evidence'
      ).length
    };
  }, [assessment]);

  const renderRefLinks = (ids: string[]) => {
    if (!ids.length) return null;
    return (
      <div className="flex flex-wrap items-center gap-1.5 pt-1">
        {ids.map(id => {
          const active = activeEvidenceId === id;
          const refInfo = ledgerRefMap.get(id);
          const label = refInfo ? `Ref #${refInfo.refNumber}` : 'Evidence ref';
          const tooltip = refInfo ? `${label}: ${refInfo.title} (${refInfo.location})` : label;
          return (
            <a
              key={id}
              href={`#${id}`}
              title={tooltip}
              onClick={() => {
                setLedgerFilter('all');
                setActiveEvidenceId(id);
              }}
              className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md border text-[11px] font-medium transition ${
                active
                  ? 'bg-[#173D32] text-white border-[#173D32]'
                  : 'bg-[#F7F5EE] text-[#164B45] border-[#DDE4DE] hover:bg-[#E8EFE8] hover:border-[#A8B8A0]'
              }`}
            >
              <span>{label}</span>
            </a>
          );
        })}
      </div>
    );
  };

  const headerActions = (
    <div className="flex flex-wrap items-center gap-2.5">
      {allConsultations.length > 1 && consultation && (
        <label className="inline-flex items-center gap-2 bg-white border border-[#DDE4DE] rounded-lg px-3 py-1.5 text-xs font-medium text-[#26332D]">
          <span className="text-[#758078]">Consultation</span>
          <select
            aria-label="Consultation"
            value={consultation.id}
            onChange={event => {
              const item = allConsultations.find(c => c.id === event.target.value);
              if (item) {
                setActiveEvidenceId(null);
                setLedgerFilter('all');
                onSelectConsultation?.(item);
              }
            }}
            className="bg-transparent text-xs font-semibold text-[#173D32] max-w-[200px] truncate focus:outline-none cursor-pointer"
          >
            {allConsultations.map(c => (
              <option value={c.id} key={c.id}>
                {c.querySummary}
              </option>
            ))}
          </select>
        </label>
      )}
      <button
        type="button"
        onClick={() => onNavigate?.('consultation')}
        className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-white border border-[#DDE4DE] text-xs font-medium text-[#26332D] hover:bg-[#E8EFE8]/60 transition cursor-pointer"
      >
        <ArrowLeft className="w-3.5 h-3.5 text-[#173D32]" />
        <span>Consultation</span>
      </button>
      <button
        type="button"
        onClick={() => onNavigate?.('agents')}
        className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-[#173D32] text-white text-xs font-medium hover:bg-[#164B45] transition cursor-pointer"
      >
        <Cpu className="w-3.5 h-3.5" />
        <span>View execution stages</span>
      </button>
    </div>
  );

  if (isLoading) {
    return (
      <div className="space-y-6">
        <PageHeader
          eyebrow="Evidence & Provenance Audit"
          title="AI Assessment"
          description="Evaluating policy rules, evidence references, and clinical safety coverage."
          actions={headerActions}
        />
        <LoadingPanel
          title="Loading clinical assessment…"
          description="Preparing retrieved records, deterministic rule checks, and coverage boundaries for this consultation."
        />
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-6">
        <PageHeader
          eyebrow="Evidence & Provenance Audit"
          title="AI Assessment"
          description="Inspect the policy verdict, source citations, and explicit coverage gaps for a live consultation."
          actions={headerActions}
        />
        <ErrorPanel
          title="Assessment unavailable"
          message={error}
          onRetry={onRetry}
        />
      </div>
    );
  }

  if (!consultation) {
    return (
      <div className="space-y-6">
        <PageHeader
          eyebrow="Evidence & Provenance Audit"
          title="AI Assessment"
          description="Review the policy verdict, supporting or opposing source citations, and coverage gaps from a live consultation."
        />
        <EmptyPanel
          title="No assessment selected"
          description="Run a consultation to review its policy verdict, safety coverage dimensions, and attributable evidence ledger."
          icon={<Scale className="w-5 h-5" />}
          action={
            <button
              type="button"
              onClick={() => onNavigate?.('consultation')}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg bg-[#173D32] text-white text-xs font-medium hover:bg-[#164B45] transition cursor-pointer"
            >
              <span>Start Consultation</span>
            </button>
          }
        />
      </div>
    );
  }

  const verdictMeta = VERDICT_META[consultation.status] ?? VERDICT_META.insufficient_evidence;
  const isInsufficient = consultation.status === 'insufficient_evidence';
  const showExpertNotice =
    Boolean(assessment?.verdict.expertReview) &&
    consultation.status !== 'expert_review_required';
  const showNoSelectionNotice = Boolean(
    assessment && !assessment.findings.length && !assessment.verdict.rules.length
  );

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Evidence & Provenance Audit"
        badge={<SafetyBadge status={consultation.status} />}
        title="AI Assessment"
        description="Deterministic policy verdict grounded in retrieved ledger records, explicit evidence references, and remaining coverage gaps."
        actions={headerActions}
      />

      {/* Consultation Context Strip */}
      <section
        aria-label="Consultation inquiry and context"
        className="bg-[#E8EFE8]/50 border border-[#DDE4DE] rounded-xl px-5 py-4 flex flex-col md:flex-row md:items-center justify-between gap-3"
      >
        <div className="space-y-1 min-w-0">
          <div className="flex flex-wrap items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.06em] text-[#164B45]">
            <span>Patient Inquiry</span>
            <span className="text-[#A8B8A0]">•</span>
            <span className="font-normal normal-case tracking-normal text-[#758078] tabular-nums">
              {consultation.timestamp}
            </span>
          </div>
          <p className="text-sm font-medium text-[#26332D] leading-snug break-words">
            {consultation.fullQuery || consultation.querySummary || 'Consultation inquiry'}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2 shrink-0">
          <span className="px-2.5 py-1 rounded-md bg-white border border-[#DDE4DE] text-xs text-[#26332D]">
            <span className="text-[#758078]">Prakriti:</span>{' '}
            <strong className="font-medium">
              {consultation.prakritiSnapshot || 'Not reported'}
            </strong>
          </span>
          <span className="px-2.5 py-1 rounded-md bg-white border border-[#DDE4DE] text-xs text-[#26332D]">
            <span className="text-[#758078]">Season:</span>{' '}
            <strong className="font-medium">
              {consultation.seasonSnapshot || 'Not reported'}
            </strong>
          </span>
          {consultation.herbsEvaluated.length > 0 ? (
            consultation.herbsEvaluated.map(herb => (
              <span
                key={herb}
                className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-[#E8EFE8] border border-[#C9D8CC] text-xs font-medium text-[#173D32]"
              >
                <Sparkles className="w-3 h-3" />
                {herb}
              </span>
            ))
          ) : (
            <span className="px-2.5 py-1 rounded-md bg-[#F7F5EE] border border-[#DDE4DE] text-xs text-[#758078]">
              No cataloged herbs identified
            </span>
          )}
        </div>
      </section>

      {/* Primary Verdict Lead Card */}
      <section className="relative overflow-hidden bg-white border border-[#DDE4DE] rounded-xl shadow-[0_1px_3px_rgba(38,51,45,0.04)]">
        <div className={`absolute left-0 top-0 bottom-0 w-1.5 ${verdictMeta.stripe}`} />

        <div className="p-5 sm:p-7 pl-6 sm:pl-8 space-y-5">
          {/* Top badges & policy metadata */}
          <div className="flex flex-col lg:flex-row lg:items-start justify-between gap-4 pb-4 border-b border-[#DDE4DE]">
            <div className="space-y-2.5">
              <div className="flex flex-wrap items-center gap-2">
                <SafetyBadge status={consultation.status} size="md" />
                <span className="px-2.5 py-0.5 rounded-md bg-[#F7F5EE] border border-[#DDE4DE] font-mono text-[11px] font-medium text-[#26332D]">
                  {consultation.verdictLabel}
                </span>
                {showExpertNotice && (
                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-[#FDF4E6] border border-[#EAD0A1] text-[11px] font-semibold text-[#945F14]">
                    <UserCheck className="w-3 h-3" />
                    Clinical expert review required
                  </span>
                )}
              </div>

              <h2 className="font-editorial text-xl sm:text-2xl font-semibold text-[#26332D] tracking-tight leading-snug">
                {verdictMeta.heading}
              </h2>
            </div>

            {assessment && (
              <div className="flex flex-wrap items-center gap-2 shrink-0 text-xs">
                <div className="px-3 py-2 rounded-lg bg-[#F7F5EE] border border-[#DDE4DE] text-center min-w-[76px]">
                  <p className="text-[10px] uppercase tracking-wider text-[#758078] font-medium">
                    Assessed
                  </p>
                  <p className="text-base font-semibold tabular-nums text-[#173D32]">
                    {coverageSummary.assessed}
                  </p>
                </div>
                {coverageSummary.notApplicable > 0 && (
                  <div className="px-3 py-2 rounded-lg bg-[#F7F5EE] border border-[#DDE4DE] text-center min-w-[88px]">
                    <p className="text-[10px] uppercase tracking-wider text-[#758078] font-medium">
                      Not applicable
                    </p>
                    <p className="text-base font-semibold tabular-nums text-[#164B45]">
                      {coverageSummary.notApplicable}
                    </p>
                  </div>
                )}
                <div className="px-3 py-2 rounded-lg bg-[#F7F5EE] border border-[#DDE4DE] text-center min-w-[76px]">
                  <p className="text-[10px] uppercase tracking-wider text-[#758078] font-medium">
                    Gaps
                  </p>
                  <p className="text-base font-semibold tabular-nums text-[#4C5750]">
                    {coverageSummary.gaps}
                  </p>
                </div>
                <div className="px-3 py-2 rounded-lg bg-[#F7F5EE] border border-[#DDE4DE] text-center min-w-[76px]">
                  <p className="text-[10px] uppercase tracking-wider text-[#758078] font-medium">
                    Records
                  </p>
                  <p className="text-base font-semibold tabular-nums text-[#26332D]">
                    {assessment.ledger.length}
                  </p>
                </div>
              </div>
            )}
          </div>

          {/* Clinical Guidance Summary */}
          <p className="text-sm text-[#26332D] leading-relaxed">{consultation.clinicalSummary}</p>

          {/* Insufficient Evidence Boundary Callout */}
          {(isInsufficient || showNoSelectionNotice) && (
            <div
              role="status"
              className="rounded-lg border border-[#B79A5B]/45 bg-[#F7F5EE] p-4 flex items-start gap-3"
            >
              <Info className="w-4 h-4 text-[#B79A5B] shrink-0 mt-0.5" />
              <div className="space-y-1 text-xs text-[#26332D]">
                <p className="font-semibold text-[#173D32]">
                  Safety clearance has not been established
                </p>
                <p className="text-[#5B6660] leading-relaxed">
                  {isInsufficient
                    ? 'Available source evidence and reported clinical context are insufficient for an affirmative recommendation. Unassessed dimensions remain visible below.'
                    : 'No specialist findings or policy rule triggers were emitted for this query. Missing evidence never implies safety.'}
                </p>
              </div>
            </div>
          )}

          {/* Safety Warnings */}
          {consultation.safetyWarnings.length > 0 && (
            <div className={`rounded-lg border p-4 space-y-2 ${verdictMeta.cardTint}`}>
              <div className="flex items-center gap-2 text-xs font-semibold">
                <AlertTriangle className="w-4 h-4 shrink-0" />
                <span>Priority Safety Warnings &amp; Restrictions</span>
              </div>
              <ul className="list-disc pl-5 space-y-1 text-xs leading-relaxed">
                {consultation.safetyWarnings.map((warning, idx) => (
                  <li key={`${warning}-${idx}`}>{warning}</li>
                ))}
              </ul>
            </div>
          )}

          {/* Triggered Policy Rules */}
          {assessment && assessment.verdict.rules.length > 0 && (
            <div className="space-y-2.5 pt-1">
              <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-[#758078]">
                <Scale className="w-3.5 h-3.5 text-[#173D32]" />
                <span>Triggered Policy Rules ({assessment.verdict.rules.length})</span>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {assessment.verdict.rules.map((rule, idx) => (
                  <div
                    key={`${rule.ruleId}-${rule.version}-${idx}`}
                    className="rounded-lg border border-[#DDE4DE] bg-[#F7F5EE]/60 p-3.5 space-y-2"
                  >
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <span className="text-xs font-semibold text-[#173D32]">
                        Policy rule #{idx + 1}
                      </span>
                      <span
                        className={`px-2 py-0.5 rounded-full border text-[11px] font-medium whitespace-nowrap capitalize ${
                          RULE_OUTCOME_STYLE[rule.outcome]
                        }`}
                      >
                        {rule.outcome.replaceAll('_', ' ')}
                      </span>
                    </div>
                    <p className="text-xs text-[#26332D] leading-relaxed">{rule.description}</p>
                    {renderRefLinks(rule.evidenceIds)}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Missing Information (fallback when assessment missing or additional missing coverage notes) */}
          {consultation.missingInformation.length > 0 && (
            <div className="rounded-lg border border-[#DDE4DE] bg-[#F7F5EE]/70 p-4 space-y-2">
              <div className="flex items-center gap-2 text-xs font-semibold text-[#26332D]">
                <HelpCircle className="w-4 h-4 text-[#B79A5B] shrink-0" />
                <span>Missing Coverage &amp; Unverified Scope</span>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {consultation.missingInformation.map((note, idx) => (
                  <span
                    key={`${note}-${idx}`}
                    className="px-2.5 py-1 rounded-md bg-white border border-[#DDE4DE] text-xs text-[#4C5750] capitalize"
                  >
                    {formatMissingNote(note)}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      </section>

      {/* Main 2-Column Audit Workspace (Findings & Coverage on Left, Evidence Ledger on Right) */}
      {assessment && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* Left Column (7 cols): Findings + Assessment Coverage */}
          <div className="lg:col-span-7 space-y-6">
            {/* Evidence Findings */}
            <section className="bg-white border border-[#DDE4DE] rounded-xl p-5 sm:p-6 space-y-4 shadow-[0_1px_3px_rgba(38,51,45,0.03)]">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3.5 border-b border-[#DDE4DE]">
                <div className="flex items-center gap-2">
                  <GitBranch className="w-4 h-4 text-[#173D32]" />
                  <div>
                    <h2 className="font-editorial text-lg font-semibold text-[#26332D]">
                      Evidence Findings
                    </h2>
                    <p className="text-xs text-[#758078]">
                      Records selected for consideration and deterministic source conflicts
                    </p>
                  </div>
                </div>
                <span className="self-start sm:self-auto px-2.5 py-1 rounded-full bg-[#F7F5EE] border border-[#DDE4DE] text-[11px] font-medium text-[#26332D] tabular-nums">
                  {assessment.findings.length}{' '}
                  {assessment.findings.length === 1 ? 'finding' : 'findings'}
                </span>
              </div>

              {!assessment.findings.length ? (
                <div className="rounded-lg border border-dashed border-[#A8B8A0] bg-[#F7F5EE]/70 p-5 text-center space-y-1">
                  <p className="text-xs font-semibold text-[#26332D]">
                    No evidence was selected. Safety remains unestablished.
                  </p>
                  <p className="text-[11px] text-[#758078]">
                    Neither supporting nor opposing citations were linked to specialist findings for this consultation.
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  {assessment.findings.map((finding, idx) => {
                    const isOpponent = finding.role === 'opponent';
                    const isConflict = finding.category === 'conflict';
                    const cardClasses = isConflict
                      ? 'border-[#E7BABA] bg-[#FBEAEA]/45'
                      : isOpponent
                      ? 'border-[#EAD0A1] bg-[#FDF4E6]/50'
                      : 'border-[#C9D8CC] bg-[#E8EFE8]/40';
                    const roleBadgeClasses = isConflict
                      ? 'bg-[#FBEAEA] text-[#9A2E2E] border-[#E7BABA]'
                      : isOpponent
                      ? 'bg-[#FDF4E6] text-[#945F14] border-[#EAD0A1]'
                      : 'bg-[#E8F5EE] text-[#1D6347] border-[#B8DEC9]';

                    return (
                      <article
                        key={`${finding.role}-${finding.category}-${idx}`}
                        className={`rounded-lg border p-4 space-y-2 ${cardClasses}`}
                      >
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <span
                            className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full border text-[11px] font-semibold ${roleBadgeClasses}`}
                          >
                            {isConflict ? (
                              <ShieldAlert className="w-3 h-3" />
                            ) : isOpponent ? (
                              <AlertTriangle className="w-3 h-3" />
                            ) : (
                              <ShieldCheck className="w-3 h-3" />
                            )}
                            <span>{findingDisplayLabel(finding)}</span>
                          </span>
                          <span className="text-[11px] text-[#758078] tabular-nums">
                            {finding.evidenceIds.length}{' '}
                            {finding.evidenceIds.length === 1 ? 'citation' : 'citations'}
                          </span>
                        </div>
                        <p className="text-xs sm:text-sm text-[#26332D] leading-relaxed">
                          {finding.text}
                        </p>
                        {renderRefLinks(finding.evidenceIds)}
                      </article>
                    );
                  })}
                </div>
              )}
            </section>

            {/* Assessment Coverage */}
            <section className="bg-white border border-[#DDE4DE] rounded-xl p-5 sm:p-6 space-y-4 shadow-[0_1px_3px_rgba(38,51,45,0.03)]">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3.5 border-b border-[#DDE4DE]">
                <div className="flex items-center gap-2">
                  <Layers className="w-4 h-4 text-[#173D32]" />
                  <div>
                    <h2 className="font-editorial text-lg font-semibold text-[#26332D]">
                      Assessment coverage
                    </h2>
                    <p className="text-xs text-[#758078]">
                      Dimensional audit across patient history, interactions, sources, and review flags
                    </p>
                  </div>
                </div>
                <div className="flex flex-wrap items-center gap-1.5 text-[11px]">
                  <span className="px-2 py-0.5 rounded bg-[#E8F5EE] text-[#1D6347] border border-[#B8DEC9] font-medium tabular-nums">
                    {coverageSummary.assessed} assessed
                  </span>
                  {coverageSummary.notApplicable > 0 && (
                    <span className="px-2 py-0.5 rounded bg-[#E8EFE8] text-[#164B45] border border-[#C9D8CC] font-medium tabular-nums">
                      {coverageSummary.notApplicable} not applicable
                    </span>
                  )}
                  <span className="px-2 py-0.5 rounded bg-[#F2F4F2] text-[#4C5750] border border-[#D3DBD4] font-medium tabular-nums">
                    {coverageSummary.gaps} gaps
                  </span>
                  {coverageSummary.review > 0 && (
                    <span className="px-2 py-0.5 rounded bg-[#FDF4E6] text-[#945F14] border border-[#EAD0A1] font-medium tabular-nums">
                      {coverageSummary.review} review
                    </span>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {assessment.verdict.coverage.map(row => {
                  const cfg = COVERAGE_STYLE[row.status] ?? COVERAGE_STYLE.insufficient_evidence;
                  const Icon = cfg.Icon;
                  return (
                    <div
                      key={row.dimension}
                      className="rounded-lg border border-[#DDE4DE] bg-[#F7F5EE]/50 p-3.5 flex flex-col justify-between gap-2.5"
                    >
                      <div className="space-y-1.5">
                        <div className="flex flex-wrap items-start justify-between gap-2">
                          <strong className="text-xs font-semibold text-[#26332D] capitalize">
                            {formatCoverageDimension(row.dimension)}
                          </strong>
                          <span
                            className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full border text-[11px] font-medium whitespace-nowrap ${cfg.classes}`}
                          >
                            <Icon className="w-3 h-3 shrink-0" />
                            <span>{row.status.replaceAll('_', ' ')}</span>
                          </span>
                        </div>
                        <p className="text-xs text-[#5B6660] leading-relaxed">{row.reason}</p>
                        {row.missing.length > 0 && (
                          <div className="flex flex-wrap gap-1 pt-0.5">
                            {row.missing.map((note, idx) => (
                              <span
                                key={`${note}-${idx}`}
                                className="px-2 py-0.5 rounded bg-white border border-[#DDE4DE] text-[11px] text-[#758078]"
                              >
                                Missing: {formatMissingNote(note)}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                      {renderRefLinks(row.evidenceIds)}
                    </div>
                  );
                })}
              </div>
            </section>
          </div>

          {/* Right Column (5 cols): Source Provenance & Evidence Ledger */}
          <aside className="lg:col-span-5 lg:sticky lg:top-6 space-y-4">
            <section className="bg-white border border-[#DDE4DE] rounded-xl p-5 sm:p-6 space-y-4 shadow-[0_1px_3px_rgba(38,51,45,0.03)]">
              <div className="flex flex-col gap-3 pb-3.5 border-b border-[#DDE4DE]">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <BookOpen className="w-4 h-4 text-[#173D32]" />
                    <div>
                      <h2 className="font-editorial text-lg font-semibold text-[#26332D]">
                        Evidence ledger
                      </h2>
                      <p className="text-xs text-[#758078]">
                        Consultation-scoped provenance records and excerpts
                      </p>
                    </div>
                  </div>
                  <span className="px-2.5 py-0.5 rounded-full bg-[#E8EFE8] border border-[#C9D8CC] text-[11px] font-semibold text-[#173D32] tabular-nums shrink-0">
                    {assessment.ledger.length}{' '}
                    {assessment.ledger.length === 1 ? 'record' : 'records'}
                  </span>
                </div>

                {/* Filter pills */}
                {assessment.ledger.length > 0 && (
                  <div className="flex flex-wrap items-center gap-1.5 pt-1">
                    <Filter className="w-3 h-3 text-[#758078] mr-0.5 shrink-0" />
                    {(
                      [
                        ['all', `All (${ledgerCounts.all})`],
                        ['source_traceable', `Source (${ledgerCounts.source_traceable})`],
                        ['derived', `Derived & Policy (${ledgerCounts.derived})`],
                        ['patient', `Patient (${ledgerCounts.patient})`],
                        ['missing_provenance', `Missing (${ledgerCounts.missing_provenance})`]
                      ] as const
                    ).map(([key, label]) => (
                      <button
                        key={key}
                        type="button"
                        onClick={() => setLedgerFilter(key)}
                        className={`px-2.5 py-1 rounded-md border text-[11px] font-medium transition cursor-pointer ${
                          ledgerFilter === key
                            ? 'bg-[#173D32] text-white border-[#173D32]'
                            : 'bg-[#F7F5EE]/70 text-[#26332D] border-[#DDE4DE] hover:bg-[#E8EFE8]'
                        }`}
                      >
                        {label}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {assessment.ledger.some(e => e.kind === 'association') && (
                <div className="rounded-lg border border-[#EAD0A1] bg-[#FDF4E6]/60 px-3.5 py-2.5 flex items-start gap-2 text-[11px] text-[#7B5212]">
                  <Info className="w-3.5 h-3.5 shrink-0 mt-0.5 text-[#945F14]" />
                  <span>
                    IMPPAT reported-use entries document historical database associations and do not independently establish clinical efficacy or patient safety.
                  </span>
                </div>
              )}

              {!filteredLedger.length ? (
                <div className="rounded-lg border border-dashed border-[#A8B8A0] bg-[#F7F5EE]/70 p-5 text-center space-y-1">
                  <p className="text-xs font-medium text-[#26332D]">
                    {assessment.ledger.length === 0
                      ? 'No records retrieved.'
                      : 'No ledger records match the active filter.'}
                  </p>
                  {ledgerFilter !== 'all' && assessment.ledger.length > 0 && (
                    <button
                      type="button"
                      onClick={() => setLedgerFilter('all')}
                      className="text-[11px] font-medium text-[#164B45] underline underline-offset-2 cursor-pointer"
                    >
                      Show all records
                    </button>
                  )}
                </div>
              ) : (
                <div className="space-y-3">
                  {filteredLedger.map(entry => {
                    const verCfg = VERIFICATION_STYLE[entry.verification];
                    const isFocused = activeEvidenceId === entry.id;
                    const refInfo = ledgerRefMap.get(entry.id);
                    const displayTitle = refInfo?.title ?? formatLedgerTitle(entry);
                    const displayLocation = refInfo?.location ?? formatLedgerLocation(entry);
                    const safeMetadata = SAFE_METADATA_FIELDS.flatMap(({ key, label }) => {
                      const rawValue = entry.metadata[key];
                      if (rawValue === undefined || rawValue === null || rawValue === '') {
                        return [];
                      }
                      return [{ key, label, value: String(rawValue) }];
                    });

                    return (
                      <article
                        key={entry.id}
                        id={entry.id}
                        onClick={() => setActiveEvidenceId(entry.id)}
                        className={`rounded-xl border p-4 space-y-2.5 transition ${
                          isFocused
                            ? 'border-[#173D32] ring-2 ring-[#B79A5B]/50 bg-[#E8EFE8]/35'
                            : 'border-[#DDE4DE] bg-[#F7F5EE]/45 hover:border-[#A8B8A0]'
                        }`}
                      >
                        <div className="flex flex-wrap items-start justify-between gap-2">
                          <div className="space-y-1 min-w-0">
                            <div className="flex flex-wrap items-center gap-1.5">
                              <Database className="w-3.5 h-3.5 text-[#164B45] shrink-0" />
                              <strong className="text-xs font-semibold text-[#26332D] break-words">
                                {displayTitle}
                              </strong>
                            </div>
                            <div className="flex flex-wrap items-center gap-1.5 text-[10px] font-medium text-[#758078]">
                              {refInfo && (
                                <span className="px-1.5 py-0.5 rounded bg-[#E8EFE8] border border-[#C9D8CC] text-[#173D32] font-semibold">
                                  Ref #{refInfo.refNumber}
                                </span>
                              )}
                              <span className="px-1.5 py-0.5 rounded bg-white border border-[#DDE4DE] text-[#26332D]">
                                {ENTRY_KIND_LABEL[entry.kind]}
                              </span>
                            </div>
                          </div>

                          <span
                            className={`px-2 py-0.5 rounded-full border text-[10px] font-semibold whitespace-nowrap ${verCfg.classes}`}
                          >
                            {verCfg.label}
                          </span>
                        </div>

                        {entry.fact && (
                          <div className="flex flex-wrap items-center gap-1.5 text-[11px] bg-white border border-[#DDE4DE] rounded-md px-2.5 py-1.5 text-[#26332D]">
                            <span className="font-semibold text-[#173D32]">{entry.fact.subject}</span>
                            <span className="text-[10px] font-medium lowercase px-1.5 py-0.5 rounded bg-[#E8EFE8] text-[#164B45]">
                              {entry.fact.predicate.replaceAll('_', ' ')}
                            </span>
                            <span className="font-medium">{entry.fact.object}</span>
                          </div>
                        )}

                        <blockquote className="rounded-lg bg-white border border-[#DDE4DE] border-l-2 border-l-[#164B45] px-3 py-2 text-xs text-[#26332D] leading-relaxed break-words">
                          {entry.excerpt}
                        </blockquote>

                        <div className="space-y-1.5 text-[11px] text-[#5B6660]">
                          <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                            <span className="inline-flex items-center gap-1">
                              <FileText className="w-3 h-3 text-[#758078]" />
                              <span>{displayLocation}</span>
                            </span>
                          </div>

                          {safeMetadata.length > 0 && (
                            <div className="flex flex-wrap gap-1.5 pt-0.5">
                              {safeMetadata.map(({ key, label, value }) => (
                                <span
                                  key={key}
                                  className="px-2 py-0.5 rounded bg-white border border-[#DDE4DE] text-[10px] text-[#4C5750]"
                                >
                                  <strong className="font-medium text-[#26332D]">{label}:</strong>{' '}
                                  {value}
                                </span>
                              ))}
                            </div>
                          )}
                        </div>
                      </article>
                    );
                  })}
                </div>
              )}
            </section>
          </aside>
        </div>
      )}

      {/* Disclaimer Footer */}
      {consultation.disclaimer && (
        <footer className="bg-[#F7F5EE] border border-[#DDE4DE] rounded-xl px-4 py-3 flex items-start gap-2.5 text-xs text-[#758078]">
          <Info className="w-4 h-4 text-[#164B45] shrink-0 mt-0.5" />
          <p className="leading-relaxed">{consultation.disclaimer}</p>
        </footer>
      )}
    </div>
  );
};
