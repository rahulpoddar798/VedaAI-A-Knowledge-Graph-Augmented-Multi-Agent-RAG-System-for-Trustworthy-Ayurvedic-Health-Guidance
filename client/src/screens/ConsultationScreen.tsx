import React, { useState } from 'react';
import {
  Send,
  Camera,
  X,
  ArrowRight,
  ShieldCheck,
  AlertTriangle,
  MessageSquare,
  ThumbsUp,
  ThumbsDown,
  ClipboardCheck,
  Cpu,
  SlidersHorizontal
} from 'lucide-react';
import { PageHeader } from '../components/ui/PageHeader';
import { SafetyBadge } from '../components/ui/SafetyBadge';
import {
  EmptyPanel,
  ErrorPanel,
  LoadingPanel,
  SampleNoticeBanner
} from '../components/ui/StatePanels';
import { clinicalProfile, appendClinicalProfile, followUpText, mapConsultation } from '../data/consultation';
import type {
  ConsultationRecord,
  PatientProfile,
  ScreenId
} from '../types/veda';

interface ConsultationScreenProps {
  profile: PatientProfile;
  activeConsultation: ConsultationRecord | null;
  onConsultationComplete: (record: ConsultationRecord) => void;
  onNavigate: (screen: ScreenId) => void;
}

interface FollowUpTurn {
  role: 'user' | 'assistant';
  content: string;
}

const SUGGESTED_PROMPTS = [
  {
    label: 'Ginger in Grishma + Acid Reflux',
    query:
      'Can I take dry Ginger (Shunthi) daily for sluggish digestion during summer while managing acid reflux?'
  },
  {
    label: 'Amalaki for winter immunity',
    query: 'Can I take Indian Gooseberry (Amalaki) daily for antioxidant immunity in winter?'
  },
  {
    label: 'Ashwagandha in Spring (Kapha)',
    query:
      'Is Ashwagandha suitable for fatigue during spring if I have Kapha dominance and weight concerns?'
  }
];

export const ConsultationScreen: React.FC<ConsultationScreenProps> = ({
  profile,
  activeConsultation,
  onConsultationComplete,
  onNavigate
}) => {
  const [query, setQuery] = useState(
    activeConsultation?.fullQuery || ''
  );
  const [attachedFile, setAttachedFile] = useState<File | null>(null);
  const [attachedPreview, setAttachedPreview] = useState<string | null>(null);

  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<'none' | 'accurate' | 'discrepancy'>('none');

  const [followUpInput, setFollowUpInput] = useState('');
  const [followUpLoading, setFollowUpLoading] = useState(false);
  const [followUps, setFollowUps] = useState<FollowUpTurn[]>([]);

  const handleSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!query.trim() && !attachedFile) return;

    setLoading(true);
    setErrorMsg(null);
    setFeedback('none');
    setFollowUps([]);

    try {
      let res: Response;
      if (attachedFile) {
        const fd = new FormData();
        fd.append('image', attachedFile);
        fd.append('query', query.trim() || 'Is this herbal product safe for my profile?');
        appendClinicalProfile(fd, profile);
        res = await fetch('/api/consult-with-image', { method: 'POST', body: fd });
      } else {
        res = await fetch('/api/chat', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            query: query.trim(),
            ...clinicalProfile(profile)
          })
        });
      }

      const json = await res.json().catch(() => ({}));
      if (!res.ok || json.success === false) {
        throw new Error(json.error || `Server error ${res.status}`);
      }

      onConsultationComplete(mapConsultation(json, query, profile));
    } catch (err) {
      // Preserve user's query and surface clear error
      setErrorMsg(
        err instanceof Error
          ? err.message
          : 'Unable to reach VedaAI consultation service.'
      );
    } finally {
      setLoading(false);
    }
  };

  const handleFollowUp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!followUpInput.trim() || !activeConsultation) return;
    const text = followUpInput.trim();
    setFollowUps(prev => [...prev, { role: 'user', content: text }]);
    setFollowUpInput('');
    setFollowUpLoading(true);

    if (activeConsultation.isSampleData) {
      setFollowUps(prev => [...prev, { role: 'assistant', content: 'A live consultation is required for follow-up.' }]);
      setFollowUpLoading(false);
      return;
    }

    try {
      const res = await fetch('/api/follow-up', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + activeConsultation.followUpToken },
        body: JSON.stringify({
          followUpQuery: text,
          consultationId: activeConsultation.id
        })
      });
      const json = await res.json();
      if (res.ok && json.success && json.data) {
        const content = followUpText(json.data, activeConsultation);
        setFollowUps(prev => [...prev, { role: 'assistant', content }]);
      } else {
        setFollowUps(prev => [
          ...prev,
          { role: 'assistant', content: json.error || 'Follow-up request could not be completed.' }
        ]);
      }
    } catch {
      setFollowUps(prev => [
        ...prev,
        { role: 'assistant', content: 'The follow-up service could not provide a valid response.' }
      ]);
    } finally {
      setFollowUpLoading(false);
    }
  };

  const handleFeedback = async (type: 'accurate' | 'discrepancy') => {
    if (!activeConsultation || activeConsultation.isSampleData) return;
    try {
      const res = await fetch('/api/feedback', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ feedback: type })
      });
      if (!res.ok) throw new Error();
      setFeedback(type);
    } catch {
      setErrorMsg('Feedback could not be recorded.');
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Multi-Agent Clinical Inquiry"
        title="Consultation Dashboard"
        description="Submit a symptom, herb, or formulation question grounded in your active constitutional profile. Review source records, safety findings and remaining evidence gaps."
        actions={
          activeConsultation && (
            <>
              <button
                type="button"
                onClick={() => onNavigate('assessment')}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-white border border-[#DDE4DE] text-xs font-medium text-[#26332D] hover:bg-[#E8EFE8]/50 cursor-pointer"
              >
                <ClipboardCheck className="w-3.5 h-3.5 text-[#173D32]" />
                <span>Full AI Assessment</span>
              </button>
              <button
                type="button"
                onClick={() => onNavigate('agents')}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-white border border-[#DDE4DE] text-xs font-medium text-[#26332D] hover:bg-[#E8EFE8]/50 cursor-pointer"
              >
                <Cpu className="w-3.5 h-3.5 text-[#173D32]" />
                <span>Execution stages</span>
              </button>
            </>
          )
        }
      />

      {/* Compact Patient Context Strip */}
      <div className="bg-white border border-[#DDE4DE] rounded-xl px-4 py-3 flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2 text-xs">
          <span className="inline-flex items-center gap-1.5 font-semibold text-[#26332D]">
            <SlidersHorizontal className="w-3.5 h-3.5 text-[#173D32]" />
            Context:
          </span>
          <span className="px-2.5 py-0.5 rounded-md bg-[#E8EFE8] text-[#173D32] font-medium">
            {profile.prakriti}
          </span>
          <span className="px-2.5 py-0.5 rounded-md bg-[#E8EFE8] text-[#173D32] font-medium">
            {profile.season}
          </span>
          {profile.conditions.map(c => (
            <span
              key={c}
              className="px-2.5 py-0.5 rounded-md bg-[#FDF4E6] text-[#945F14] border border-[#EAD0A1] font-medium"
            >
              {c}
            </span>
          ))}
        </div>
        <button
          type="button"
          onClick={() => onNavigate('profile')}
          className="text-xs font-medium text-[#164B45] underline underline-offset-2 cursor-pointer"
        >
          Update Health Profile
        </button>
      </div>

      {/* Primary Query Composer Card */}
      <section className="bg-white border border-[#DDE4DE] rounded-xl p-5 space-y-4">
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <label htmlFor="consult-query" className="text-sm font-semibold text-[#26332D]">
              Clinical Query or Herbal Safety Question
            </label>

            <label className="inline-flex items-center gap-1.5 text-xs font-medium text-[#173D32] hover:text-[#164B45] cursor-pointer">
              <Camera className="w-4 h-4" />
              <span>{attachedFile ? 'Replace photo' : 'Attach herb / label photo'}</span>
              <input
                type="file"
                accept="image/png,image/jpeg,image/webp"
                className="sr-only"
                onChange={e => {
                  const file = e.target.files?.[0];
                  if (file) {
                    setAttachedFile(file);
                    setAttachedPreview(URL.createObjectURL(file));
                  }
                }}
              />
            </label>
          </div>

          {attachedPreview && (
            <div className="flex items-center justify-between gap-3 p-3 rounded-lg bg-[#F7F5EE] border border-[#DDE4DE]">
              <div className="flex items-center gap-3 min-w-0">
                <img
                  src={attachedPreview}
                  alt="Attached formulation"
                  className="w-12 h-12 rounded-md object-cover border border-[#DDE4DE]"
                />
                <div className="min-w-0">
                  <p className="text-xs font-semibold text-[#26332D] truncate">
                    {attachedFile?.name}
                  </p>
                  <p className="text-[11px] text-[#758078]">
                    Multimodal scan will seed entities into the clinical pipeline.
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => {
                  setAttachedFile(null);
                  setAttachedPreview(null);
                }}
                aria-label="Remove attached photo"
                className="p-1.5 rounded-md text-[#758078] hover:text-[#B64040] cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          )}

          <div className="flex flex-col sm:flex-row gap-3">
            <textarea
              id="consult-query"
              rows={2}
              value={query}
              onChange={e => setQuery(e.target.value)}
              placeholder="Ask about an herb, formulation, symptom, or seasonal compatibility..."
              className="flex-1 p-3 rounded-lg border border-[#DDE4DE] bg-[#F7F5EE]/50 text-sm text-[#26332D] placeholder-[#758078] focus:bg-white resize-none"
            />
            <button
              type="submit"
              disabled={loading || (!query.trim() && !attachedFile)}
              className="sm:w-44 h-auto py-3 px-4 rounded-lg bg-[#173D32] text-white text-sm font-medium hover:bg-[#164B45] transition disabled:opacity-50 inline-flex items-center justify-center gap-2 shrink-0 cursor-pointer"
            >
              <span>{loading ? 'Evaluating...' : 'Run Consultation'}</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>

          {/* Compact Optional Suggested Prompts */}
          <div className="flex flex-wrap items-center gap-2 pt-1">
            <span className="text-[11px] font-medium text-[#758078]">Optional examples:</span>
            {SUGGESTED_PROMPTS.map(p => (
              <button
                key={p.label}
                type="button"
                onClick={() => {
                  setQuery(p.query);
                  setErrorMsg(null);
                }}
                className="px-2.5 py-1 rounded-full border border-[#DDE4DE] bg-[#F7F5EE]/70 text-xs text-[#26332D] hover:bg-[#E8EFE8] transition cursor-pointer"
              >
                {p.label}
              </button>
            ))}
          </div>
        </form>
      </section>

      <details className="rounded-xl border p-4">
        <summary>View a demonstration consultation</summary>
        <p>Example question: Can I take ginger during summer?</p>
        <p>Demonstration only. This example has no backend assessment or evidence ledger.</p>
      </details>

      {errorMsg && (
        <ErrorPanel
          title="Consultation Request Failed"
          message={errorMsg}
          onRetry={() => handleSubmit()}
        />
      )}

      {loading && (
        <LoadingPanel
          title="Assessing available evidence..."
          description="Retrieving sources and checking the reported patient context."
        />
      )}

      {!loading && !activeConsultation && !errorMsg && (
        <EmptyPanel
          title="Ready for Clinical Consultation"
          description="Enter a question above or choose an optional example prompt to view structured safety verdicts, graph citations, and follow-up guidance."
        />
      )}

      {/* Structured Consultation Result */}
      {!loading && !errorMsg && activeConsultation && (
        <div className="space-y-5">
          {activeConsultation.isSampleData && (
            <SampleNoticeBanner text="Showing sample consultation record. Submit any query above to evaluate against live Neo4j + LangGraph when the backend is online." />
          )}

          {/* User Message Bubble */}
          <div className="bg-[#E8EFE8]/50 border border-[#DDE4DE] rounded-xl p-4 flex items-start justify-between gap-4">
            <div className="space-y-1">
              <span className="text-[11px] font-semibold uppercase tracking-wider text-[#164B45]">
                Patient Inquiry · {activeConsultation.timestamp}
              </span>
              <p className="text-sm font-medium text-[#26332D]">{activeConsultation.fullQuery}</p>
            </div>
          </div>

          {/* Safety Verdict & Clinical Summary */}
          <section className="bg-white border border-[#DDE4DE] rounded-xl p-6 space-y-5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-[#DDE4DE]">
              <div className="space-y-1">
                <span className="text-[11px] font-semibold uppercase tracking-wider text-[#758078]">
                  Consultation assessment
                </span>
                <h2 className="font-editorial text-xl font-semibold text-[#26332D]">
                  {activeConsultation.verdictLabel}
                </h2>
              </div>
              <SafetyBadge status={activeConsultation.status} size="md" />
            </div>

            {/* Warnings first when present */}
            {activeConsultation.safetyWarnings.length > 0 && (
              <div className="rounded-lg bg-[#FBEAEA] border border-[#E7BABA] p-4 space-y-2">
                <div className="flex items-center gap-2 text-xs font-semibold text-[#9A2E2E]">
                  <AlertTriangle className="w-4 h-4 shrink-0" />
                  <span>Safety Warnings &amp; Contraindications</span>
                </div>
                <ul className="list-disc pl-5 space-y-1 text-xs text-[#7B2828] leading-relaxed">
                  {activeConsultation.safetyWarnings.map((w, i) => (
                    <li key={i}>{w}</li>
                  ))}
                </ul>
              </div>
            )}

            <div className="space-y-2">
              <h3 className="text-xs font-semibold uppercase tracking-wider text-[#758078]">
                Clinical Guidance Summary
              </h3>
              <p className="text-sm text-[#26332D] leading-relaxed">
                {activeConsultation.clinicalSummary}
              </p>
            <p>Evaluated herbs: {activeConsultation.herbsEvaluated.join(', ') || 'Not available'}</p>
            {activeConsultation.missingInformation.map(note => <p key={note}>{note}</p>)}
            </div>

            {/* Alternatives if present */}
            {activeConsultation.alternatives && activeConsultation.alternatives.length > 0 && (
              <div className="pt-2 space-y-2.5">
                <h3 className="text-xs font-semibold uppercase tracking-wider text-[#173D32]">
                  Alternatives considered in this assessment
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {activeConsultation.alternatives.map(alt => (
                    <div
                      key={alt.herb_name}
                      className="p-3.5 rounded-lg border border-[#B8DEC9] bg-[#E8F5EE]/40 space-y-1"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-xs font-semibold text-[#173D32]">
                          {alt.herb_name}
                        </span>
                        {alt.virya && (
                          <span className="text-[11px] px-2 py-0.5 rounded bg-white border border-[#B8DEC9] text-[#1D6347]">
                            {alt.virya} Virya
                          </span>
                        )}
                      </div>
                      {alt.botanical_name && (
                        <p className="text-[11px] italic text-[#758078]">{alt.botanical_name}</p>
                      )}
                      <p className="text-xs text-[#26332D] leading-relaxed">{alt.why_safe}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Navigation to Deep Assessment & Verification Feedback */}
            <div className="pt-4 border-t border-[#DDE4DE] flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={() => onNavigate('assessment')}
                  className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-[#173D32] text-white text-xs font-medium hover:bg-[#164B45] transition cursor-pointer"
                >
                  <ShieldCheck className="w-3.5 h-3.5" />
                  <span>Inspect Evidence &amp; Provenance</span>
                </button>
                <button
                  type="button"
                  onClick={() => onNavigate('agents')}
                  className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-white border border-[#DDE4DE] text-xs font-medium text-[#26332D] hover:bg-[#F7F5EE] transition cursor-pointer"
                >
                  <Cpu className="w-3.5 h-3.5 text-[#173D32]" />
                  <span>Inspect execution stages</span>
                </button>
              </div>

              <div className="flex items-center gap-2 text-xs">
                <span className="text-[#758078]">Clinical feedback:</span>
                <button
                  type="button"
                  onClick={() => handleFeedback('accurate')}
                  className={`inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg border text-xs font-medium cursor-pointer ${
                    feedback === 'accurate'
                      ? 'bg-[#E8F5EE] border-[#B8DEC9] text-[#1D6347]'
                      : 'bg-white border-[#DDE4DE] text-[#26332D]'
                  }`}
                >
                  <ThumbsUp className="w-3.5 h-3.5" />
                  <span>Accurate</span>
                </button>
                <button
                  type="button"
                  onClick={() => handleFeedback('discrepancy')}
                  className={`inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg border text-xs font-medium cursor-pointer ${
                    feedback === 'discrepancy'
                      ? 'bg-[#FDF4E6] border-[#EAD0A1] text-[#945F14]'
                      : 'bg-white border-[#DDE4DE] text-[#26332D]'
                  }`}
                >
                  <ThumbsDown className="w-3.5 h-3.5" />
                  <span>Flag Discrepancy</span>
                </button>
              </div>
            </div>
          </section>

          {/* Follow-up is available for assessed records. */}
          {activeConsultation.followUpToken && <section className="bg-white border border-[#DDE4DE] rounded-xl p-5 space-y-4">
            <div className="flex items-center gap-2 pb-3 border-b border-[#DDE4DE]">
              <MessageSquare className="w-4 h-4 text-[#173D32]" />
              <div>
                <h3 className="text-sm font-semibold text-[#26332D]">
                  Consultation follow-up
                </h3>
                <p className="text-xs text-[#758078]">
                  Ask a scoped follow-up question anchored to this assessment.
                </p>
              </div>
            </div>

            {followUps.length > 0 && (
              <div className="space-y-3">
                {followUps.map((turn, i) => (
                  <div
                    key={i}
                    className={`rounded-xl p-4 text-xs space-y-2 ${
                      turn.role === 'user'
                        ? 'bg-[#E8EFE8]/60 border border-[#DDE4DE] ml-8'
                        : 'bg-[#F7F5EE] border border-[#DDE4DE] mr-8'
                    }`}
                  >
                    <p className="font-semibold text-[#173D32]">
                      {turn.role === 'user' ? 'Your Follow-Up' : 'VedaAI Follow-Up Guidance'}
                    </p>
                    <p className="text-[#26332D] leading-relaxed">{turn.content}</p>
                  </div>
                ))}
              </div>
            )}

            <form onSubmit={handleFollowUp} className="flex gap-2">
              <input
                type="text"
                value={followUpInput}
                onChange={e => setFollowUpInput(e.target.value)}
                placeholder="Ask about the evidence or restrictions in this assessment..."
                className="flex-1 h-10 px-3.5 rounded-lg border border-[#DDE4DE] bg-[#F7F5EE]/50 text-xs text-[#26332D] focus:bg-white"
              />
              <button
                type="submit"
                disabled={followUpLoading || !followUpInput.trim()}
                className="inline-flex items-center gap-1.5 px-4 h-10 rounded-lg bg-[#173D32] text-white text-xs font-medium hover:bg-[#164B45] disabled:opacity-50 cursor-pointer"
              >
                <Send className="w-3.5 h-3.5" />
                <span>{followUpLoading ? 'Sending...' : 'Ask'}</span>
              </button>
            </form>
          </section>}
        </div>
      )}
    </div>
  );
};
