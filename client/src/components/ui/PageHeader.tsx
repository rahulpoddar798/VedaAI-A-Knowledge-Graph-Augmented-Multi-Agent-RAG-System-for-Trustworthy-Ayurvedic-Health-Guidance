import React from 'react';

interface PageHeaderProps {
  eyebrow?: string;
  title: string;
  description: string;
  actions?: React.ReactNode;
  badge?: React.ReactNode;
}

export const PageHeader: React.FC<PageHeaderProps> = ({
  eyebrow,
  title,
  description,
  actions,
  badge
}) => {
  return (
    <header className="border-b border-[#DDE4DE] pb-5 mb-6 flex flex-col lg:flex-row lg:items-end justify-between gap-4">
      <div className="space-y-1.5 max-w-3xl">
        {eyebrow && (
          <div className="flex items-center gap-2">
            <span className="text-[11px] font-semibold uppercase tracking-[0.08em] text-[#164B45]">
              {eyebrow}
            </span>
            {badge}
          </div>
        )}
        <h1 className="font-editorial text-2xl sm:text-[28px] font-semibold tracking-tight text-[#26332D] leading-tight">
          {title}
        </h1>
        <p className="text-sm text-[#758078] leading-relaxed">{description}</p>
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2.5 shrink-0">{actions}</div>}
    </header>
  );
};
