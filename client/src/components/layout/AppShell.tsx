import React, { useState } from 'react';
import {
  LayoutDashboard,
  Stethoscope,
  ClipboardCheck,
  Cpu,
  History,
  FlaskConical,
  ScanLine,
  Leaf,
  Share2,
  UserCircle2,
  Shield,
  Menu,
  X,
  LogOut,
  ExternalLink,
  Wifi,
  WifiOff
} from 'lucide-react';
import type { PatientProfile, ScreenId } from '../../types/veda';

interface AppShellProps {
  activeScreen: ScreenId;
  onNavigate: (screen: ScreenId) => void;
  profile: PatientProfile;
  backendOnline: boolean;
  userRole: 'Patient' | 'Clinical Reviewer';
  children: React.ReactNode;
}

interface NavGroup {
  groupLabel: string;
  items: Array<{
    id: ScreenId;
    label: string;
    Icon: React.ComponentType<{ className?: string }>;
  }>;
}

const NAV_GROUPS: NavGroup[] = [
  {
    groupLabel: 'Clinical Workspace',
    items: [
      { id: 'overview', label: 'Overview', Icon: LayoutDashboard },
      { id: 'consultation', label: 'Consultation', Icon: Stethoscope },
      { id: 'assessment', label: 'AI Assessment', Icon: ClipboardCheck },
      { id: 'agents', label: 'Agent Transparency', Icon: Cpu },
      { id: 'history', label: 'Consultation History', Icon: History }
    ]
  },
  {
    groupLabel: 'Safety & Discovery',
    items: [
      { id: 'interactions', label: 'Drug–Herb Checker', Icon: FlaskConical },
      { id: 'label-analyzer', label: 'Product Label Analyzer', Icon: ScanLine },
      { id: 'herbs', label: 'Herb Explorer', Icon: Leaf },
      { id: 'knowledge-graph', label: 'Knowledge Graph', Icon: Share2 }
    ]
  },
  {
    groupLabel: 'Profile & Governance',
    items: [
      { id: 'profile', label: 'Health Profile', Icon: UserCircle2 },
      { id: 'admin', label: 'Admin & Expert Portal', Icon: Shield }
    ]
  }
];

export const AppShell: React.FC<AppShellProps> = ({
  activeScreen,
  onNavigate,
  profile,
  backendOnline,
  userRole,
  children
}) => {
  const [mobileOpen, setMobileOpen] = useState(false);

  const handleNav = (id: ScreenId) => {
    onNavigate(id);
    setMobileOpen(false);
  };

  const sidebarContent = (
    <div className="flex flex-col h-full bg-white border-r border-[#DDE4DE]">
      {/* VedaAI Brand Header */}
      <div className="px-5 py-5 border-b border-[#DDE4DE] flex items-center justify-between">
        <button
          type="button"
          onClick={() => handleNav('overview')}
          className="flex items-center gap-3 text-left cursor-pointer group"
        >
          <div className="w-9 h-9 rounded-xl bg-[#173D32] text-white flex items-center justify-center shrink-0">
            <Leaf className="w-4.5 h-4.5 text-[#E8EFE8]" />
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <span className="font-editorial text-lg font-semibold tracking-tight text-[#173D32]">
                VedaAI
              </span>
              <span className="text-[10px] font-medium px-1.5 py-0.5 rounded bg-[#E8EFE8] text-[#173D32]">
                KG-RAG
              </span>
            </div>
            <p className="text-[11px] text-[#758078] leading-tight">
              Botanical Clinical Safety
            </p>
          </div>
        </button>

        <button
          type="button"
          onClick={() => setMobileOpen(false)}
          className="lg:hidden p-1.5 rounded-lg text-[#758078] hover:text-[#26332D] hover:bg-[#F7F5EE]"
          aria-label="Close navigation menu"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* Navigation Modules */}
      <nav aria-label="Primary VedaAI navigation" className="flex-1 overflow-y-auto px-3 py-4 space-y-5">
        {NAV_GROUPS.map(group => (
          <div key={group.groupLabel} className="space-y-1">
            <p className="px-3 text-[11px] font-semibold uppercase tracking-[0.07em] text-[#758078] mb-1.5">
              {group.groupLabel}
            </p>
            {group.items.map(item => {
              const Icon = item.Icon;
              const isActive = activeScreen === item.id;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => handleNav(item.id)}
                  aria-current={isActive ? 'page' : undefined}
                  className={`w-full flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-[13px] transition text-left cursor-pointer ${
                    isActive
                      ? 'bg-[#E8EFE8] text-[#173D32] font-semibold'
                      : 'text-[#26332D] font-medium hover:bg-[#F7F5EE]'
                  }`}
                >
                  <Icon
                    className={`w-4 h-4 shrink-0 ${
                      isActive ? 'text-[#173D32]' : 'text-[#758078]'
                    }`}
                  />
                  <span className="truncate">{item.label}</span>
                </button>
              );
            })}
          </div>
        ))}
      </nav>

      {/* Bottom Status + Profile & Public Views */}
      <div className="p-3.5 border-t border-[#DDE4DE] space-y-3 bg-[#F7F5EE]/50">
        {/* Connection Status Pill */}
        <div className="flex items-center justify-between px-2.5 py-2 rounded-lg bg-white border border-[#DDE4DE] text-[11px]">
          <span className="inline-flex items-center gap-1.5 font-medium text-[#26332D]">
            {backendOnline ? (
              <Wifi className="w-3.5 h-3.5 text-[#247A58]" />
            ) : (
              <WifiOff className="w-3.5 h-3.5 text-[#758078]" />
            )}
            <span>{backendOnline ? 'Neo4j Aura Online' : 'Catalog unavailable'}</span>
          </span>
          <span
            className={`w-2 h-2 rounded-full ${
              backendOnline ? 'bg-[#247A58]' : 'bg-[#B79A5B]'
            }`}
          />
        </div>

        {/* User Profile Card */}
        <div className="rounded-lg bg-white border border-[#DDE4DE] p-3 space-y-2.5">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-full bg-[#173D32] text-white text-xs font-semibold flex items-center justify-center shrink-0">
              {profile.fullName
                .split(' ')
                .map(n => n[0])
                .join('')
                .slice(0, 2)}
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-xs font-semibold text-[#26332D] truncate">
                {profile.fullName}
              </p>
              <p className="text-[11px] text-[#758078] truncate">
                {userRole} · {profile.prakriti}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1.5 pt-1 border-t border-[#DDE4DE]">
            <button
              type="button"
              onClick={() => handleNav('landing')}
              className="flex-1 inline-flex items-center justify-center gap-1 px-2 py-1.5 rounded-md border border-[#DDE4DE] text-[11px] font-medium text-[#26332D] hover:bg-[#F7F5EE] transition cursor-pointer"
            >
              <ExternalLink className="w-3 h-3 text-[#758078]" />
              <span>Landing</span>
            </button>
            <button
              type="button"
              onClick={() => handleNav('auth')}
              className="flex-1 inline-flex items-center justify-center gap-1 px-2 py-1.5 rounded-md border border-[#DDE4DE] text-[11px] font-medium text-[#26332D] hover:bg-[#F7F5EE] transition cursor-pointer"
            >
              <LogOut className="w-3 h-3 text-[#758078]" />
              <span>Demo views</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-[#F7F5EE] text-[#26332D] flex">
      {/* Desktop Persistent Sidebar */}
      <aside className="hidden lg:block w-[264px] shrink-0 sticky top-0 h-screen">
        {sidebarContent}
      </aside>

      {/* Mobile Drawer Overlay */}
      {mobileOpen && (
        <div className="fixed inset-0 z-50 lg:hidden flex">
          <div
            className="fixed inset-0 bg-[#26332D]/40 backdrop-blur-[1px]"
            onClick={() => setMobileOpen(false)}
          />
          <aside className="relative w-72 max-w-[85vw] h-full z-10">
            {sidebarContent}
          </aside>
        </div>
      )}

      {/* Main Content Area */}
      <div className="flex-1 min-w-0 flex flex-col">
        {/* Mobile Top Bar */}
        <div className="lg:hidden sticky top-0 z-30 bg-white border-b border-[#DDE4DE] px-4 h-14 flex items-center justify-between">
          <button
            type="button"
            onClick={() => setMobileOpen(true)}
            className="inline-flex items-center gap-2 text-sm font-medium text-[#26332D]"
            aria-label="Open navigation menu"
          >
            <Menu className="w-5 h-5 text-[#173D32]" />
            <span className="font-editorial text-base font-semibold text-[#173D32]">
              VedaAI
            </span>
          </button>
          <span className="text-xs font-medium px-2.5 py-1 rounded-full bg-[#E8EFE8] text-[#173D32]">
            {profile.prakriti} · {profile.season}
          </span>
        </div>

        <main className="flex-1 w-full max-w-[1360px] mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
          {children}
        </main>
      </div>
    </div>
  );
};
