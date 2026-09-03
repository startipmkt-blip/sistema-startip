import type { HTMLAttributes } from 'react';

type Tone = 'slate' | 'green' | 'amber' | 'red' | 'blue';

interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
  tone?: Tone;
}

// Cores semânticas mantidas (verde %, azul/amarelo tags, vermelho despesas),
// em versão translúcida para o tema escuro.
const tones: Record<Tone, string> = {
  slate: 'bg-white/10 text-slate-300 ring-white/10',
  green: 'bg-emerald-500/15 text-emerald-300 ring-emerald-500/20',
  amber: 'bg-amber-500/15 text-amber-300 ring-amber-500/20',
  red: 'bg-red-500/15 text-red-300 ring-red-500/20',
  blue: 'bg-blue-500/15 text-blue-300 ring-blue-500/20',
};

export function Badge({ tone = 'slate', className = '', ...props }: BadgeProps) {
  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ring-1 ring-inset ${tones[tone]} ${className}`}
      {...props}
    />
  );
}
