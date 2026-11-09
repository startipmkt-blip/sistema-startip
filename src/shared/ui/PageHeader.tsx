import type { ReactNode } from 'react';
import { glassify } from '@/shared/ui/GlassIcon';

interface PageHeaderProps {
  title: string;
  subtitle?: string;
  children?: ReactNode; // área de ações (botões, filtros)
}

export function PageHeader({ title, subtitle, children }: PageHeaderProps) {
  return (
    <div className="flex flex-wrap items-end justify-between gap-3 pb-1 sm:gap-4">
      <div className="min-w-0">
        <h1 className="text-[22px] font-bold leading-tight sm:text-[26px] tracking-[-0.02em] text-white">{glassify(title)}</h1>
        {subtitle && <p className="mt-1 text-sm text-slate-400">{glassify(subtitle)}</p>}
      </div>
      {children && <div className="flex w-full flex-wrap items-center gap-2 sm:w-auto">{children}</div>}
    </div>
  );
}
