import { useState } from 'react';
import { PageHeader } from '../components/ui/PageHeader';
import { SafetyBadge } from '../components/ui/SafetyBadge';
import type { PatientProfile } from '../types/veda';

const herbOptions = ['Ginger', 'Licorice', 'Ashwagandha', 'Tulsi'];
const examples = ['Furosemide', 'Warfarin', 'Levothyroxine', 'Metformin'];

export function DrugHerbCheckerScreen({ profile }: { profile: PatientProfile }) {
  const medications = [...new Set([...profile.medications, ...examples])];
  const [selectedHerb, setSelectedHerb] = useState(herbOptions[0]);
  const [selectedMed, setSelectedMed] = useState(medications[0]);
  return <div className="space-y-6">
      <PageHeader title="Drug-Herb Interaction Checker" eyebrow="Demonstration"
        description="The available catalog and source tables contain no verified drug-herb interaction dataset." />
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
              {medications.map(med => (
                <option key={med} value={med}>
                  {med}
                </option>
              ))}
            </select>
          </div>
        </div>

      </section>
      <section className="bg-white border rounded-xl p-6 space-y-3">
        <h2>{selectedHerb} and {selectedMed}</h2>
        <SafetyBadge status="insufficient_evidence" />
        <p>Safety for this combination is unknown. A pharmacist or prescribing clinician can review it with you.</p>
      </section>
    </div>;
}
