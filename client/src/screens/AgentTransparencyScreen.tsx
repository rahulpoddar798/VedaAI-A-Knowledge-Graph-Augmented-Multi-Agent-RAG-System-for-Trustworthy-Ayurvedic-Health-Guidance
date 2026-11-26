import React, { useMemo } from 'react';
import {
  AlertTriangle,
  ArrowLeft,
  ArrowRight,
  BookOpen,
  CheckCircle2,
  ClipboardCheck,
  Database,
  FileSearch,
  Info,
  Layers,
  Scale,
  Search,
  ShieldAlert,
  ShieldCheck,
  SkipForward,
  Sparkles,
  UserCheck
} from 'lucide-react';
import { PageHeader } from '../components/ui/PageHeader';
import { SafetyBadge } from '../components/ui/SafetyBadge';
import { EmptyPanel, ErrorPanel, LoadingPanel } from '../components/ui/StatePanels';
import type { ConsultationRecord, EvidenceAssessment, ScreenId } from '../types/veda';

interface AgentTransparencyScreenProps {
  consultation: ConsultationRecord | null;
  onNavigate?: (screen: ScreenId) => void;
  isLoading?: boolean;
  error?: string | null;
  onRetry?: () => void;
}

type StageEntry = EvidenceAssessment['stages'][number];
type StageStatus = StageEntry['status'];
type LedgerEntry = EvidenceAssessment['ledger'][number];

interface StagePresentation {
  title: string;
  roleTag: string;
  Icon: React.ComponentType<{ className?: string }>;
  descriptions: Partial<Record<StageStatus, string>>;
}

const SOURCE_STAGES = new Set(['graph', 'reported uses', 'documents']);

const STAGE_PRESENTATIONS: Record<string, StagePresentation> = {
  intake: {
    title: 'Consultation intake & patient context',
    roleTag: 'Deterministic validation',
    Icon: ClipboardCheck,
    descriptions: {
      completed:
        'Validated your clinical question and captured reported patient context (season, constitution, conditions, allergies, and medications).'
    }
  },
  'entity extraction': {
    title: 'Botanical & clinical term identification',
    roleTag: 'Catalog matching',
    Icon: FileSearch,
    descriptions: {
      completed:
        'Identified canonical herbs and clinical terms from your query using the curated catalog.',
      unavailable:
        'Automated term matching was unavailable; downstream checks rely only on validated profile and inquiry inputs.'
    }
  },
  'retrieval planning': {
    title: 'Evidence retrieval planning',
    roleTag: 'Query scoping',
    Icon: Layers,
    descriptions: {
      completed:
        'Scoped knowledge-graph, botanical table, and document lookups to the identified herbs and patient context.'
    }
  },
  graph: {
    title: 'Knowledge graph safety lookup',
    roleTag: 'Curated knowledge graph',
    Icon: Database,
    descriptions: {
      completed:
        'Retrieved curated herb properties, dosha relationships, and seasonal cautions from the clinical knowledge graph.',
      empty:
        'Queried the clinical knowledge graph; no matching botanical safety relationships applied to this query.',
      unavailable:
        'The knowledge graph service was unavailable during this consultation; graph relationships could not be checked.'
    }
  },
  'reported uses': {
    title: 'Ethnobotanical reported-use tables',
    roleTag: 'Reference database',
    Icon: BookOpen,
    descriptions: {
      completed:
        'Retrieved historical plant-part and therapeutic association entries from curated reference tables.',
      empty:
        'Checked ethnobotanical reported-use tables; no matching association entries applied.',
      unavailable:
        'Ethnobotanical reported-use tables were unavailable during this consultation.'
    }
  },
  documents: {
    title: 'Clinical & classical documents',
    roleTag: 'Textual archive',
    Icon: BookOpen,
    descriptions: {
      completed:
        'Retrieved attributable excerpts from classical Ayurvedic texts and research documents.',
      empty:
        'Searched curated clinical and classical documents; no matching attributable passages were found.',
      unavailable:
        'Reference documents were unavailable during this consultation; textual excerpts could not be consulted.'
    }
  },
  proponent: {
    title: 'Supporting evidence specialist',
    roleTag: 'AI evidence selection',
    Icon: ShieldCheck,
    descriptions: {
      completed:
        'Reviewed source-traceable records and selected supporting citations relevant to your question.',
      skipped:
        'Skipped — no attributable primary-source records were eligible for supporting evidence selection.',
      unavailable:
        'Supporting evidence selection could not run because the language-model service was unavailable.',
      invalid:
        'Supporting evidence output failed strict citation validation and was discarded.'
    }
  },
  opponent: {
    title: 'Critical safety review specialist',
    roleTag: 'AI evidence selection',
    Icon: UserCheck,
    descriptions: {
      completed:
        'Screened retrieved evidence to flag cautions, contradictions, or records requiring practitioner review.',
      skipped:
        'Skipped — no eligible evidence records were retrieved for critical safety screening.',
      unavailable:
        'Critical safety screening could not run because the language-model service was unavailable.',
      invalid:
        'Critical review output failed strict citation validation and was discarded.'
    }
  },
  'coverage and safety checks': {
    title: 'Deterministic safety rules & coverage audit',
    roleTag: 'Application policy code',
    Icon: Scale,
    descriptions: {
      completed:
        'Checked missing clinical dimensions, provenance boundaries, and approved safety policy rules independently of language models.'
    }
  },
  verdict: {
    title: 'Deterministic verdict adjudication',
    roleTag: 'Application policy decision',
    Icon: ShieldCheck,
    descriptions: {
      completed:
        'Computed the final clinical safety status strictly from deterministic policy rules and verified evidence coverage.'
    }
  },
  explanation: {
    title: 'Patient-safe guidance summary',
    roleTag: 'Output validation',
    Icon: Sparkles,
    descriptions: {
      completed:
        'Prepared the structured assessment summary, safety warnings, and verified references for presentation.'
    }
  }
};

function getStageStatusMeta(stageName: string, status: StageStatus): {
  label: string;
  classes: string;
  dotClasses: string;
  Icon: React.ComponentType<{ className?: string }>;
} {
  switch (status) {
    case 'completed':
      return {
        label: 'Completed',
        classes: 'bg-[#E8F5EE] text-[#1D6347] border-[#B8DEC9]',
        dotClasses: 'bg-[#173D32] text-white border-[#173D32]',
        Icon: CheckCircle2
      };
    case 'unavailable':
      return {
        label: SOURCE_STAGES.has(stageName) ? 'Source unavailable' : 'Service unavailable',
        classes: 'bg-[#FBEAEA] text-[#9A2E2E] border-[#E7BABA]',
        dotClasses: 'bg-[#B64040] text-white border-[#B64040]',
        Icon: AlertTriangle
      };
    case 'empty':
      return {
        label: 'No matching records',
        classes: 'bg-[#F2F4F2] text-[#4C5750] border-[#D3DBD4]',
        dotClasses: 'bg-[#758078] text-white border-[#758078]',
        Icon: Search
      };
    case 'skipped':
      return {
        label: 'Skipped (no eligible inputs)',
        classes: 'bg-[#FDF4E6] text-[#945F14] border-[#EAD0A1]',
        dotClasses: 'bg-[#B79A5B] text-white border-[#B79A5B]',
        Icon: SkipForward
      };
    case 'invalid':
      return {
        label: 'Validation rejected',
        classes: 'bg-[#FBEAEA] text-[#9A2E2E] border-[#E7BABA]',
        dotClasses: 'bg-[#B64040] text-white border-[#B64040]',
        Icon: ShieldAlert
      };
  }
}

function getStagePresentation(name: string): StagePresentation {
  if (STAGE_PRESENTATIONS[name]) return STAGE_PRESENTATIONS[name];
  const cleaned = name
    .replaceAll('_', ' ')
    .replace(/\b(proponent|opponent|langgraph|node|judge)\b/gi, 'review');
  return {
    title: cleaned.charAt(0).toUpperCase() + cleaned.slice(1),
    roleTag: 'Assessment step',
    Icon: Layers,
    descriptions: {}
  };
}

function getStageDescription(name: string, status: StageStatus): string {
  const mapped = STAGE_PRESENTATIONS[name]?.descriptions[status];
  if (mapped) return mapped;
  switch (status) {
    case 'completed':
      return 'Step completed successfully using verified consultation inputs.';
    case 'unavailable':
      return 'This source or service was unavailable during the consultation.';
    case 'empty':
      return 'This lookup completed without returning matching records.';
    case 'skipped':
      return 'This step did not run because prerequisite records were not present.';
    case 'invalid':
      return 'Output from this step did not pass structural validation and was rejected.';
  }
}

function formatReadableTitle(entry: LedgerEntry): string {
  if (entry.kind === 'rule') return 'Approved clinical policy rule';
  if (entry.method === 'registry') return 'Clinical safety policy check';
  return entry.title || 'Reference source';
}

function formatReadableLocation(entry: LedgerEntry): string {
  if (entry.kind === 'rule' || entry.method === 'registry') return 'Clinical policy registry';
  if (!entry.location) return 'Unspecified location';
  if (entry.kind === 'patient') return entry.location.replaceAll('_', ' ');
  if (entry.location.startsWith('condition:')) {
    return `Condition: ${entry.location.slice('condition:'.length)}`;
  }
  if (entry.location.startsWith('season:')) {
    return `Season: ${entry.location.slice('season:'.length)}`;
  }
  return entry.location;
}

export const AgentTransparencyScreen: React.FC<AgentTransparencyScreenProps> = ({
  consultation,
  onNavigate,
  isLoading = false,
  error = null,
  onRetry
}) => {
  const assessment = consultation?.assessment;
  const stages = useMemo(() => assessment?.stages ?? [], [assessment]);

  const ledgerRefMap = useMemo(() => {
    const map = new Map<string, { refNumber: number; title: string; location: string; entry: LedgerEntry }>();
    (assessment?.ledger ?? []).forEach((entry, idx) => {
      map.set(entry.id, {
        refNumber: idx + 1,
        title: formatReadableTitle(entry),
        location: formatReadableLocation(entry),
        entry
      });
    });
    return map;
  }, [assessment]);

  const statusCounts = useMemo(() => {
    return {
      total: stages.length,
      completed: stages.filter(s => s.status === 'completed').length,
      unavailable: stages.filter(s => s.status === 'unavailable').length,
      empty: stages.filter(s => s.status === 'empty').length,
      skipped: stages.filter(s => s.status === 'skipped').length,
      invalid: stages.filter(s => s.status === 'invalid').length
    };
  }, [stages]);

  const stageReferences = useMemo(() => {
    const ledger = assessment?.ledger ?? [];
    const findings = assessment?.findings ?? [];

    const refsForEntries = (items: LedgerEntry[]) =>
      items
        .map(item => ledgerRefMap.get(item.id))
        .filter((x): x is NonNullable<typeof x> => Boolean(x));

    const refsForIds = (ids: string[]) =>
      Array.from(new Set(ids))
        .map(id => ledgerRefMap.get(id))
        .filter((x): x is NonNullable<typeof x> => Boolean(x));

    const proponentIds = findings.filter(f => f.role === 'proponent').flatMap(f => f.evidenceIds);
    const reviewIds = findings
      .filter(f => f.role === 'opponent' && f.category === 'review')
      .flatMap(f => f.evidenceIds);

    return {
      intake: refsForEntries(ledger.filter(e => e.kind === 'patient')),
      graph: refsForEntries(ledger.filter(e => e.method === 'graph' && e.kind !== 'association')),
      'reported uses': refsForEntries(ledger.filter(e => e.kind === 'association')),
      documents: refsForEntries(
        ledger.filter(e => e.kind === 'classical' || e.kind === 'research')
      ),
      proponent: refsForIds(proponentIds),
      opponent: refsForIds(reviewIds),
      'coverage and safety checks': refsForEntries(
        ledger.filter(e => e.kind === 'rule' || e.method === 'registry')
      )
    } as Record<string, Array<{ refNumber: number; title: string; location: string; entry: LedgerEntry }>>;
  }, [assessment, ledgerRefMap]);

  const headerActions = (
    <div className="flex flex-wrap items-center gap-2.5">
      <button
        type="button"
        onClick={() => onNavigate?.('consultation')}
        className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-white border border-[#DDE4DE] text-xs font-medium text-[#26332D] hover:bg-[#E8EFE8]/60 transition cursor-pointer"
      >
        <ArrowLeft className="w-3.5 h-3.5 text-[#173D32]" />
        <span>Consultation</span>
      </button>
      {consultation && (
        <button
          type="button"
          onClick={() => onNavigate?.('assessment')}
          className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-[#173D32] text-white text-xs font-medium hover:bg-[#164B45] transition cursor-pointer"
        >
          <span>View AI Assessment</span>
          <ArrowRight className="w-3.5 h-3.5" />
        </button>
      )}
    </div>
  );

  if (isLoading) {
    return (
      <div className="space-y-6">
        <PageHeader
          eyebrow="Clinical Process Audit"
          title="Assessment Journey & Transparency"
          description="Step-by-step execution record from patient intake and source lookups to evidence selection and safety verification."
          actions={headerActions}
        />
        <LoadingPanel
          title="Loading consultation workflow trace…"
          description="Gathering actual source lookups, specialist selection steps, and policy verification outcomes."
        />
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-6">
        <PageHeader
          eyebrow="Clinical Process Audit"
          title="Assessment Journey & Transparency"
          description="Step-by-step execution record from patient intake and source lookups to evidence selection and safety verification."
          actions={headerActions}
        />
        <ErrorPanel title="Process trace unavailable" message={error} onRetry={onRetry} />
      </div>
    );
  }

  if (!consultation) {
    return (
      <div className="space-y-6">
        <PageHeader
          eyebrow="Clinical Process Audit"
          title="Assessment Journey & Transparency"
          description="Inspect how a live consultation gathered evidence, ran specialist selection, and arrived at a deterministic safety verdict."
        />
        <EmptyPanel
          title="No consultation selected"
          description="Run a consultation to review its actual source lookups, AI specialist evidence selection steps, and deterministic rule checks."
          icon={<Layers className="w-5 h-5" />}
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

  const traceableSources = (assessment?.ledger ?? []).filter(
    e => e.verification === 'source_traceable'
  );
  const catalogSources = (assessment?.ledger ?? []).filter(
    e => e.kind === 'derived' && e.method === 'graph'
  );

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Clinical Process Audit"
        badge={<SafetyBadge status={consultation.status} />}
        title="Assessment Journey & Transparency"
        description="Observed execution path for this consultation. Every status below reflects actual runtime results without estimated timings or hidden steps."
        actions={headerActions}
      />

      {/* Consultation Summary Strip */}
      <section className="bg-[#E8EFE8]/50 border border-[#DDE4DE] rounded-xl px-5 py-4 flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div className="space-y-1 min-w-0">
          <div className="flex flex-wrap items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.06em] text-[#164B45]">
            <span>Active Consultation</span>
            {consultation.timestamp && (
              <>
                <span className="text-[#A8B8A0]">•</span>
                <span className="font-normal normal-case tracking-normal text-[#758078] tabular-nums">
                  {consultation.timestamp}
                </span>
              </>
            )}
          </div>
          <p className="text-sm font-medium text-[#26332D] leading-snug break-words">
            {consultation.fullQuery || consultation.querySummary || 'Consultation inquiry'}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2 shrink-0">
          {consultation.herbsEvaluated.length > 0 ? (
            consultation.herbsEvaluated.map(herb => (
              <span
                key={herb}
                className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-white border border-[#C9D8CC] text-xs font-medium text-[#173D32]"
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

      {/* AI vs Deterministic Authority Boundary */}
      <section className="bg-white border border-[#DDE4DE] rounded-xl p-5 flex items-start gap-3.5 shadow-[0_1px_3px_rgba(38,51,45,0.03)]">
        <div className="w-9 h-9 rounded-lg bg-[#E8EFE8] border border-[#C9D8CC] text-[#173D32] flex items-center justify-center shrink-0">
          <Scale className="w-4 h-4" />
        </div>
        <div className="space-y-1">
          <h2 className="text-sm font-semibold text-[#26332D]">
            How AI specialists and safety policy rules work together
          </h2>
          <p className="text-xs text-[#5B6660] leading-relaxed">
            AI specialists help select relevant supporting citations and flag records needing critical safety review from retrieved sources. They never decide clinical clearance — deterministic application code verifies source provenance, checks patient coverage, evaluates approved rules, and sets the final safety verdict.
          </p>
        </div>
      </section>

      {!stages.length ? (
        <EmptyPanel
          title="Workflow stages are unavailable for this record"
          description="No step-by-step runtime stage trace is present on this consultation record. Inspect the AI Assessment view or run a live consultation to capture stage details."
          icon={<Info className="w-5 h-5" />}
          action={
            <div className="flex flex-wrap items-center justify-center gap-2.5">
              <button
                type="button"
                onClick={() => onNavigate?.('assessment')}
                className="px-4 py-2 rounded-lg border border-[#DDE4DE] bg-white text-xs font-medium text-[#26332D] hover:bg-[#E8EFE8]/50 transition cursor-pointer"
              >
                Open AI Assessment
              </button>
              <button
                type="button"
                onClick={() => onNavigate?.('consultation')}
                className="px-4 py-2 rounded-lg bg-[#173D32] text-white text-xs font-medium hover:bg-[#164B45] transition cursor-pointer"
              >
                New Consultation
              </button>
            </div>
          }
        />
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* Left 8 cols: Sequential Execution Journey */}
          <section className="lg:col-span-8 bg-white border border-[#DDE4DE] rounded-xl p-5 sm:p-6 space-y-5 shadow-[0_1px_3px_rgba(38,51,45,0.03)]">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-[#DDE4DE]">
              <div>
                <h2 className="font-editorial text-lg font-semibold text-[#26332D]">
                  Assessment Journey ({statusCounts.total}{' '}
                  {statusCounts.total === 1 ? 'step' : 'steps'})
                </h2>
                <p className="text-xs text-[#758078]">
                  Exact execution sequence recorded for this consultation
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-1.5 text-[11px]">
                <span className="px-2 py-0.5 rounded bg-[#E8F5EE] text-[#1D6347] border border-[#B8DEC9] font-medium tabular-nums">
                  {statusCounts.completed} completed
                </span>
                {statusCounts.unavailable > 0 && (
                  <span className="px-2 py-0.5 rounded bg-[#FBEAEA] text-[#9A2E2E] border border-[#E7BABA] font-medium tabular-nums">
                    {statusCounts.unavailable} unavailable
                  </span>
                )}
                {statusCounts.empty > 0 && (
                  <span className="px-2 py-0.5 rounded bg-[#F2F4F2] text-[#4C5750] border border-[#D3DBD4] font-medium tabular-nums">
                    {statusCounts.empty} no matches
                  </span>
                )}
                {statusCounts.skipped > 0 && (
                  <span className="px-2 py-0.5 rounded bg-[#FDF4E6] text-[#945F14] border border-[#EAD0A1] font-medium tabular-nums">
                    {statusCounts.skipped} skipped
                  </span>
                )}
                {statusCounts.invalid > 0 && (
                  <span className="px-2 py-0.5 rounded bg-[#FBEAEA] text-[#9A2E2E] border border-[#E7BABA] font-medium tabular-nums">
                    {statusCounts.invalid} rejected
                  </span>
                )}
              </div>
            </div>

            <ol className="relative space-y-3.5">
              {stages.map((stageItem, idx) => {
                const presentation = getStagePresentation(stageItem.name);
                const statusMeta = getStageStatusMeta(stageItem.name, stageItem.status);
                const StatusIcon = statusMeta.Icon;
                const StepIcon = presentation.Icon;
                const description = getStageDescription(stageItem.name, stageItem.status);
                const refs = stageReferences[stageItem.name] ?? [];

                return (
                  <li
                    key={`${stageItem.name}-${idx}`}
                    className="rounded-xl border border-[#DDE4DE] bg-[#F7F5EE]/45 p-4 flex items-start gap-3.5"
                  >
                    <div
                      aria-hidden="true"
                      className={`w-7 h-7 rounded-full border text-xs font-semibold flex items-center justify-center shrink-0 mt-0.5 tabular-nums ${statusMeta.dotClasses}`}
                    >
                      {idx + 1}
                    </div>

                    <div className="min-w-0 flex-1 space-y-2">
                      <div className="flex flex-wrap items-start justify-between gap-2">
                        <div className="space-y-0.5 min-w-0">
                          <div className="flex flex-wrap items-center gap-2">
                            <StepIcon className="w-3.5 h-3.5 text-[#173D32] shrink-0" />
                            <h3 className="text-sm font-semibold text-[#26332D]">
                              {presentation.title}
                            </h3>
                          </div>
                          <span className="inline-block text-[11px] font-medium text-[#758078]">
                            {presentation.roleTag}
                          </span>
                        </div>

                        <span
                          className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full border text-[11px] font-medium whitespace-nowrap ${statusMeta.classes}`}
                        >
                          <StatusIcon className="w-3 h-3 shrink-0" />
                          <span>{statusMeta.label}</span>
                        </span>
                      </div>

                      <p className="text-xs text-[#4C5750] leading-relaxed">{description}</p>

                      {stageItem.name === 'entity extraction' &&
                        stageItem.status === 'completed' &&
                        consultation.herbsEvaluated.length > 0 && (
                          <div className="flex flex-wrap items-center gap-1.5 pt-0.5">
                            {consultation.herbsEvaluated.map(herb => (
                              <span
                                key={herb}
                                className="px-2 py-0.5 rounded bg-white border border-[#C9D8CC] text-[11px] font-medium text-[#173D32]"
                              >
                                {herb}
                              </span>
                            ))}
                          </div>
                        )}

                      {refs.length > 0 && (
                        <div className="flex flex-wrap items-center gap-1.5 pt-1">
                          {refs.slice(0, 4).map(ref => (
                            <span
                              key={`${stageItem.name}-${ref.refNumber}`}
                              className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-white border border-[#DDE4DE] text-[11px] text-[#26332D]"
                            >
                              <strong className="font-semibold text-[#173D32]">
                                Ref #{ref.refNumber}
                              </strong>
                              <span className="text-[#758078]">·</span>
                              <span className="truncate max-w-[180px]">{ref.title}</span>
                            </span>
                          ))}
                          {refs.length > 4 && (
                            <span className="text-[11px] text-[#758078]">
                              +{refs.length - 4} more
                            </span>
                          )}
                        </div>
                      )}
                    </div>
                  </li>
                );
              })}
            </ol>
          </section>

          {/* Right 4 cols: Real Source & Verdict Summary */}
          <aside className="lg:col-span-4 space-y-4">
            <section className="bg-white border border-[#DDE4DE] rounded-xl p-5 space-y-4 shadow-[0_1px_3px_rgba(38,51,45,0.03)]">
              <div className="space-y-1 pb-3 border-b border-[#DDE4DE]">
                <h2 className="font-editorial text-base font-semibold text-[#26332D]">
                  Verified Evidence Snapshot
                </h2>
                <p className="text-xs text-[#758078]">
                  Records actually present in this consultation ledger
                </p>
              </div>

              <div className="grid grid-cols-2 gap-2.5 text-xs">
                <div className="rounded-lg bg-[#F7F5EE] border border-[#DDE4DE] p-3">
                  <p className="text-[10px] uppercase tracking-wider text-[#758078] font-medium">
                    Ledger records
                  </p>
                  <p className="text-base font-semibold text-[#26332D] tabular-nums mt-0.5">
                    {assessment?.ledger.length ?? 0}
                  </p>
                </div>
                <div className="rounded-lg bg-[#F7F5EE] border border-[#DDE4DE] p-3">
                  <p className="text-[10px] uppercase tracking-wider text-[#758078] font-medium">
                    Source traceable
                  </p>
                  <p className="text-base font-semibold text-[#173D32] tabular-nums mt-0.5">
                    {traceableSources.length}
                  </p>
                </div>
                <div className="rounded-lg bg-[#F7F5EE] border border-[#DDE4DE] p-3">
                  <p className="text-[10px] uppercase tracking-wider text-[#758078] font-medium">
                    Catalog &amp; graph
                  </p>
                  <p className="text-base font-semibold text-[#164B45] tabular-nums mt-0.5">
                    {catalogSources.length}
                  </p>
                </div>
                <div className="rounded-lg bg-[#F7F5EE] border border-[#DDE4DE] p-3">
                  <p className="text-[10px] uppercase tracking-wider text-[#758078] font-medium">
                    Rules triggered
                  </p>
                  <p className="text-base font-semibold text-[#26332D] tabular-nums mt-0.5">
                    {assessment?.verdict.rules.length ?? 0}
                  </p>
                </div>
              </div>

              {assessment && assessment.ledger.length > 0 ? (
                <div className="space-y-2 pt-1">
                  <p className="text-[11px] font-semibold uppercase tracking-wider text-[#758078]">
                    Referenced Sources ({assessment.ledger.length})
                  </p>
                  <ul className="space-y-2">
                    {assessment.ledger.slice(0, 6).map(entry => {
                      const info = ledgerRefMap.get(entry.id);
                      if (!info) return null;
                      return (
                        <li
                          key={entry.id}
                          className="rounded-lg border border-[#DDE4DE] bg-[#F7F5EE]/50 px-3 py-2 text-xs space-y-0.5"
                        >
                          <div className="flex items-center justify-between gap-2">
                            <span className="font-semibold text-[#173D32]">
                              Ref #{info.refNumber}
                            </span>
                            <span className="text-[10px] text-[#758078] capitalize">
                              {entry.verification.replaceAll('_', ' ')}
                            </span>
                          </div>
                          <p className="font-medium text-[#26332D] break-words">{info.title}</p>
                          <p className="text-[11px] text-[#5B6660] break-words">{info.location}</p>
                        </li>
                      );
                    })}
                  </ul>
                  {assessment.ledger.length > 6 && (
                    <p className="text-[11px] text-[#758078]">
                      +{assessment.ledger.length - 6} additional records in the full ledger.
                    </p>
                  )}
                </div>
              ) : (
                <div className="rounded-lg border border-dashed border-[#A8B8A0] bg-[#F7F5EE]/60 p-4 text-xs text-[#5B6660]">
                  No retrieved source records are attached to this consultation.
                </div>
              )}

              <button
                type="button"
                onClick={() => onNavigate?.('assessment')}
                className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg bg-[#173D32] text-white text-xs font-medium hover:bg-[#164B45] transition cursor-pointer"
              >
                <span>Open Full Evidence &amp; Verdict</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </section>
          </aside>
        </div>
      )}
    </div>
  );
};
