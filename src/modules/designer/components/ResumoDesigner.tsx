import { useMemo } from 'react';
import { Card } from '@/shared/ui/Card';
import {
  useDemandas, useTempoDesigner, formatarDuracao, segundosAberto, TIPO_LABEL,
} from '../api/demandasApi';
import { useTempoTotal } from './DemandaCard';

function inicioDaSemana(): Date {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() + (d.getDay() === 0 ? -6 : 1 - d.getDay()));
  return d;
}

function LinhaFazendo({ titulo, cliente, quem, tempo }: {
  titulo: string; cliente: string | null; quem: string;
  tempo?: Parameters<typeof useTempoTotal>[0];
}) {
  const total = useTempoTotal(tempo);
  return (
    <li className="flex items-center justify-between gap-2 text-xs">
      <span className="min-w-0 truncate text-slate-100">
        <span className="font-semibold">{titulo}</span>
        {cliente && <span className="text-slate-400"> · {cliente}</span>}
      </span>
      <span className="shrink-0 rounded-full bg-emerald-500/15 px-2 py-0.5 font-semibold text-emerald-300">
        ⏱ {quem || '—'} · {formatarDuracao(total)}
      </span>
    </li>
  );
}

// Visão rápida: o que está sendo feito agora, o que falta e o que já saiu na semana.
export function ResumoDesigner() {
  const { data: demandas } = useDemandas();
  const { data: tempos } = useTempoDesigner();

  const r = useMemo(() => {
    const lista = demandas ?? [];
    const semana = inicioDaSemana();
    const feitasSemana = lista.filter(
      (d) => d.status === 'concluido' && d.concluido_em && new Date(d.concluido_em) >= semana,
    );
    let segSemana = 0;
    for (const d of feitasSemana) {
      const t = tempos?.[d.id];
      if (t) segSemana += t.segundosFechados + (t.aberto ? segundosAberto(t.aberto) : 0);
    }
    return {
      fazendo: lista.filter((d) => d.status === 'em_andamento'),
      fila: lista.filter((d) => d.status === 'a_fazer'),
      aprovacao: lista.filter((d) => d.status === 'aprovacao').length,
      feitasSemana: feitasSemana.length,
      segSemana,
    };
  }, [demandas, tempos]);

  return (
    <Card className="space-y-3 p-3">
      <div className="grid gap-2 text-center sm:grid-cols-4">
        <div className="rounded-lg bg-blue-500/10 p-2">
          <div className="text-lg font-bold text-blue-300">{r.fazendo.length}</div>
          <div className="text-[11px] text-slate-400">🎨 fazendo agora</div>
        </div>
        <div className="rounded-lg bg-white/5 p-2">
          <div className="text-lg font-bold text-slate-100">{r.fila.length}</div>
          <div className="text-[11px] text-slate-400">📥 na fila</div>
        </div>
        <div className="rounded-lg bg-amber-500/10 p-2">
          <div className="text-lg font-bold text-amber-300">{r.aprovacao}</div>
          <div className="text-[11px] text-slate-400">👀 aguardando aprovação</div>
        </div>
        <div className="rounded-lg bg-emerald-500/10 p-2">
          <div className="text-lg font-bold text-emerald-300">{r.feitasSemana}</div>
          <div className="text-[11px] text-slate-400">
            ✅ feitas na semana{r.segSemana > 0 && ` · ${formatarDuracao(r.segSemana)}`}
          </div>
        </div>
      </div>

      {r.fazendo.length > 0 && (
        <ul className="space-y-1.5 border-t border-white/10 pt-2">
          {r.fazendo.map((d) => (
            <LinhaFazendo
              key={d.id}
              titulo={`${TIPO_LABEL[d.tipo]} · ${d.titulo}`}
              cliente={d.cliente_nome ?? null}
              quem={tempos?.[d.id]?.aberto?.quem ?? d.responsavel_nome ?? ''}
              tempo={tempos?.[d.id]}
            />
          ))}
        </ul>
      )}
    </Card>
  );
}
