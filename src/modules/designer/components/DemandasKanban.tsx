import { temInformacao } from '../lib/material';
import { useMemo, useState } from 'react';
import { Card } from '@/shared/ui/Card';
import { Spinner } from '@/shared/ui/Spinner';
import {
  useDemandas, useMoverStatus, useTempoDesigner, STATUS_COLUNAS,
  type DesignerDemanda, type DesignerStatus,
} from '../api/demandasApi';
import { DemandaCard } from './DemandaCard';
import { GlassIcon } from '@/shared/ui/GlassIcon';

interface Props {
  clienteId?: string | null;
  responsavelId?: string | null;
  q?: string;
  periodo?: { ini: string; fim: string } | null;
  clienteIds?: string[] | null;
  onEditar: (d: DesignerDemanda) => void;
  onNova: (status: DesignerStatus) => void;
  /** Gera as demandas da semana a partir da meta de cada cliente (coluna A fazer). */
  onGerarSemana?: () => void;
}

export function DemandasKanban({ clienteId, responsavelId, q, periodo, clienteIds, onEditar, onNova, onGerarSemana }: Props) {
  const { data, isLoading } = useDemandas({ clienteId, responsavelId, q, periodo, clienteIds });
  const { data: tempos } = useTempoDesigner();
  const mover = useMoverStatus();
  const [arrastando, setArrastando] = useState<string | null>(null);
  const [dropAlvo, setDropAlvo] = useState<DesignerStatus | null>(null);

  const porStatus = useMemo(() => {
    const m: Record<DesignerStatus, DesignerDemanda[]> = { a_fazer: [], alteracao: [], em_andamento: [], aprovacao: [], concluido: [] };
    for (const d of data ?? []) m[d.status].push(d);
    // Com informação para o designer vem primeiro; a ordem original é mantida dentro de cada grupo.
    for (const k of Object.keys(m) as DesignerStatus[]) {
      m[k] = m[k]
        .map((d, i) => ({ d, i, p: temInformacao(d) ? 0 : 1 }))
        .sort((a, b) => a.p - b.p || a.i - b.i)
        .map((x) => x.d);
    }
    return m;
  }, [data]);

  if (isLoading) return <Card className="flex justify-center p-10"><Spinner /></Card>;

  function handleDrop(status: DesignerStatus) {
    const d = (data ?? []).find((x) => x.id === arrastando);
    setArrastando(null);
    setDropAlvo(null);
    if (!d || d.status === status) return;
    mover.mutate(
      {
        id: d.id, status, titulo: d.titulo, de: d.status,
        iniciado_em: d.iniciado_em, responsavel_nome: d.responsavel_nome ?? null,
      },
      {
        onSuccess: (r) => {
          if (r?.cronometroErro) {
            alert(`A demanda foi movida, mas o cronômetro não acompanhou:\n\n${r.cronometroErro}`);
          }
        },
      },
    );
  }

  // Quadro estilo Trello: listas de largura fixa lado a lado, rolagem horizontal.
  return (
    <div className="flex items-start gap-3 overflow-x-auto pb-3">
      {STATUS_COLUNAS.map((col) => {
        const itens = porStatus[col.id];
        const highlighted = dropAlvo === col.id;
        return (
          <div
            key={col.id}
            onDragOver={(e) => { e.preventDefault(); setDropAlvo(col.id); }}
            onDragLeave={() => setDropAlvo((v) => v === col.id ? null : v)}
            onDrop={() => handleDrop(col.id)}
            className={`flex max-h-[75vh] w-72 shrink-0 flex-col rounded-xl bg-slate-900/80 transition-shadow ${
              highlighted ? 'ring-2 ring-brand-400' : 'ring-1 ring-white/10'
            }`}
          >
            <div className="flex items-center justify-between px-3 pb-2 pt-3">
              <h3 className="text-sm font-semibold text-slate-100">
                <span className="mr-1.5"><GlassIcon emoji={col.emoji} /></span>{col.label}
              </h3>
              <span className="text-xs text-slate-400">{itens.length}</span>
            </div>
            <div className="min-h-[2.5rem] flex-1 space-y-2 overflow-y-auto px-2 py-0.5">
              {itens.map((d) => (
                <DemandaCard key={d.id} d={d} tempo={tempos?.[d.id]} onEditar={onEditar} onDragStart={setArrastando} />
              ))}
            </div>
            <button
              type="button"
              onClick={() => onNova(col.id)}
              className="m-2 flex items-center gap-1.5 rounded-lg px-2 py-1.5 text-left text-sm text-slate-400 hover:bg-white/10 hover:text-slate-200"
            >
              <GlassIcon name="plus" /> Adicionar um cartão
            </button>
            {col.id === 'a_fazer' && onGerarSemana && (
              <button
                type="button"
                onClick={onGerarSemana}
                className="mx-2 mb-2 flex items-center gap-1.5 rounded-lg border border-dashed border-brand-400/40 px-2 py-1.5 text-left text-sm text-brand-200 hover:bg-brand-500/10"
              >
                <GlassIcon name="sparkles" /> Gerar semana (todos os clientes)
              </button>
            )}
          </div>
        );
      })}
    </div>
  );
}
