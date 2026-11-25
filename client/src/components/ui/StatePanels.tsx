import React from 'react';
import { Loader2, AlertTriangle, Leaf, RefreshCw } from 'lucide-react';

export const LoadingPanel: React.FC<{
  title: string;
  description: string;
}> = ({ title, description }) => (
  <div
    role="status"
    aria-live="polite"
    className="bg-white border border-[#DDE4DE] rounded-xl p-8 flex flex-col items-center justify-center text-center space-y-3"
  >
    <div className="w-11 h-11 rounded-full bg-[#E8EFE8] text-[#173D32] flex items-center justify-center">
      <Loader2 className="w-5 h-5 animate-spin" />
    </div>
    <div className="space-y-1 max-w-md">
      <h3 className="text-sm font-semibold text-[#26332D]">{title}</h3>
      <p className="text-xs text-[#758078] leading-relaxed">{description}</p>
    </div>
  </div>
);

export const EmptyPanel: React.FC<{
  title: string;
  description: string;
  icon?: React.ReactNode;
  action?: React.ReactNode;
}> = ({ title, description, icon, action }) => (
  <div className="bg-white border border-[#DDE4DE] rounded-xl p-10 flex flex-col items-center justify-center text-center space-y-3">
    <div className="w-12 h-12 rounded-xl bg-[#E8EFE8] border border-[#DDE4DE] text-[#173D32] flex items-center justify-center">
      {icon || <Leaf className="w-5 h-5" />}
    </div>
    <div className="space-y-1 max-w-md">
      <h3 className="font-editorial text-lg font-medium text-[#26332D]">{title}</h3>
      <p className="text-xs text-[#758078] leading-relaxed">{description}</p>
    </div>
    {action && <div className="pt-2">{action}</div>}
  </div>
);

export const ErrorPanel: React.FC<{
  title: string;
  message: string;
  onRetry?: () => void;
}> = ({ title, message, onRetry }) => (
  <div
    role="alert"
    className="bg-[#FBEAEA] border border-[#E7BABA] rounded-xl p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4"
  >
    <div className="flex items-start gap-3">
      <AlertTriangle className="w-5 h-5 text-[#B64040] shrink-0 mt-0.5" />
      <div className="space-y-0.5">
        <h3 className="text-sm font-semibold text-[#9A2E2E]">{title}</h3>
        <p className="text-xs text-[#7B2828] leading-relaxed">{message}</p>
      </div>
    </div>
    {onRetry && (
      <button
        type="button"
        onClick={onRetry}
        className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-white border border-[#E7BABA] text-xs font-medium text-[#9A2E2E] hover:bg-[#FDF7F7] transition shrink-0"
      >
        <RefreshCw className="w-3.5 h-3.5" />
        Retry
      </button>
    )}
  </div>
);

export const SampleNoticeBanner: React.FC<{
  text?: string;
}> = ({ text }) => (
  <div className="bg-[#E8EFE8]/70 border border-[#DDE4DE] rounded-lg px-3.5 py-2 flex items-center justify-between gap-3 text-xs text-[#26332D]">
    <span>
      <strong className="font-semibold text-[#173D32]">Demonstration Sample Data:</strong>{' '}
      {text ||
        'Records shown below illustrate VedaAI reasoning structure and IMPPAT 2.0 ontology semantics. Treat as prototype sample data, not verified personal medical advice.'}
    </span>
  </div>
);
