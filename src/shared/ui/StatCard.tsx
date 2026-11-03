import { Card } from '@/shared/ui/Card';

type Tone = 'slate' | 'green' | 'red' | 'blue' | 'amber';

// Número grande e neutro; cor só quando carrega significado (verde %, vermelho despesa…).
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
      <div className="text-xs font-medium text-slate-400">{label}</div>
      <div className={`mt-1.5 font-display text-2xl font-semibold tracking-tight ${toneText[tone]}`}>{value}</div>
      {hint && <div className="mt-1 text-xs text-slate-400">{hint}</div>}
    </Card>
  );
}
