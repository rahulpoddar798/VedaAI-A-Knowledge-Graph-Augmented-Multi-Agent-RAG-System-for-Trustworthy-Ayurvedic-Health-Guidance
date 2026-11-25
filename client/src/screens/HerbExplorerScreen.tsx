import React, { useMemo, useState } from 'react';
import { Search, Leaf, GitBranch, Info, AlertTriangle, X } from 'lucide-react';
import { PageHeader } from '../components/ui/PageHeader';
import { SafetyBadge } from '../components/ui/SafetyBadge';
import { EmptyPanel } from '../components/ui/StatePanels';
import type { HerbItem, ScreenId } from '../types/veda';

interface HerbExplorerScreenProps {
  herbs: HerbItem[];
  onNavigate: (screen: ScreenId) => void;
}

export const HerbExplorerScreen: React.FC<HerbExplorerScreenProps> = ({
  herbs,
  onNavigate
}) => {
  const [search, setSearch] = useState('');
  const [viryaFilter, setViryaFilter] = useState<'ALL' | 'Ushna' | 'Sheeta'>('ALL');
  const [doshaFilter, setDoshaFilter] = useState<'ALL' | 'Vata' | 'Pitta' | 'Kapha'>('ALL');
  const [selectedHerb, setSelectedHerb] = useState<HerbItem | null>(herbs[0] || null);

  const filteredHerbs = useMemo(() => {
    const q = search.trim().toLowerCase();
    return herbs.filter(h => {
      const matchesText =
        !q ||
        h.name.toLowerCase().includes(q) ||
        h.botanical_name?.toLowerCase().includes(q) ||
        h.sanskrit_name?.toLowerCase().includes(q) ||
        h.therapeutic_uses?.toLowerCase().includes(q);
      if (!matchesText) return false;

      if (viryaFilter !== 'ALL' && h.virya !== viryaFilter) return false;
      if (doshaFilter !== 'ALL' && !(h.pacifies || []).includes(doshaFilter)) return false;
      return true;
    });
  }, [herbs, search, viryaFilter, doshaFilter]);

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Materia Medica Ontology"
        title="Herb Explorer"
        description="Browse canonical Ayurvedic herbs from IMPPAT 2.0 and classical treatises. Search by Sanskrit name, botanical binomial, thermal potency (Virya), or dosha balance."
        actions={
          <button
            type="button"
            onClick={() => onNavigate('knowledge-graph')}
            className="inline-flex items-center gap-1.5 px-3.5 py-2.5 rounded-lg bg-white border border-[#DDE4DE] text-xs font-medium text-[#26332D] hover:bg-[#E8EFE8]/50 cursor-pointer"
          >
            <GitBranch className="w-4 h-4 text-[#173D32]" />
            <span>Open Knowledge Graph</span>
          </button>
        }
      />

      {/* Search & Filters */}
      <div className="bg-white border border-[#DDE4DE] rounded-xl p-4 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 text-[#758078] absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search by herb, botanical name, Sanskrit, or traditional use..."
            className="w-full h-10 pl-9 pr-3 rounded-lg border border-[#DDE4DE] bg-[#F7F5EE]/50 text-xs text-[#26332D] focus:bg-white"
          />
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-1.5 text-xs">
            <span className="text-[#758078] font-medium">Virya:</span>
            {(['ALL', 'Ushna', 'Sheeta'] as const).map(v => (
              <button
                key={v}
                type="button"
                onClick={() => setViryaFilter(v)}
                className={`px-2.5 py-1.5 rounded-lg border text-xs font-medium cursor-pointer ${
                  viryaFilter === v
                    ? 'bg-[#173D32] text-white border-[#173D32]'
                    : 'bg-white text-[#26332D] border-[#DDE4DE] hover:bg-[#F7F5EE]'
                }`}
              >
                {v === 'ALL' ? 'All' : v}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-1.5 text-xs">
            <span className="text-[#758078] font-medium">Pacifies:</span>
            {(['ALL', 'Vata', 'Pitta', 'Kapha'] as const).map(d => (
              <button
                key={d}
                type="button"
                onClick={() => setDoshaFilter(d)}
                className={`px-2.5 py-1.5 rounded-lg border text-xs font-medium cursor-pointer ${
                  doshaFilter === d
                    ? 'bg-[#E8EFE8] text-[#173D32] border-[#173D32]/40'
                    : 'bg-white text-[#26332D] border-[#DDE4DE] hover:bg-[#F7F5EE]'
                }`}
              >
                {d === 'ALL' ? 'Any' : d}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Main Split: Herb Cards Grid + Detail Side Panel */}
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-6 items-start">
        <div className="xl:col-span-8">
          {filteredHerbs.length === 0 ? (
            <EmptyPanel
              title="No Matching Herbs Found"
              description="Try clearing one of the Virya or Dosha filters or searching with a common English or Sanskrit synonym."
              action={
                <button
                  type="button"
                  onClick={() => {
                    setSearch('');
                    setViryaFilter('ALL');
                    setDoshaFilter('ALL');
                  }}
                  className="px-4 py-2 rounded-lg bg-[#173D32] text-white text-xs font-medium cursor-pointer"
                >
                  Reset Filters
                </button>
              }
            />
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {filteredHerbs.map(herb => {
                const isSelected = selectedHerb?.name === herb.name;
                return (
                  <button
                    key={herb.name}
                    type="button"
                    onClick={() => setSelectedHerb(herb)}
                    className={`p-5 rounded-xl border text-left transition space-y-3 cursor-pointer ${
                      isSelected
                        ? 'bg-[#E8EFE8]/60 border-[#173D32] shadow-xs'
                        : 'bg-white border-[#DDE4DE] hover:border-[#A8B8A0]'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <h2 className="font-editorial text-lg font-semibold text-[#26332D]">
                          {herb.name}
                        </h2>
                        <p className="text-xs italic text-[#758078]">{herb.botanical_name}</p>
                        <p className="text-[11px] text-[#758078]">
                          Sanskrit: <span className="text-[#26332D]">{herb.sanskrit_name}</span>
                        </p>
                      </div>
                      <span
                        className={`px-2.5 py-0.5 rounded-full text-[11px] font-medium border shrink-0 ${
                          herb.virya === 'Ushna'
                            ? 'bg-[#FDF4E6] text-[#945F14] border-[#EAD0A1]'
                            : 'bg-[#EEF3F7] text-[#2C5877] border-[#C6D8E6]'
                        }`}
                      >
                        {herb.virya || 'Unknown'} Virya
                      </span>
                    </div>

                    <div className="flex flex-wrap gap-1.5">
                      {(herb.pacifies || []).filter(Boolean).map(p => (
                        <span
                          key={p}
                          className="px-2 py-0.5 rounded bg-[#E8F5EE] text-[#1D6347] text-[11px] font-medium"
                        >
                          Pacifies {p}
                        </span>
                      ))}
                      {(herb.aggravates || []).filter(Boolean).map(a => (
                        <span
                          key={a}
                          className="px-2 py-0.5 rounded bg-[#FBEAEA] text-[#9A2E2E] text-[11px] font-medium"
                        >
                          Aggravates {a}
                        </span>
                      ))}
                    </div>

                    <div className="pt-2 border-t border-[#DDE4DE] flex items-center justify-between text-[11px] text-[#758078]">
                      <span>{herb.evidence_tier || 'Classical + IMPPAT 2.0'}</span>
                      <span className="font-medium text-[#173D32]">Inspect →</span>
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* Sticky Herb Detail & Provenance Panel */}
        <aside className="xl:col-span-4 bg-white border border-[#DDE4DE] rounded-xl p-5 space-y-4 sticky top-6">
          {selectedHerb ? (
            <>
              <div className="flex items-start justify-between gap-2 pb-3 border-b border-[#DDE4DE]">
                <div>
                  <span className="text-[11px] font-semibold uppercase tracking-wider text-[#164B45]">
                    Monograph &amp; Graph Profile
                  </span>
                  <h3 className="font-editorial text-xl font-semibold text-[#26332D] mt-0.5">
                    {selectedHerb.name}
                  </h3>
                  <p className="text-xs italic text-[#758078]">{selectedHerb.botanical_name}</p>
                </div>
                <button
                  type="button"
                  onClick={() => setSelectedHerb(null)}
                  className="xl:hidden p-1 text-[#758078]"
                  aria-label="Close detail panel"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <dl className="grid grid-cols-2 gap-2.5 text-xs">
                <div className="p-2.5 rounded-lg bg-[#F7F5EE]">
                  <dt className="text-[#758078]">Sanskrit Name</dt>
                  <dd className="font-semibold text-[#26332D] mt-0.5">
                    {selectedHerb.sanskrit_name}
                  </dd>
                </div>
                <div className="p-2.5 rounded-lg bg-[#F7F5EE]">
                  <dt className="text-[#758078]">Virya (Potency)</dt>
                  <dd className="font-semibold text-[#26332D] mt-0.5">{selectedHerb.virya}</dd>
                </div>
                <div className="p-2.5 rounded-lg bg-[#F7F5EE] col-span-2">
                  <dt className="text-[#758078]">Rasa (Taste) &amp; Vipaka</dt>
                  <dd className="font-medium text-[#26332D] mt-0.5">
                    {selectedHerb.rasa || '—'}
                    {selectedHerb.vipaka ? ` · Vipaka: ${selectedHerb.vipaka}` : ''}
                  </dd>
                </div>
              </dl>

              {selectedHerb.therapeutic_uses && (
                <div className="space-y-1">
                  <span className="text-xs font-semibold text-[#26332D]">
                    Traditional / Classical Indications
                  </span>
                  <p className="text-xs text-[#758078] leading-relaxed">
                    {selectedHerb.therapeutic_uses}
                  </p>
                  <p className="text-[11px] text-[#758078] italic">
                    Note: Traditional textual associations are not equivalent to randomized clinical efficacy proof.
                  </p>
                </div>
              )}

              {selectedHerb.safety_note && (
                <div className="rounded-lg bg-[#FDF4E6] border border-[#EAD0A1] p-3 flex items-start gap-2 text-xs text-[#7B5212]">
                  <AlertTriangle className="w-4 h-4 text-[#B7791F] shrink-0 mt-0.5" />
                  <span>{selectedHerb.safety_note}</span>
                </div>
              )}

              <div className="space-y-1.5 pt-2 border-t border-[#DDE4DE]">
                <span className="text-xs font-semibold text-[#26332D]">Evidence Availability</span>
                <div>
                  <SafetyBadge
                    status={
                      selectedHerb.evidence_tier === 'Traditional Textual Only'
                        ? 'insufficient_evidence'
                        : 'verified'
                    }
                    labelOverride={selectedHerb.evidence_tier || 'IMPPAT 2.0 Cataloged'}
                  />
                </div>
                <p className="text-[11px] text-[#758078]">
                  Source: {selectedHerb.source || 'IMPPAT 2.0 Knowledge Base'}
                </p>
              </div>

              <div className="flex items-center gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => onNavigate('interactions')}
                  className="flex-1 py-2 px-3 rounded-lg bg-[#173D32] text-white text-xs font-medium hover:bg-[#164B45] cursor-pointer"
                >
                  Check Drug Interactions
                </button>
                <button
                  type="button"
                  onClick={() => onNavigate('knowledge-graph')}
                  className="py-2 px-3 rounded-lg bg-white border border-[#DDE4DE] text-xs font-medium text-[#26332D] hover:bg-[#F7F5EE] cursor-pointer"
                >
                  Graph
                </button>
              </div>
            </>
          ) : (
            <div className="py-10 text-center space-y-2 text-xs text-[#758078]">
              <Leaf className="w-6 h-6 mx-auto text-[#A8B8A0]" />
              <p>Select any herb card to inspect its Dravyaguna attributes, safety warnings, and provenance.</p>
            </div>
          )}

          <div className="pt-3 border-t border-[#DDE4DE] flex items-start gap-2 text-[11px] text-[#758078]">
            <Info className="w-3.5 h-3.5 text-[#164B45] shrink-0 mt-0.5" />
            <span>Catalog properties reflect IMPPAT 2.0 and classical Dravyaguna references.</span>
          </div>
        </aside>
      </div>
    </div>
  );
};
