import React, { useState } from 'react';
import { Save, CheckCircle2, UserCircle2, Stethoscope, Plus, X } from 'lucide-react';
import { PageHeader } from '../components/ui/PageHeader';
import type { PatientProfile, ScreenId } from '../types/veda';

interface HealthProfileScreenProps {
  profile: PatientProfile;
  onSaveProfile: (updated: PatientProfile) => void;
  onNavigate: (screen: ScreenId) => void;
}

const PRAKRITI_OPTIONS = [
  { id: 'Vata', sub: 'Air & Ether' },
  { id: 'Pitta', sub: 'Fire & Water' },
  { id: 'Kapha', sub: 'Earth & Water' },
  { id: 'Pitta-Vata', sub: 'Warm & Mobile' },
  { id: 'Kapha-Pitta', sub: 'Moist & Warm' },
  { id: 'Tridoshic', sub: 'Balanced' }
];

const SEASON_OPTIONS = [
  { id: 'Grishma', label: 'Summer (Grishma)', note: 'Pitta-dominant' },
  { id: 'Varsha', label: 'Monsoon (Varsha)', note: 'Vata-dominant' },
  { id: 'Sharada', label: 'Autumn (Sharada)', note: 'Pitta-dominant' },
  { id: 'Hemanta', label: 'Early Winter (Hemanta)', note: 'Vata-dominant' },
  { id: 'Shishira', label: 'Late Winter (Shishira)', note: 'Kapha-dominant' },
  { id: 'Vasanta', label: 'Spring (Vasanta)', note: 'Kapha-dominant' }
];

const CONDITION_OPTIONS = [
  'Acid Reflux',
  'GERD',
  'Hypertension',
  'Inflammation',
  'Obesity',
  'Anxiety',
  'Insomnia',
  'Arthritis',
  'Constipation',
  'Diabetes'
];

export const HealthProfileScreen: React.FC<HealthProfileScreenProps> = ({
  profile,
  onSaveProfile,
  onNavigate
}) => {
  const [draft, setDraft] = useState<PatientProfile>(profile);
  const [newMed, setNewMed] = useState('');
  const [newAllergy, setNewAllergy] = useState('');
  const [savedToast, setSavedToast] = useState(false);

  const isDirty = JSON.stringify(draft) !== JSON.stringify(profile);

  const toggleCondition = (cond: string) => {
    setDraft(prev => ({
      ...prev,
      conditions: prev.conditions.includes(cond)
        ? prev.conditions.filter(c => c !== cond)
        : [...prev.conditions, cond]
    }));
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    onSaveProfile(draft);
    setSavedToast(true);
    setTimeout(() => setSavedToast(false), 2600);
  };

  return (
    <form onSubmit={handleSave} className="space-y-6">
      <PageHeader
        eyebrow="Constitutional & Clinical Context"
        title="Health Profile"
        description="Configure your Prakriti, seasonal Ritu, declared conditions, allergies, and current medications. Optional fields remain optional so you can start a consultation anytime."
        actions={
          <>
            <button
              type="button"
              onClick={() => onNavigate('consultation')}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg bg-white border border-[#DDE4DE] text-sm font-medium text-[#26332D] hover:bg-[#E8EFE8]/50 transition cursor-pointer"
            >
              <Stethoscope className="w-4 h-4 text-[#173D32]" />
              <span>Go to Consultation</span>
            </button>
            <button
              type="submit"
              disabled={!isDirty}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg bg-[#173D32] text-white text-sm font-medium hover:bg-[#164B45] transition disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
            >
              <Save className="w-4 h-4" />
              <span>{isDirty ? 'Save Profile Changes' : 'Profile Saved'}</span>
            </button>
          </>
        }
      />

      {savedToast && (
        <div
          role="status"
          className="bg-[#E8F5EE] border border-[#B8DEC9] rounded-xl px-4 py-3 flex items-center gap-2 text-xs font-medium text-[#1D6347]"
        >
          <CheckCircle2 className="w-4 h-4 shrink-0" />
          <span>Health profile updated. Label audits, consultations, and interaction checks will immediately use this context.</span>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left: Demographics & Preferences */}
        <section className="lg:col-span-5 bg-white border border-[#DDE4DE] rounded-xl p-5 space-y-5">
          <div className="flex items-center gap-2 pb-3 border-b border-[#DDE4DE]">
            <UserCircle2 className="w-4 h-4 text-[#173D32]" />
            <h2 className="text-sm font-semibold text-[#26332D]">
              Demographics &amp; Preferences
            </h2>
          </div>

          <div className="space-y-4">
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-[#26332D]">
                Display Name <span className="text-[#758078] font-normal">(Optional)</span>
              </label>
              <input
                type="text"
                value={draft.fullName}
                onChange={e => setDraft({ ...draft, fullName: e.target.value })}
                className="w-full h-10 px-3 rounded-lg border border-[#DDE4DE] bg-[#F7F5EE]/50 text-sm text-[#26332D] focus:bg-white"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-[#26332D]">
                  Age Group <span className="text-[#758078] font-normal">(Optional)</span>
                </label>
                <select
                  value={draft.ageGroup}
                  onChange={e => setDraft({ ...draft, ageGroup: e.target.value })}
                  className="w-full h-10 px-3 rounded-lg border border-[#DDE4DE] bg-[#F7F5EE]/50 text-sm text-[#26332D]"
                >
                  <option value="">Not specified</option>
                  <option>18–25 years</option>
                  <option>26–33 years</option>
                  <option>34–42 years</option>
                  <option>43–59 years</option>
                  <option>60+ years</option>
                </select>
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-[#26332D]">
                  Sex <span className="text-[#758078] font-normal">(Optional)</span>
                </label>
                <select
                  value={draft.biologicalSex}
                  onChange={e => setDraft({ ...draft, biologicalSex: e.target.value })}
                  className="w-full h-10 px-3 rounded-lg border border-[#DDE4DE] bg-[#F7F5EE]/50 text-sm text-[#26332D]"
                >
                  <option value="">Not specified</option>
                  <option>Female</option>
                  <option>Male</option>
                  <option>Prefer not to say</option>
                </select>
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-medium text-[#26332D]">
                Dietary Preference <span className="text-[#758078] font-normal">(Optional)</span>
              </label>
              <select
                value={draft.dietaryPreference}
                onChange={e => setDraft({ ...draft, dietaryPreference: e.target.value })}
                className="w-full h-10 px-3 rounded-lg border border-[#DDE4DE] bg-[#F7F5EE]/50 text-sm text-[#26332D]"
              >
                <option value="">Not specified</option>
                <option>Vegetarian</option>
                <option>Vegan / Plant-only</option>
                <option>Omnivorous</option>
                <option>No restriction</option>
              </select>
            </div>

            <label className="flex items-start gap-2.5 p-3 rounded-lg bg-[#F7F5EE] border border-[#DDE4DE] cursor-pointer">
              <input
                type="checkbox"
                checked={draft.avoidAlcoholExtracts}
                onChange={e =>
                  setDraft({ ...draft, avoidAlcoholExtracts: e.target.checked })
                }
                className="mt-0.5 accent-[#173D32]"
              />
              <span className="text-xs text-[#26332D]">
                Prefer non-alcoholic / non-Asava-Arishta formulations{' '}
                <span className="text-[#758078]">(Optional preference)</span>
              </span>
            </label>

            <div className="space-y-1.5">
              <label className="text-xs font-medium text-[#26332D]">
                Clinical Notes <span className="text-[#758078] font-normal">(Optional)</span>
              </label>
              <textarea
                rows={3}
                value={draft.notes || ''}
                onChange={e => setDraft({ ...draft, notes: e.target.value })}
                className="w-full p-3 rounded-lg border border-[#DDE4DE] bg-[#F7F5EE]/50 text-xs text-[#26332D] focus:bg-white"
              />
            </div>
          </div>
        </section>

        {/* Right: Prakriti, Season, Conditions, Allergies & Medications */}
        <section className="lg:col-span-7 space-y-6">
          <div className="bg-white border border-[#DDE4DE] rounded-xl p-5 space-y-5">
            <h2 className="text-sm font-semibold text-[#26332D] pb-3 border-b border-[#DDE4DE]">
              Prakriti (Constitution) &amp; Current Ritu (Season)
            </h2>

            <div className="space-y-2">
              <label className="text-xs font-medium text-[#26332D]">
                Constitutional Type (Prakriti)
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
                {PRAKRITI_OPTIONS.map(opt => (
                  <button
                    key={opt.id}
                    type="button"
                    onClick={() => setDraft({ ...draft, prakriti: opt.id })}
                    className={`p-3 rounded-lg border text-left transition cursor-pointer ${
                      draft.prakriti === opt.id
                        ? 'bg-[#E8EFE8] border-[#173D32] text-[#173D32]'
                        : 'bg-[#F7F5EE]/50 border-[#DDE4DE] text-[#26332D] hover:bg-[#E8EFE8]/40'
                    }`}
                  >
                    <p className="text-xs font-semibold">{opt.id}</p>
                    <p className="text-[11px] text-[#758078] mt-0.5">{opt.sub}</p>
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-xs font-medium text-[#26332D]">
                Current Climate Season (Ritu)
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
                {SEASON_OPTIONS.map(s => (
                  <button
                    key={s.id}
                    type="button"
                    onClick={() => setDraft({ ...draft, season: s.id })}
                    className={`p-2.5 rounded-lg border text-left transition cursor-pointer ${
                      draft.season === s.id
                        ? 'bg-[#E8EFE8] border-[#173D32] text-[#173D32]'
                        : 'bg-[#F7F5EE]/50 border-[#DDE4DE] text-[#26332D] hover:bg-[#E8EFE8]/40'
                    }`}
                  >
                    <p className="text-xs font-semibold truncate">{s.label}</p>
                    <p className="text-[11px] text-[#758078]">{s.note}</p>
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Conditions, Medications & Allergies */}
          <div className="bg-white border border-[#DDE4DE] rounded-xl p-5 space-y-5">
            <h2 className="text-sm font-semibold text-[#26332D] pb-3 border-b border-[#DDE4DE]">
              Conditions, Medications &amp; Allergies
            </h2>

            <div className="space-y-2">
              <label className="text-xs font-medium text-[#26332D]">
                Declared Health Conditions{' '}
                <span className="text-[#758078] font-normal">(Optional — used for graph safety rules)</span>
              </label>
              <div className="flex flex-wrap gap-2">
                {CONDITION_OPTIONS.map(cond => {
                  const selected = draft.conditions.includes(cond);
                  return (
                    <button
                      key={cond}
                      type="button"
                      onClick={() => toggleCondition(cond)}
                      className={`px-3 py-1.5 rounded-full border text-xs font-medium transition cursor-pointer ${
                        selected
                          ? 'bg-[#FDF4E6] border-[#EAD0A1] text-[#945F14]'
                          : 'bg-[#F7F5EE]/60 border-[#DDE4DE] text-[#26332D] hover:bg-[#E8EFE8]/50'
                      }`}
                    >
                      {cond}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Medications */}
            <div className="space-y-2">
              <label className="text-xs font-medium text-[#26332D]">
                Current Prescription Medications{' '}
                <span className="text-[#758078] font-normal">(Optional)</span>
              </label>
              <div className="flex flex-wrap gap-2">
                {draft.medications.map(med => (
                  <span
                    key={med}
                    className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#EEF3F7] border border-[#C6D8E6] text-xs font-medium text-[#2C5877]"
                  >
                    {med}
                    <button
                      type="button"
                      onClick={() =>
                        setDraft(prev => ({
                          ...prev,
                          medications: prev.medications.filter(m => m !== med)
                        }))
                      }
                      aria-label={`Remove ${med}`}
                      className="hover:text-[#B64040] cursor-pointer"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </span>
                ))}
              </div>
              <div className="flex gap-2 pt-1">
                <input
                  type="text"
                  value={newMed}
                  onChange={e => setNewMed(e.target.value)}
                  placeholder="Add medication (e.g., Warfarin, Levothyroxine)..."
                  className="flex-1 h-9 px-3 rounded-lg border border-[#DDE4DE] bg-[#F7F5EE]/50 text-xs text-[#26332D]"
                />
                <button
                  type="button"
                  onClick={() => {
                    if (!newMed.trim()) return;
                    setDraft(prev => ({
                      ...prev,
                      medications: [...prev.medications, newMed.trim()]
                    }));
                    setNewMed('');
                  }}
                  className="inline-flex items-center gap-1 px-3 h-9 rounded-lg border border-[#DDE4DE] bg-white text-xs font-medium text-[#173D32] hover:bg-[#E8EFE8]/50 cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Add</span>
                </button>
              </div>
            </div>

            {/* Allergies */}
            <div className="space-y-2">
              <label className="text-xs font-medium text-[#26332D]">
                Known Botanical / Food Allergies{' '}
                <span className="text-[#758078] font-normal">(Optional)</span>
              </label>
              <div className="flex flex-wrap gap-2">
                {draft.allergies.map(a => (
                  <span
                    key={a}
                    className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#F7F5EE] border border-[#DDE4DE] text-xs text-[#26332D]"
                  >
                    {a}
                    <button
                      type="button"
                      onClick={() =>
                        setDraft(prev => ({
                          ...prev,
                          allergies: prev.allergies.filter(item => item !== a)
                        }))
                      }
                      aria-label={`Remove ${a}`}
                      className="text-[#758078] hover:text-[#B64040] cursor-pointer"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </span>
                ))}
              </div>
              <div className="flex gap-2 pt-1">
                <input
                  type="text"
                  value={newAllergy}
                  onChange={e => setNewAllergy(e.target.value)}
                  placeholder="Add allergy or sensitivity..."
                  className="flex-1 h-9 px-3 rounded-lg border border-[#DDE4DE] bg-[#F7F5EE]/50 text-xs text-[#26332D]"
                />
                <button
                  type="button"
                  onClick={() => {
                    if (!newAllergy.trim()) return;
                    setDraft(prev => ({
                      ...prev,
                      allergies: prev.allergies
                        .filter(x => x !== 'None reported')
                        .concat(newAllergy.trim())
                    }));
                    setNewAllergy('');
                  }}
                  className="inline-flex items-center gap-1 px-3 h-9 rounded-lg border border-[#DDE4DE] bg-white text-xs font-medium text-[#173D32] hover:bg-[#E8EFE8]/50 cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Add</span>
                </button>
              </div>
            </div>
          </div>
        </section>
      </div>
    </form>
  );
};
