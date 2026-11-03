import type { ReactNode } from 'react';
import { GlassIcon, type GlassIconName } from '@/shared/ui/GlassIcon';

interface EmptyStateProps {
  message: string;
  title?: string;
  icon?: GlassIconName;
  action?: ReactNode;
}

export function EmptyState({ message, title, icon = 'inbox', action }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center gap-2 px-6 py-12 text-center">
      <div className="flex h-12 w-12 items-center justify-center rounded-xl border border-white/10 bg-white/[0.04]">
        <GlassIcon name={icon} className="h-6 w-6" />
      </div>
      {title && <div className="mt-1 text-sm font-semibold text-slate-100">{title}</div>}
      <p className="max-w-sm text-sm text-slate-400">{message}</p>
      {action && <div className="mt-2">{action}</div>}
    </div>
  );
}
