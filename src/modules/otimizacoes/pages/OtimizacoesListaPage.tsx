import { Link } from 'react-router-dom';
import { PageHeader } from '@/shared/ui/PageHeader';
import { Card } from '@/shared/ui/Card';
import { Badge } from '@/shared/ui/Badge';
import { CLIENTES_OTIMIZACAO } from '../clientes';
import { useContagemMesAtual } from '../api/otimizacoesApi';
import { MESES_PT, fmtDia } from '../utils';

export function OtimizacoesListaPage() {
  const { data: contagem } = useContagemMesAtual();
  const hoje = new Date();
  const mesLabel = `${MESES_PT[hoje.getMonth()]} ${hoje.getFullYear()}`;

  return (
    <div className="space-y-4 p-4">
      <PageHeader
        title="📈 Otimização de Campanhas"
        subtitle={`Registro diário de tudo que foi otimizado em cada conta. Mês atual: ${mesLabel}.`}
      />

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {CLIENTES_OTIMIZACAO.map((c) => {
          const info = contagem?.[c.slug];
          const total = info?.total ?? 0;
          const ultima = info?.ultima ? fmtDia(info.ultima) : null;
          return (
            <Link key={c.slug} to={`/otimizacoes/${c.slug}`} className="block">
              <Card className="p-4 transition hover:border-brand-400/40 hover:bg-white/10">
                <div className="flex items-start justify-between gap-2">
                  <h3 className="text-base font-semibold text-white">{c.nome}</h3>
                  {total > 0 ? (
                    <Badge tone="green">{total} no mês</Badge>
                  ) : (
                    <Badge tone="slate">sem registro</Badge>
                  )}
                </div>
                <p className="mt-2 text-xs text-slate-400">
                  {ultima
                    ? `Última otimização: ${ultima.dia}/${ultima.mesAbrev} (${ultima.diaSemana})`
                    : 'Nenhuma otimização registrada este mês.'}
                </p>
              </Card>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
