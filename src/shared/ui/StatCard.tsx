import { Card } from '@/shared/ui/Card';
import { GlassIcon, type GlassIconName } from '@/shared/ui/GlassIcon';

type Tone = 'slate' | 'green' | 'red' | 'blue' | 'amber';

// Número grande e neutro; cor só quando carrega significado (verde %, vermelho despesa…).
const toneText: Record<Tone, string> = {
  slate: 'text-white',
  green: 'text-emerald-400',
  red: 'text-red-400',
  blue: 'text-brand-300',
  amber: 'text-amber-400',
};

const toneChip: Record<Tone, string> = {
  slate: 'bg-brand-500/10',
  green: 'bg-emerald-500/10',
  red: 'bg-red-500/10',
  blue: 'bg-brand-500/10',
  amber: 'bg-amber-500/10',
};

// Ícone escolhido pelo nome do indicador, para não precisar mexer em cada tela.
const REGRAS: [RegExp, string][] = [
  [/despes|pagar|custo|gasto/i, 'financeiro'],
  [/client|empresa|conta(s)? ativ/i, 'clientes'],
  [/lead|contato|conversa|whats/i, 'crm'],
  [/roas|roi|cpl|cpa|ctr|convers|taxa|%|cresc/i, 'trending-up'],
  [/receit|mrr|fatur|saldo|lucro|receber|valor|ticket|invest|r\$/i, 'financeiro'],
  [/demanda|tarefa|pendent|abert/i, 'demandas'],
  [/conte[uú]do|post|ideia|stor/i, 'calendar'],
  [/alerta|atras|venc|sem resposta/i, 'bell'],
];

function iconePara(label: string): string {
  return REGRAS.find(([re]) => re.test(label))?.[1] ?? 'bar-chart';
}

interface StatCardProps {
  label: string;
  value: string;
  tone?: Tone;
  hint?: string;
  icon?: GlassIconName | string;
}

export function StatCard({ label, value, tone = 'slate', hint, icon }: StatCardProps) {
  return (
    <Card className="flex flex-col gap-3 p-4">
      <div className="flex items-center gap-2.5">
        <span className={`chip-icone ${toneChip[tone]}`}>
          <GlassIcon name={icon ?? iconePara(label)} className="h-[17px] w-[17px]" />
        </span>
        <span className="text-[13px] font-medium text-slate-400">{label}</span>
      </div>
      <div>
        <div className={`font-display text-2xl font-semibold tracking-tight tabular-nums ${toneText[tone]}`}>{value}</div>
        {hint && <div className="mt-0.5 text-xs text-slate-400">{hint}</div>}
      </div>
    </Card>
  );
}
