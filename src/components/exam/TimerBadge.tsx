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
          ? 'bg-rose-50 text-rose-700 border-rose-300 animate-bounce shadow-xs'
          : isLowTime
          ? 'bg-amber-50 text-amber-700 border-amber-300 animate-pulse shadow-xs'
          : 'bg-white text-slate-800 border-slate-200 shadow-xs'
      }`}
      title="Server-synchronized assessment countdown"
    >
      {isCritical ? (
        <AlertCircle className="w-3.5 h-3.5 text-rose-600 animate-spin" />
      ) : (
        <Clock className={`w-3.5 h-3.5 ${isLowTime ? 'text-amber-600' : 'text-indigo-600'}`} />
      )}
      <span>{formatTimeSeconds(secondsRemaining)}</span>
      <span className="text-[10px] uppercase font-sans tracking-wider text-slate-500">Left</span>
    </div>
  );
};
