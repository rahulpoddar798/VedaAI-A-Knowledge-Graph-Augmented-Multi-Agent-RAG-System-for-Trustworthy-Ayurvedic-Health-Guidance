import React, { useMemo, useState } from 'react';
import { FlaskConical, AlertTriangle, Info, GitBranch, ArrowRight } from 'lucide-react';
import { PageHeader } from '../components/ui/PageHeader';
import { SafetyBadge } from '../components/ui/SafetyBadge';
import { SampleNoticeBanner } from '../components/ui/StatePanels';
import { DRUG_HERB_INTERACTIONS, HERBS_CATALOG } from '../data/mockData';
import type { DrugHerbInteraction, PatientProfile, SafetyStatus } from '../types/veda';

interface DrugHerbCheckerScreenProps {
  profile: PatientProfile;
}

const MEDICATIONS_LIST = [
  'Furosemide / Loop Diuretics',
  'Warfarin / Oral Anticoagulants',
  'Levothyroxine',
  'Omeprazole 20 mg',
  'Sertraline / SSRIs',
  'Metformin'
];

export const DrugHerbCheckerScreen: React.FC<DrugHerbCheckerScreenProps> = ({
  profile
}) => {
  const [selectedHerb, setSelectedHerb] = useState('Licorice (Yashtimadhu)');
  const [selectedMed, setSelectedMed] = useState('Furosemide / Loop Diuretics');

  const herbOptions = useMemo(
    () => HERBS_CATALOG.map(h => `${h.name} (${h.sanskrit_name.split('/')[0]})`),
    []
  );

  const matchedInteraction: DrugHerbInteraction = useMemo(() => {
    const exact = DRUG_HERB_INTERACTIONS.find(
      item =>
        item.herb.toLowerCase().includes(selectedHerb.split(' (')[0].toLowerCase()) &&
        item.medication.toLowerCase().includes(selectedMed.split(' /')[0].toLowerCase())
    );
    if (exact) return exact;

    return {
      id: 'custom-pair',
      herb: selectedHerb,
      herbBotanical:
        HERBS_CATALOG.find(h => selectedHerb.startsWith(h.name))?.botanical_name ||
        'Botanical extract',
      medication: selectedMed,
      medicationClass: 'Selected Prescription Medication',
      status: 'insufficient_data',
      severity: 'Unknown',
      mechanism:
        'No curated pharmacokinetic or pharmacodynamic interaction pair exists in the demonstration monograph index for this specific herb-drug pair.',
      clinicalGuidance:
        'Insufficient data to rule out an interaction. Absence of a recorded interaction does NOT establish safety—consult a pharmacist or prescribing clinician before combining.',
      sources: ['VedaAI Drug–Herb Screening Index (Demonstration)'],
      missingEvidenceNote:
        'Controlled human CYP450 / P-gp interaction studies are not available for this pair in the prototype dataset.'
    };
  }, [selectedHerb, selectedMed]);

  const mapInteractionStatus = (status: DrugHerbInteraction['status']): {
    badge: SafetyStatus;
    label: string;
  } => {
    switch (status) {
      case 'documented':
        return { badge: 'flagged', label: 'Documented interaction' };
      case 'potential':
        return { badge: 'caution', label: 'Potential interaction' };
      case 'no_known_interaction':
        return { badge: 'verified', label: 'No known interaction' };
      case 'insufficient_data':
      default:
        return { badge: 'insufficient_evidence', label: 'Insufficient data' };
    }
  };

  const badgeInfo = mapInteractionStatus(matchedInteraction.status);

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Pharmacovigilance Screening"
        title="Drug–Herb Interaction Checker"
        description="Evaluate potential interactions between Ayurvedic botanicals and prescription medications. VedaAI explicitly separates documented interactions, potential interactions, no known interaction, and insufficient clinical data."
      />

      <SampleNoticeBanner text="Interaction results below use curated demonstration pharmacology pairs. Always verify medication safety with a licensed pharmacist or physician." />

      {/* Explicit Herb + Medication Selection Panel */}
      <section className="bg-white border border-[#DDE4DE] rounded-xl p-5 space-y-5">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <label htmlFor="select-herb" className="text-xs font-semibold text-[#26332D]">
              1. Select Ayurvedic Herb / Ingredient
            </label>
            <select
              id="select-herb"
              value={selectedHerb}
              onChange={e => setSelectedHerb(e.target.value)}
              className="w-full h-10 px-3 rounded-lg border border-[#DDE4DE] bg-[#F7F5EE]/60 text-sm text-[#26332D]"
            >
              {herbOptions.map(opt => (
                <option key={opt} value={opt}>
                  {opt}
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-1.5">
            <label htmlFor="select-med" className="text-xs font-semibold text-[#26332D]">
              2. Select Prescription Medication
            </label>
            <select
              id="select-med"
              value={selectedMed}
              onChange={e => setSelectedMed(e.target.value)}
              className="w-full h-10 px-3 rounded-lg border border-[#DDE4DE] bg-[#F7F5EE]/60 text-sm text-[#26332D]"
            >
              {MEDICATIONS_LIST.map(med => (
                <option key={med} value={med}>
                  {med}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Quick Curated Pair Presets covering all 4 semantic states */}
        <div className="pt-2 border-t border-[#DDE4DE] flex flex-wrap items-center gap-2">
          <span className="text-[11px] font-medium text-[#758078]">
            Curated test pairs (all 4 evidence states):
          </span>
          {DRUG_HERB_INTERACTIONS.map(pair => {
            const b = mapInteractionStatus(pair.status);
            return (
              <button
                key={pair.id}
                type="button"
                onClick={() => {
                  setSelectedHerb(pair.herb);
                  setSelectedMed(pair.medication);
                }}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-[#DDE4DE] bg-[#F7F5EE]/60 hover:bg-[#E8EFE8]/50 text-xs text-[#26332D] transition cursor-pointer"
              >
                <span className="font-medium">
                  {pair.herb.split(' (')[0]} + {pair.medication.split(' /')[0]}
                </span>
                <SafetyBadge status={b.badge} labelOverride={b.label} />
              </button>
            );
          })}
        </div>
      </section>

      {/* Interaction Result Card */}
      <section className="bg-white border border-[#DDE4DE] rounded-xl p-6 space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 pb-4 border-b border-[#DDE4DE]">
          <div className="space-y-1">
            <div className="flex items-center gap-2 text-xs text-[#758078]">
              <FlaskConical className="w-4 h-4 text-[#173D32]" />
              <span>Pair Evaluation · Active profile medications: {profile.medications.join(', ') || 'None'}</span>
            </div>
            <h2 className="font-editorial text-xl font-semibold text-[#26332D] flex flex-wrap items-center gap-2">
              <span>{matchedInteraction.herb}</span>
              <ArrowRight className="w-4 h-4 text-[#758078]" />
              <span>{matchedInteraction.medication}</span>
            </h2>
            <p className="text-xs text-[#758078]">
              <span className="italic">{matchedInteraction.herbBotanical}</span> ·{' '}
              {matchedInteraction.medicationClass}
            </p>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <SafetyBadge status={badgeInfo.badge} labelOverride={badgeInfo.label} size="md" />
            <span className="px-2.5 py-1 rounded-md border border-[#DDE4DE] bg-[#F7F5EE] text-xs font-medium text-[#26332D]">
              Severity: {matchedInteraction.severity}
            </span>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          <div className="space-y-2">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-[#758078]">
              Pharmacological Mechanism
            </h3>
            <p className="text-sm text-[#26332D] leading-relaxed">
              {matchedInteraction.mechanism}
            </p>
          </div>

          <div className="space-y-2">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-[#758078]">
              Clinical Guidance
            </h3>
            <p className="text-sm text-[#26332D] leading-relaxed">
              {matchedInteraction.clinicalGuidance}
            </p>
          </div>
        </div>

        {matchedInteraction.graphPath && (
          <div className="p-3.5 rounded-lg bg-[#F7F5EE] border border-[#DDE4DE] flex items-center gap-2 text-xs">
            <GitBranch className="w-4 h-4 text-[#164B45] shrink-0" />
            <span className="font-mono text-[#26332D]">{matchedInteraction.graphPath}</span>
          </div>
        )}

        {/* Critical epistemic caveat: absence of data !== no risk */}
        {(matchedInteraction.status === 'no_known_interaction' ||
          matchedInteraction.status === 'insufficient_data') && (
          <div className="rounded-lg bg-[#FDF4E6] border border-[#EAD0A1] p-4 flex items-start gap-2.5 text-xs text-[#7B5212]">
            <AlertTriangle className="w-4 h-4 text-[#B7791F] shrink-0 mt-0.5" />
            <div>
              <strong className="font-semibold">Evidence Boundary Notice:</strong>{' '}
              {matchedInteraction.missingEvidenceNote ||
                'Absence of a documented interaction does not imply proven safety across concentrated extracts or comorbid states.'}
            </div>
          </div>
        )}

        <div className="pt-3 border-t border-[#DDE4DE] flex flex-wrap items-center justify-between gap-2 text-xs text-[#758078]">
          <span className="inline-flex items-center gap-1.5">
            <Info className="w-3.5 h-3.5 text-[#164B45]" />
            Sources: {matchedInteraction.sources.join(' · ')}
          </span>
        </div>
      </section>
    </div>
  );
};
