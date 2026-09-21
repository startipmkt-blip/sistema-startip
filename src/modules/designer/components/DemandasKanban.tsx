import { useMemo, useState } from 'react';
import { Card } from '@/shared/ui/Card';
import { Spinner } from '@/shared/ui/Spinner';
import {
  useDemandas, useMoverStatus, STATUS_COLUNAS,
  type DesignerDemanda, type DesignerStatus,
} from '../api/demandasApi';
import { DemandaCard } from './DemandaCard';

interface Props {
  clienteId?: string | null;
  responsavelId?: string | null;
  q?: string;
  onEditar: (d: DesignerDemanda) => void;
}

export function DemandasKanban({ clienteId, responsavelId, q, onEditar }: Props) {
  const { data, isLoading } = useDemandas({ clienteId, responsavelId, q });
  const mover = useMoverStatus();
  const [arrastando, setArrastando] = useState<string | null>(null);
  const [dropAlvo, setDropAlvo] = useState<DesignerStatus | null>(null);

  const porStatus = useMemo(() => {
    const m: Record<DesignerStatus, DesignerDemanda[]> = { a_fazer: [], em_andamento: [], aprovacao: [], concluido: [] };
    for (const d of data ?? []) m[d.status].push(d);
    return m;
  }, [data]);

  if (isLoading) return <Card className="flex justify-center p-10"><Spinner /></Card>;

  function handleDrop(status: DesignerStatus) {
    if (arrastando) mover.mutate({ id: arrastando, status });
    setArrastando(null);
    setDropAlvo(null);
  }

  return (
    <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
      {STATUS_COLUNAS.map((col) => {
        const itens = porStatus[col.id];
        const highlighted = dropAlvo === col.id;
        return (
          <div
            key={col.id}
            onDragOver={(e) => { e.preventDefault(); setDropAlvo(col.id); }}
            onDragLeave={() => setDropAlvo((v) => v === col.id ? null : v)}
            onDrop={() => handleDrop(col.id)}
            className={`flex flex-col rounded-xl border p-3 transition-colors ${
              highlighted ? 'border-brand-400 bg-brand-500/10' : 'border-white/10 bg-white/5'
            }`}
          >
            <div className="mb-3 flex items-center justify-between">
              <h3 className="text-sm font-semibold text-slate-100">
                <span className="mr-1">{col.emoji}</span>{col.label}
              </h3>
              <span className="rounded-full bg-white/10 px-2 py-0.5 text-[10px] text-slate-300">{itens.length}</span>
            </div>
            <div className="space-y-2">
              {itens.length === 0 ? (
                <p className="rounded-md border border-dashed border-white/10 p-4 text-center text-[11px] text-slate-500">
                  vazio
                </p>
              ) : (
                itens.map((d) => (
                  <DemandaCard key={d.id} d={d} onEditar={onEditar} onDragStart={setArrastando} />
                ))
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
