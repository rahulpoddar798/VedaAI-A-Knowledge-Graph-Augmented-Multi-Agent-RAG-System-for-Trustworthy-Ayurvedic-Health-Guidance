import React from 'react';
import {
  ScanLine,
  Stethoscope,
  FlaskConical,
  Share2,
  ArrowRight,
  ShieldCheck,
  Cpu,
  BookOpen,
  UserCircle2
} from 'lucide-react';
import { PageHeader } from '../components/ui/PageHeader';
import { SafetyBadge } from '../components/ui/SafetyBadge';
import { SampleNoticeBanner } from '../components/ui/StatePanels';
import type { ConsultationRecord, PatientProfile, ScreenId } from '../types/veda';

interface OverviewScreenProps {
  profile: PatientProfile;
  consultations: ConsultationRecord[];
  herbCount: number;
  backendOnline: boolean;
  onNavigate: (screen: ScreenId) => void;
  onSelectConsultation: (c: ConsultationRecord) => void;
}

export const OverviewScreen: React.FC<OverviewScreenProps> = ({
  profile,
  consultations,
  herbCount,
  backendOnline,
  onNavigate,
  onSelectConsultation
}) => {
  const latest = consultations[0];

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Clinical Workspace Overview"
        title="Ayurvedic Safety & Evidence Workbench"
        description="Coordinate personalized Dravyaguna consultations, ingredient-by-ingredient label audits, medication interaction checks, and Neo4j knowledge graph inspections from a single clinical shell."
        actions={
          <>
            <button
              type="button"
              onClick={() => onNavigate('consultation')}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg bg-[#173D32] text-white text-sm font-medium hover:bg-[#164B45] transition cursor-pointer"
            >
              <Stethoscope className="w-4 h-4" />
              <span>Start Consultation</span>
            </button>
            <button
              type="button"
              onClick={() => onNavigate('label-analyzer')}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg bg-white border border-[#DDE4DE] text-sm font-medium text-[#26332D] hover:bg-[#E8EFE8]/50 transition cursor-pointer"
            >
              <ScanLine className="w-4 h-4 text-[#173D32]" />
              <span>Analyze Product Label</span>
            </button>
          </>
        }
      />

      <SampleNoticeBanner text="Overview metrics and recent assessment summaries combine active session context with curated demonstration data." />

      {/* 4 Key System Metrics */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        <div className="bg-white border border-[#DDE4DE] rounded-xl p-5 space-y-1.5">
          <p className="text-xs font-medium text-[#758078]">Cataloged Dravyas</p>
          <p className="text-2xl font-semibold tabular-nums text-[#173D32]">{herbCount}</p>
          <p className="text-xs text-[#758078]">IMPPAT 2.0 &amp; Charaka ontology</p>
        </div>

        <div className="bg-white border border-[#DDE4DE] rounded-xl p-5 space-y-1.5">
          <p className="text-xs font-medium text-[#758078]">Reasoning Pipeline</p>
          <p className="text-2xl font-semibold tabular-nums text-[#26332D]">5 Agents</p>
          <p className="text-xs text-[#758078]">Adversarial Proponent / Opponent / Judge</p>
        </div>

        <div className="bg-white border border-[#DDE4DE] rounded-xl p-5 space-y-1.5">
          <p className="text-xs font-medium text-[#758078]">Active Patient Context</p>
          <p className="text-2xl font-semibold text-[#26332D]">{profile.prakriti}</p>
          <p className="text-xs text-[#758078]">
            Season: {profile.season} · {profile.conditions.length} declared condition(s)
          </p>
        </div>

        <div className="bg-white border border-[#DDE4DE] rounded-xl p-5 space-y-1.5">
          <p className="text-xs font-medium text-[#758078]">Knowledge Graph Engine</p>
          <div className="flex items-center gap-2 pt-0.5">
            <SafetyBadge
              status={backendOnline ? 'verified' : 'insufficient_evidence'}
              labelOverride={backendOnline ? 'Live Connected' : 'Demo Snapshot'}
              size="md"
            />
          </div>
          <p className="text-xs text-[#758078] pt-0.5">179+ semantic safety edges</p>
        </div>
      </div>

      {/* Primary Workflows Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <section className="lg:col-span-7 bg-white border border-[#DDE4DE] rounded-xl p-5 space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-[#DDE4DE]">
            <div>
              <h2 className="font-editorial text-lg font-semibold text-[#26332D]">
                Clinical &amp; Safety Modules
              </h2>
              <p className="text-xs text-[#758078]">
                Select a specialized workflow tailored to your clinical or verification task.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            {[
              {
                screen: 'label-analyzer' as ScreenId,
                title: 'Product Label Analyzer',
                desc: 'Upload supplement packaging for OCR extraction, catalog matching, and safety flags.',
                Icon: ScanLine
              },
              {
                screen: 'consultation' as ScreenId,
                title: 'Consultation Workbench',
                desc: 'Submit symptom or herb queries grounded in Prakriti, Ritu, and comorbidities.',
                Icon: Stethoscope
              },
              {
                screen: 'interactions' as ScreenId,
                title: 'Drug–Herb Interaction Checker',
                desc: 'Screen botanical ingredients against prescription medications with evidence tiers.',
                Icon: FlaskConical
              },
              {
                screen: 'knowledge-graph' as ScreenId,
                title: 'Knowledge Graph Explorer',
                desc: 'Inspect herb-dosha-season-condition edges and provenance paths interactively.',
                Icon: Share2
              },
              {
                screen: 'agents' as ScreenId,
                title: 'Agent Transparency',
                desc: 'Audit the 5-stage multi-agent debate separately from verified graph evidence.',
                Icon: Cpu
              },
              {
                screen: 'herbs' as ScreenId,
                title: 'Herb Explorer',
                desc: 'Browse classical Rasa, Virya, Vipaka, and safety cautions across IMPPAT 2.0.',
                Icon: BookOpen
              }
            ].map(card => {
              const Icon = card.Icon;
              return (
                <button
                  key={card.screen}
                  type="button"
                  onClick={() => onNavigate(card.screen)}
                  className="p-4 rounded-xl border border-[#DDE4DE] bg-[#F7F5EE]/50 hover:bg-[#E8EFE8]/60 hover:border-[#A8B8A0] transition text-left space-y-2 group cursor-pointer"
                >
                  <div className="flex items-center justify-between">
                    <div className="w-8 h-8 rounded-lg bg-white border border-[#DDE4DE] text-[#173D32] flex items-center justify-center">
                      <Icon className="w-4 h-4" />
                    </div>
                    <ArrowRight className="w-4 h-4 text-[#758078] group-hover:text-[#173D32] transition" />
                  </div>
                  <h3 className="text-sm font-semibold text-[#26332D]">{card.title}</h3>
                  <p className="text-xs text-[#758078] leading-relaxed">{card.desc}</p>
                </button>
              );
            })}
          </div>
        </section>

        {/* Right Column: Latest Assessment & Active Profile Summary */}
        <aside className="lg:col-span-5 space-y-5">
          {latest && (
            <div className="bg-white border border-[#DDE4DE] rounded-xl p-5 space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-[#DDE4DE]">
                <span className="text-xs font-semibold uppercase tracking-wider text-[#758078]">
                  Latest Assessment Snapshot
                </span>
                <SafetyBadge status={latest.status} />
              </div>
              <div className="space-y-1.5">
                <h3 className="font-editorial text-base font-semibold text-[#26332D]">
                  {latest.querySummary}
                </h3>
                <p className="text-xs text-[#758078]">
                  {latest.timestamp} · {latest.prakritiSnapshot} · {latest.seasonSnapshot}
                </p>
              </div>
              <p className="text-xs text-[#26332D] leading-relaxed line-clamp-3">
                {latest.clinicalSummary}
              </p>
              <div className="flex items-center gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => {
                    onSelectConsultation(latest);
                    onNavigate('assessment');
                  }}
                  className="px-3.5 py-2 rounded-lg bg-[#173D32] text-white text-xs font-medium hover:bg-[#164B45] transition cursor-pointer"
                >
                  Open AI Assessment
                </button>
                <button
                  type="button"
                  onClick={() => {
                    onSelectConsultation(latest);
                    onNavigate('agents');
                  }}
                  className="px-3.5 py-2 rounded-lg bg-white border border-[#DDE4DE] text-xs font-medium text-[#26332D] hover:bg-[#F7F5EE] transition cursor-pointer"
                >
                  Inspect 5 Agents
                </button>
              </div>
            </div>
          )}

          <div className="bg-white border border-[#DDE4DE] rounded-xl p-5 space-y-3">
            <div className="flex items-center justify-between">
              <span className="inline-flex items-center gap-2 text-sm font-semibold text-[#26332D]">
                <UserCircle2 className="w-4 h-4 text-[#173D32]" />
                Patient Context Summary
              </span>
              <button
                type="button"
                onClick={() => onNavigate('profile')}
                className="text-xs font-medium text-[#164B45] underline underline-offset-2 cursor-pointer"
              >
                Edit Profile
              </button>
            </div>
            <dl className="grid grid-cols-2 gap-3 text-xs pt-1">
              <div className="p-2.5 rounded-lg bg-[#F7F5EE]">
                <dt className="text-[#758078]">Prakriti</dt>
                <dd className="font-semibold text-[#26332D] mt-0.5">{profile.prakriti}</dd>
              </div>
              <div className="p-2.5 rounded-lg bg-[#F7F5EE]">
                <dt className="text-[#758078]">Current Ritu</dt>
                <dd className="font-semibold text-[#26332D] mt-0.5">{profile.season}</dd>
              </div>
              <div className="p-2.5 rounded-lg bg-[#F7F5EE] col-span-2">
                <dt className="text-[#758078]">Declared Conditions &amp; Medications</dt>
                <dd className="font-medium text-[#26332D] mt-0.5">
                  {[...profile.conditions, ...profile.medications].join(' · ') || 'None specified'}
                </dd>
              </div>
            </dl>
            <div className="flex items-start gap-2 pt-2 text-[11px] text-[#758078]">
              <ShieldCheck className="w-4 h-4 text-[#173D32] shrink-0" />
              <span>
                Safety rules enforce an independent Opponent verification step before any recommendation is surfaced.
              </span>
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
};
