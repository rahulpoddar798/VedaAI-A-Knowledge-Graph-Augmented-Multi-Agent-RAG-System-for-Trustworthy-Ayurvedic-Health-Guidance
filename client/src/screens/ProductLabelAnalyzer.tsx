import { auditResponse } from '../../../shared/image_response.mjs';
import { appendClinicalProfile } from '../data/consultation';
import React, { useMemo, useRef, useState } from 'react';
import {
  Camera,
  Upload,
  Eye,
  EyeOff,
  Search,
  ChevronDown,
  ChevronUp,
  AlertTriangle,
  ShieldCheck,
  FileText,
  Copy,
  Check,
  SlidersHorizontal,
  GitBranch,
  Info,
  RotateCcw,
  Sparkles
} from 'lucide-react';
import { PageHeader } from '../components/ui/PageHeader';
import { SafetyBadge } from '../components/ui/SafetyBadge';
import {
  EmptyPanel,
  ErrorPanel,
  LoadingPanel,
  SampleNoticeBanner
} from '../components/ui/StatePanels';
import { SAMPLE_LABEL_AUDITS } from '../data/mockData';
import type {
  AuditIngredient,
  LabelAuditResult,
  PatientProfile,
  SafetyStatus,
  ScreenId
} from '../types/veda';

interface ProductLabelAnalyzerProps {
  profile: PatientProfile;
  backendOnline: boolean;
  onNavigate: (screen: ScreenId) => void;
}

type FilterKey = 'all' | 'flagged' | 'caution' | 'verified' | 'unverified_uncertain';

export const ProductLabelAnalyzer: React.FC<ProductLabelAnalyzerProps> = ({
  profile,
  backendOnline,
  onNavigate
}) => {
  const auditRequest = useRef(0);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const [selectedPresetId, setSelectedPresetId] = useState('');
  const [imageUrl, setImageUrl] = useState('');
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [auditResult, setAuditResult] = useState<LabelAuditResult | null>(null);

  const [showOcrOverlay, setShowOcrOverlay] = useState(true);
  const [activeBoxId, setActiveBoxId] = useState<string | null>(null);
  const [expandedIds, setExpandedIds] = useState<Record<string, boolean>>({
    'ing-ginger': true
  });

  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<FilterKey>('all');
  const [copiedOcr, setCopiedOcr] = useState(false);

  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Merge all extracted rows into one unified clinical audit table
  const allRows: AuditIngredient[] = useMemo(() => {
    if (!auditResult) return [];
    return [
      ...auditResult.auditedIngredients,
      ...auditResult.ingredients.unverified,
      ...auditResult.ingredients.uncertain
    ];
  }, [auditResult]);

  const filteredRows = useMemo(() => {
    return allRows.filter(row => {
      const q = searchTerm.trim().toLowerCase();
      const matchesQuery =
        !q ||
        row.printed_name.toLowerCase().includes(q) ||
        (row.canonical_name && row.canonical_name.toLowerCase().includes(q)) ||
        (row.botanical_name && row.botanical_name.toLowerCase().includes(q)) ||
        (row.sanskrit_name && row.sanskrit_name.toLowerCase().includes(q));

      if (!matchesQuery) return false;

      if (statusFilter === 'all') return true;
      if (statusFilter === 'flagged') return row.safety?.verdict === 'FLAGGED';
      if (statusFilter === 'caution') return row.safety?.verdict === 'CAUTION';
      if (statusFilter === 'verified')
        return (
          row.status === 'verified' &&
          (row.safety?.verdict === 'SAFE' || row.safety?.verdict === 'INSUFFICIENT_EVIDENCE')
        );
      if (statusFilter === 'unverified_uncertain')
        return row.status === 'unverified' || row.status === 'uncertain';
      return true;
    });
  }, [allRows, searchTerm, statusFilter]);

  const toggleExpand = (id: string) => {
    setExpandedIds(prev => ({ ...prev, [id]: !prev[id] }));
  };

  const selectPreset = (presetId: string) => {
    const preset = SAMPLE_LABEL_AUDITS.find(p => p.id === presetId);
    if (!preset) return;
    auditRequest.current++;
    setSelectedPresetId(preset.id);
    setUploadedFile(null);
    setImageUrl(preset.imageUrl);
    setErrorMsg(null);
    setLoading(false);
    setAuditResult(preset.audit);
    setStatusFilter('all');
    setSearchTerm('');
    setActiveBoxId(null);
    if (preset.audit.auditedIngredients[0]) {
      setExpandedIds({ [preset.audit.auditedIngredients[0].id]: true });
    }
  };

  const handleFileSelected = async (file: File) => {
    if (!['image/png', 'image/jpeg', 'image/webp'].includes(file.type)) {
      setErrorMsg('Unsupported file format. Please upload a PNG, JPEG, or WebP label image.');
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      setErrorMsg('File exceeds the 10 MB upload limit. Please compress or crop the label photo.');
      return;
    }

    const preview = URL.createObjectURL(file);
    setSelectedPresetId('custom');
    setUploadedFile(file);
    setImageUrl(preview);
    setErrorMsg(null);
    await runLiveOrFallbackAudit(file);
  };

  const runLiveOrFallbackAudit = async (fileToScan?: File) => {
    const targetFile = fileToScan || uploadedFile;
    if (!targetFile) return;
    const request = ++auditRequest.current;

    setLoading(true);
    setErrorMsg(null);

    try {
      const formData = new FormData();
      formData.append('image', targetFile);
      appendClinicalProfile(formData, profile);

      const response = await fetch('/api/label-audit', {
        method: 'POST',
        body: formData
      });
      const raw = await response.json().catch(() => ({}));
      if (raw.status === 'ANALYSIS_UNAVAILABLE' || raw.extraction?.extraction_failed) {
        throw new Error('Analysis unavailable. The label could not be processed. Please retry later.');
      }
      if (!response.ok || raw.success !== true) {
        throw new Error(
          raw.error ||
            `Backend label audit returned status ${response.status}. Verify Gemini API & Neo4j configuration.`
        );
      }

      if (request !== auditRequest.current) return;
      const parsed = auditResponse.safeParse(raw);
      if (!parsed.success) throw new Error('Invalid label audit response.');
      const payload = parsed.data;
      const normalizedVerified: AuditIngredient[] = (payload.auditedIngredients || []).map(
        (ing: any, idx: number) => ({
          ...ing,
          id: `live-v-${idx}`
        })
      );
      const normalizedUnverified: AuditIngredient[] = (payload.ingredients?.unverified || []).map(
        (ing: any, idx: number) => ({
          ...ing,
          id: `live-u-${idx}`,
          safety: {
            verdict: 'INSUFFICIENT_EVIDENCE',
            flags: ['NOT_IN_CATALOG'],
            paths: [],
            reasoning: [ing.reason || 'Not found in the VedaAI herb catalog.']
          }
        })
      );
      const normalizedUncertain: AuditIngredient[] = (payload.ingredients?.uncertain || []).map(
        (ing: any, idx: number) => ({
          ...ing,
          id: `live-c-${idx}`,
          safety: {
            verdict: 'INSUFFICIENT_EVIDENCE',
            flags: ['ILLEGIBLE_OCR'],
            paths: [],
            reasoning: [ing.reason || 'Text was partially illegible on the label.']
          }
        })
      );

      setAuditResult({
        isSampleData: false,
        status: payload.status,
        missing_coverage: payload.missing_coverage,
        durationMs: payload.durationMs || 0,
        extraction: payload.extraction,
        ingredients: {
          verified: normalizedVerified,
          unverified: normalizedUnverified,
          uncertain: normalizedUncertain
        },
        auditedIngredients: normalizedVerified,
        summary: payload.summary
      });
    } catch (err) {
      if (request !== auditRequest.current) return;
      const message =
        err instanceof Error
          ? err.message
          : 'Unable to reach /api/label-audit. Start the backend server or use a sample label.';
      setAuditResult(null);
      setErrorMsg(message);
    } finally {
      if (request === auditRequest.current) setLoading(false);
    }
  };

  const handleCopyOcr = () => {
    if (!auditResult?.extraction.extracted_ocr_text) return;
    navigator.clipboard?.writeText(auditResult.extraction.extracted_ocr_text);
    setCopiedOcr(true);
    setTimeout(() => setCopiedOcr(false), 1800);
  };

  const clearToEmptyState = () => {
    auditRequest.current++;
    setSelectedPresetId('');
    setUploadedFile(null);
    setImageUrl('');
    setAuditResult(null);
    setErrorMsg(null);
    setLoading(false);
  };

  const getRowCatalogStatus = (row: AuditIngredient): SafetyStatus => {
    if (row.status === 'verified') return 'verified';
    if (row.status === 'uncertain') return 'uncertain';
    return 'unverified';
  };

  const getRowSafetyStatus = (row: AuditIngredient): SafetyStatus => {
    if (row.status === 'unverified' || row.status === 'uncertain') {
      return 'insufficient_evidence';
    }
    const v = row.safety?.verdict;
    if (v === 'FLAGGED') return 'flagged';
    if (v === 'CAUTION') return 'caution';
    return v === 'SAFE' && auditResult?.isSampleData ? 'verified' : 'insufficient_evidence';
  };

  const getRowSafetyLabel = (row: AuditIngredient): string => {
    if (row.status === 'unverified' || row.status === 'uncertain') {
      return 'Insufficient evidence';
    }
    const v = row.safety?.verdict;
    if (v === 'FLAGGED') return 'Flagged';
    if (v === 'CAUTION') return 'Caution';
    if (v === 'INSUFFICIENT_EVIDENCE') return 'Insufficient evidence';
    return v === 'SAFE' && auditResult?.isSampleData ? 'Demo / no graph flag' : 'Insufficient evidence';
  };

  const boxStyleMap: Record<
    string,
    { border: string; bg: string; tagBg: string; tagText: string }
  > = {
    product: {
      border: 'border-[#164B45]',
      bg: 'bg-[#164B45]/10',
      tagBg: 'bg-[#164B45]',
      tagText: 'text-white'
    },
    verified: {
      border: 'border-[#247A58]',
      bg: 'bg-[#247A58]/10',
      tagBg: 'bg-[#247A58]',
      tagText: 'text-white'
    },
    flagged: {
      border: 'border-[#B64040]',
      bg: 'bg-[#B64040]/12',
      tagBg: 'bg-[#B64040]',
      tagText: 'text-white'
    },
    uncertain: {
      border: 'border-[#B7791F]',
      bg: 'bg-[#B7791F]/12',
      tagBg: 'bg-[#B7791F]',
      tagText: 'text-white'
    },
    unverified: {
      border: 'border-[#356B91]',
      bg: 'bg-[#356B91]/10',
      tagBg: 'bg-[#356B91]',
      tagText: 'text-white'
    }
  };

  const ocrPct = typeof auditResult?.extraction.visual_confidence === 'number' ? Math.round(auditResult.extraction.visual_confidence * 100) : null;
  const isOutOfDomain = auditResult ? !auditResult.extraction.is_supplement_label : false;

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Safety Verification Module"
        badge={
          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium bg-[#E8EFE8] text-[#173D32] border border-[#DDE4DE]">
            {backendOnline ? 'Catalog connected' : 'Interactive Prototype Mode'}
          </span>
        }
        title="Product Label Analyzer"
        description="Inspect supplement and Ayurvedic medicine labels ingredient by ingredient. VedaAI extracts label text via OCR, verifies canonical herb identity against the IMPPAT 2.0 catalog, and evaluates constitutional and seasonal graph safety."
        actions={
          <>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/png,image/jpeg,image/webp"
              className="sr-only"
              onChange={e => {
                const file = e.target.files?.[0];
                if (file) handleFileSelected(file);
                e.target.value = '';
              }}
            />
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg bg-[#173D32] text-white text-sm font-medium hover:bg-[#164B45] transition shadow-xs cursor-pointer"
            >
              <Upload className="w-4 h-4" />
              <span>Upload Label Image</span>
            </button>
            <button
              type="button"
              onClick={clearToEmptyState}
              className="inline-flex items-center gap-1.5 px-3.5 py-2.5 rounded-lg bg-white border border-[#DDE4DE] text-xs font-medium text-[#26332D] hover:bg-[#E8EFE8]/50 transition cursor-pointer"
            >
              <RotateCcw className="w-3.5 h-3.5 text-[#758078]" />
              <span>Clear</span>
            </button>
          </>
        }
      />

      {/* Profile Context & Secondary Sample Presets Bar */}
      <div className="bg-white border border-[#DDE4DE] rounded-xl p-4 flex flex-col xl:flex-row xl:items-center justify-between gap-4">
        <div className="flex flex-wrap items-center gap-2 text-xs">
          <span className="inline-flex items-center gap-1.5 font-semibold text-[#26332D] mr-1">
            <SlidersHorizontal className="w-3.5 h-3.5 text-[#173D32]" />
            Active Audit Profile:
          </span>
          <span className="px-2.5 py-1 rounded-md bg-[#E8EFE8] text-[#173D32] font-medium">
            Prakriti: {profile.prakriti}
          </span>
          <span className="px-2.5 py-1 rounded-md bg-[#E8EFE8] text-[#173D32] font-medium">
            Season: {profile.season}
          </span>
          {profile.conditions.map(cond => (
            <span
              key={cond}
              className="px-2.5 py-1 rounded-md bg-[#FDF4E6] text-[#945F14] border border-[#EAD0A1] font-medium"
            >
              {cond}
            </span>
          ))}
          <button
            type="button"
            onClick={() => onNavigate('profile')}
            className="text-xs font-medium text-[#164B45] underline underline-offset-2 hover:text-[#173D32] ml-1 cursor-pointer"
          >
            Adjust profile
          </button>
        </div>

        {/* Secondary sample presets + state previewers */}
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-[11px] font-medium uppercase tracking-wider text-[#758078] mr-1">
            Sample labels:
          </span>
          {SAMPLE_LABEL_AUDITS.map(preset => {
            const active = selectedPresetId === preset.id && !errorMsg && !loading;
            return (
              <button
                key={preset.id}
                type="button"
                onClick={() => selectPreset(preset.id)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition cursor-pointer ${
                  active
                    ? 'bg-[#E8EFE8] border-[#173D32]/40 text-[#173D32]'
                    : 'bg-[#F7F5EE]/70 border-[#DDE4DE] text-[#26332D] hover:bg-[#E8EFE8]/40'
                }`}
              >
                {preset.label}
              </button>
            );
          })}
        </div>
      </div>

      {auditResult?.isSampleData && !loading && !errorMsg && (
        <SampleNoticeBanner text="Currently displaying a demonstration audit with a fictional profile. Upload any PNG/JPEG/WebP supplement label to run live multimodal OCR + Neo4j graph verification." />
      )}

      {/* Error State */}
      {errorMsg && (
        <ErrorPanel
          title="Label Extraction or Audit Failed"
          message={errorMsg}
          onRetry={() => {
            if (uploadedFile) {
              runLiveOrFallbackAudit(uploadedFile);
            } else {
              selectPreset(SAMPLE_LABEL_AUDITS[0].id);
            }
          }}
        />
      )}

      {/* Loading State */}
      {loading && (
        <LoadingPanel
          title="Reading label text and traversing safety graph..."
          description="Extracting printed composition via multimodal vision, resolving canonical botanical synonyms against IMPPAT 2.0, and checking dosha, seasonal, and condition contraindications."
        />
      )}

      {/* Empty State */}
      {!loading && !auditResult && !errorMsg && (
        <EmptyPanel
          title="No Product Label Loaded"
          description="Upload a clear photograph of an Ayurvedic medicine bottle, churna pouch, or herbal supplement label to audit every ingredient against the knowledge graph."
          icon={<Camera className="w-5 h-5" />}
          action={
            <div className="flex flex-wrap items-center justify-center gap-3">
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg bg-[#173D32] text-white text-xs font-medium hover:bg-[#164B45] transition cursor-pointer"
              >
                <Upload className="w-4 h-4" />
                <span>Choose Label Image</span>
              </button>
              <button
                type="button"
                onClick={() => selectPreset(SAMPLE_LABEL_AUDITS[0].id)}
                className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg bg-white border border-[#DDE4DE] text-xs font-medium text-[#26332D] hover:bg-[#E8EFE8]/50 transition cursor-pointer"
              >
                <Sparkles className="w-4 h-4 text-[#173D32]" />
                <span>Load Sample Audit</span>
              </button>
            </div>
          }
        />
      )}

      {/* Main Content Grid when an Audit Result is Present */}
      {!loading && auditResult && (
        <div className="space-y-6">
          {/* Out-of-Domain Alert Banner (Distinct from ordinary successful audit) */}
          {(auditResult?.status === 'PARTIAL_ASSESSMENT' || auditResult?.status === 'INSUFFICIENT_DATA') && (
            <section role="status">
              <strong>{auditResult.status === 'PARTIAL_ASSESSMENT' ? 'Partial assessment' : 'Insufficient data'}</strong>
              <p>Safety of the complete formulation could not be established.</p>
              {[...auditResult.ingredients.unverified, ...auditResult.ingredients.uncertain].map(i => <p key={i.id}>{i.printed_name}: unverified</p>)}
              {auditResult.missing_coverage?.map(note => <p key={note}>{note}</p>)}
            </section>
          )}
          {isOutOfDomain && (
            <div
              role="alert"
              className="bg-[#FDF4E6] border border-[#EAD0A1] rounded-xl p-5 flex flex-col sm:flex-row sm:items-start justify-between gap-4"
            >
              <div className="flex items-start gap-3.5">
                <div className="w-9 h-9 rounded-lg bg-white border border-[#EAD0A1] text-[#B7791F] flex items-center justify-center shrink-0">
                  <AlertTriangle className="w-5 h-5" />
                </div>
                <div className="space-y-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <h2 className="text-sm font-semibold text-[#26332D]">
                      Non-Ayurvedic / Out-of-Domain Item Detected
                    </h2>
                    <SafetyBadge status="out_of_domain" />
                  </div>
                  <p className="text-xs text-[#5B4720] leading-relaxed max-w-3xl">
                    {auditResult.extraction.summary ||
                      'The uploaded image does not appear to be an Ayurvedic medicine or herbal supplement label. Ingredient catalog verification and safety auditing were halted by the multimodal domain gate.'}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => selectPreset(SAMPLE_LABEL_AUDITS[0].id)}
                className="px-3.5 py-2 rounded-lg bg-white border border-[#EAD0A1] text-xs font-medium text-[#26332D] hover:bg-[#FAF6EE] transition shrink-0 cursor-pointer"
              >
                Return to Herbal Sample
              </button>
            </div>
          )}

          {/* Top Visual Anchor Row: Product Image + OCR Annotations (Left) & Audit Summary + OCR Text (Right) */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
            {/* Left Primary Visual Anchor: Image Preview + OCR Bounding Boxes */}
            <section className="lg:col-span-5 bg-white border border-[#DDE4DE] rounded-xl p-5 space-y-4">
              <div className="flex items-center justify-between gap-2 pb-3 border-b border-[#DDE4DE]">
                <div>
                  <h2 className="text-sm font-semibold text-[#26332D]">
                    Label Scan &amp; OCR Regions
                  </h2>
                  <p className="text-xs text-[#758078]">
                    {auditResult.ocrBoxes?.length
                      ? 'Click or hover an OCR box to highlight its table row'
                      : 'Uploaded image preview'}
                  </p>
                </div>
                {auditResult.ocrBoxes && auditResult.ocrBoxes.length > 0 && (
                  <button
                    type="button"
                    onClick={() => setShowOcrOverlay(v => !v)}
                    className={`inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border text-xs font-medium transition cursor-pointer ${
                      showOcrOverlay
                        ? 'bg-[#E8EFE8] border-[#173D32]/30 text-[#173D32]'
                        : 'bg-white border-[#DDE4DE] text-[#758078] hover:text-[#26332D]'
                    }`}
                  >
                    {showOcrOverlay ? (
                      <Eye className="w-3.5 h-3.5" />
                    ) : (
                      <EyeOff className="w-3.5 h-3.5" />
                    )}
                    <span>{showOcrOverlay ? 'OCR Overlay On' : 'OCR Overlay Off'}</span>
                  </button>
                )}
              </div>

              {/* Image Canvas with Bounding Boxes */}
              <div className="relative rounded-lg overflow-hidden border border-[#DDE4DE] bg-[#F7F5EE]">
                <img
                  src={imageUrl}
                  alt={auditResult.extraction.product_name || 'Product label preview'}
                  className="w-full h-auto block select-none"
                />

                {showOcrOverlay &&
                  auditResult.ocrBoxes?.map(box => {
                    const style = boxStyleMap[box.category] || boxStyleMap.unverified;
                    const isActive = activeBoxId === box.id;
                    return (
                      <button
                        key={box.id}
                        type="button"
                        onClick={() => {
                          setActiveBoxId(box.id);
                          if (box.ingredientRef) {
                            setExpandedIds(prev => ({
                              ...prev,
                              [box.ingredientRef!]: true
                            }));
                          }
                        }}
                        onMouseEnter={() => setActiveBoxId(box.id)}
                        style={{
                          left: `${box.x}%`,
                          top: `${box.y}%`,
                          width: `${box.width}%`,
                          height: `${box.height}%`
                        }}
                        title={`${box.label} (${Math.round(box.confidence * 100)}% OCR confidence)`}
                        className={`absolute rounded border-2 transition cursor-pointer ${
                          style.border
                        } ${style.bg} ${isActive ? 'ring-2 ring-[#173D32] ring-offset-1 z-20' : 'z-10'}`}
                      >
                        {isActive && (
                          <span
                            className={`absolute -top-6 left-0 px-2 py-0.5 rounded text-[10px] font-medium whitespace-nowrap shadow-sm ${style.tagBg} ${style.tagText}`}
                          >
                            {box.label}
                          </span>
                        )}
                      </button>
                    );
                  })}
              </div>

              {/* OCR Annotation Legend */}
              {auditResult.ocrBoxes && auditResult.ocrBoxes.length > 0 && (
                <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 text-[11px] text-[#758078] pt-1">
                  <span className="inline-flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 rounded-xs border-2 border-[#B64040] bg-[#B64040]/20" />
                    Flagged
                  </span>
                  <span className="inline-flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 rounded-xs border-2 border-[#247A58] bg-[#247A58]/20" />
                    Verified
                  </span>
                  <span className="inline-flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 rounded-xs border-2 border-[#356B91] bg-[#356B91]/20" />
                    Unverified
                  </span>
                  <span className="inline-flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 rounded-xs border-2 border-[#B7791F] bg-[#B7791F]/20" />
                    Uncertain OCR
                  </span>
                </div>
              )}

              {/* Dropzone / Upload Trigger */}
              <div
                onDragOver={e => e.preventDefault()}
                onDrop={e => {
                  e.preventDefault();
                  const dropped = e.dataTransfer.files?.[0];
                  if (dropped) handleFileSelected(dropped);
                }}
                className="rounded-lg border border-dashed border-[#A8B8A0] bg-[#F7F5EE]/70 p-3.5 flex items-center justify-between gap-3"
              >
                <div className="text-xs">
                  <p className="font-medium text-[#26332D]">
                    {uploadedFile ? uploadedFile.name : 'Replace with your own label photo'}
                  </p>
                  <p className="text-[11px] text-[#758078]">
                    Drag &amp; drop PNG, JPEG, or WebP (max 10 MB)
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="px-3 py-1.5 rounded-lg bg-white border border-[#DDE4DE] text-xs font-medium text-[#173D32] hover:bg-[#E8EFE8] transition shrink-0 cursor-pointer"
                >
                  Browse
                </button>
              </div>
            </section>

            {/* Right Column: Audit Summary, OCR Confidence, KPI Strip & Extracted OCR Text */}
            <section className="lg:col-span-7 space-y-5">
              {/* Product Identification & OCR Confidence Card */}
              <div className="bg-white border border-[#DDE4DE] rounded-xl p-5 space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3 pb-4 border-b border-[#DDE4DE]">
                  <div className="space-y-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-[11px] font-semibold uppercase tracking-wider text-[#758078]">
                        Identified Formulation
                      </span>
                      {isOutOfDomain ? (
                        <SafetyBadge status="out_of_domain" />
                      ) : auditResult.status === 'PARTIAL_ASSESSMENT' || auditResult.status === 'INSUFFICIENT_DATA' ? (
                        <SafetyBadge status="insufficient_evidence" />
                      ) : auditResult.summary.flagged > 0 ? (
                        <SafetyBadge
                          status="flagged"
                          labelOverride={`${auditResult.summary.flagged} Safety Flag${
                            auditResult.summary.flagged > 1 ? 's' : ''
                          } Detected`}
                        />
                      ) : (
                        <SafetyBadge status="verified" labelOverride="Catalog Audit Complete" />
                      )}
                    </div>
                    <h2 className="font-editorial text-xl font-semibold text-[#26332D]">
                      {auditResult.extraction.product_name}
                    </h2>
                    <p className="text-xs text-[#758078]">
                      Formulation:{' '}
                      <span className="text-[#26332D] font-medium">
                        {auditResult.extraction.formulation_type || 'Unspecified'}
                      </span>
                      {auditResult.extraction.manufacturer && (
                        <> · {auditResult.extraction.manufacturer}</>
                      )}
                      {auditResult.durationMs ? (
                        <>
                          {' '}
                          · Audited in{' '}
                          <span className="tabular-nums">
                            {(auditResult.durationMs / 1000).toFixed(2)}s
                          </span>
                        </>
                      ) : null}
                    </p>
                  </div>

                  {/* OCR Confidence Meter */}
                  <div className="sm:w-56 rounded-lg bg-[#F7F5EE] border border-[#DDE4DE] p-3 space-y-1.5 shrink-0">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-medium text-[#26332D]">OCR Legibility</span>
                      <span className="font-semibold tabular-nums text-[#173D32]">{ocrPct === null ? 'Not available' : ocrPct + '%'}</span>
                    </div>
                    <div className="h-2 w-full rounded-full bg-[#DDE4DE] overflow-hidden">
                      <div
                        className="h-full rounded-full bg-[#173D32] transition-all"
                        style={{ width: (ocrPct ?? 0) + '%' }}
                      />
                    </div>
                    <p className="text-[11px] leading-snug text-[#758078]">
                      Measures optical print clarity only; does not verify ingredient identity or safety.
                    </p>
                  </div>
                </div>

                {auditResult.extraction.summary && (
                  <p className="text-sm text-[#26332D] leading-relaxed">
                    {auditResult.extraction.summary}
                  </p>
                )}

                {/* 5-Metric Summary Grid */}
                <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 pt-1">
                  <div className="rounded-lg border border-[#DDE4DE] bg-[#F7F5EE]/60 p-3">
                    <p className="text-[11px] font-medium text-[#758078]">Extracted</p>
                    <p className="mt-1 text-xl font-semibold tabular-nums text-[#26332D]">
                      {auditResult.summary.totalExtracted}
                    </p>
                    <p className="text-[11px] text-[#758078]">Label lines</p>
                  </div>

                  <div className="rounded-lg border border-[#B8DEC9] bg-[#E8F5EE]/50 p-3">
                    <p className="text-[11px] font-medium text-[#1D6347]">Catalog Verified</p>
                    <p className="mt-1 text-xl font-semibold tabular-nums text-[#1D6347]">
                      {auditResult.summary.verified}
                    </p>
                    <p className="text-[11px] text-[#247A58]">IMPPAT 2.0 match</p>
                  </div>

                  <div className="rounded-lg border border-[#E7BABA] bg-[#FBEAEA]/60 p-3">
                    <p className="text-[11px] font-medium text-[#9A2E2E]">Safety-Flagged</p>
                    <p className="mt-1 text-xl font-semibold tabular-nums text-[#9A2E2E]">
                      {auditResult.summary.flagged}
                    </p>
                    <p className="text-[11px] text-[#B64040]">Graph collision</p>
                  </div>

                  <div className="rounded-lg border border-[#EAD0A1] bg-[#FDF4E6]/60 p-3">
                    <p className="text-[11px] font-medium text-[#945F14]">Uncertain OCR</p>
                    <p className="mt-1 text-xl font-semibold tabular-nums text-[#945F14]">
                      {auditResult.summary.uncertain}
                    </p>
                    <p className="text-[11px] text-[#B7791F]">Illegible print</p>
                  </div>

                  <div className="rounded-lg border border-[#C6D8E6] bg-[#EEF3F7]/60 p-3">
                    <p className="text-[11px] font-medium text-[#2C5877]">Unverified</p>
                    <p className="mt-1 text-xl font-semibold tabular-nums text-[#2C5877]">
                      {auditResult.summary.unverified}
                    </p>
                    <p className="text-[11px] text-[#356B91]">Not in catalog</p>
                  </div>
                </div>
              </div>

              {/* Extracted OCR Text Transcript Panel */}
              <div className="bg-white border border-[#DDE4DE] rounded-xl p-5 space-y-3">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <FileText className="w-4 h-4 text-[#173D32]" />
                    <h3 className="text-sm font-semibold text-[#26332D]">
                      Extracted Raw OCR Text
                    </h3>
                  </div>
                  <button
                    type="button"
                    onClick={handleCopyOcr}
                    className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md border border-[#DDE4DE] text-xs font-medium text-[#26332D] hover:bg-[#E8EFE8]/50 transition cursor-pointer"
                  >
                    {copiedOcr ? (
                      <>
                        <Check className="w-3.5 h-3.5 text-[#247A58]" />
                        <span>Copied</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-3.5 h-3.5 text-[#758078]" />
                        <span>Copy transcript</span>
                      </>
                    )}
                  </button>
                </div>
                <pre className="rounded-lg border border-[#DDE4DE] bg-[#F7F5EE] p-3.5 text-xs font-mono leading-relaxed text-[#26332D] whitespace-pre-wrap overflow-x-auto">
                  {auditResult.extraction.extracted_ocr_text || 'No OCR text extracted.'}
                </pre>
              </div>
            </section>
          </div>

          {/* Ingredient-by-Ingredient Safety Audit Table */}
          {!isOutOfDomain && (
            <section className="bg-white border border-[#DDE4DE] rounded-xl overflow-hidden">
              <div className="p-5 border-b border-[#DDE4DE] flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                <div>
                  <h2 className="font-editorial text-lg font-semibold text-[#26332D]">
                    Ingredient-by-Ingredient Safety Audit
                  </h2>
                  <p className="text-xs text-[#758078] mt-0.5">
                    Click any row to inspect Neo4j graph relationship paths, Dravyaguna attributes, and clinical reasoning.
                  </p>
                </div>

                <div className="flex flex-col sm:flex-row sm:items-center gap-3">
                  {/* Search input */}
                  <div className="relative w-full sm:w-64">
                    <Search className="w-3.5 h-3.5 text-[#758078] absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      value={searchTerm}
                      onChange={e => setSearchTerm(e.target.value)}
                      placeholder="Filter printed or botanical name..."
                      className="w-full h-9 pl-9 pr-3 rounded-lg border border-[#DDE4DE] bg-[#F7F5EE]/50 text-xs text-[#26332D] placeholder-[#758078] focus:bg-white transition"
                    />
                  </div>

                  {/* Filter pills */}
                  <div className="flex flex-wrap items-center gap-1.5">
                    {(
                      [
                        ['all', 'All'],
                        ['flagged', 'Flagged'],
                        ['caution', 'Caution'],
                        ['verified', 'No Flag'],
                        ['unverified_uncertain', 'Unverified / Uncertain']
                      ] as const
                    ).map(([key, label]) => (
                      <button
                        key={key}
                        type="button"
                        onClick={() => setStatusFilter(key)}
                        className={`px-2.5 py-1.5 rounded-lg text-xs font-medium border transition cursor-pointer ${
                          statusFilter === key
                            ? 'bg-[#173D32] text-white border-[#173D32]'
                            : 'bg-white text-[#26332D] border-[#DDE4DE] hover:bg-[#E8EFE8]/50'
                        }`}
                      >
                        {label}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Desktop / Responsive Table */}
              {filteredRows.length === 0 ? (
                <div className="p-8 text-center text-xs text-[#758078]">
                  No ingredients match the current search or status filter.
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse min-w-[820px]">
                    <thead>
                      <tr className="border-b border-[#DDE4DE] bg-[#F7F5EE]/80 text-[11px] font-semibold uppercase tracking-wider text-[#758078]">
                        <th className="py-3 px-5">Printed Label Text</th>
                        <th className="py-3 px-4">Catalog Match</th>
                        <th className="py-3 px-4">Dravyaguna</th>
                        <th className="py-3 px-4">Verification</th>
                        <th className="py-3 px-4">Safety Status</th>
                        <th className="py-3 px-5 text-right">Reasoning</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#DDE4DE] text-sm">
                      {filteredRows.map(row => {
                        const isExpanded = Boolean(expandedIds[row.id]);
                        const isHighlighted = Boolean(row.ocrBoxId && activeBoxId === row.ocrBoxId);
                        const catalogStatus = getRowCatalogStatus(row);
                        const safetyStatus = getRowSafetyStatus(row);
                        const safetyLabel = getRowSafetyLabel(row);

                        return (
                          <React.Fragment key={row.id}>
                            <tr
                              onClick={() => {
                                toggleExpand(row.id);
                                if (row.ocrBoxId) setActiveBoxId(row.ocrBoxId);
                              }}
                              onMouseEnter={() => row.ocrBoxId && setActiveBoxId(row.ocrBoxId)}
                              className={`cursor-pointer transition ${
                                isHighlighted
                                  ? 'bg-[#E8EFE8]/60'
                                  : 'hover:bg-[#F7F5EE]/70'
                              }`}
                            >
                              <td className="py-4 px-5 align-top">
                                <p className="font-medium text-[#26332D] leading-snug">
                                  {row.printed_name}
                                </p>
                                {row.dosage_printed && (
                                  <p className="text-xs text-[#758078] tabular-nums mt-0.5">
                                    Label strength: {row.dosage_printed}
                                  </p>
                                )}
                              </td>

                              <td className="py-4 px-4 align-top">
                                {row.canonical_name ? (
                                  <div>
                                    <p className="font-semibold text-[#173D32]">
                                      {row.canonical_name}
                                    </p>
                                    <p className="text-xs italic text-[#758078]">
                                      {row.botanical_name}
                                    </p>
                                    {row.sanskrit_name && (
                                      <p className="text-[11px] text-[#758078]">
                                        Sanskrit: {row.sanskrit_name}
                                      </p>
                                    )}
                                  </div>
                                ) : (
                                  <span className="text-xs text-[#758078]">
                                    {row.common_name || 'No canonical catalog match'}
                                  </span>
                                )}
                              </td>

                              <td className="py-4 px-4 align-top">
                                {row.virya ? (
                                  <div className="space-y-1">
                                    <span
                                      className={`inline-block px-2 py-0.5 rounded text-[11px] font-medium border ${
                                        row.virya === 'Ushna'
                                          ? 'bg-[#FDF4E6] text-[#945F14] border-[#EAD0A1]'
                                          : 'bg-[#EEF3F7] text-[#2C5877] border-[#C6D8E6]'
                                      }`}
                                    >
                                      {row.virya} Virya
                                    </span>
                                    {row.rasa && (
                                      <p className="text-[11px] text-[#758078]">Rasa: {row.rasa}</p>
                                    )}
                                  </div>
                                ) : (
                                  <span className="text-xs text-[#758078]">—</span>
                                )}
                              </td>

                              <td className="py-4 px-4 align-top">
                                <SafetyBadge status={catalogStatus} />
                              </td>

                              <td className="py-4 px-4 align-top">
                                <SafetyBadge status={safetyStatus} labelOverride={safetyLabel} />
                              </td>

                              <td className="py-4 px-5 align-top text-right">
                                <button
                                  type="button"
                                  onClick={e => {
                                    e.stopPropagation();
                                    toggleExpand(row.id);
                                  }}
                                  className="inline-flex items-center gap-1 text-xs font-medium text-[#173D32] hover:text-[#164B45] cursor-pointer"
                                  aria-expanded={isExpanded}
                                >
                                  <span>{isExpanded ? 'Hide' : 'Inspect'}</span>
                                  {isExpanded ? (
                                    <ChevronUp className="w-4 h-4" />
                                  ) : (
                                    <ChevronDown className="w-4 h-4" />
                                  )}
                                </button>
                              </td>
                            </tr>

                            {/* Expandable Clinical Reasoning & Graph Path Row */}
                            {isExpanded && (
                              <tr className="bg-[#F7F5EE]/50">
                                <td colSpan={6} className="px-5 py-4 border-t border-[#DDE4DE]/70">
                                  <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
                                    <div className="lg:col-span-7 space-y-2">
                                      <div className="flex items-center gap-1.5 text-xs font-semibold text-[#26332D]">
                                        <ShieldCheck className="w-4 h-4 text-[#173D32]" />
                                        <span>Clinical &amp; Safety Reasoning</span>
                                      </div>

                                      {row.reason && (
                                        <p className="text-xs text-[#26332D] leading-relaxed">
                                          {row.reason}
                                        </p>
                                      )}

                                      {row.safety?.reasoning && row.safety.reasoning.length > 0 && (
                                        <ul className="space-y-1.5 list-disc pl-4 text-xs text-[#26332D] leading-relaxed">
                                          {row.safety.reasoning.map((r, i) => (
                                            <li key={i}>{r}</li>
                                          ))}
                                        </ul>
                                      )}

                                      {row.provenance && (
                                        <p className="text-[11px] text-[#758078] pt-1">
                                          Provenance: <strong className="font-medium text-[#26332D]">{row.provenance}</strong>
                                        </p>
                                      )}
                                    </div>

                                    <div className="lg:col-span-5 space-y-2">
                                      <div className="flex items-center justify-between">
                                        <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#26332D]">
                                          <GitBranch className="w-3.5 h-3.5 text-[#164B45]" />
                                          Knowledge Graph Traversal Paths
                                        </span>
                                        <button
                                          type="button"
                                          onClick={() => onNavigate('knowledge-graph')}
                                          className="text-[11px] font-medium text-[#164B45] underline underline-offset-2 cursor-pointer"
                                        >
                                          Open in Graph Explorer
                                        </button>
                                      </div>

                                      {row.safety?.paths && row.safety.paths.length > 0 ? (
                                        <div className="space-y-1.5">
                                          {row.safety.paths.map((p, idx) => (
                                            <div
                                              key={idx}
                                              className="px-3 py-1.5 rounded-md bg-white border border-[#DDE4DE] font-mono text-[11px] text-[#26332D] break-all"
                                            >
                                              {p}
                                            </div>
                                          ))}
                                        </div>
                                      ) : (
                                        <div className="px-3 py-2.5 rounded-md bg-white border border-[#DDE4DE] text-xs text-[#758078]">
                                          No catalog graph path available — insufficient ontology coverage for automated clearance.
                                        </div>
                                      )}
                                    </div>
                                  </div>
                                </td>
                              </tr>
                            )}
                          </React.Fragment>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}

              {/* Clinical Boundary Disclaimer */}
              <div className="px-5 py-3.5 bg-[#F7F5EE] border-t border-[#DDE4DE] flex items-start gap-2.5 text-xs text-[#758078]">
                <Info className="w-4 h-4 text-[#164B45] shrink-0 mt-0.5" />
                <p className="leading-relaxed">
                  Catalog verification confirms botanical identity against the 25-herb VedaAI IMPPAT 2.0 graph only. Unverified or uncertain ingredients cannot be cleared for safety, and absence of a graph flag does not substitute for clinician review.
                </p>
              </div>
            </section>
          )}
        </div>
      )}
    </div>
  );
};
