import { Card } from '@/shared/ui/Card';

type Tone = 'slate' | 'green' | 'red' | 'blue' | 'amber';

// Mantém as cores semânticas (verde %, vermelho despesas, azul, laranja/amarelo).
const toneText: Record<Tone, string> = {
  slate: 'text-white',
  green: 'text-emerald-400',
  red: 'text-red-400',
  blue: 'text-brand-300',
  amber: 'text-amber-400',
};

interface StatCardProps {
  label: string;
  value: string;
  tone?: Tone;
  hint?: string;
}

export function StatCard({ label, value, tone = 'slate', hint }: StatCardProps) {
  return (
    <Card className="p-4">
      <div className="text-xs font-medium uppercase tracking-wide text-slate-400">
        {label}
      </div>
      <div className={`mt-1 text-2xl font-semibold ${toneText[tone]}`}>{value}</div>
      {hint && <div className="mt-1 text-xs text-slate-500">{hint}</div>}
    </Card>
  );
}
