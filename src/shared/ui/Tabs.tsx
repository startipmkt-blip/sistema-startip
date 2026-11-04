import type { ReactNode } from 'react';

export interface TabItem<T extends string> {
  id: T;
  label: string;
  icon?: ReactNode;
  count?: number;
}

interface TabsProps<T extends string> {
  tabs: readonly TabItem<T>[];
  value: T;
  onChange: (id: T) => void;
  className?: string;
}

// Único estilo de abas do sistema: controle segmentado (pílula clara na ativa).
export function Tabs<T extends string>({ tabs, value, onChange, className = '' }: TabsProps<T>) {
  return (
    <div role="tablist" className={`tabs-clean inline-flex max-w-full flex-wrap gap-1 self-start rounded-xl border border-white/10 bg-white/[0.03] p-1 ${className}`}>
      {tabs.map((t) => {
        const ativa = t.id === value;
        return (
          <button
            key={t.id}
            role="tab"
            aria-selected={ativa}
            onClick={() => onChange(t.id)}
            className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-semibold transition-colors ${
              ativa
                ? 'tab-ativa bg-white/10 text-white'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            {t.icon}
            {t.label}
            {t.count != null && (
              <span className="rounded-md bg-white/10 px-1.5 text-xs text-slate-300">{t.count}</span>
            )}
          </button>
        );
      })}
    </div>
  );
}
