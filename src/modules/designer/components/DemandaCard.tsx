import { useEffect, useState } from 'react';
import { Badge } from '@/shared/ui/Badge';
import { diasEntre, hojeLocal, labelMes, mesDaSemana } from '../lib/periodo';
import {
  TIPO_LABEL, formatarDuracao, segundosAberto,
  type DesignerDemanda, type TempoDemanda,
} from '../api/demandasApi';

interface Props {
  d: DesignerDemanda;
  tempo?: TempoDemanda;
  onEditar: (d: DesignerDemanda) => void;
  onDragStart: (id: string) => void;
}

const TIPO_COR: Record<string, 'slate' | 'blue' | 'green' | 'amber' | 'red'> = {
  post: 'blue', carrossel: 'blue', reels: 'red', story: 'amber', web: 'green', extra: 'slate',
};

function diasAte(iso: string | null): { texto: string; tone: 'green' | 'amber' | 'red' | 'slate' } {
  if (!iso) return { texto: 'sem prazo', tone: 'slate' };
  const dias = diasEntre(hojeLocal(), iso);
  if (dias < 0)  return { texto: `atrasada ${Math.abs(dias)}d`, tone: 'red' };
  if (dias === 0) return { texto: 'hoje', tone: 'amber' };
  if (dias <= 2)  return { texto: `${dias}d`, tone: 'amber' };
  return { texto: `${dias}d`, tone: 'green' };
}

// Soma fechados + o registro aberto, atualizando a cada segundo só enquanto roda.
export function useTempoTotal(tempo?: TempoDemanda): number {
  const [, tick] = useState(0);
  const rodando = !!tempo?.aberto && !tempo.aberto.pausado;
  useEffect(() => {
    if (!rodando) return;
    const t = setInterval(() => tick((n) => n + 1), 1000);
    return () => clearInterval(t);
  }, [rodando]);
  if (!tempo) return 0;
  return tempo.segundosFechados + (tempo.aberto ? segundosAberto(tempo.aberto) : 0);
}

export function DemandaCard({ d, tempo, onEditar, onDragStart }: Props) {
  const prazoInfo = d.status === 'concluido' ? { texto: 'entregue', tone: 'green' as const } : diasAte(d.prazo);
  const total = useTempoTotal(tempo);
  const aberto = tempo?.aberto;
  const audios = d.anexos.filter((a) => a.type.startsWith('audio/')).length;
  const arquivos = d.anexos.length - audios;
  const atraso = d.atrasada && d.prazo ? diasEntre(d.prazo.slice(0, 10), hojeLocal()) : 0;
  return (
    <div
      draggable
      onDragStart={(e) => { e.dataTransfer.effectAllowed = 'move'; onDragStart(d.id); }}
      onClick={() => onEditar(d)}
      className={`cursor-pointer rounded-lg border p-3 text-xs ${
        d.atrasada
          ? 'border-red-500/60 bg-red-500/10 hover:bg-red-500/15'
          : 'border-white/10 bg-white/5 hover:border-brand-400/50 hover:bg-white/10'
      }`}
    >
      {d.atrasada && (
        <div className="mb-2 rounded-md bg-red-500/20 px-2 py-1 text-[11px] font-semibold text-red-200">
          ⚠ ATRASADA há {atraso} dia{atraso === 1 ? '' : 's'}
          {d.carregada && d.prazo && (
            <span className="block font-normal text-red-300/80">
              ↪ veio de {labelMes(mesDaSemana(d.prazo.slice(0, 10)))}
            </span>
          )}
        </div>
      )}
      <div className="mb-1 flex items-center gap-2">
        <Badge tone={TIPO_COR[d.tipo] ?? 'slate'}>{TIPO_LABEL[d.tipo]}</Badge>
        {d.origem === 'ideia_aprovada' && <Badge tone="green">ideia</Badge>}
        {d.origem === 'calendario' && <Badge tone="blue">calendário</Badge>}
      </div>
      <p className="font-semibold text-slate-100 line-clamp-2">{d.titulo}</p>
      {d.cliente_nome && (
        <p className="mt-1 truncate text-[11px] text-slate-400">🏢 {d.cliente_nome}</p>
      )}
      {d.descricao && (
        <p className="mt-1 line-clamp-2 text-[11px] text-slate-500">{d.descricao}</p>
      )}
      {(audios > 0 || arquivos > 0) && (
        <p className="mt-1 flex gap-3 text-[11px] text-slate-400">
          {audios > 0 && <span>🎙 {audios} áudio{audios > 1 ? 's' : ''}</span>}
          {arquivos > 0 && <span>📎 {arquivos} anexo{arquivos > 1 ? 's' : ''}</span>}
        </p>
      )}
      {aberto && (
        <div className="mt-2 inline-flex items-center gap-1 rounded-full bg-emerald-500/15 px-2 py-0.5 text-[11px] font-semibold text-emerald-300">
          ⏱ {aberto.quem || 'Alguém'} {aberto.pausado ? 'pausou' : 'está tocando'} · {formatarDuracao(total)}
        </div>
      )}
      {!aberto && total > 0 && (
        <p className="mt-2 text-[11px] text-slate-400">⏱ {formatarDuracao(total)} gastos</p>
      )}
      <div className="mt-2 flex items-center justify-between text-[11px] text-slate-400">
        <span>{d.responsavel_nome ? `👤 ${d.responsavel_nome}` : 'sem responsável'}</span>
        <Badge tone={prazoInfo.tone}>{prazoInfo.texto}</Badge>
      </div>
    </div>
  );
}
