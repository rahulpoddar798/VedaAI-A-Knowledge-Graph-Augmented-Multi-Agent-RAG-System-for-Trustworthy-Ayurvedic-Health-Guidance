import React from 'react';
import {
  Leaf,
  ShieldCheck,
  GitBranch,
  Cpu,
  ScanLine,
  ArrowRight,
  CheckCircle2,
  BookOpen
} from 'lucide-react';
import type { ScreenId } from '../types/veda';

interface LandingScreenProps {
  onNavigate: (screen: ScreenId) => void;
}

export const LandingScreen: React.FC<LandingScreenProps> = ({ onNavigate }) => {
  return (
    <div className="min-h-screen bg-[#F7F5EE] text-[#26332D] flex flex-col">
      {/* Top Bar */}
      <header className="border-b border-[#DDE4DE] bg-white/90 backdrop-blur-xs sticky top-0 z-30">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-[#173D32] text-white flex items-center justify-center">
              <Leaf className="w-4.5 h-4.5 text-[#E8EFE8]" />
            </div>
            <div>
              <span className="font-editorial text-lg font-semibold text-[#173D32]">
                VedaAI
              </span>
              <span className="hidden sm:inline-block ml-2 text-xs text-[#758078]">
                Clinical Botanical Intelligence
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2.5">
            <button
              type="button"
              onClick={() => onNavigate('auth')}
              className="px-3.5 py-2 rounded-lg border border-[#DDE4DE] bg-white text-xs font-medium text-[#26332D] hover:bg-[#E8EFE8]/50 transition cursor-pointer"
            >
              Clinician / Patient Sign In
            </button>
            <button
              type="button"
              onClick={() => onNavigate('label-analyzer')}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-[#173D32] text-white text-xs font-medium hover:bg-[#164B45] transition cursor-pointer"
            >
              <span>Enter Platform</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="max-w-6xl mx-auto px-4 sm:px-6 py-14 lg:py-20 grid grid-cols-1 lg:grid-cols-12 gap-10 items-center">
        <div className="lg:col-span-7 space-y-6">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#E8EFE8] border border-[#DDE4DE] text-xs font-medium text-[#173D32]">
            <ShieldCheck className="w-3.5 h-3.5" />
            <span>Knowledge-Graph-Augmented Multi-Agent RAG</span>
          </div>

          <h1 className="font-editorial text-3xl sm:text-5xl font-semibold text-[#173D32] leading-[1.15] tracking-tight">
            Trustworthy Ayurvedic guidance grounded in graph safety and transparent evidence.
          </h1>

          <p className="text-base text-[#758078] leading-relaxed max-w-2xl">
            VedaAI pairs classical Ayurvedic pharmacology (IMPPAT 2.0 &amp; Charaka Samhita) with a Neo4j knowledge graph, hybrid vector retrieval, and an adversarial five-agent architecture so safety contraindications are never hidden behind fluent prose.
          </p>

          <div className="flex flex-wrap items-center gap-3 pt-1">
            <button
              type="button"
              onClick={() => onNavigate('label-analyzer')}
              className="inline-flex items-center gap-2 px-5 py-3 rounded-lg bg-[#173D32] text-white text-sm font-medium hover:bg-[#164B45] transition cursor-pointer"
            >
              <ScanLine className="w-4 h-4" />
              <span>Open Product Label Analyzer</span>
            </button>
            <button
              type="button"
              onClick={() => onNavigate('consultation')}
              className="inline-flex items-center gap-2 px-5 py-3 rounded-lg bg-white border border-[#DDE4DE] text-sm font-medium text-[#26332D] hover:bg-[#E8EFE8]/50 transition cursor-pointer"
            >
              <span>Launch Clinical Consultation</span>
            </button>
          </div>
        </div>

        {/* Right Architectural Summary Card */}
        <div className="lg:col-span-5 bg-white border border-[#DDE4DE] rounded-2xl p-6 space-y-5">
          <div className="flex items-center justify-between pb-3 border-b border-[#DDE4DE]">
            <span className="text-xs font-semibold uppercase tracking-wider text-[#164B45]">
              Safety-First Reasoning Pipeline
            </span>
            <span className="text-[11px] font-medium px-2 py-0.5 rounded bg-[#E8EFE8] text-[#173D32]">
              5 Stages
            </span>
          </div>

          <div className="space-y-3">
            {[
              ['1. Entity Extractor', 'Normalizes Sanskrit, botanical, seasonal & morbidity entities.'],
              ['2. Retrieval Planner', 'Executes Neo4j Cypher traversals + 3072-d vector search.'],
              ['3. Proponent Agent', 'Synthesizes potential therapeutic rationale from classical texts.'],
              ['4. Opponent Validator', 'Audits contraindications, dosha clashes, and missing data.'],
              ['5. Judge Arbitrator', 'Enforces safety-first verdicts with explicit provenance.']
            ].map(([title, desc]) => (
              <div key={title} className="flex items-start gap-2.5">
                <CheckCircle2 className="w-4 h-4 text-[#247A58] shrink-0 mt-0.5" />
                <div>
                  <p className="text-xs font-semibold text-[#26332D]">{title}</p>
                  <p className="text-xs text-[#758078]">{desc}</p>
                </div>
              </div>
            ))}
          </div>

          <div className="pt-3 border-t border-[#DDE4DE] flex items-center justify-between text-xs">
            <span className="text-[#758078]">Active Prototype Notice</span>
            <span className="font-medium text-[#B79A5B]">Clinical Research Preview</span>
          </div>
        </div>
      </section>

      {/* Feature Pillars */}
      <section className="max-w-6xl mx-auto px-4 sm:px-6 pb-16 grid grid-cols-1 md:grid-cols-3 gap-5">
        {[
          {
            Icon: GitBranch,
            title: 'Explicit Knowledge Graph Provenance',
            desc: 'Every safety flag traces directly to Neo4j relationships across herbs, doshas, seasons (Ritucharya), and chronic conditions.'
          },
          {
            Icon: ScanLine,
            title: 'Multimodal Product Label Auditing',
            desc: 'Extracts supplement ingredients via OCR, separates verified catalog herbs from unverified carriers, and flags illegible print.'
          },
          {
            Icon: Cpu,
            title: 'Adversarial Multi-Agent Transparency',
            desc: 'Distinguishes generated agent commentary from independently verified database facts and reports missing evidence clearly.'
          }
        ].map(item => {
          const Icon = item.Icon;
          return (
            <div
              key={item.title}
              className="bg-white border border-[#DDE4DE] rounded-xl p-6 space-y-2.5"
            >
              <div className="w-9 h-9 rounded-lg bg-[#E8EFE8] text-[#173D32] flex items-center justify-center">
                <Icon className="w-4.5 h-4.5" />
              </div>
              <h2 className="font-editorial text-lg font-semibold text-[#26332D]">
                {item.title}
              </h2>
              <p className="text-xs text-[#758078] leading-relaxed">{item.desc}</p>
            </div>
          );
        })}
      </section>

      <footer className="mt-auto border-t border-[#DDE4DE] bg-white py-5 px-4 sm:px-6">
        <div className="max-w-6xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-[#758078]">
          <span className="inline-flex items-center gap-1.5">
            <BookOpen className="w-3.5 h-3.5 text-[#173D32]" />
            Grounded in IMPPAT 2.0 &amp; Classical Ayurvedic Treatises
          </span>
          <span>Educational &amp; clinical decision support prototype — not a substitute for medical care.</span>
        </div>
      </footer>
    </div>
  );
};
