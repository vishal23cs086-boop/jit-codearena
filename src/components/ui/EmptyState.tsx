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
    <div className="flex flex-col items-center justify-center p-12 text-center rounded-3xl border border-dashed border-slate-300 bg-white/70 shadow-xs backdrop-blur-md">
      <div className="w-14 h-14 rounded-2xl bg-indigo-50 border border-indigo-200 flex items-center justify-center text-indigo-600 mb-4 shadow-xs">
        <Icon className="w-7 h-7 text-indigo-600" />
      </div>
      <h3 className="text-base font-bold text-slate-900 mb-1">{title}</h3>
      {description && <p className="text-xs text-slate-500 max-w-sm leading-relaxed mb-5">{description}</p>}
      {finalAction && (
        finalAction.href ? (
          <a
            href={finalAction.href}
            className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-semibold transition shadow-md shadow-indigo-600/20"
          >
            {finalAction.label}
          </a>
        ) : (
          <button
            onClick={finalAction.onClick}
            className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-semibold transition shadow-md shadow-indigo-600/20"
          >
            {finalAction.label}
          </button>
        )
      )}
    </div>
  );
};
