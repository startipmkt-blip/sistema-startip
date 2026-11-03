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

// Único estilo de abas do sistema: texto + sublinhado azul na ativa.
export function Tabs<T extends string>({ tabs, value, onChange, className = '' }: TabsProps<T>) {
  return (
    <div role="tablist" className={`flex flex-wrap gap-x-1 border-b border-white/10 ${className}`}>
      {tabs.map((t) => {
        const ativa = t.id === value;
        return (
          <button
            key={t.id}
            role="tab"
            aria-selected={ativa}
            onClick={() => onChange(t.id)}
            className={`-mb-px flex items-center gap-1.5 border-b-2 px-3 py-2 text-sm font-medium transition-colors ${
              ativa
                ? 'border-brand-400 text-white'
                : 'border-transparent text-slate-400 hover:text-slate-200'
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
