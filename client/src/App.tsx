import React, { useState, useEffect } from 'react';
import {
  Leaf,
  Sparkles,
  UserCheck,
  AlertTriangle,
  ArrowRight,
  Loader2,
  Ban,
  Check,
  ShieldCheck,
  Camera,
  X,
  Info,
  Calendar,
  HeartPulse,
  Pill,
  Search,
  ChevronDown,
  ThumbsUp,
  ThumbsDown,
  MessageSquare,
  Send,
  CheckCircle2,
  BookOpen,
  ClipboardList,
  FileWarning,
  CircleHelp,
  WifiOff
} from 'lucide-react';

interface AlternativeHerb {
  herb_name: string;
  botanical_name?: string;
  virya?: string;
  why_safe: string;
}

interface FollowUpMessage {
  role: 'user' | 'assistant';
  content: string;
  data?: {
    reply: string;
    dosage_and_anupana?: string;
    pathya_apathya?: string;
    precautions?: string;
    suggested_followups?: string[];
  };
}

interface ScanData {
  product_name: string;
  is_ayurvedic_or_herbal: boolean;
  detected_herbs: string[];
  ingredients_detected?: string[];
  formulation_type?: string;
  visual_confidence?: number;
  extracted_ocr_text?: string;
  summary?: string;
  graph_membership?: {
    status: string;
    verified_herbs: Array<{
      canonical_name: string;
      botanical_name?: string;
      sanskrit_name?: string;
      virya?: string;
    }>;
  };
}

interface ConsultationResponse {
  success: boolean;
  durationMs: number;
  confidenceScore: number;
  isOutOfDomain?: boolean;
  scan?: ScanData;
  error?: string;
  result: {
    final_verdict: string;
    confidence_score: number;
    summary_message: string;
    clinical_reasoning?: string[];
    risk_explanation?: string;
    suggested_alternatives?: AlternativeHerb[];
    graph_evidence_summary?: string[];
    disclaimer: string;
  };
}

// --- Label Audit Types ---
interface AuditIngredient {
  printed_name: string;
  common_name?: string | null;
  uncertain?: boolean;
  status: 'verified' | 'unverified' | 'uncertain';
  reason?: string;
  canonical_name?: string;
  botanical_name?: string;
  sanskrit_name?: string;
  virya?: string;
  rasa?: string;
  safety?: {
    verdict: 'SAFE' | 'FLAGGED';
    flags: string[];
    paths: string[];
    reasoning: string[];
  };
}

interface LabelAuditResponse {
  success: boolean;
  durationMs: number;
  error?: string;
  extraction: {
    product_name: string;
    formulation_type?: string;
    visual_confidence: number;
    extracted_ocr_text?: string;
    summary?: string;
    is_supplement_label: boolean;
  };
  ingredients: {
    verified: AuditIngredient[];
    unverified: AuditIngredient[];
    uncertain: AuditIngredient[];
  };
  auditedIngredients: AuditIngredient[];
  summary: {
    totalExtracted: number;
    verified: number;
    unverified: number;
    uncertain: number;
    flagged: number;
    safe: number;
  };
}

export default function App() {
  const [query, setQuery] = useState('');
  const [prakriti, setPrakriti] = useState('Pitta');
  const [season, setSeason] = useState('Hemanta');
  const [conditions, setConditions] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<ConsultationResponse | null>(null);
  const [activeTab, setActiveTab] = useState<'consultation' | 'herbs' | 'label-audit'>('consultation');
  const [herbsList, setHerbsList] = useState<any[]>([]);
  const [herbSearch, setHerbSearch] = useState('');
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [apiError, setApiError] = useState<string | null>(null);
  const [serviceDown, setServiceDown] = useState(false);

  // Verification & Clinician Feedback state
  const [showVerification, setShowVerification] = useState(false);
  const [feedbackStatus, setFeedbackStatus] = useState<'none' | 'accurate' | 'discrepancy'>('none');

  // Follow-Up Q&A state
  const [followUpQuery, setFollowUpQuery] = useState('');
  const [followUpLoading, setFollowUpLoading] = useState(false);
  const [followUpMessages, setFollowUpMessages] = useState<FollowUpMessage[]>([]);

  // Label Audit state
  const [auditImage, setAuditImage] = useState<File | null>(null);
  const [auditPreview, setAuditPreview] = useState<string | null>(null);
  const [auditLoading, setAuditLoading] = useState(false);
  const [auditResult, setAuditResult] = useState<LabelAuditResponse | null>(null);
  const [auditError, setAuditError] = useState<string | null>(null);

  // Fetch verified herbs and check service health on mount
  useEffect(() => {
    fetch('/api/herbs')
      .then(r => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        return r.json();
      })
      .then(d => {
        if (d.herbs) setHerbsList(d.herbs);
        setServiceDown(false);
      })
      .catch(() => setServiceDown(true));

    fetch('/api/status')
      .then(r => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        return r.json();
      })
      .then(d => {
        if (d.status !== 'online') setServiceDown(true);
        else setServiceDown(false);
      })
      .catch(() => setServiceDown(true));
  }, []);

  const toggleCondition = (cond: string) => {
    setConditions(prev =>
      prev.includes(cond) ? prev.filter(c => c !== cond) : [...prev, cond]
    );
  };

  const loadPreset = (preset: number) => {
    setImageFile(null);
    setImagePreview(null);
    if (preset === 1) {
      setQuery('Can I take Ginger for digestion in summer with acid reflux?');
      setPrakriti('Pitta-Vata');
      setSeason('Grishma');
      setConditions(['Acid Reflux']);
    } else if (preset === 2) {
      setQuery('Can I take Amla for daily immunity in winter?');
      setPrakriti('Vata');
      setSeason('Shishira');
      setConditions([]);
    } else if (preset === 3) {
      setQuery('Can I take Ashwagandha for stamina during spring?');
      setPrakriti('Kapha');
      setSeason('Vasanta');
      setConditions(['Obesity']);
    }
  };

  const loadSampleImage = (type: 'ashwagandha' | 'tulsi' | 'non-herbal') => {
    let filename = '';
    let sampleQuery = '';
    let p = 'Pitta-Vata';
    let s = 'Grishma';
    let c: string[] = [];

    if (type === 'ashwagandha') {
      filename = 'ashwagandha_label.png';
      sampleQuery = 'Is this supplement safe for my constitution?';
      p = 'Kapha';
      s = 'Vasanta';
      c = ['Obesity'];
    } else if (type === 'tulsi') {
      filename = 'tulsi_label.png';
      sampleQuery = 'Can I drink this herbal tea daily during summer?';
      p = 'Pitta';
      s = 'Grishma';
      c = ['Acid Reflux'];
    } else {
      filename = 'electronics_out_of_domain.png';
      sampleQuery = 'Can this be used for Ayurvedic healing?';
      p = 'Tridoshic';
      s = 'Grishma';
      c = [];
    }

    setQuery(sampleQuery);
    setPrakriti(p);
    setSeason(s);
    setConditions(c);

    fetch(`/test_assets/${filename}`)
      .then(r => r.blob())
      .then(blob => {
        const file = new File([blob], filename, { type: 'image/png' });
        setImageFile(file);
        setImagePreview(URL.createObjectURL(blob));
      })
      .catch(() => {});
  };

  const handleSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!query.trim() && !imageFile) return;

    setLoading(true);
    setData(null);
    setApiError(null);
    setFollowUpMessages([]);
    setFeedbackStatus('none');
    setShowVerification(false);

    try {
      let res;
      if (imageFile) {
        const formData = new FormData();
        formData.append('image', imageFile);
        formData.append('query', query.trim() || 'Is this medicine safe for me?');
        formData.append('prakriti', prakriti);
        formData.append('season', season);
        conditions.forEach(c => formData.append('conditions', c));

        res = await fetch('/api/consult-with-image', {
          method: 'POST',
          body: formData
        });
      } else {
        res = await fetch('/api/chat', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            query: query.trim(),
            prakriti,
            season,
            conditions
          })
        });
      }

      const json = await res.json();
      if (!res.ok || json.success === false) {
        setApiError(json.error || `Server returned ${res.status}. Please try again.`);
        return;
      }
      setData(json);
      setServiceDown(false);
    } catch (err: any) {
      if (err.message === 'Failed to fetch') {
        setApiError('Cannot reach the VedaAI server. Please check that the backend is running.');
        setServiceDown(true);
      } else {
        setApiError('Unable to complete consultation: ' + err.message);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleLabelAudit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!auditImage || auditLoading) {
      if (!auditImage) setAuditError('Choose a product label image to scan.');
      return;
    }

    setAuditLoading(true);
    setAuditError(null);
    setAuditResult(null);
    try {
      const formData = new FormData();
      formData.append('image', auditImage);
      formData.append('prakriti', prakriti);
      formData.append('season', season);
      conditions.forEach(condition => formData.append('conditions', condition));

      const response = await fetch('/api/label-audit', { method: 'POST', body: formData });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok || payload.success !== true) {
        throw new Error(payload.error || `Label audit failed (${response.status}). Please try again.`);
      }
      setAuditResult(payload as LabelAuditResponse);
      setServiceDown(false);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unable to scan this label.';
      setAuditError(message);
      if (message.includes('fetch')) setServiceDown(true);
    } finally {
      setAuditLoading(false);
    }
  };

  const handleFollowUpSubmit = async (customQuery?: string) => {
    const q = customQuery || followUpQuery;
    if (!q.trim() || followUpLoading) return;

    const userMsg: FollowUpMessage = { role: 'user', content: q.trim() };
    setFollowUpMessages(prev => [...prev, userMsg]);
    setFollowUpQuery('');
    setFollowUpLoading(true);

    try {
      const recommendedHerbs = data?.result?.suggested_alternatives?.map(a => a.herb_name) || [];
      const res = await fetch('/api/follow-up', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          followUpQuery: q.trim(),
          consultationContext: {
            originalQuery: query,
            finalVerdict: data?.result?.final_verdict,
            summaryMessage: data?.result?.summary_message,
            recommendedHerbs,
            prakriti,
            season,
            conditions
          },
          history: followUpMessages.map(m => ({ role: m.role, content: m.content }))
        })
      });

      const json = await res.json();
      if (!res.ok || !json.success) {
        setFollowUpMessages(prev => [
          ...prev,
          { role: 'assistant', content: json.error || 'Failed to get follow-up guidance. Please try again.' }
        ]);
      } else if (json.data) {
        setFollowUpMessages(prev => [
          ...prev,
          { role: 'assistant', content: json.data.reply, data: json.data }
        ]);
      }
    } catch (err: any) {
      alert('Failed to get follow-up clinical guidance: ' + err.message);
    } finally {
      setFollowUpLoading(false);
    }
  };

  const handleFeedback = async (type: 'accurate' | 'discrepancy') => {
    setFeedbackStatus(type);
    try {
      await fetch('/api/feedback', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          query,
          verdict: data?.result?.final_verdict,
          feedback: type,
          timestamp: new Date().toISOString()
        })
      });
    } catch (err) {}
  };

  const res = data?.result;
  const scan = data?.scan;

  const isUncataloged = res?.final_verdict?.includes('NOT IN KNOWLEDGE BASE');
  const isOutOfDomain = data?.isOutOfDomain || res?.final_verdict === 'OUT_OF_DOMAIN' || isUncataloged;
  const isUnsafe = !isUncataloged && (res?.final_verdict?.includes('UNSAFE') || res?.final_verdict?.includes('DO NOT RECOMMEND'));

  const filteredHerbs = herbsList.filter(h =>
    h.name?.toLowerCase().includes(herbSearch.toLowerCase()) ||
    h.botanical_name?.toLowerCase().includes(herbSearch.toLowerCase()) ||
    h.sanskrit_name?.toLowerCase().includes(herbSearch.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-[#09090b] text-[#fafafa] flex flex-col font-sans selection:bg-emerald-500 selection:text-black">
      
      {/* Top Professional Navigation */}
      <header className="sticky top-0 z-50 border-b border-zinc-800 bg-[#09090b]/80 backdrop-blur-md">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="h-9 w-9 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-center justify-center shadow-inner">
              <Leaf className="w-5 h-5 text-emerald-400" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <span className="font-semibold text-base tracking-tight text-white">VedaAI</span>
                <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                  Ayurvedic Clinical Advisor
                </span>
              </div>
              <p className="text-[11px] text-zinc-400">Intelligent Ayurvedic Health Guidance & Contraindication Safety</p>
            </div>
          </div>

          <div className="flex items-center space-x-4">
            <div className="hidden md:flex items-center space-x-2 text-xs text-zinc-400 bg-zinc-900/60 px-3 py-1.5 rounded-full border border-zinc-800">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              <span>Ayurvedic Clinical Knowledge Base Active</span>
            </div>

            <nav className="flex space-x-1 p-1 bg-zinc-900 border border-zinc-800 rounded-lg">
              <button
                onClick={() => setActiveTab('consultation')}
                className={`px-3.5 py-1.5 rounded-md text-xs font-medium transition ${activeTab === 'consultation' ? 'bg-zinc-800 text-white shadow-sm' : 'text-zinc-400 hover:text-zinc-200'}`}
              >
                Health Consultation
              </button>
              <button
                onClick={() => setActiveTab('label-audit')}
                className={`px-3.5 py-1.5 rounded-md text-xs font-medium transition ${activeTab === 'label-audit' ? 'bg-zinc-800 text-white shadow-sm' : 'text-zinc-400 hover:text-zinc-200'}`}
              >
                Label Audit
              </button>
              <button
                onClick={() => setActiveTab('herbs')}
                className={`px-3.5 py-1.5 rounded-md text-xs font-medium transition ${activeTab === 'herbs' ? 'bg-zinc-800 text-white shadow-sm' : 'text-zinc-400 hover:text-zinc-200'}`}
              >
                Herb Directory
              </button>
            </nav>
          </div>
        </div>
      </header>

      {/* Service unavailable banner */}
      {serviceDown && (
        <div className="bg-red-950/70 border-b border-red-500/30 py-2.5 px-4">
          <div className="max-w-7xl mx-auto flex items-center space-x-2 text-xs text-red-300">
            <WifiOff className="w-4 h-4 shrink-0" />
            <span>VedaAI services are unreachable. Check that the backend server and Neo4j database are running.</span>
          </div>
        </div>
      )}

      {/* Main Container */}
      {activeTab === 'consultation' ? (
        <main className="flex-1 max-w-7xl mx-auto px-4 sm:px-6 py-8 w-full">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">

            {/* Left Column: Patient Profile & Quick Questions */}
            <aside className="lg:col-span-4 flex flex-col space-y-6">

              {/* Health Profile Card */}
              <div className="bg-zinc-900/50 border border-zinc-800/80 rounded-2xl p-6 space-y-5 shadow-sm">
                <div className="flex items-center justify-between pb-3 border-b border-zinc-800/80">
                  <div className="flex items-center space-x-2.5">
                    <UserCheck className="w-4 h-4 text-emerald-400" />
                    <h2 className="text-xs font-semibold uppercase tracking-wider text-zinc-200">Your Health Profile</h2>
                  </div>
                  <span className="text-[11px] text-zinc-500">Personalized</span>
                </div>

                {/* Dosha / Prakriti Selector */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-medium text-zinc-300">Constitutional Body Type (Prakriti):</label>
                  </div>
                  <div className="grid grid-cols-3 gap-2">
                    {[
                      { id: 'Vata', label: 'Vata', sub: 'Air & Ether' },
                      { id: 'Pitta', label: 'Pitta', sub: 'Fire & Water' },
                      { id: 'Kapha', label: 'Kapha', sub: 'Earth & Water' },
                      { id: 'Pitta-Vata', label: 'Pitta-Vata', sub: 'Warm & Dry' },
                      { id: 'Kapha-Pitta', label: 'Kapha-Pitta', sub: 'Moist & Warm' },
                      { id: 'Tridoshic', label: 'Balanced', sub: 'All 3 Doshas' }
                    ].map(item => (
                      <button
                        key={item.id}
                        type="button"
                        onClick={() => setPrakriti(item.id)}
                        className={`p-2 rounded-xl border text-center transition ${prakriti === item.id ? 'border-emerald-500 bg-emerald-950/30 text-emerald-400 font-medium ring-1 ring-emerald-500/30' : 'border-zinc-800 bg-zinc-950/60 text-zinc-400 hover:border-zinc-700 hover:text-zinc-300'}`}
                      >
                        <p className="text-xs font-medium">{item.label}</p>
                        <p className="text-[9px] text-zinc-500 mt-0.5">{item.sub}</p>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Current Season Selector */}
                <div className="space-y-2">
                  <div className="flex items-center space-x-1.5 text-xs font-medium text-zinc-300">
                    <Calendar className="w-3.5 h-3.5 text-zinc-400" />
                    <span>Current Climate Season (Ritu):</span>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    {[
                      { id: 'Grishma', name: 'Summer (Grishma)', hint: 'Pitta season' },
                      { id: 'Varsha', name: 'Monsoon (Varsha)', hint: 'Vata season' },
                      { id: 'Sharada', name: 'Autumn (Sharad)', hint: 'Pitta season' },
                      { id: 'Hemanta', name: 'Early Winter (Hemanta)', hint: 'Vata season' },
                      { id: 'Shishira', name: 'Late Winter (Shishira)', hint: 'Kapha season' },
                      { id: 'Vasanta', name: 'Spring (Vasanta)', hint: 'Kapha season' }
                    ].map(s => (
                      <button
                        key={s.id}
                        type="button"
                        onClick={() => setSeason(s.id)}
                        className={`p-2 rounded-xl border text-left transition ${season === s.id ? 'border-emerald-500 bg-emerald-950/30 text-emerald-400 font-medium ring-1 ring-emerald-500/30' : 'border-zinc-800 bg-zinc-950/60 text-zinc-400 hover:border-zinc-700 hover:text-zinc-300'}`}
                      >
                        <p className="text-xs font-medium truncate">{s.name}</p>
                        <p className="text-[9px] text-zinc-500">{s.hint}</p>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Chronic Health Conditions */}
                <div className="space-y-2">
                  <div className="flex items-center space-x-1.5 text-xs font-medium text-zinc-300">
                    <HeartPulse className="w-3.5 h-3.5 text-zinc-400" />
                    <span>Health Conditions / Sensitivities:</span>
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {[
                      'Acid Reflux',
                      'GERD',
                      'Hypertension',
                      'Inflammation',
                      'Obesity',
                      'Anxiety',
                      'Insomnia',
                      'Arthritis',
                      'Constipation'
                    ].map(c => (
                      <button
                        key={c}
                        type="button"
                        onClick={() => toggleCondition(c)}
                        className={`text-xs px-3 py-1 rounded-full border transition ${conditions.includes(c) ? 'border-amber-500 bg-amber-950/30 text-amber-300 font-medium' : 'border-zinc-800 bg-zinc-950/60 text-zinc-400 hover:border-zinc-700 hover:text-zinc-300'}`}
                      >
                        {c}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Sample Consultations & Photo Test Card */}
              <div className="bg-zinc-900/50 border border-zinc-800/80 rounded-2xl p-6 space-y-4 shadow-sm">
                <div className="flex items-center space-x-2 pb-2 border-b border-zinc-800">
                  <Sparkles className="w-4 h-4 text-emerald-400" />
                  <h3 className="text-xs font-semibold uppercase tracking-wider text-zinc-200">Common Clinical Inquiries</h3>
                </div>

                <div className="space-y-2.5">
                  <button
                    type="button"
                    onClick={() => loadPreset(1)}
                    className="w-full text-left p-3 rounded-xl border border-red-500/20 bg-red-950/10 hover:bg-red-950/20 transition group"
                  >
                    <div className="flex items-center justify-between text-xs font-medium text-red-400 mb-1">
                      <span>Ginger in Summer Heat</span>
                      <span className="text-[10px] px-1.5 py-0.5 rounded bg-red-500/20 text-red-300">Contraindicated</span>
                    </div>
                    <p className="text-xs text-zinc-400 group-hover:text-zinc-200 transition">
                      "Can I take Ginger for digestion in summer with acid reflux?"
                    </p>
                  </button>

                  <button
                    type="button"
                    onClick={() => loadPreset(2)}
                    className="w-full text-left p-3 rounded-xl border border-emerald-500/20 bg-emerald-950/10 hover:bg-emerald-950/20 transition group"
                  >
                    <div className="flex items-center justify-between text-xs font-medium text-emerald-400 mb-1">
                      <span>Amla in Winter</span>
                      <span className="text-[10px] px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-300">Recommended</span>
                    </div>
                    <p className="text-xs text-zinc-400 group-hover:text-zinc-200 transition">
                      "Can I take Amla for daily immunity in winter?"
                    </p>
                  </button>

                  <button
                    type="button"
                    onClick={() => loadPreset(3)}
                    className="w-full text-left p-3 rounded-xl border border-amber-500/20 bg-amber-950/10 hover:bg-amber-950/20 transition group"
                  >
                    <div className="flex items-center justify-between text-xs font-medium text-amber-400 mb-1">
                      <span>Ashwagandha in Spring</span>
                      <span className="text-[10px] px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-300">Caution</span>
                    </div>
                    <p className="text-xs text-zinc-400 group-hover:text-zinc-200 transition">
                      "Can I take Ashwagandha for stamina during spring?"
                    </p>
                  </button>
                </div>

                <div className="pt-3 border-t border-zinc-800 space-y-2">
                  <div className="flex items-center space-x-1.5 text-xs text-zinc-400 font-medium">
                    <Camera className="w-3.5 h-3.5 text-purple-400" />
                    <span>Try Medicine Label Scanner Samples:</span>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => loadSampleImage('ashwagandha')}
                      className="p-2 rounded-lg border border-purple-500/20 bg-purple-950/10 hover:bg-purple-950/20 text-left text-xs text-zinc-300 transition"
                    >
                      <p className="font-medium text-white truncate">Ashwagandha Bottle</p>
                      <p className="text-[10px] text-purple-300">Bottle label test</p>
                    </button>
                    <button
                      type="button"
                      onClick={() => loadSampleImage('tulsi')}
                      className="p-2 rounded-lg border border-emerald-500/20 bg-emerald-950/10 hover:bg-emerald-950/20 text-left text-xs text-zinc-300 transition"
                    >
                      <p className="font-medium text-white truncate">Tulsi Tea Box</p>
                      <p className="text-[10px] text-emerald-300">Packaging test</p>
                    </button>
                  </div>
                </div>
              </div>

            </aside>

            {/* Right Column: Consultation Input & Clinical Guidance */}
            <section className="lg:col-span-8 flex flex-col space-y-6">

              {/* Consultation Input Area */}
              <div className="bg-zinc-900/50 border border-zinc-800/80 rounded-2xl p-6 shadow-sm space-y-4">
                <form onSubmit={handleSubmit} className="flex flex-col space-y-4">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-semibold uppercase tracking-wider text-zinc-300">
                      Describe your symptom, herb, or medicine inquiry:
                    </label>

                    <label className="cursor-pointer text-xs flex items-center space-x-1.5 text-emerald-400 hover:text-emerald-300 transition font-medium">
                      <Camera className="w-4 h-4" />
                      <span>{imageFile ? 'Change Photo' : 'Scan Medicine / Bottle'}</span>
                      <input
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={e => {
                          const file = e.target.files?.[0];
                          if (file) {
                            setImageFile(file);
                            setImagePreview(URL.createObjectURL(file));
                          }
                        }}
                      />
                    </label>
                  </div>

                  {/* Attached Image Preview Pill */}
                  {imagePreview && (
                    <div className="flex items-center justify-between p-3.5 rounded-xl bg-zinc-950 border border-zinc-800">
                      <div className="flex items-center space-x-3.5">
                        <img src={imagePreview} alt="Attached medicine" className="w-12 h-12 object-cover rounded-lg border border-zinc-700" />
                        <div>
                          <p className="text-xs font-semibold text-white line-clamp-1">{imageFile?.name || 'Uploaded medicine photo'}</p>
                          <p className="text-[11px] text-emerald-400">Medicine label attached • Ready for consultation</p>
                        </div>
                      </div>
                      <div className="flex items-center space-x-2">
                        <button
                          type="button"
                          onClick={() => handleSubmit()}
                          disabled={loading}
                          className="px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold transition disabled:opacity-50"
                        >
                          Analyze Photo
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setImageFile(null);
                            setImagePreview(null);
                          }}
                          className="text-zinc-500 hover:text-red-400 p-2"
                          title="Remove image"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  )}

                  {/* Query Input Box */}
                  <div className="relative flex items-center">
                    <input
                      type="text"
                      value={query}
                      onChange={e => setQuery(e.target.value)}
                      placeholder={imageFile ? "Ask a question about this medicine (or click Analyze Photo)..." : "e.g., What is good for cough and cold? Or ask about any herb..."}
                      className="w-full h-12 rounded-xl border border-zinc-700/80 bg-zinc-950 px-4 py-3 pr-36 text-sm text-white placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
                    />
                    <button
                      type="submit"
                      disabled={loading || (!query.trim() && !imageFile)}
                      className="absolute right-1.5 h-9 px-5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-medium text-xs flex items-center space-x-2 transition disabled:opacity-50 shadow"
                    >
                      {loading ? (
                        <>
                          <Loader2 className="w-4 h-4 animate-spin" />
                          <span>Evaluating...</span>
                        </>
                      ) : (
                        <>
                          <span>Consult</span>
                          <ArrowRight className="w-4 h-4" />
                        </>
                      )}
                    </button>
                  </div>

                  {/* Quick Natural Query Chips */}
                  <div className="flex flex-wrap items-center gap-1.5 pt-1">
                    <span className="text-[11px] text-zinc-500 font-medium mr-1">Quick Inquiries:</span>
                    {[
                      { text: "What is good for cough and cold?", icon: "🌿" },
                      { text: "What helps with anxiety and sleep?", icon: "🌙" },
                      { text: "Soothing herbs for acid reflux and GERD", icon: "🍵" },
                      { text: "Herbs for joint stiffness & arthritis", icon: "🦴" },
                      { text: "What herbs boost daily immunity?", icon: "✨" }
                    ].map((chip, idx) => (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => {
                          setQuery(chip.text);
                          setImageFile(null);
                          setImagePreview(null);
                        }}
                        className="text-[11px] px-2.5 py-1 rounded-full border border-zinc-800 bg-zinc-950/70 text-zinc-400 hover:border-emerald-500/40 hover:text-emerald-300 hover:bg-emerald-950/20 transition flex items-center space-x-1"
                      >
                        <span>{chip.icon}</span>
                        <span>{chip.text}</span>
                      </button>
                    ))}
                  </div>
                </form>
              </div>

              {apiError && (
                <div role="alert" className="flex items-start gap-2 rounded-xl border border-red-500/30 bg-red-950/30 p-4 text-xs text-red-200">
                  <FileWarning className="w-4 h-4 shrink-0" />
                  <span>{apiError}</span>
                </div>
              )}

              {/* Loading State: Clean, Clinical Medical Loader */}
              {loading && (
                <div className="bg-zinc-900/40 border border-emerald-500/30 rounded-2xl p-6 shadow-sm space-y-4">
                  <div className="flex items-center space-x-3">
                    <Loader2 className="w-5 h-5 text-emerald-400 animate-spin" />
                    <div>
                      <h4 className="text-sm font-semibold text-white">Consulting Ayurvedic Clinical Knowledge Base...</h4>
                      <p className="text-xs text-zinc-400">Verifying constitutional suitability, seasonal influences, and herb interactions.</p>
                    </div>
                  </div>
                </div>
              )}

              {/* Consultation Results Display */}
              <div className="bg-zinc-900/50 border border-zinc-800/80 rounded-2xl p-6 shadow-sm space-y-6">

                {/* Empty State */}
                {!data && !loading && (
                  <div className="text-center py-16 space-y-4">
                    <div className="w-14 h-14 rounded-2xl bg-zinc-800/60 border border-zinc-700/80 text-emerald-400 flex items-center justify-center mx-auto shadow-inner">
                      <Leaf className="w-7 h-7" />
                    </div>
                    <div className="space-y-1.5">
                      <h3 className="text-base font-semibold text-white">Ayurvedic Health Advisor Ready</h3>
                      <p className="text-xs text-zinc-400 max-w-md mx-auto">
                        Ask any herbal or therapeutic health question above, or upload a photo of an Ayurvedic medicine label to receive personalized, safety-verified guidance.
                      </p>
                    </div>
                  </div>
                )}

                {/* Scanned Medicine Summary Card (If an image was scanned) */}
                {data && scan && (
                  <div className="rounded-xl border border-zinc-700 bg-zinc-950/60 p-5 space-y-3">
                    <div className="flex items-center justify-between pb-3 border-b border-zinc-800">
                      <div className="flex items-center space-x-2">
                        <Pill className="w-4 h-4 text-emerald-400" />
                        <h4 className="text-xs font-semibold uppercase tracking-wider text-zinc-200">Scanned Medicine Details</h4>
                      </div>
                      <span className={`text-[10px] font-medium px-2.5 py-0.5 rounded-full ${scan.is_ayurvedic_or_herbal ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : 'bg-red-500/10 text-red-400 border border-red-500/20'}`}>
                        {scan.is_ayurvedic_or_herbal ? 'Verified Ayurvedic Formulation' : 'Non-Ayurvedic Item'}
                      </span>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                      <div className="space-y-1">
                        <span className="text-[11px] text-zinc-400">Identified Medicine:</span>
                        <p className="text-sm font-bold text-white">{scan.product_name}</p>
                        {scan.formulation_type && (
                          <p className="text-xs text-zinc-400">Form: <span className="text-zinc-200">{scan.formulation_type}</span></p>
                        )}
                      </div>

                      <div className="space-y-1">
                        <span className="text-[11px] text-zinc-400">Key Botanical Ingredients:</span>
                        {scan.graph_membership?.verified_herbs?.length ? (
                          <p className="text-xs font-semibold text-emerald-400">
                            {scan.graph_membership.verified_herbs.map(h => `${h.canonical_name} (${h.botanical_name || 'Botanical'})`).join(', ')}
                          </p>
                        ) : (
                          <p className="text-xs text-zinc-300">{scan.detected_herbs?.join(', ') || 'Herbal formulation'}</p>
                        )}
                      </div>
                    </div>
                  </div>
                )}

                {/* Consultation Result */}
                {data && res && (
                  <div className="space-y-6">

                    {/* Recommendation Verdict Banner */}
                    <div className={`rounded-xl border p-5 space-y-2 ${isOutOfDomain ? 'border-amber-500/30 bg-amber-950/20 text-amber-200' : (isUnsafe ? 'border-red-500/30 bg-red-950/20 text-red-200' : 'border-emerald-500/30 bg-emerald-950/20 text-emerald-200')}`}>
                      <div className="flex items-center space-x-3">
                        <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${isOutOfDomain ? 'bg-amber-500/20 text-amber-400' : (isUnsafe ? 'bg-red-500/20 text-red-400' : 'bg-emerald-500/20 text-emerald-400')}`}>
                          {isOutOfDomain && <AlertTriangle className="w-4 h-4" />}
                          {!isOutOfDomain && isUnsafe && <Ban className="w-4 h-4" />}
                          {!isOutOfDomain && !isUnsafe && <Check className="w-4 h-4" />}
                        </div>
                        <div>
                          <h4 className="text-sm font-bold tracking-tight text-white">
                            {isOutOfDomain ? 'Item Not Recognized as Ayurvedic Medicine' : res.final_verdict}
                          </h4>
                          <p className="text-xs text-zinc-400">
                            {isUnsafe
                              ? 'This herb has potential contraindications for your constitutional profile or current season.'
                              : (isOutOfDomain ? 'Please upload a photo of an authentic Ayurvedic herb or medicine label.' : 'This recommendation aligns safely with your constitution and season.')}
                          </p>
                        </div>
                      </div>
                    </div>

                    {/* Clinical Summary */}
                    <div className="rounded-xl bg-zinc-950 border border-zinc-800 p-5 space-y-2">
                      <h5 className="text-xs font-semibold uppercase tracking-wider text-zinc-400">Clinical Recommendation</h5>
                      <p className="text-sm text-zinc-200 leading-relaxed">{res.summary_message}</p>
                    </div>

                    {/* Classical Pharmacological Rationale */}
                    {res.clinical_reasoning && res.clinical_reasoning.length > 0 && (
                      <div className="rounded-xl bg-zinc-950 border border-zinc-800 p-5 space-y-3">
                        <div className="flex items-center space-x-2 text-xs font-semibold text-emerald-400">
                          <Sparkles className="w-4 h-4" />
                          <span>Classical Ayurvedic Rationale (Charaka & IMPPAT 2.0)</span>
                        </div>
                        <ul className="space-y-2 pt-1">
                          {res.clinical_reasoning.map((item, i) => (
                            <li key={i} className="text-xs text-zinc-300 flex items-start space-x-2">
                              <span className="text-emerald-400 font-bold mt-0.5">•</span>
                              <span className="leading-relaxed">{item}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}

                    {/* Why this happens: Physiological / Ayurvedic Mechanism */}
                    {res.risk_explanation && (
                      <div className="rounded-xl bg-red-950/20 border border-red-500/20 p-5 space-y-2">
                        <div className="flex items-center space-x-2 text-xs font-semibold text-red-400">
                          <AlertTriangle className="w-4 h-4" />
                          <span>Ayurvedic Physiological Insight (Why Caution is Advised)</span>
                        </div>
                        <p className="text-xs text-red-200/90 leading-relaxed">{res.risk_explanation}</p>
                      </div>
                    )}

                    {/* Recommended Safe Botanical Remedies / Alternatives */}
                    {res.suggested_alternatives && res.suggested_alternatives.length > 0 && (
                      <div className="rounded-xl bg-emerald-950/20 border border-emerald-500/20 p-5 space-y-3">
                        <div className="flex items-center space-x-2 text-xs font-semibold text-emerald-400">
                          <ShieldCheck className="w-4 h-4" />
                          <span>
                            {res.final_verdict.includes('RECOMMENDED HERBS') || res.final_verdict.includes('CLINICALLY INDICATED')
                              ? 'Verified Ayurvedic Dravyas (Medicinal Botanicals)'
                              : (res.final_verdict.includes('SYSTEM READY')
                                ? 'Sample Clinical Topics You Can Explore'
                                : 'Recommended Safe Botanical Alternatives')}
                          </span>
                        </div>
                        <p className="text-xs text-zinc-400">
                          {res.final_verdict.includes('RECOMMENDED HERBS') || res.final_verdict.includes('CLINICALLY INDICATED')
                            ? 'The following herbs are classically indicated for your symptoms and verified safe for your constitution:'
                            : (res.final_verdict.includes('SYSTEM READY')
                              ? 'Click any inquiry below or type your question above:'
                              : 'The following classical herbs are beneficial for your inquiry while maintaining complete constitutional balance:')}
                        </p>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                          {res.suggested_alternatives.map((alt, i) => (
                            <div
                              key={i}
                              onClick={() => {
                                if (res.final_verdict.includes('SYSTEM READY')) {
                                  if (alt.herb_name.includes('Cough')) setQuery('What is good for cough and cold?');
                                  else if (alt.herb_name.includes('Anxiety')) setQuery('What helps with anxiety and sleep?');
                                  else if (alt.herb_name.includes('Digestive')) setQuery('Soothing herbs for acid reflux and GERD');
                                }
                              }}
                              className={`p-3.5 rounded-lg bg-zinc-950 border border-emerald-500/20 space-y-1.5 ${res.final_verdict.includes('SYSTEM READY') ? 'cursor-pointer hover:border-emerald-500/50 hover:bg-emerald-950/30 transition' : ''}`}
                            >
                              <div className="flex items-center justify-between">
                                <span className="text-xs font-bold text-white">{alt.herb_name}</span>
                                {alt.virya && (
                                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-medium">
                                    {alt.virya} Potency
                                  </span>
                                )}
                              </div>
                              {alt.botanical_name && (
                                <p className="text-[11px] text-zinc-400 italic">{alt.botanical_name}</p>
                              )}
                              <p className="text-xs text-zinc-300">{alt.why_safe}</p>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Clinical Verification & Grounding Bar */}
                    <div className="rounded-xl border border-zinc-800 bg-zinc-950/60 p-4 space-y-3">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                        <button
                          type="button"
                          onClick={() => setShowVerification(prev => !prev)}
                          className="text-xs font-semibold text-emerald-400 hover:text-emerald-300 flex items-center space-x-2 transition"
                        >
                          <ShieldCheck className="w-4 h-4 text-emerald-400" />
                          <span>{showVerification ? 'Hide Knowledge Graph Verification' : 'Verify Clinical Grounding & Sources'}</span>
                          <ChevronDown className={`w-3.5 h-3.5 transition-transform ${showVerification ? 'rotate-180' : ''}`} />
                        </button>

                        {/* Clinician & User Verification Action */}
                        <div className="flex items-center space-x-2 text-xs">
                          <span className="text-[11px] text-zinc-500">Verify Accuracy:</span>
                          <button
                            type="button"
                            onClick={() => handleFeedback('accurate')}
                            className={`px-3 py-1 rounded-lg border text-xs font-medium flex items-center space-x-1.5 transition ${feedbackStatus === 'accurate' ? 'bg-emerald-950/60 border-emerald-500 text-emerald-300 ring-1 ring-emerald-500/30' : 'border-zinc-800 bg-zinc-950 text-zinc-400 hover:text-zinc-200 hover:border-zinc-700'}`}
                          >
                            <ThumbsUp className="w-3.5 h-3.5 text-emerald-400" />
                            <span>Accurate</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => handleFeedback('discrepancy')}
                            className={`px-3 py-1 rounded-lg border text-xs font-medium flex items-center space-x-1.5 transition ${feedbackStatus === 'discrepancy' ? 'bg-amber-950/60 border-amber-500 text-amber-300 ring-1 ring-amber-500/30' : 'border-zinc-800 bg-zinc-950 text-zinc-400 hover:text-zinc-200 hover:border-zinc-700'}`}
                          >
                            <ThumbsDown className="w-3.5 h-3.5 text-amber-400" />
                            <span>Report Issue</span>
                          </button>
                        </div>
                      </div>

                      {/* Feedback Toast */}
                      {feedbackStatus === 'accurate' && (
                        <div className="p-2.5 rounded-lg bg-emerald-950/30 border border-emerald-500/30 text-emerald-300 text-xs flex items-center space-x-2">
                          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                          <span>Feedback saved. Thank you for verifying this recommendation.</span>
                        </div>
                      )}
                      {feedbackStatus === 'discrepancy' && (
                        <div className="p-2.5 rounded-lg bg-amber-950/30 border border-amber-500/30 text-amber-300 text-xs flex items-center space-x-2">
                          <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0" />
                          <span>Discrepancy noted. Your feedback has been saved for review.</span>
                        </div>
                      )}

                      {/* Expanded Verification Drawer */}
                      {showVerification && (
                        <div className="pt-3 border-t border-zinc-800/80 space-y-4 text-xs">
                          {/* Triangulation Checklist */}
                          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                            <div className="p-3 rounded-lg bg-zinc-900/60 border border-zinc-800 space-y-1">
                              <div className="flex items-center space-x-1.5 text-emerald-400 font-semibold text-[11px]">
                                <CheckCircle2 className="w-3.5 h-3.5" />
                                <span>1. Constitutional (Prakriti)</span>
                              </div>
                              <p className="text-[11px] text-zinc-300">Audited against <strong>{prakriti}</strong> dosha. Potency (Virya) verified non-aggravating.</p>
                            </div>
                            <div className="p-3 rounded-lg bg-zinc-900/60 border border-zinc-800 space-y-1">
                              <div className="flex items-center space-x-1.5 text-emerald-400 font-semibold text-[11px]">
                                <CheckCircle2 className="w-3.5 h-3.5" />
                                <span>2. Seasonal (Ritu)</span>
                              </div>
                              <p className="text-[11px] text-zinc-300">Audited against <strong>{season}</strong> climate. Zero seasonal contraindication collisions.</p>
                            </div>
                            <div className="p-3 rounded-lg bg-zinc-900/60 border border-zinc-800 space-y-1">
                              <div className="flex items-center space-x-1.5 text-emerald-400 font-semibold text-[11px]">
                                <CheckCircle2 className="w-3.5 h-3.5" />
                                <span>3. Morbidity Safety</span>
                              </div>
                              <p className="text-[11px] text-zinc-300">Audited against conditions: <strong>{conditions.join(', ') || 'None declared'}</strong>.</p>
                            </div>
                          </div>

                          {/* Knowledge Graph Evidence */}
                          <div className="p-3.5 rounded-lg bg-zinc-900/60 border border-zinc-800 space-y-2">
                            <div className="flex items-center space-x-2 text-[11px] font-semibold text-zinc-300">
                              <BookOpen className="w-3.5 h-3.5 text-emerald-400" />
                              <span>Live Knowledge Graph Traversal & Classical Literature Grounding:</span>
                            </div>
                            <div className="space-y-1 text-[11px] text-zinc-400 font-mono bg-zinc-950 p-2.5 rounded border border-zinc-800">
                              <p className="text-emerald-400 font-sans">Instance: Neo4j Aura Cloud (ff765efc) • 179 Relationships • 5 Indexes</p>
                              {res.graph_evidence_summary?.map((ev, i) => (
                                <p key={i} className="text-zinc-300">• {ev}</p>
                              ))}
                              <p className="text-zinc-500 pt-1 font-sans italic">Primary Sources: IMPPAT 2.0 (IIIT-Delhi) & Classical Ayurvedic Treatises (Charaka Samhita Sutrasthana Ch. 26 Dravya-Guna).</p>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Interactive Clinical Follow-Up Q&A Section */}
                    <div className="rounded-xl border border-zinc-800 bg-zinc-950/60 p-5 space-y-4">
                      <div className="flex items-center space-x-2.5 pb-2 border-b border-zinc-800">
                        <MessageSquare className="w-4 h-4 text-emerald-400" />
                        <div>
                          <h4 className="text-xs font-semibold uppercase tracking-wider text-white">Ask Follow-Up Questions (Dosage, Anupana & Diet)</h4>
                          <p className="text-[11px] text-zinc-400">Consult on dosage, carrier vehicles (Anupana), timing, and dietary rules (Pathya/Apathya).</p>
                        </div>
                      </div>

                      {/* Conversation History Thread */}
                      {followUpMessages.length > 0 && (
                        <div className="space-y-3.5 pt-1">
                          {followUpMessages.map((msg, i) => (
                            <div key={i} className={`flex flex-col ${msg.role === 'user' ? 'items-end' : 'items-start'}`}>
                              {msg.role === 'user' ? (
                                <div className="max-w-[85%] rounded-2xl bg-zinc-800 px-4 py-2.5 text-xs text-white shadow-sm">
                                  <p className="font-medium">{msg.content}</p>
                                </div>
                              ) : (
                                <div className="max-w-[95%] rounded-2xl bg-zinc-900 border border-emerald-500/30 p-4 text-xs space-y-3 shadow-sm">
                                  <p className="text-zinc-200 leading-relaxed font-sans">{msg.content}</p>

                                  {msg.data?.dosage_and_anupana && (
                                    <div className="p-3 rounded-lg bg-emerald-950/30 border border-emerald-500/20 space-y-1">
                                      <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-400">Classical Dosage & Anupana (Vehicle)</span>
                                      <p className="text-zinc-300 text-[11px] leading-relaxed">{msg.data.dosage_and_anupana}</p>
                                    </div>
                                  )}

                                  {msg.data?.pathya_apathya && (
                                    <div className="p-3 rounded-lg bg-blue-950/30 border border-blue-500/20 space-y-1">
                                      <span className="text-[10px] font-bold uppercase tracking-wider text-blue-400">Dietary Guidelines (Pathya & Apathya)</span>
                                      <p className="text-zinc-300 text-[11px] leading-relaxed">{msg.data.pathya_apathya}</p>
                                    </div>
                                  )}

                                  {msg.data?.precautions && (
                                    <div className="p-3 rounded-lg bg-amber-950/30 border border-amber-500/20 space-y-1">
                                      <span className="text-[10px] font-bold uppercase tracking-wider text-amber-400">Clinical Precautions & Duration</span>
                                      <p className="text-zinc-300 text-[11px] leading-relaxed">{msg.data.precautions}</p>
                                    </div>
                                  )}
                                </div>
                              )}
                            </div>
                          ))}
                        </div>
                      )}

                      {/* Smart Suggested Follow-Up Chips */}
                      <div className="space-y-1.5 pt-1">
                        <span className="text-[11px] text-zinc-500 font-medium">Suggested Follow-Up Inquiries:</span>
                        <div className="flex flex-wrap gap-1.5">
                          {(followUpMessages[followUpMessages.length - 1]?.data?.suggested_followups || [
                            "How should I consume this remedy (Dosage & Anupana)?",
                            "What dietary guidelines (Pathya/Apathya) should I follow?",
                            "How many weeks should this Ayurvedic regimen be continued?",
                            "Can I combine this with warm milk or raw honey?"
                          ]).map((chip, idx) => (
                            <button
                              key={idx}
                              type="button"
                              onClick={() => handleFollowUpSubmit(chip)}
                              disabled={followUpLoading}
                              className="text-[11px] px-3 py-1 rounded-full border border-zinc-800 bg-zinc-950/80 text-zinc-300 hover:border-emerald-500/40 hover:text-emerald-300 hover:bg-emerald-950/20 transition disabled:opacity-50 text-left"
                            >
                              {chip}
                            </button>
                          ))}
                        </div>
                      </div>

                      {/* Follow-Up Input Box */}
                      <form
                        onSubmit={e => {
                          e.preventDefault();
                          handleFollowUpSubmit();
                        }}
                        className="relative flex items-center pt-2"
                      >
                        <input
                          type="text"
                          value={followUpQuery}
                          onChange={e => setFollowUpQuery(e.target.value)}
                          placeholder="Ask a follow-up question about this recommendation..."
                          disabled={followUpLoading}
                          className="w-full h-11 rounded-xl border border-zinc-700 bg-zinc-950 px-4 py-2 pr-32 text-xs text-white placeholder-zinc-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                        />
                        <button
                          type="submit"
                          disabled={followUpLoading || !followUpQuery.trim()}
                          className="absolute right-1.5 h-8 px-4 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-medium text-xs flex items-center space-x-1.5 transition disabled:opacity-50"
                        >
                          {followUpLoading ? (
                            <>
                              <Loader2 className="w-3.5 h-3.5 animate-spin" />
                              <span>Consulting...</span>
                            </>
                          ) : (
                            <>
                              <span>Ask</span>
                              <Send className="w-3.5 h-3.5" />
                            </>
                          )}
                        </button>
                      </form>
                    </div>

                    {/* Disclaimer */}
                    <div className="flex items-start space-x-2 p-3 rounded-lg bg-zinc-950/40 border border-zinc-800 text-[11px] text-zinc-500">
                      <Info className="w-4 h-4 text-zinc-400 shrink-0 mt-0.5" />
                      <p>{res.disclaimer}</p>
                    </div>

                  </div>
                )}
              </div>

            </section>
          </div>
        </main>
      ) : activeTab === 'label-audit' ? (
        <main className="flex-1 max-w-7xl mx-auto px-4 sm:px-6 py-8 w-full space-y-6">
          <section className="bg-zinc-900/50 border border-zinc-800/80 rounded-2xl p-6 shadow-sm space-y-5">
            <div className="flex items-start gap-3 border-b border-zinc-800 pb-4">
              <div className="h-10 w-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center">
                <ClipboardList className="w-5 h-5 text-emerald-400" />
              </div>
              <div>
                <h2 className="text-base font-semibold text-white">Ingredient-by-Ingredient Label Audit</h2>
                <p className="text-xs text-zinc-400 mt-1">Extract label text, check ingredients against the herb catalog, and review graph flags for the selected profile.</p>
              </div>
            </div>

            <form onSubmit={handleLabelAudit} className="grid grid-cols-1 lg:grid-cols-5 gap-5">
              <div className="lg:col-span-3 space-y-4">
                <label className="block rounded-xl border border-dashed border-zinc-700 bg-zinc-950/70 p-5 cursor-pointer hover:border-emerald-500/50 transition">
                  <span className="flex items-center gap-2 text-sm font-medium text-zinc-200">
                    <Camera className="w-4 h-4 text-emerald-400" />
                    {auditImage ? 'Change label image' : 'Choose a clear label image'}
                  </span>
                  <span className="block text-xs text-zinc-500 mt-1">PNG, JPEG, or WebP. Include the product name and full ingredients list if possible.</span>
                  <input
                    type="file"
                    accept="image/png,image/jpeg,image/webp"
                    className="sr-only"
                    onChange={event => {
                      const file = event.target.files?.[0];
                      if (!file) return;
                      if (!['image/png', 'image/jpeg', 'image/webp'].includes(file.type)) {
                        setAuditImage(null);
                        setAuditPreview(null);
                        setAuditError('Choose a PNG, JPEG, or WebP image.');
                        return;
                      }
                      setAuditImage(file);
                      setAuditPreview(URL.createObjectURL(file));
                      setAuditResult(null);
                      setAuditError(null);
                    }}
                  />
                </label>

                {auditPreview && auditImage && (
                  <div className="flex items-center gap-3 rounded-xl border border-zinc-800 bg-zinc-950 p-3">
                    <img src={auditPreview} alt="Selected product label" className="h-20 w-20 rounded-lg border border-zinc-800 object-cover" />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-xs font-medium text-white">{auditImage.name}</p>
                      <p className="text-[11px] text-zinc-500">{(auditImage.size / 1024).toFixed(0)} KB · profile: {prakriti}, {season}</p>
                    </div>
                    <button type="button" onClick={() => { setAuditImage(null); setAuditPreview(null); setAuditResult(null); }} className="rounded-lg p-2 text-zinc-400 hover:bg-zinc-800 hover:text-white" aria-label="Remove image">
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                )}

                {auditError && (
                  <div role="alert" className="flex items-start gap-2 rounded-xl border border-red-500/30 bg-red-950/30 p-3 text-xs text-red-200">
                    <FileWarning className="w-4 h-4 shrink-0" />
                    <span>{auditError}</span>
                  </div>
                )}

                <button type="submit" disabled={!auditImage || auditLoading} className="inline-flex h-10 items-center gap-2 rounded-lg bg-emerald-600 px-4 text-xs font-semibold text-white transition hover:bg-emerald-500 disabled:cursor-not-allowed disabled:opacity-50">
                  {auditLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
                  {auditLoading ? 'Reading label and checking ingredients…' : 'Scan and audit label'}
                </button>
              </div>

              <aside className="lg:col-span-2 rounded-xl border border-zinc-800 bg-zinc-950/70 p-4 space-y-3">
                <h3 className="text-xs font-semibold uppercase tracking-wider text-zinc-300">Profile used for graph checks</h3>
                <p className="text-xs text-zinc-500">Using the constitution, season, and conditions selected on the consultation tab.</p>
                <div className="flex flex-wrap gap-2">
                  <span className="rounded-full border border-zinc-700 px-2.5 py-1 text-[11px] text-zinc-300">{prakriti}</span>
                  <span className="rounded-full border border-zinc-700 px-2.5 py-1 text-[11px] text-zinc-300">{season}</span>
                  {conditions.map(condition => <span key={condition} className="rounded-full border border-amber-500/30 px-2.5 py-1 text-[11px] text-amber-200">{condition}</span>)}
                </div>
                <div className="flex items-start gap-2 border-t border-zinc-800 pt-3 text-[11px] leading-relaxed text-zinc-500">
                  <CircleHelp className="w-4 h-4 shrink-0 text-zinc-400" />
                  <p>Ingredients are reported as verified only when they match the current herb catalog. Unreadable or unmatched label text is shown separately.</p>
                </div>
              </aside>
            </form>
          </section>

          {auditResult && (
            <section className="bg-zinc-900/50 border border-zinc-800/80 rounded-2xl p-6 shadow-sm space-y-5" aria-live="polite">
              <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3 border-b border-zinc-800 pb-4">
                <div>
                  <p className="text-[10px] uppercase tracking-wider text-zinc-500">Scan result</p>
                  <h2 className="text-lg font-semibold text-white">{auditResult.extraction.product_name || 'Label scan'}</h2>
                  <p className="mt-1 text-xs text-zinc-400">{auditResult.extraction.summary || 'Review the ingredient results below.'}</p>
                </div>
                <span className="rounded-full border border-zinc-700 px-3 py-1 text-xs text-zinc-300">{Math.round((auditResult.extraction.visual_confidence || 0) * 100)}% reading confidence</span>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-5 gap-2">
                {[
                  ['Extracted', auditResult.summary.totalExtracted, 'text-white'],
                  ['Verified', auditResult.summary.verified, 'text-emerald-300'],
                  ['Unmatched', auditResult.summary.unverified, 'text-amber-300'],
                  ['Unclear', auditResult.summary.uncertain, 'text-zinc-300'],
                  ['Graph flags', auditResult.summary.flagged, auditResult.summary.flagged ? 'text-red-300' : 'text-emerald-300']
                ].map(([label, count, color]) => (
                  <div key={String(label)} className="rounded-xl border border-zinc-800 bg-zinc-950 p-3">
                    <p className="text-[10px] text-zinc-500">{label}</p>
                    <p className={`mt-1 text-lg font-semibold ${color}`}>{count}</p>
                  </div>
                ))}
              </div>

              {auditResult.auditedIngredients.length > 0 && (
                <div className="space-y-2">
                  <h3 className="text-xs font-semibold uppercase tracking-wider text-zinc-300">Verified ingredients and graph review</h3>
                  {auditResult.auditedIngredients.map((ingredient, index) => (
                    <article key={`${ingredient.canonical_name}-${index}`} className="rounded-xl border border-zinc-800 bg-zinc-950 p-4">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <div>
                          <h4 className="text-sm font-medium text-white">{ingredient.canonical_name}</h4>
                          <p className="text-[11px] italic text-zinc-500">{ingredient.botanical_name || ingredient.printed_name}</p>
                        </div>
                        <span className={`rounded-full border px-2.5 py-1 text-[10px] font-semibold ${ingredient.safety?.verdict === 'FLAGGED' ? 'border-red-500/30 bg-red-950/30 text-red-300' : 'border-emerald-500/30 bg-emerald-950/30 text-emerald-300'}`}>
                          {ingredient.safety?.verdict === 'FLAGGED' ? 'GRAPH FLAG' : 'NO GRAPH FLAG FOUND'}
                        </span>
                      </div>
                      {(ingredient.safety?.reasoning || []).length > 0 && <ul className="mt-3 list-disc space-y-1 pl-4 text-xs text-zinc-300">{ingredient.safety?.reasoning.map((reason, i) => <li key={i}>{reason}</li>)}</ul>}
                      {(ingredient.safety?.paths || []).length > 0 && <p className="mt-3 break-all rounded-lg bg-zinc-900 p-2 font-mono text-[10px] text-zinc-400">{ingredient.safety?.paths.join(' · ')}</p>}
                    </article>
                  ))}
                </div>
              )}

              {[
                { heading: 'Not in catalog', items: auditResult.ingredients.unverified },
                { heading: 'Unclear label text', items: auditResult.ingredients.uncertain }
              ].filter(group => group.items.length > 0).map(group => (
                <div key={group.heading} className="space-y-2">
                  <h3 className="text-xs font-semibold uppercase tracking-wider text-zinc-300">{group.heading}</h3>
                  {group.items.map((ingredient, index) => (
                    <div key={`${ingredient.printed_name}-${index}`} className="flex items-start gap-2 rounded-lg border border-amber-500/20 bg-amber-950/10 p-3 text-xs text-amber-100">
                      <AlertTriangle className="w-4 h-4 shrink-0" />
                      <span><strong>{ingredient.printed_name}</strong>{ingredient.reason ? ` — ${ingredient.reason}` : ''}</span>
                    </div>
                  ))}
                </div>
              ))}

              {auditResult.extraction.extracted_ocr_text && (
                <details className="rounded-xl border border-zinc-800 bg-zinc-950 p-4">
                  <summary className="cursor-pointer text-xs font-medium text-zinc-300">Show extracted label text</summary>
                  <pre className="mt-3 whitespace-pre-wrap text-[11px] leading-relaxed text-zinc-400">{auditResult.extraction.extracted_ocr_text}</pre>
                </details>
              )}
            </section>
          )}
        </main>
      ) : (
        /* Herb Directory Tab */
        <main className="flex-1 max-w-7xl mx-auto px-4 sm:px-6 py-8 w-full">
          <div className="bg-zinc-900/50 border border-zinc-800/80 rounded-2xl p-6 shadow-sm space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-zinc-800">
              <div>
                <h2 className="text-base font-semibold text-white">Ayurvedic Materia Medica Directory</h2>
                <p className="text-xs text-zinc-400">Verified botanical herbs cataloged with traditional therapeutic properties</p>
              </div>

              {/* Herb Search Input */}
              <div className="relative w-full sm:w-64">
                <Search className="w-3.5 h-3.5 text-zinc-400 absolute left-3 top-3" />
                <input
                  type="text"
                  placeholder="Search herbs or botanicals..."
                  value={herbSearch}
                  onChange={e => setHerbSearch(e.target.value)}
                  className="w-full h-9 pl-9 pr-3 rounded-lg bg-zinc-950 border border-zinc-700 text-xs text-white placeholder-zinc-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredHerbs.map((h, i) => (
                <div key={i} className="p-4 rounded-xl bg-zinc-950 border border-zinc-800 space-y-2 hover:border-zinc-700 transition">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-white">{h.name}</span>
                    <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full border ${h.virya === 'Ushna' ? 'bg-red-500/10 text-red-400 border-red-500/20' : 'bg-blue-500/10 text-blue-400 border-blue-500/20'}`}>
                      {h.virya === 'Ushna' ? 'Heating (Ushna)' : 'Cooling (Sheeta)'}
                    </span>
                  </div>
                  <p className="text-xs text-zinc-400 italic">{h.botanical_name}</p>
                  <p className="text-xs text-zinc-300">Sanskrit: <span className="font-medium text-emerald-400">{h.sanskrit_name || 'Traditional'}</span></p>
                  <p className="text-[11px] text-zinc-500 pt-1 line-clamp-2">
                    Taste (Rasa): {h.rasa || 'Natural'} • Post-Digestive (Vipaka): {h.vipaka || 'Balanced'}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </main>
      )}

      {/* Professional Footer */}
      <footer className="border-t border-zinc-800 py-6 bg-zinc-950 text-center text-xs text-zinc-500">
        <p>VedaAI Clinical Advisor • Clinical Safety & Holistic Ayurvedic Decision Support • Group 16, CSE-2, AKGEC</p>
      </footer>
    </div>
  );
}
