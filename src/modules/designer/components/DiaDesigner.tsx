import { useMemo, useState } from 'react';
import { Card } from '@/shared/ui/Card';
import { Input } from '@/shared/ui/Input';
import { Spinner } from '@/shared/ui/Spinner';
import { EmptyState } from '@/shared/ui/EmptyState';
import {
  useDemandas, useTempoDesigner, formatarDuracao, TIPO_LABEL,
  type DesignerDemanda, type DesignerCategoria,
} from '../api/demandasApi';
import { hojeLocal } from '../lib/periodo';
import { GlassIcon, glassify } from '@/shared/ui/GlassIcon';

interface Props {
  clienteId?: string | null;
  responsavelId?: string | null;
  q?: string;
  clienteIds?: string[] | null;
  categoria?: DesignerCategoria | null;
  onEditar: (d: DesignerDemanda) => void;
}

const diaLocal = (iso: string | null) => (iso ? new Date(iso).toLocaleDateString('sv-SE') : '');
const hora = (iso: string | null) =>
  iso ? new Date(iso).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }) : '—';

function Lista({ titulo, icone, itens, campo, tempos, onEditar }: {
  titulo: string; icone: 'timer' | 'check-circle'; itens: DesignerDemanda[];
  campo: 'iniciado_em' | 'concluido_em';
  tempos: ReturnType<typeof useTempoDesigner>['data'];
  onEditar: (d: DesignerDemanda) => void;
}) {
  return (
    <Card className="p-4">
      <div className="mb-3 flex items-center gap-2 text-sm font-semibold text-slate-100">
        <GlassIcon name={icone} /> {titulo}
        <span className="rounded-full bg-white/10 px-2 py-0.5 text-xs">{itens.length}</span>
      </div>
      {itens.length === 0 ? (
        <EmptyState message="Nenhuma demanda neste dia." />
      ) : (
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
                    <span className="text-xs text-slate-400">
                      {TIPO_LABEL[d.tipo]}{d.cliente_nome ? ` · ${d.cliente_nome}` : ''}
                      {glassify(d.responsavel_nome ? ` · 👤 ${d.responsavel_nome}` : '')}
                    </span>
                  </span>
                  <span className="shrink-0 text-right text-xs text-slate-400">
                    <span className="block">{hora(d[campo])}</span>
                    {t > 0 && <span className="block text-slate-300"><GlassIcon name="timer" /> {formatarDuracao(t)}</span>}
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </Card>
  );
}

// Produção de um dia específico: o que foi tocado (iniciado) e o que foi finalizado.
export function DiaDesigner({ clienteId, responsavelId, q, clienteIds, categoria, onEditar }: Props) {
  const [dia, setDia] = useState(hojeLocal());
  // Sem período: o dia escolhido vale mesmo fora da semana aberta no quadro.
  const { data, isLoading } = useDemandas({ clienteId, responsavelId, q, periodo: null, clienteIds, categoria });
  const { data: tempos } = useTempoDesigner();

  const r = useMemo(() => {
    const lista = data ?? [];
    const ordena = (campo: 'iniciado_em' | 'concluido_em') => (a: DesignerDemanda, b: DesignerDemanda) =>
      (a[campo] ?? '').localeCompare(b[campo] ?? '');
    return {
      tocadas: lista.filter((d) => diaLocal(d.iniciado_em) === dia).sort(ordena('iniciado_em')),
      finalizadas: lista.filter((d) => d.status === 'concluido' && diaLocal(d.concluido_em) === dia).sort(ordena('concluido_em')),
    };
  }, [data, dia]);

  return (
    <div className="space-y-3">
      <Card className="flex flex-wrap items-center gap-3 p-3">
        <label className="text-xs text-slate-300" htmlFor="dia-designer">Dia</label>
        <Input id="dia-designer" type="date" value={dia} max={hojeLocal()} onChange={(e) => e.target.value && setDia(e.target.value)} className="w-44" />
        <button
          type="button"
          onClick={() => setDia(hojeLocal())}
          className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs text-slate-300 hover:bg-white/10"
        >Hoje</button>
        <div className="ml-auto flex gap-2 text-xs">
          <span className="rounded-full bg-blue-500/20 px-3 py-1 font-semibold text-blue-200">{r.tocadas.length} tocada(s)</span>
          <span className="rounded-full bg-emerald-500/20 px-3 py-1 font-semibold text-emerald-200">{r.finalizadas.length} finalizada(s)</span>
        </div>
      </Card>

      {isLoading ? (
        <Card className="flex justify-center p-10"><Spinner /></Card>
      ) : (
        <div className="grid gap-3 lg:grid-cols-2">
          <Lista titulo="Tocadas (iniciadas) no dia" icone="timer" itens={r.tocadas} campo="iniciado_em" tempos={tempos} onEditar={onEditar} />
          <Lista titulo="Finalizadas no dia" icone="check-circle" itens={r.finalizadas} campo="concluido_em" tempos={tempos} onEditar={onEditar} />
        </div>
      )}
    </div>
  );
}
