import React, { useState } from 'react';
import {
  Cpu,
  CheckCircle2,
  AlertTriangle,
  Ban,
  ArrowRight,
  GitBranch,
  Sparkles,
  ShieldCheck
} from 'lucide-react';
import { PageHeader } from '../components/ui/PageHeader';
import { SafetyBadge } from '../components/ui/SafetyBadge';
import { EmptyPanel, SampleNoticeBanner } from '../components/ui/StatePanels';
import type { AgentStage, ConsultationRecord, ScreenId } from '../types/veda';

interface AgentTransparencyScreenProps {
  consultation: ConsultationRecord | null;
  onNavigate: (screen: ScreenId) => void;
}

export const AgentTransparencyScreen: React.FC<AgentTransparencyScreenProps> = ({
  consultation,
  onNavigate
}) => {
  const stages: AgentStage[] = consultation?.isSampleData ? consultation.agentStages : [];

  const [selectedId, setSelectedId] = useState<AgentStage['id']>(
    stages[0]?.id || 'entity_extractor'
  );

  const selectedStage = stages.find(s => s.id === selectedId) || stages[0];

  if (consultation?.assessment) return <section className="bg-white border rounded-xl p-6 space-y-3">
    <h2 className="font-semibold">Consultation execution</h2>{consultation.assessment.stages.map(s=><p key={s.name}>{s.name} / {s.status}</p>)}
  </section>;
  if (!stages.length) {
    return (
      <EmptyPanel
        title="Execution summary: Not available"
        description={consultation?.querySummary || "No consultation selected."}
        action={
          <button
            type="button"
            onClick={() => onNavigate('consultation')}
            className="px-4 py-2 rounded-lg bg-[#173D32] text-white text-xs font-medium cursor-pointer"
          >
            Start Consultation
          </button>
        }
      />
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Multi-Agent Auditability"
        title="Agent Transparency"
        description="Inspect each of VedaAI's five reasoning stages. Structured outputs distinguish generated model synthesis from independently verified Neo4j knowledge graph evidence without exposing private chain-of-thought."
        actions={
          <button
            type="button"
            onClick={() => onNavigate('assessment')}
            className="inline-flex items-center gap-1.5 px-3.5 py-2.5 rounded-lg bg-white border border-[#DDE4DE] text-xs font-medium text-[#26332D] hover:bg-[#E8EFE8]/50 cursor-pointer"
          >
            <ShieldCheck className="w-4 h-4 text-[#173D32]" />
            <span>Back to AI Assessment</span>
          </button>
        }
      />

      <SampleNoticeBanner text="Demonstration case. All stage summaries and timings below are sample data." />

      {/* 5-Stage Pipeline Stepper */}
      <section className="bg-white border border-[#DDE4DE] rounded-xl p-5 space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-[#DDE4DE]">
          <span className="text-xs font-semibold uppercase tracking-wider text-[#758078]">
            Five-Stage LangGraph Workflow
          </span>
          <span className="text-xs text-[#758078] tabular-nums">
            Total pipeline latency:{' '}
            <strong className="text-[#26332D]">
              {stages.reduce((acc, s) => acc + s.latencyMs, 0)} ms
            </strong>
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-5 gap-3">
          {stages.map((stage, idx) => {
            const active = stage.id === selectedStage.id;
            return (
              <button
                key={stage.id}
                type="button"
                onClick={() => setSelectedId(stage.id)}
                className={`p-3.5 rounded-xl border text-left transition space-y-2 relative cursor-pointer ${
                  active
                    ? 'bg-[#E8EFE8] border-[#173D32] ring-1 ring-[#173D32]/20'
                    : 'bg-[#F7F5EE]/60 border-[#DDE4DE] hover:bg-[#E8EFE8]/40'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-semibold text-[#758078] tabular-nums">
                    Stage {idx + 1}
                  </span>
                  {stage.status === 'completed' && (
                    <CheckCircle2 className="w-4 h-4 text-[#247A58]" />
                  )}
                  {stage.status === 'warning' && (
                    <AlertTriangle className="w-4 h-4 text-[#B7791F]" />
                  )}
                  {stage.status === 'blocked' && (
                    <Ban className="w-4 h-4 text-[#B64040]" />
                  )}
                </div>
                <p className="text-xs font-semibold text-[#26332D] leading-snug">
                  {stage.name}
                </p>
                <p className="text-[11px] text-[#758078] tabular-nums">{stage.latencyMs} ms</p>
                {idx < stages.length - 1 && (
                  <ArrowRight className="hidden md:block w-3.5 h-3.5 text-[#A8B8A0] absolute -right-2.5 top-1/2 -translate-y-1/2 z-10 bg-[#F7F5EE] rounded-full" />
                )}
              </button>
            );
          })}
        </div>
      </section>

      {/* Selected Stage Detail Card */}
      <section className="bg-white border border-[#DDE4DE] rounded-xl p-6 space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3 pb-4 border-b border-[#DDE4DE]">
          <div className="space-y-1">
            <div className="flex flex-wrap items-center gap-2">
              <Cpu className="w-4 h-4 text-[#173D32]" />
              <h2 className="font-editorial text-xl font-semibold text-[#26332D]">
                {selectedStage.name}
              </h2>
              <SafetyBadge
                status={
                  selectedStage.status === 'blocked'
                    ? 'flagged'
                    : selectedStage.status === 'warning'
                    ? 'caution'
                    : 'verified'
                }
                labelOverride={selectedStage.outputLabel}
              />
            </div>
            <p className="text-xs text-[#758078]">{selectedStage.role}</p>
          </div>

          <span className="text-xs font-medium px-2.5 py-1 rounded-md bg-[#F7F5EE] border border-[#DDE4DE] tabular-nums text-[#26332D]">
            Execution: {selectedStage.latencyMs} ms
          </span>
        </div>

        <p className="text-sm text-[#26332D] leading-relaxed">{selectedStage.summary}</p>

        {/* Explicit Separation: Verified Graph Outputs vs Generated Model Arguments */}
        <div className="space-y-3">
          <h3 className="text-xs font-semibold uppercase tracking-wider text-[#758078]">
            Structured Stage Artifacts
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {selectedStage.outputs.map((out, i) => (
              <div
                key={i}
                className={`p-4 rounded-lg border space-y-1.5 ${
                  out.kind === 'warning'
                    ? 'bg-[#FBEAEA]/50 border-[#E7BABA]'
                    : out.kind === 'verified'
                    ? 'bg-[#E8F5EE]/40 border-[#B8DEC9]'
                    : 'bg-[#F7F5EE] border-[#DDE4DE]'
                }`}
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="text-xs font-semibold text-[#26332D]">{out.label}</span>
                  <span
                    className={`inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full ${
                      out.kind === 'verified'
                        ? 'bg-white text-[#1D6347] border border-[#B8DEC9]'
                        : out.kind === 'warning'
                        ? 'bg-white text-[#9A2E2E] border border-[#E7BABA]'
                        : 'bg-white text-[#356B91] border border-[#C6D8E6]'
                    }`}
                  >
                    {out.kind === 'verified' && <GitBranch className="w-3 h-3" />}
                    {out.kind === 'generated' && <Sparkles className="w-3 h-3" />}
                    {out.kind === 'warning' && <AlertTriangle className="w-3 h-3" />}
                    {out.kind === 'verified'
                      ? 'Verified Graph Evidence'
                      : out.kind === 'warning'
                      ? 'Safety Veto Signal'
                      : 'Generated Agent Argument'}
                  </span>
                </div>
                <p className="text-xs font-mono text-[#26332D] break-words leading-relaxed">
                  {out.value}
                </p>
              </div>
            ))}
          </div>
        </div>

        {/* Evidence References */}
        <div className="pt-3 border-t border-[#DDE4DE] flex flex-wrap items-center gap-2 text-xs">
          <span className="font-semibold text-[#758078]">Evidence References:</span>
          {selectedStage.evidenceRefs.map(ref => (
            <span
              key={ref}
              className="px-2.5 py-1 rounded-md bg-[#F7F5EE] border border-[#DDE4DE] text-[#26332D]"
            >
              {ref}
            </span>
          ))}
        </div>
      </section>
    </div>
  );
};
