'use client';

import React, { useEffect, useState } from 'react';
import { Clock, AlertCircle } from 'lucide-react';
import { formatTimeSeconds } from '@/lib/utils';

interface TimerBadgeProps {
  initialSeconds: number;
  onTimeExpire: () => void;
  isRunning?: boolean;
}

export const TimerBadge: React.FC<TimerBadgeProps> = ({
  initialSeconds,
  onTimeExpire,
  isRunning = true,
}) => {
  const [secondsRemaining, setSecondsRemaining] = useState<number>(initialSeconds);

  useEffect(() => {
    setSecondsRemaining(initialSeconds);
  }, [initialSeconds]);

  useEffect(() => {
    if (!isRunning || secondsRemaining <= 0) return;

    const timer = setInterval(() => {
      setSecondsRemaining((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          onTimeExpire();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [isRunning, secondsRemaining, onTimeExpire]);

  const isLowTime = secondsRemaining < 300; // < 5 minutes
  const isCritical = secondsRemaining < 60; // < 1 minute

  return (
    <div
      className={`flex items-center gap-2 px-3.5 py-1.5 rounded-xl font-mono text-sm font-semibold transition shadow-sm border ${
        isCritical
          ? 'bg-red-500/20 text-red-400 border-red-500/50 animate-bounce'
          : isLowTime
          ? 'bg-amber-500/15 text-amber-300 border-amber-500/40 animate-pulse'
          : 'bg-slate-800/80 text-slate-200 border-slate-700/60'
      }`}
      title="Server-synchronized assessment countdown"
    >
      {isCritical ? (
        <AlertCircle className="w-4 h-4 text-red-400 animate-spin" />
      ) : (
        <Clock className={`w-4 h-4 ${isLowTime ? 'text-amber-400' : 'text-indigo-400'}`} />
      )}
      <span>{formatTimeSeconds(secondsRemaining)}</span>
      <span className="text-[10px] uppercase font-sans tracking-wider opacity-70">Remaining</span>
    </div>
  );
};
