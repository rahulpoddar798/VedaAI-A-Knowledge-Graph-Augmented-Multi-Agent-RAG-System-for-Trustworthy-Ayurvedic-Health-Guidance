import React from 'react';
import { Leaf, ShieldCheck, ArrowLeft, UserCheck } from 'lucide-react';
import type { ScreenId } from '../types/veda';

interface AuthScreenProps {
  userRole: 'Patient' | 'Clinical Reviewer';
  onChangeRole: (role: 'Patient' | 'Clinical Reviewer') => void;
  onAuthenticated: (target: ScreenId) => void;
}

export const AuthScreen: React.FC<AuthScreenProps> = ({
  userRole,
  onChangeRole,
  onAuthenticated
}) => {
  return (
    <div className="min-h-screen bg-[#F7F5EE] flex flex-col justify-center px-4 py-10">
      <div className="max-w-md w-full mx-auto space-y-5">
        <button
          type="button"
          onClick={() => onAuthenticated('label-analyzer')}
          className="inline-flex items-center gap-1.5 text-xs font-medium text-[#164B45] hover:text-[#173D32] cursor-pointer"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Back to workspace</span>
        </button>

        <div className="bg-white border border-[#DDE4DE] rounded-2xl p-6 sm:p-8 space-y-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#173D32] text-white flex items-center justify-center">
              <Leaf className="w-5 h-5 text-[#E8EFE8]" />
            </div>
            <div>
              <h1 className="font-editorial text-xl font-semibold text-[#173D32]">
                Workspace demonstration
              </h1>
              <p className="text-xs text-[#758078]">
                Choose a view for this browser session.
              </p>
            </div>
          </div>

          {/* Role Selector */}
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-[#26332D]">Workspace Role</label>
            <div className="grid grid-cols-2 gap-2.5">
              {(['Patient', 'Clinical Reviewer'] as const).map(role => (
                <button
                  key={role}
                  type="button"
                  onClick={() => onChangeRole(role)}
                  className={`p-2.5 rounded-lg border text-xs font-medium flex items-center justify-center gap-1.5 transition cursor-pointer ${
                    userRole === role
                      ? 'bg-[#E8EFE8] border-[#173D32]/40 text-[#173D32]'
                      : 'bg-white border-[#DDE4DE] text-[#758078] hover:text-[#26332D]'
                  }`}
                >
                  <UserCheck className="w-3.5 h-3.5" />
                  <span>{role}</span>
                </button>
              ))}
            </div>
          </div>

          <button type="button" className="w-full rounded-lg bg-[#173D32] p-3 text-white"
            onClick={() => onAuthenticated(userRole === 'Clinical Reviewer' ? 'admin' : 'label-analyzer')}>
            Open selected view
          </button>

          <div className="pt-3 border-t border-[#DDE4DE] flex items-start gap-2 text-[11px] text-[#758078]">
            <ShieldCheck className="w-4 h-4 text-[#173D32] shrink-0 mt-0.5" />
            <span>
              These display preferences apply only to this tab. Patient accounts and reviewer permissions are pending.
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};
