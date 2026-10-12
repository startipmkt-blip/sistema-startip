import { useMemo } from 'react';
import { Card } from '@/shared/ui/Card';
import { Spinner } from '@/shared/ui/Spinner';
import { EmptyState } from '@/shared/ui/EmptyState';
import {
  useDemandas, useTempoDesigner, formatarDuracao, TIPO_LABEL,
  type DesignerDemanda,
} from '../api/demandasApi';

interface Props {
  clienteId?: string | null;
  responsavelId?: string | null;
  q?: string;
  periodo?: { ini: string; fim: string } | null;
  clienteIds?: string[] | null;
  onEditar: (d: DesignerDemanda) => void;
}

// Domingo (data local) da semana do timestamp — mesma convenção do seletor de período.
function semanaChave(iso: string): string {
  const d = new Date(iso);
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() - d.getDay());
  return d.toLocaleDateString('sv-SE');
}

function labelSemana(chave: string): string {
  const d = new Date(`${chave}T00:00:00`);
  const fim = new Date(d);
  fim.setDate(fim.getDate() + 6);
  const f = (x: Date) => x.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' });
  return `Semana de ${f(d)} a ${f(fim)}`;
}

// O que o designer já entregou, por semana, com o tempo real do cronômetro.
export function HistoricoDesigner({ clienteId, responsavelId, q, periodo, clienteIds, onEditar }: Props) {
  const { data, isLoading } = useDemandas({ clienteId, responsavelId, q, periodo, clienteIds });
  const { data: tempos } = useTempoDesigner();

  const semanas = useMemo(() => {
    const mapa = new Map<string, DesignerDemanda[]>();
    for (const d of data ?? []) {
      if (d.status !== 'concluido') continue;
      const k = semanaChave(d.concluido_em ?? d.updated_at);
      (mapa.get(k) ?? mapa.set(k, []).get(k)!).push(d);
    }
    return [...mapa.entries()].sort((a, b) => b[0].localeCompare(a[0]));
  }, [data]);

  if (isLoading) return <Card className="flex justify-center p-10"><Spinner /></Card>;
  if (semanas.length === 0) {
    return <Card><EmptyState message="Nenhuma demanda concluída ainda." /></Card>;
  }

  return (
    <div className="space-y-4">
      {semanas.map(([chave, itens]) => {
        const seg = itens.reduce((a, d) => a + (tempos?.[d.id]?.segundosFechados ?? 0), 0);
        return (
          <Card key={chave} className="p-4">
            <div className="mb-3 flex flex-wrap items-center gap-2 text-xs">
              <span className="rounded-full bg-emerald-500/20 px-3 py-1 font-semibold text-emerald-200">
                ✅ {itens.length}
              </span>
              {seg > 0 && (
                <span className="rounded-full bg-white/10 px-3 py-1 text-slate-200">⏱ {formatarDuracao(seg)}</span>
              )}
              <span className="text-slate-300">{labelSemana(chave)}</span>
            </div>
            <ul className="divide-y divide-white/5">
              {itens.map((d) => {
                const t = tempos?.[d.id]?.segundosFechados ?? 0;
                return (
                  <li key={d.id}>
                    <button
                      onClick={() => onEditar(d)}
                      className="flex w-full items-center justify-between gap-3 py-2 text-left text-sm hover:bg-white/5"
                    >
                      <span className="min-w-0">
                        <span className="block truncate text-slate-100">{d.titulo}</span>
                        <span className="text-xs text-slate-500">
                          {TIPO_LABEL[d.tipo]}{d.cliente_nome ? ` · ${d.cliente_nome}` : ''}
                          {d.responsavel_nome ? ` · 👤 ${d.responsavel_nome}` : ''}
                        </span>
                      </span>
                      <span className="shrink-0 text-right text-xs text-slate-400">
                        <span className="block">
                          {d.concluido_em ? new Date(d.concluido_em).toLocaleDateString('pt-BR') : '—'}
                        </span>
                        {t > 0 && <span className="block text-slate-300">⏱ {formatarDuracao(t)}</span>}
                      </span>
                    </button>
                  </li>
                );
              })}
            </ul>
          </Card>
        );
      })}
    </div>
  );
}
