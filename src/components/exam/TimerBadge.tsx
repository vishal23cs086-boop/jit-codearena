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
      className={`flex items-center gap-2 px-3.5 py-1.5 rounded-xl font-mono text-xs font-semibold transition backdrop-blur-md border ${
        isCritical
          ? 'bg-rose-500/20 text-rose-300 border-rose-500/40 animate-bounce shadow-lg shadow-rose-500/20'
          : isLowTime
          ? 'bg-amber-500/15 text-amber-300 border-amber-500/30 animate-pulse shadow-md shadow-amber-500/10'
          : 'bg-white/[0.06] text-white border-white/10'
      }`}
      title="Server-synchronized assessment countdown"
    >
      {isCritical ? (
        <AlertCircle className="w-3.5 h-3.5 text-rose-400 animate-spin" />
      ) : (
        <Clock className={`w-3.5 h-3.5 ${isLowTime ? 'text-amber-400' : 'text-indigo-400'}`} />
      )}
      <span>{formatTimeSeconds(secondsRemaining)}</span>
      <span className="text-[10px] uppercase font-sans tracking-wider text-slate-400">Left</span>
    </div>
  );
};
