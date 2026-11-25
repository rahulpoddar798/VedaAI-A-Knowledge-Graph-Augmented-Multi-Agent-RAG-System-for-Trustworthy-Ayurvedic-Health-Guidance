import React, { useState } from 'react';
import { Shield, CheckCircle2, AlertTriangle, Database, Activity, FileCheck2 } from 'lucide-react';
import { SafetyBadge } from '../components/ui/SafetyBadge';
import { ADMIN_REVIEW_QUEUE } from '../data/mockData';
import type { AdminReviewItem } from '../types/veda';

interface AdminPortalScreenProps {
  backendOnline: boolean;
}

export const AdminPortalScreen: React.FC<AdminPortalScreenProps> = ({
  backendOnline
}) => {
  const [activeTab, setActiveTab] = useState<'queue' | 'versioning' | 'monitoring'>('queue');
  const [items, setItems] = useState<AdminReviewItem[]>(ADMIN_REVIEW_QUEUE);
  const [pendingAction, setPendingAction] = useState<{
    item: AdminReviewItem;
    nextStatus: 'Approved' | 'Requires Revision';
  } | null>(null);

  const confirmUpdate = () => {
    if (!pendingAction) return;
    setItems(prev =>
      prev.map(i =>
        i.id === pendingAction.item.id ? { ...i, status: pendingAction.nextStatus } : i
      )
    );
    setPendingAction(null);
  };

  return (
    <div className="space-y-6">
      {/* Visually Distinct Governance Header Banner (Separated from Patient Workflows) */}
      <header className="rounded-xl bg-[#164B45] text-white p-6 flex flex-col lg:flex-row lg:items-center justify-between gap-4 border border-[#173D32]">
        <div className="space-y-1.5">
          <div className="inline-flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.08em] text-[#E8EFE8]">
            <Shield className="w-3.5 h-3.5" />
            <span>Governance &amp; Ontology Administration</span>
          </div>
          <h1 className="font-editorial text-2xl sm:text-[28px] font-semibold">
            Admin &amp; Expert Review Portal
          </h1>
          <p className="text-xs sm:text-sm text-[#DCE6DE] max-w-2xl">
            Demonstration review queue and release history. Decisions here apply only to this browser session.
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          {(
            [
              ['queue', 'Review Queue'],
              ['versioning', 'Ontology Versions'],
              ['monitoring', 'System Monitoring']
            ] as const
          ).map(([id, label]) => (
            <button
              key={id}
              type="button"
              onClick={() => setActiveTab(id)}
              className={`px-3.5 py-2 rounded-lg text-xs font-medium transition cursor-pointer ${
                activeTab === id
                  ? 'bg-white text-[#173D32]'
                  : 'bg-[#173D32] text-[#E8EFE8] hover:bg-[#173D32]/80 border border-white/15'
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      </header>

      {activeTab === 'queue' && (
        <section className="space-y-4">
          {items.map(item => (
            <article
              key={item.id}
              className="bg-white border border-[#DDE4DE] rounded-xl p-5 space-y-3"
            >
              <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                <div className="space-y-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="px-2 py-0.5 rounded bg-[#E8EFE8] text-[#173D32] text-[11px] font-medium">
                      {item.category}
                    </span>
                    <span className="text-xs text-[#758078] tabular-nums">
                      {item.id} · {item.version}
                    </span>
                  </div>
                  <h2 className="text-base font-semibold text-[#26332D]">{item.title}</h2>
                  <p className="text-xs text-[#758078]">
                    Submitted by {item.submittedBy} · {item.submittedAt}
                  </p>
                </div>

                <SafetyBadge
                  status={
                    item.status === 'Approved'
                      ? 'verified'
                      : item.status === 'Requires Revision'
                      ? 'flagged'
                      : 'caution'
                  }
                  labelOverride={item.status}
                  size="md"
                />
              </div>

              <p className="text-xs text-[#26332D] leading-relaxed">{item.detail}</p>

              {item.cypherImpact && (
                <pre className="p-3 rounded-lg bg-[#F7F5EE] border border-[#DDE4DE] font-mono text-[11px] text-[#164B45] overflow-x-auto">
                  {item.cypherImpact}
                </pre>
              )}

              <div className="pt-2 border-t border-[#DDE4DE] flex flex-wrap items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setPendingAction({ item, nextStatus: 'Requires Revision' })}
                  className="px-3 py-1.5 rounded-lg border border-[#E7BABA] bg-white text-xs font-medium text-[#9A2E2E] hover:bg-[#FBEAEA] cursor-pointer"
                >
                  Request Revision
                </button>
                <button
                  type="button"
                  onClick={() => setPendingAction({ item, nextStatus: 'Approved' })}
                  className="px-3.5 py-1.5 rounded-lg bg-[#173D32] text-white text-xs font-medium hover:bg-[#164B45] cursor-pointer"
                >
                  Approve Change
                </button>
              </div>
            </article>
          ))}
        </section>
      )}

      {activeTab === 'versioning' && (
        <section className="bg-white border border-[#DDE4DE] rounded-xl p-6 space-y-4">
          <div className="flex items-center gap-2 pb-3 border-b border-[#DDE4DE]">
            <FileCheck2 className="w-4 h-4 text-[#173D32]" />
            <h2 className="text-sm font-semibold text-[#26332D]">
              Ontology &amp; Prompt Releases
            </h2>
          </div>
          <div className="divide-y divide-[#DDE4DE] text-xs">
            {[
              ['v2.4.0 (Active)', '2026-11-18', '25 Herbs · 179 Relationships · Label Audit v1 prompt'],
              ['v2.3.1', '2026-10-30', 'Added seasonal Ritucharya CONTRAINDICATED_IN edges for Grishma/Varsha'],
              ['v2.2.0', '2026-10-12', 'Initial IMPPAT 2.0 TSV ingestion + 3072-d classical embeddings']
            ].map(([ver, date, notes]) => (
              <div key={ver} className="py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div>
                  <p className="font-semibold text-[#26332D]">{ver}</p>
                  <p className="text-[#758078] mt-0.5">{notes}</p>
                </div>
                <span className="text-[#758078] tabular-nums">{date}</span>
              </div>
            ))}
          </div>
        </section>
      )}

      {activeTab === 'monitoring' && (
        <section className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-white border border-[#DDE4DE] rounded-xl p-5 space-y-2">
            <div className="flex items-center gap-2 text-xs font-semibold text-[#26332D]">
              <Database className="w-4 h-4 text-[#173D32]" />
              <span>Neo4j Aura Instance</span>
            </div>
            <SafetyBadge
              status={backendOnline ? 'verified' : 'insufficient_evidence'}
              labelOverride={backendOnline ? 'Connected' : 'Offline / Demo Mode'}
            />
            <p className="text-xs text-[#758078]">Catalog connectivity check</p>
          </div>

          <div className="bg-white border border-[#DDE4DE] rounded-xl p-5 space-y-2">
            <div className="flex items-center gap-2 text-xs font-semibold text-[#26332D]">
              <Activity className="w-4 h-4 text-[#173D32]" />
              <span>Safety Gate Audit</span>
            </div>
            <p className="text-xl font-semibold tabular-nums text-[#26332D]">Not available</p>
            <p className="text-xs text-[#758078]">Aggregate safety metrics are unavailable.</p>
          </div>

          <div className="bg-white border border-[#DDE4DE] rounded-xl p-5 space-y-2">
            <div className="flex items-center gap-2 text-xs font-semibold text-[#26332D]">
              <CheckCircle2 className="w-4 h-4 text-[#173D32]" />
              <span>Clinician Feedback Log</span>
            </div>
            <p className="text-xl font-semibold tabular-nums text-[#26332D]">Not available</p>
            <p className="text-xs text-[#758078]">Individual feedback is private.</p>
          </div>
        </section>
      )}

      {/* Confirmation Modal for Consequential Governance Changes */}
      {pendingAction && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 bg-[#26332D]/40 flex items-center justify-center p-4"
        >
          <div className="bg-white border border-[#DDE4DE] rounded-xl max-w-md w-full p-6 space-y-4 shadow-lg">
            <div className="flex items-start gap-3">
              <AlertTriangle className="w-5 h-5 text-[#B7791F] shrink-0 mt-0.5" />
              <div className="space-y-1">
                <h3 className="text-sm font-semibold text-[#26332D]">
                  Confirm Governance Action
                </h3>
                <p className="text-xs text-[#758078] leading-relaxed">
                  You are marking <strong>&ldquo;{pendingAction.item.title}&rdquo;</strong> as{' '}
                  <strong>{pendingAction.nextStatus}</strong>. This changes safety review status in the audit log.
                </p>
              </div>
            </div>
            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setPendingAction(null)}
                className="px-3.5 py-2 rounded-lg border border-[#DDE4DE] text-xs font-medium text-[#26332D] hover:bg-[#F7F5EE] cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={confirmUpdate}
                className="px-4 py-2 rounded-lg bg-[#173D32] text-white text-xs font-medium hover:bg-[#164B45] cursor-pointer"
              >
                Confirm {pendingAction.nextStatus}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
