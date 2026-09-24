'use client';

import React from 'react';
import { LucideIcon, Inbox } from 'lucide-react';

interface EmptyStateProps {
  title: string;
  description?: string;
  icon?: LucideIcon;
  actionText?: string;
  actionHref?: string;
  action?: {
    label: string;
    onClick?: () => void;
    href?: string;
  };
}

export const EmptyState: React.FC<EmptyStateProps> = ({
  title,
  description,
  icon: Icon = Inbox,
  actionText,
  actionHref,
  action,
}) => {
  const finalAction = action || (actionText ? { label: actionText, href: actionHref } : undefined);
  return (
    <div className="flex flex-col items-center justify-center p-12 text-center rounded-2xl border border-dashed border-slate-800 bg-slate-900/30">
      <div className="w-14 h-14 rounded-2xl bg-slate-800/80 border border-slate-700/60 flex items-center justify-center text-slate-400 mb-4 shadow-inner">
        <Icon className="w-7 h-7" />
      </div>
      <h3 className="text-base font-bold text-slate-200 mb-1">{title}</h3>
      {description && <p className="text-xs text-slate-400 max-w-sm leading-relaxed mb-5">{description}</p>}
      {finalAction && (
        finalAction.href ? (
          <a
            href={finalAction.href}
            className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-semibold transition shadow-md shadow-indigo-600/20"
          >
            {finalAction.label}
          </a>
        ) : (
          <button
            onClick={finalAction.onClick}
            className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-semibold transition shadow-md shadow-indigo-600/20"
          >
            {finalAction.label}
          </button>
        )
      )}
    </div>
  );
};
