import React, { useState } from 'react';
import { Leaf, ShieldCheck, ArrowLeft, Lock, Mail, UserCheck } from 'lucide-react';
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
  const [mode, setMode] = useState<'signin' | 'register'>('signin');
  const [email, setEmail] = useState('ananya.sharma@vedaai-demo.org');
  const [password, setPassword] = useState('••••••••••••');
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.includes('@')) {
      setError('Enter a valid email address to continue.');
      return;
    }
    setError(null);
    onAuthenticated(userRole === 'Clinical Reviewer' ? 'admin' : 'label-analyzer');
  };

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
                VedaAI Access
              </h1>
              <p className="text-xs text-[#758078]">
                {mode === 'signin'
                  ? 'Sign in to your clinical safety workspace'
                  : 'Create a demonstration patient or reviewer profile'}
              </p>
            </div>
          </div>

          {/* Mode Tabs */}
          <div className="grid grid-cols-2 p-1 rounded-lg bg-[#F7F5EE] border border-[#DDE4DE]">
            <button
              type="button"
              onClick={() => setMode('signin')}
              className={`py-2 rounded-md text-xs font-medium transition cursor-pointer ${
                mode === 'signin' ? 'bg-white text-[#173D32] shadow-xs' : 'text-[#758078]'
              }`}
            >
              Sign In
            </button>
            <button
              type="button"
              onClick={() => setMode('register')}
              className={`py-2 rounded-md text-xs font-medium transition cursor-pointer ${
                mode === 'register' ? 'bg-white text-[#173D32] shadow-xs' : 'text-[#758078]'
              }`}
            >
              Register
            </button>
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

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1.5">
              <label htmlFor="auth-email" className="text-xs font-medium text-[#26332D]">
                Email Address
              </label>
              <div className="relative">
                <Mail className="w-4 h-4 text-[#758078] absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  id="auth-email"
                  type="email"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  className="w-full h-10 pl-9 pr-3 rounded-lg border border-[#DDE4DE] bg-[#F7F5EE]/50 text-sm text-[#26332D] focus:bg-white"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <label htmlFor="auth-password" className="text-xs font-medium text-[#26332D]">
                Password
              </label>
              <div className="relative">
                <Lock className="w-4 h-4 text-[#758078] absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  id="auth-password"
                  type="password"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  className="w-full h-10 pl-9 pr-3 rounded-lg border border-[#DDE4DE] bg-[#F7F5EE]/50 text-sm text-[#26332D] focus:bg-white"
                />
              </div>
            </div>

            {error && (
              <p className="text-xs text-[#9A2E2E] bg-[#FBEAEA] border border-[#E7BABA] rounded-lg px-3 py-2">
                {error}
              </p>
            )}

            <button
              type="submit"
              className="w-full h-10 rounded-lg bg-[#173D32] text-white text-sm font-medium hover:bg-[#164B45] transition cursor-pointer"
            >
              {mode === 'signin' ? 'Continue to VedaAI' : 'Create Demo Session'}
            </button>
          </form>

          <div className="pt-3 border-t border-[#DDE4DE] flex items-start gap-2 text-[11px] text-[#758078]">
            <ShieldCheck className="w-4 h-4 text-[#173D32] shrink-0 mt-0.5" />
            <span>
              Prototype authentication screen. Session preferences remain local to your browser; no clinical credentials are transmitted externally.
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};
