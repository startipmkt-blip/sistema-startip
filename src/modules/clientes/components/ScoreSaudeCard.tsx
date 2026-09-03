import { useSaudeCliente, classificarScore } from '@/modules/clientes/api/saudeApi';
import { Card } from '@/shared/ui/Card';
import { Badge } from '@/shared/ui/Badge';
import { Spinner } from '@/shared/ui/Spinner';

interface Props { clienteId: string; }

function Barra({ label, valor, ajuda }: { label: string; valor: number | null; ajuda: string }) {
  const cor = valor == null ? 'bg-slate-600' : valor >= 60 ? 'bg-emerald-500' : valor >= 40 ? 'bg-amber-500' : 'bg-red-500';
  return (
    <div>
      <div className="mb-1 flex items-center justify-between text-xs">
        <span className="text-slate-300">{label}</span>
        <span className="font-mono text-slate-400">{valor == null ? '—' : `${valor}%`}</span>
      </div>
      <div className="h-2 overflow-hidden rounded-full bg-white/5">
        <div className={`h-full ${cor} transition-all`} style={{ width: `${valor ?? 0}%` }} />
      </div>
      <div className="mt-1 text-[10px] text-slate-500">{ajuda}</div>
    </div>
  );
}

export function ScoreSaudeCard({ clienteId }: Props) {
  const { data: saude, isLoading } = useSaudeCliente(clienteId);
  const cls = classificarScore(saude?.score_saude);

  return (
    <Card className="p-5">
      <div className="mb-3 flex items-center gap-2">
        <h3 className="text-sm font-semibold text-slate-200">Score de saúde</h3>
        <Badge tone={cls.tone}>{cls.label}</Badge>
        <span className="ml-auto text-3xl font-semibold text-slate-100">
          {saude?.score_saude ?? '—'}<span className="ml-1 text-sm text-slate-500">/100</span>
        </span>
      </div>
      {isLoading ? <Spinner /> : (
        <div className="grid gap-3 sm:grid-cols-3">
          <Barra label="Contrato"   valor={saude?.score_contrato  ?? null} ajuda="100% se há contrato assinado vigente." />
          <Barra label="Aprovação"  valor={saude?.score_aprovacao ?? null} ajuda="% de conteúdos aprovados nos últimos 90 dias." />
          <Barra label="Suporte"    valor={saude?.score_suporte   ?? null} ajuda="100 − % de solicitações pendentes no CRM." />
        </div>
      )}
      <p className="mt-3 text-[10px] text-slate-500">
        Média simples dos componentes com dados. Barras sem dado ficam neutras e não impactam o score.
      </p>
    </Card>
  );
}
