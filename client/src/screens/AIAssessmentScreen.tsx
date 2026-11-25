import React from 'react';
import {
  AlertTriangle,
  CheckCircle2,
  XCircle,
  HelpCircle,
  GitBranch,
  Info,
  Cpu
} from 'lucide-react';
import { PageHeader } from '../components/ui/PageHeader';
import { SafetyBadge } from '../components/ui/SafetyBadge';
import { EmptyPanel, SampleNoticeBanner } from '../components/ui/StatePanels';
import type { ConsultationRecord, ScreenId } from '../types/veda';

interface AIAssessmentScreenProps {
  consultation: ConsultationRecord | null;
  allConsultations: ConsultationRecord[];
  onSelectConsultation: (c: ConsultationRecord) => void;
  onNavigate: (screen: ScreenId) => void;
}

export const AIAssessmentScreen: React.FC<AIAssessmentScreenProps> = ({
  consultation,
  allConsultations,
  onSelectConsultation,
  onNavigate
}) => {
  if (!consultation) {
    return (
      <div className="space-y-6">
        <PageHeader
          eyebrow="Clinical Evidence Breakdown"
          title="AI Assessment Dashboard"
          description="Review structured evidence quality, supporting vs. contradicting graph paths, provenance citations, and missing data."
        />
        <EmptyPanel
          title="No Assessment Selected"
          description="Run a consultation or choose an existing assessment record to inspect its clinical evidence."
          action={
            <button
              type="button"
              onClick={() => onNavigate('consultation')}
              className="px-4 py-2 rounded-lg bg-[#173D32] text-white text-xs font-medium cursor-pointer"
            >
              Go to Consultation
            </button>
          }
        />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Evidence & Provenance Dashboard"
        title="AI Assessment"
        description="Inspect the verdict, source records and safety dimensions assessed for this consultation."
        actions={
          <button
            type="button"
            onClick={() => onNavigate('agents')}
            className="inline-flex items-center gap-1.5 px-3.5 py-2.5 rounded-lg bg-white border border-[#DDE4DE] text-xs font-medium text-[#26332D] hover:bg-[#E8EFE8]/50 cursor-pointer"
          >
            <Cpu className="w-4 h-4 text-[#173D32]" />
            <span>View execution stages</span>
          </button>
        }
      />

      {/* Quick Case Switcher */}
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-xs font-medium text-[#758078]">Inspect case:</span>
        {allConsultations.map(item => (
          <button
            key={item.id}
            type="button"
            onClick={() => onSelectConsultation(item)}
            className={`px-3 py-1.5 rounded-lg border text-xs font-medium transition cursor-pointer ${
              item.id === consultation.id
                ? 'bg-[#E8EFE8] border-[#173D32]/40 text-[#173D32]'
                : 'bg-white border-[#DDE4DE] text-[#26332D] hover:bg-[#F7F5EE]'
            }`}
          >
            {item.querySummary}
          </button>
        ))}
      </div>

      {consultation.isSampleData && (
        <SampleNoticeBanner text="Displaying sample assessment evidence structure for prototype demonstration." />
      )}

      {consultation.assessment && <section className="bg-white border rounded-xl p-6 space-y-3">
        <h2 className="font-semibold">Assessment coverage</h2>
        {consultation.assessment.verdict.expertReview && <strong>Expert review required</strong>}
        {consultation.assessment.verdict.coverage.map(r=><p key={r.dimension}><b>{r.dimension.replaceAll('_',' ')}</b> ? {r.status.replaceAll('_',' ')}. {r.reason}</p>)}
        {consultation.assessment.verdict.expertReview && <p><strong>Clinical expert review required.</strong></p>}
        <h2 className="font-semibold">Evidence ledger</h2>
        {consultation.assessment.ledger.some(e=>e.kind==='association') && <p>IMPPAT rows describe reported associations. Clinical efficacy and safety require separate evidence.</p>}
        {consultation.assessment.ledger.map(e=><details key={e.id}><summary>{e.title || 'Unknown source'} / {e.kind} / {e.verification}</summary>
          <p>{e.location || 'Source location unavailable'} {Object.entries(e.metadata).map(([k,v])=>k+' '+v).join(' ? ')}</p><blockquote>{e.excerpt}</blockquote><small>{e.id}</small></details>)}
      </section>}
      {/* Overall Assessment Lead Card */}
      <section className="bg-white border border-[#DDE4DE] rounded-xl p-6 space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 pb-4 border-b border-[#DDE4DE]">
          <div className="space-y-1.5">
            <div className="flex flex-wrap items-center gap-2">
              <SafetyBadge status={consultation.status} size="md" />
              <span className="text-xs text-[#758078]">
                {consultation.timestamp} · Profile: {consultation.prakritiSnapshot},{' '}
                {consultation.seasonSnapshot}
              </span>
            </div>
            <h2 className="font-editorial text-xl font-semibold text-[#26332D]">
              {consultation.verdictLabel}
            </h2>
            <p className="text-xs text-[#758078]">Query: &ldquo;{consultation.fullQuery}&rdquo;</p>
          </div>
        </div>

        <p>Evaluated herbs: {consultation.herbsEvaluated.join(', ') || 'Not available'}</p>

        {/* Safety Warnings Promoted Above Supporting Details */}
        {consultation.safetyWarnings.length > 0 && (
          <div className="rounded-lg bg-[#FBEAEA] border border-[#E7BABA] p-4 space-y-2">
            <div className="flex items-center gap-2 text-xs font-semibold text-[#9A2E2E]">
              <AlertTriangle className="w-4 h-4 shrink-0" />
              <span>Priority Safety Warnings</span>
            </div>
            <ul className="list-disc pl-5 space-y-1 text-xs text-[#7B2828] leading-relaxed">
              {consultation.safetyWarnings.map((w, idx) => (
                <li key={idx}>{w}</li>
              ))}
            </ul>
          </div>
        )}

        <p className="text-sm text-[#26332D] leading-relaxed">{consultation.clinicalSummary}</p>

        {/* Three Disaggregated Reliability Metrics (Never combined into one misleading score) */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-2">
          {[
            {
              label: 'Evidence Quality',
              value: consultation.evidenceQuality,
              desc: 'Grounding in IMPPAT 2.0 & classical Charaka Samhita citations'
            },
            {
              label: 'Retrieval Coverage',
              value: consultation.retrievalCoverage,
              desc: 'Completeness of Neo4j multi-hop & vector chunk retrieval'
            },
            {
              label: 'Assessment Confidence',
              value: consultation.modelConfidence,
              desc: 'Arbitration consistency across Proponent, Opponent & Judge'
            }
          ].map(metric => (
            <div
              key={metric.label}
              className="rounded-lg border border-[#DDE4DE] bg-[#F7F5EE]/70 p-4 space-y-2"
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-[#26332D]">{metric.label}</span>
                <span className="text-sm font-semibold tabular-nums text-[#173D32]">
                  {metric.value === null ? 'Not available' : metric.value + '%'}
                </span>
              </div>
              {metric.value !== null && <div className="h-2 rounded-full bg-[#DDE4DE] overflow-hidden">
                <div
                  className="h-full rounded-full bg-[#173D32]"
                  style={{ width: `${metric.value}%` }}
                />
              </div>}
              <p className="text-[11px] text-[#758078] leading-snug">{metric.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Supporting vs Contradicting Evidence Columns */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <section className="bg-white border border-[#DDE4DE] rounded-xl p-5 space-y-4">
          <div className="flex items-center gap-2 pb-3 border-b border-[#DDE4DE]">
            <CheckCircle2 className="w-4 h-4 text-[#247A58]" />
            <h3 className="text-sm font-semibold text-[#26332D]">
              Supporting records ({consultation.supportingEvidence.length})
            </h3>
          </div>

          {consultation.supportingEvidence.length === 0 ? (
            <p className="text-xs text-[#758078]">No supporting claims recorded for this query.</p>
          ) : (
            <div className="space-y-3">
              {consultation.supportingEvidence.map(ev => (
                <div
                  key={ev.id}
                  className="p-3.5 rounded-lg border border-[#DDE4DE] bg-[#F7F5EE]/50 space-y-2"
                >
                  <p className="text-xs text-[#26332D] leading-relaxed">{ev.claim}</p>
                  {ev.cypherPath && (
                    <p className="font-mono text-[11px] bg-white border border-[#DDE4DE] rounded px-2.5 py-1 text-[#164B45] break-all">
                      {ev.cypherPath}
                    </p>
                  )}
                  <div className="flex items-center justify-between text-[11px] text-[#758078]">
                    <span>Source: {ev.source}</span>
                    <span className="px-2 py-0.5 rounded bg-[#E8EFE8] text-[#173D32] font-medium">
                      {ev.provenanceType}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

        <section className="bg-white border border-[#DDE4DE] rounded-xl p-5 space-y-4">
          <div className="flex items-center gap-2 pb-3 border-b border-[#DDE4DE]">
            <XCircle className="w-4 h-4 text-[#B64040]" />
            <h3 className="text-sm font-semibold text-[#26332D]">
              Records selected for review ({consultation.contradictingEvidence.length})
            </h3>
          </div>

          {consultation.contradictingEvidence.length === 0 ? (
            <div className="p-3.5 rounded-lg border border-[#DDE4DE] bg-[#F7F5EE]/50 text-xs text-[#758078]">
              No risk evidence was returned for this consultation.
            </div>
          ) : (
            <div className="space-y-3">
              {consultation.contradictingEvidence.map(ev => (
                <div
                  key={ev.id}
                  className="p-3.5 rounded-lg border border-[#E7BABA] bg-[#FBEAEA]/40 space-y-2"
                >
                  <p className="text-xs text-[#26332D] leading-relaxed">{ev.claim}</p>
                  {ev.cypherPath && (
                    <p className="font-mono text-[11px] bg-white border border-[#E7BABA] rounded px-2.5 py-1 text-[#9A2E2E] break-all">
                      {ev.cypherPath}
                    </p>
                  )}
                  <div className="flex items-center justify-between text-[11px] text-[#758078]">
                    <span>Source: {ev.source}</span>
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-white border border-[#E7BABA] text-[#9A2E2E] font-medium">
                      <GitBranch className="w-3 h-3" />
                      {ev.provenanceType}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>

      {/* Explicit Missing Information Callout */}
      <section className="bg-white border border-[#DDE4DE] rounded-xl p-5 space-y-3">
        <div className="flex items-center gap-2">
          <HelpCircle className="w-4 h-4 text-[#B7791F]" />
          <h3 className="text-sm font-semibold text-[#26332D]">
            Explicit Missing Information &amp; Uncertainty Boundaries
          </h3>
        </div>
        {consultation.missingInformation.length > 0 ? (
          <ul className="list-disc pl-5 space-y-1 text-xs text-[#26332D] leading-relaxed">
            {consultation.missingInformation.map((m, i) => (
              <li key={i}>{m}</li>
            ))}
          </ul>
        ) : (
          <p className="text-xs text-[#758078]">
            No additional coverage information was returned.
          </p>
        )}
        <div className="pt-2 border-t border-[#DDE4DE] flex items-start gap-2 text-[11px] text-[#758078]">
          <Info className="w-4 h-4 text-[#164B45] shrink-0" />
          <span>{consultation.disclaimer}</span>
        </div>
      </section>
    </div>
  );
};
