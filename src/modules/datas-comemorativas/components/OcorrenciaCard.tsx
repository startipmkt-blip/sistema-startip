import type { ReactNode } from 'react';
import { Badge } from '@/shared/ui/Badge';
import { formatarData } from '@/modules/datas-comemorativas/lib/recorrencia';
import {
  PRIORIDADE_LABEL, PRIORIDADE_TONE, STATUS_LABEL, STATUS_TONE, type IsoDate, type Ocorrencia,
} from '@/modules/datas-comemorativas/types';

interface Props {
  ocorrencia: Ocorrencia;
  hoje: IsoDate;
  acoes?: ReactNode;
  etiquetas?: ReactNode;
}

export function OcorrenciaCard({ ocorrencia: o, hoje, acoes, etiquetas }: Props) {
  const passada = o.status === 'passada';
  return (
    <article
      className={`flex gap-3 rounded-2xl border p-4 ${
        passada
          ? 'border-white/5 bg-white/[0.015] opacity-70'
          : o.prioridade === 'muito_alta'
            ? 'border-red-500/30 bg-red-500/[0.04]'
            : 'border-white/10 bg-white/[0.03]'
      }`}
    >
      <div className="flex w-14 shrink-0 flex-col items-center rounded-xl border border-white/10 bg-slate-900/60 py-2 text-center">
        <span className="text-xl font-bold leading-none text-white">{o.data.slice(8, 10)}</span>
        <span className="mt-1 text-[10px] font-semibold uppercase text-brand-300">
          {formatarData(o.data, { month: 'short' }).replace('.', '')}
        </span>
        <span className="text-[10px] text-slate-500">{formatarData(o.data, { weekday: 'short' }).replace('.', '')}</span>
      </div>

      <div className="min-w-0 flex-1 space-y-2">
        <div>
          <h3 className="text-sm font-semibold text-slate-100">{o.base.nome}</h3>
          {o.base.categoria && <p className="text-[11px] text-slate-500">{o.base.categoria}</p>}
        </div>

        <div className="flex flex-wrap gap-1.5">
          <Badge tone={STATUS_TONE[o.status]}>{passada ? 'Passada · histórico' : STATUS_LABEL[o.status]}</Badge>
          <Badge tone={PRIORIDADE_TONE[o.prioridade]}>Prioridade: {PRIORIDADE_LABEL[o.prioridade]}</Badge>
          {o.base.opcional && <Badge tone="slate">Opcional</Badge>}
          {etiquetas}
        </div>

        {o.item.relevancia && <p className="text-xs leading-relaxed text-slate-300">{o.item.relevancia}</p>}
        {o.base.observacao && <p className="text-xs italic leading-relaxed text-slate-400">{o.base.observacao}</p>}

        {o.angulos.length > 0 && (
          <div>
            <div className="mb-1 text-[10px] font-semibold uppercase tracking-wider text-slate-500">Possíveis ângulos</div>
            <div className="flex flex-wrap gap-1.5">
              {o.angulos.map((a) => (
                <span key={a} className="rounded-full border border-white/10 bg-white/5 px-2 py-0.5 text-[11px] text-slate-300">{a}</span>
              ))}
            </div>
          </div>
        )}

        {o.marcos.length > 0 && (
          <div>
            <div className="mb-1 text-[10px] font-semibold uppercase tracking-wider text-slate-500">Planejamento</div>
            <ol className="space-y-1">
              {o.marcos.map((m) => {
                const feito = m.data < hoje;
                const atual = !feito && m.data <= hoje;
                return (
                  <li key={m.data + m.titulo} className="flex items-center gap-2 text-[11px]">
                    <span className={`h-1.5 w-1.5 shrink-0 rounded-full ${feito ? 'bg-emerald-400' : atual ? 'bg-amber-400' : 'bg-slate-600'}`} />
                    <span className={`w-11 shrink-0 tabular-nums ${feito ? 'text-slate-500' : 'text-slate-300'}`}>
                      {formatarData(m.data, { day: '2-digit', month: '2-digit' })}
                    </span>
                    <span className={feito ? 'text-slate-500 line-through' : 'text-slate-200'}>{m.titulo}</span>
                  </li>
                );
              })}
              <li className="flex items-center gap-2 text-[11px]">
                <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-brand-400" />
                <span className="w-11 shrink-0 tabular-nums text-slate-300">{formatarData(o.data, { day: '2-digit', month: '2-digit' })}</span>
                <span className="font-semibold text-slate-100">{o.base.nome}</span>
              </li>
            </ol>
          </div>
        )}

        {acoes && <div className="flex flex-wrap items-center justify-end gap-3 pt-1">{acoes}</div>}
      </div>
    </article>
  );
}
