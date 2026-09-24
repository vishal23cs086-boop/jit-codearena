'use client';

import React from 'react';
import { AlertTriangle, Maximize2, ShieldAlert } from 'lucide-react';

interface ExamGuardProps {
  isFullscreen: boolean;
  warningMessage: string | null;
  showWarningModal: boolean;
  tabSwitchCount: number;
  fullscreenExitCount: number;
  copyPasteCount: number;
  onRequestFullscreen: () => void;
  onDismissWarning: () => void;
}

export const ExamGuardModal: React.FC<ExamGuardProps> = ({
  isFullscreen,
  warningMessage,
  showWarningModal,
  tabSwitchCount,
  fullscreenExitCount,
  copyPasteCount,
  onRequestFullscreen,
  onDismissWarning,
}) => {
  return (
    <>
      {/* 1. Fullscreen Enforcement Overlay (Displayed if test started but student is not in fullscreen) */}
      {!isFullscreen && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-lg flex items-center justify-center p-4">
          <div className="glass-card rounded-3xl max-w-lg w-full p-8 text-center shadow-2xl border border-white/10 relative overflow-hidden">
            <div className="w-16 h-16 p-2 bg-white/[0.04] border border-white/10 rounded-2xl mx-auto mb-4 shadow-inner flex items-center justify-center">
              <img
                src="/jit-logo.png"
                alt="Jansons Institute of Technology Crest"
                className="w-full h-full object-contain filter drop-shadow-[0_2px_8px_rgba(99,102,241,0.3)]"
              />
            </div>
            <h3 className="text-xl font-bold text-white mb-2">Fullscreen Mode Required</h3>
            <p className="text-sm text-slate-300 mb-6 leading-relaxed">
              JIT CodeArena requires full-screen mode to maintain test integrity and prevent unfair practices. All tab switches and window changes are monitored and reported directly to the college examination cell.
            </p>
            <div className="bg-white/[0.03] rounded-2xl p-4 mb-6 text-left border border-white/[0.08] text-xs text-slate-300 space-y-1.5 font-mono">
              <p>• Do not switch tabs or minimize your browser window.</p>
              <p>• Copying, cutting, or pasting code is disabled.</p>
              <p>• Incidents are logged with your Register Number and timestamp.</p>
            </div>
            <button
              onClick={onRequestFullscreen}
              className="w-full py-3.5 px-4 bg-indigo-600 hover:bg-indigo-500 text-white font-semibold rounded-xl transition shadow-lg shadow-indigo-600/30 flex items-center justify-center gap-2 text-sm"
            >
              <Maximize2 className="w-4 h-4" />
              Enter Fullscreen & Continue Test
            </button>
          </div>
        </div>
      )}

      {/* 2. Security Deterrent Alert Modal (Displayed when a warning is triggered) */}
      {showWarningModal && warningMessage && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-lg flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="glass-card rounded-3xl max-w-md w-full p-7 shadow-2xl border border-rose-500/30">
            <div className="flex items-center gap-3 text-rose-400 mb-4">
              <div className="p-2.5 bg-rose-500/10 rounded-2xl border border-rose-500/20">
                <ShieldAlert className="w-6 h-6 text-rose-400" />
              </div>
              <div>
                <h4 className="font-bold text-lg text-white">Security Event Logged</h4>
                <p className="text-xs text-rose-400 font-medium">Recorded to Invigilator Portal</p>
              </div>
            </div>

            <div className="p-3.5 bg-rose-500/10 border border-rose-500/20 rounded-2xl mb-5">
              <p className="text-sm text-rose-200 leading-relaxed">{warningMessage}</p>
            </div>

            <div className="grid grid-cols-3 gap-2 py-3 border-y border-white/[0.08] mb-5 text-center text-xs font-mono">
              <div className="bg-white/[0.03] border border-white/[0.08] p-2.5 rounded-xl">
                <span className="text-slate-400 block mb-0.5 text-[10px]">Tab Switches</span>
                <span className="font-bold text-amber-400 text-sm">{tabSwitchCount}</span>
              </div>
              <div className="bg-white/[0.03] border border-white/[0.08] p-2.5 rounded-xl">
                <span className="text-slate-400 block mb-0.5 text-[10px]">Fullscreen Exits</span>
                <span className="font-bold text-amber-400 text-sm">{fullscreenExitCount}</span>
              </div>
              <div className="bg-white/[0.03] border border-white/[0.08] p-2.5 rounded-xl">
                <span className="text-slate-400 block mb-0.5 text-[10px]">Copy/Pastes</span>
                <span className="font-bold text-amber-400 text-sm">{copyPasteCount}</span>
              </div>
            </div>

            <p className="text-[11px] text-slate-400 mb-5 text-center leading-relaxed">
              Note: Deterrent controls are in place. Continued disruptions may result in test invalidation by the college exam committee.
            </p>

            <button
              onClick={onDismissWarning}
              className="w-full py-3 px-4 bg-rose-600 hover:bg-rose-500 text-white font-medium rounded-xl transition text-sm shadow-lg shadow-rose-600/30"
            >
              I Understand & Resume Assessment
            </button>
          </div>
        </div>
      )}
    </>
  );
};

export const ExamDeterrentNotice: React.FC = () => (
  <div className="flex items-center gap-2 px-3 py-1.5 bg-amber-500/10 border border-amber-500/20 text-amber-300 text-xs rounded-xl backdrop-blur-md">
    <AlertTriangle className="w-3.5 h-3.5 flex-shrink-0 text-amber-400" />
    <span>Browser security active: Fullscreen enforced • Tab monitoring enabled</span>
  </div>
);
