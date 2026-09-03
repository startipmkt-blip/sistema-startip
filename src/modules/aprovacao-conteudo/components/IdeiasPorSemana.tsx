import type { ReactNode } from 'react';
import { APROVACAO_LABEL, APROVACAO_TONE, type ConteudoIdeia } from '@/modules/aprovacao-conteudo/types';
import { TIPO_LABEL } from '@/modules/conteudo/types';
import { Badge } from '@/shared/ui/Badge';

interface Props {
  ideias: ConteudoIdeia[];
  renderAcoes?: (ideia: ConteudoIdeia) => ReactNode;
}

// Mostra as ideias agrupadas por Semana 1..4.
export function IdeiasPorSemana({ ideias, renderAcoes }: Props) {
  const semanas = [1, 2, 3, 4].filter((s) => ideias.some((i) => i.semana === s));

  return (
    <div className="space-y-5">
      {semanas.map((s) => (
        <div key={s}>
          <div className="mb-2 flex items-center gap-2">
            <span className="rounded-md bg-white/10 px-2 py-1 text-xs font-semibold text-slate-300">
              Semana {s}
            </span>
            <div className="h-px flex-1 bg-white/10" />
          </div>
          <div className="space-y-2">
            {ideias
              .filter((i) => i.semana === s)
              .map((i) => (
                <div key={i.id} className="rounded-md border border-white/10 p-3">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="text-sm font-medium text-slate-100">{i.titulo}</span>
                        <Badge tone="blue">{TIPO_LABEL[i.formato]}</Badge>
                        <Badge tone={APROVACAO_TONE[i.status]}>{APROVACAO_LABEL[i.status]}</Badge>
                      </div>
                      <p className="mt-1 text-xs text-slate-400">{i.descricao}</p>
                      {i.status === 'reprovado' && i.justificativa && (
                        <p className="mt-1 text-xs text-red-400">Motivo: {i.justificativa}</p>
                      )}
                    </div>
                  </div>
                  {renderAcoes && <div className="mt-3">{renderAcoes(i)}</div>}
                </div>
              ))}
          </div>
        </div>
      ))}
    </div>
  );
}
