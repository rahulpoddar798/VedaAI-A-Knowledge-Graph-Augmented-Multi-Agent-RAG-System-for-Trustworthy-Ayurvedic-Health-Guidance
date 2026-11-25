import React, { useMemo, useState } from 'react';
import { Search, ArrowUpRight, ClipboardCheck, Shield } from 'lucide-react';
import { PageHeader } from '../components/ui/PageHeader';
import { SafetyBadge } from '../components/ui/SafetyBadge';
import { EmptyPanel } from '../components/ui/StatePanels';
import type { ConsultationRecord, SafetyStatus } from '../types/veda';

interface ConsultationHistoryScreenProps {
  consultations: ConsultationRecord[];
  onReopenConsultation: (c: ConsultationRecord, target: 'consultation' | 'assessment') => void;
}

export const ConsultationHistoryScreen: React.FC<ConsultationHistoryScreenProps> = ({
  consultations,
  onReopenConsultation
}) => {
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | SafetyStatus>('all');

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return consultations.filter(c => {
      const matchesText =
        !q ||
        c.querySummary.toLowerCase().includes(q) ||
        c.herbsEvaluated.some(h => h.toLowerCase().includes(q));
      if (!matchesText) return false;
      if (statusFilter !== 'all' && c.status !== statusFilter) return false;
      return true;
    });
  }, [consultations, search, statusFilter]);

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Current browser session"
        title="Consultation History"
        description="Reopen consultations from this session. Refreshing or closing this page clears this history."
      />


      {/* Search & Status Filters */}
      <div className="bg-white border border-[#DDE4DE] rounded-xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 text-[#758078] absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search by topic or herb evaluated..."
            className="w-full h-9 pl-9 pr-3 rounded-lg border border-[#DDE4DE] bg-[#F7F5EE]/50 text-xs text-[#26332D] focus:bg-white"
          />
        </div>

        <div className="flex flex-wrap items-center gap-1.5">
          {(
            [
              ['all', 'All'],
              ['blocked', 'Blocked'], ['restricted', 'Restricted'],
              ['expert_review_required', 'Expert review'], ['insufficient_evidence', 'Insufficient evidence'],
              ['out_of_domain', 'Out of domain']
            ] as const
          ).map(([key, label]) => (
            <button
              key={key}
              type="button"
              onClick={() => setStatusFilter(key)}
              className={`px-3 py-1.5 rounded-lg border text-xs font-medium cursor-pointer ${
                statusFilter === key
                  ? 'bg-[#173D32] text-white border-[#173D32]'
                  : 'bg-white text-[#26332D] border-[#DDE4DE] hover:bg-[#F7F5EE]'
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {filtered.length === 0 ? (
        <EmptyPanel
          title="No Matching Consultations"
          description="No archived consultations match your current search or safety status filter."
        />
      ) : (
        <section className="bg-white border border-[#DDE4DE] rounded-xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse min-w-[760px]">
              <thead>
                <tr className="border-b border-[#DDE4DE] bg-[#F7F5EE]/80 text-[11px] font-semibold uppercase tracking-wider text-[#758078]">
                  <th className="py-3 px-5">Date / Timestamp</th>
                  <th className="py-3 px-4">Inquiry Summary</th>
                  <th className="py-3 px-4">Herbs Evaluated</th>
                  <th className="py-3 px-4">Assessment Status</th>
                  <th className="py-3 px-5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#DDE4DE] text-sm">
                {filtered.map(item => (
                  <tr key={item.id} className="hover:bg-[#F7F5EE]/60 transition">
                    <td className="py-4 px-5 text-xs text-[#758078] tabular-nums whitespace-nowrap align-top">
                      {item.timestamp}
                    </td>
                    <td className="py-4 px-4 align-top">
                      <p className="font-medium text-[#26332D]">{item.querySummary}</p>
                      <p className="text-[11px] text-[#758078] mt-0.5">
                        Context: {item.prakritiSnapshot} · {item.seasonSnapshot}
                      </p>
                    </td>
                    <td className="py-4 px-4 align-top">
                      <div className="flex flex-wrap gap-1">
                        {item.herbsEvaluated.map(h => (
                          <span
                            key={h}
                            className="px-2 py-0.5 rounded bg-[#F7F5EE] border border-[#DDE4DE] text-[11px] text-[#26332D]"
                          >
                            {h.split(' (')[0]}
                          </span>
                        ))}
                      </div>
                    </td>
                    <td className="py-4 px-4 align-top">
                      <SafetyBadge status={item.status} />
                    </td>
                    <td className="py-4 px-5 align-top text-right whitespace-nowrap">
                      <div className="inline-flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => onReopenConsultation(item, 'assessment')}
                          className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-[#DDE4DE] bg-white text-xs font-medium text-[#26332D] hover:bg-[#E8EFE8]/50 cursor-pointer"
                        >
                          <ClipboardCheck className="w-3.5 h-3.5 text-[#173D32]" />
                          <span>Assessment</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => onReopenConsultation(item, 'consultation')}
                          className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-[#173D32] text-white text-xs font-medium hover:bg-[#164B45] cursor-pointer"
                        >
                          <span>Reopen</span>
                          <ArrowUpRight className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="px-5 py-3 bg-[#F7F5EE] border-t border-[#DDE4DE] flex items-center gap-2 text-[11px] text-[#758078]">
            <Shield className="w-3.5 h-3.5 text-[#173D32]" />
            <span>Privacy guard: Detailed medical conditions and personal notes remain hidden in list summaries.</span>
          </div>
        </section>
      )}
    </div>
  );
};
