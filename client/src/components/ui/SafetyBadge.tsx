import React from 'react';
import {
  CheckCircle2,
  ShieldAlert,
  AlertTriangle,
  HelpCircle,
  FileQuestion,
  Ban,
  Info,
  ShieldOff
} from 'lucide-react';
import type { SafetyStatus } from '../../types/veda';

interface SafetyBadgeProps {
  status: SafetyStatus;
  labelOverride?: string;
  size?: 'sm' | 'md';
}

const STATUS_CONFIG: Record<
  SafetyStatus,
  {
    label: string;
    classes: string;
    Icon: React.ComponentType<{ className?: string }>;
  }
> = {
  verified: {
    label: 'Verified',
    classes: 'bg-[#E8F5EE] text-[#1D6347] border-[#B8DEC9]',
    Icon: CheckCircle2
  },
  flagged: {
    label: 'Flagged',
    classes: 'bg-[#FBEAEA] text-[#9A2E2E] border-[#E7BABA]',
    Icon: ShieldAlert
  },
  caution: {
    label: 'Caution',
    classes: 'bg-[#FDF4E6] text-[#945F14] border-[#EAD0A1]',
    Icon: AlertTriangle
  },
  uncertain: {
    label: 'Uncertain',
    classes: 'bg-[#FDF4E6] text-[#945F14] border-[#EAD0A1]',
    Icon: HelpCircle
  },
  unverified: {
    label: 'Unverified',
    classes: 'bg-[#EEF3F7] text-[#2C5877] border-[#C6D8E6]',
    Icon: FileQuestion
  },
  insufficient_evidence: {
    label: 'Insufficient evidence',
    classes: 'bg-[#F2F4F2] text-[#4C5750] border-[#D3DBD4]',
    Icon: Info
  },
  out_of_domain: {
    label: 'Out-of-domain',
    classes: 'bg-[#FDF4E6] text-[#945F14] border-[#EAD0A1]',
    Icon: ShieldOff
  },
  blocked: {
    label: 'Blocked',
    classes: 'bg-[#FBEAEA] text-[#9A2E2E] border-[#E7BABA]',
    Icon: Ban
  }
};

export const SafetyBadge: React.FC<SafetyBadgeProps> = ({
  status,
  labelOverride,
  size = 'sm'
}) => {
  const cfg = STATUS_CONFIG[status] ?? STATUS_CONFIG.insufficient_evidence;
  const Icon = cfg.Icon;
  const sizing =
    size === 'md'
      ? 'px-3 py-1 text-xs gap-1.5'
      : 'px-2.5 py-0.5 text-[11px] gap-1';

  return (
    <span
      className={`inline-flex items-center font-medium rounded-full border whitespace-nowrap ${cfg.classes} ${sizing}`}
    >
      <Icon className={size === 'md' ? 'w-3.5 h-3.5 shrink-0' : 'w-3 h-3 shrink-0'} />
      <span>{labelOverride || cfg.label}</span>
    </span>
  );
};
