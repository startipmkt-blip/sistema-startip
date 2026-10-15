import { useEffect, useState } from 'react';
import { diasEntre, hojeLocal, labelMes, mesDaSemana } from '../lib/periodo';
import {
  TIPO_LABEL, formatarDuracao, segundosAberto,
  type DesignerDemanda, type TempoDemanda,
} from '../api/demandasApi';
import { GlassIcon } from '@/shared/ui/GlassIcon';
import { LogoCliente } from '@/shared/ui/LogoCliente';

interface Props {
  d: DesignerDemanda;
  tempo?: TempoDemanda;
  onEditar: (d: DesignerDemanda) => void;
  onDragStart: (id: string) => void;
}

// Etiquetas no estilo Trello: cor cheia por tipo de peça.
const TIPO_ETIQUETA: Record<string, string> = {
  post: 'bg-blue-600 text-blue-50',
  carrossel: 'bg-purple-600 text-purple-50',
  reels: 'bg-pink-600 text-pink-50',
  story: 'bg-amber-500 text-amber-950',
  web: 'bg-emerald-600 text-emerald-50',
  extra: 'bg-slate-500 text-slate-50',
};
const ETIQUETA = 'rounded px-1.5 py-0.5 text-[10px] font-semibold leading-4';

const diaMes = (iso: string) => `${iso.slice(8, 10)}/${iso.slice(5, 7)}`;

function prazoChip(d: DesignerDemanda): { texto: string; cls: string } | null {
  if (!d.prazo) return null;
  const texto = diaMes(d.prazo);
  if (d.status === 'concluido') return { texto, cls: 'bg-emerald-600 text-emerald-50' };
  const dias = diasEntre(hojeLocal(), d.prazo);
  if (dias < 0) return { texto, cls: 'bg-red-600 text-red-50' };
  if (dias <= 2) return { texto: dias === 0 ? `${texto} · hoje` : texto, cls: 'bg-amber-500 text-amber-950' };
  return { texto, cls: 'text-slate-400' };
}

function iniciais(nome: string): string {
  const p = nome.trim().split(/\s+/);
  return ((p[0]?.[0] ?? '') + (p.length > 1 ? p[p.length - 1][0] : '')).toUpperCase();
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

/** Reprovada pelo cliente e ainda não refeita (voltou para aprovação = aviso some). */
export const reprovadaPeloCliente = (d: DesignerDemanda) =>
  !!d.reprovado_em && (d.status === 'a_fazer' || d.status === 'em_andamento');

export function DemandaCard({ d, tempo, onEditar, onDragStart }: Props) {
  const prazo = prazoChip(d);
  const total = useTempoTotal(tempo);
  const aberto = tempo?.aberto;
  const audios = d.anexos.filter((a) => a.type.startsWith('audio/')).length;
  const arquivos = d.anexos.length - audios;
  const atraso = d.atrasada && d.prazo ? diasEntre(d.prazo.slice(0, 10), hojeLocal()) : 0;
  const temTexto = !!(d.descricao || d.briefing);
  const reprovada = reprovadaPeloCliente(d);
  return (
    <div
      draggable
      onDragStart={(e) => { e.dataTransfer.effectAllowed = 'move'; onDragStart(d.id); }}
      onClick={() => onEditar(d)}
      className={`cursor-pointer rounded-lg bg-slate-800 px-3 py-2 shadow-md ring-1 hover:ring-2 hover:ring-brand-400/70 ${
        d.atrasada || reprovada ? 'ring-red-500/70' : 'ring-white/10'
      }`}
    >
      <div className="mb-1.5 flex flex-wrap gap-1">
        <span className={`${ETIQUETA} ${TIPO_ETIQUETA[d.tipo] ?? TIPO_ETIQUETA.extra}`}>{TIPO_LABEL[d.tipo]}</span>
        {reprovada && <span className={`${ETIQUETA} bg-red-600 text-red-50`}>↩ Reprovado pelo cliente</span>}
        {d.atrasada && <span className={`${ETIQUETA} bg-red-600 text-red-50`}>Atrasada {atraso}d</span>}
        {d.origem === 'ideia_aprovada' && <span className={`${ETIQUETA} bg-emerald-600 text-emerald-50`}>Ideia</span>}
        {d.origem === 'calendario' && <span className={`${ETIQUETA} bg-sky-600 text-sky-50`}>Calendário</span>}
      </div>

      <p className="text-sm leading-snug text-slate-100 line-clamp-3">{d.titulo}</p>
      {d.cliente_nome && (
        <p className="mt-1 flex items-center gap-1.5 text-[11px] text-slate-400">
          {d.cliente_logo && <LogoCliente src={d.cliente_logo} alt="" className="h-4 w-4 shrink-0 rounded-full object-cover" />}
          <span className="truncate">{d.cliente_nome}</span>
        </p>
      )}
      {reprovada && d.reprovado_justificativa && (
        <p className="mt-1.5 rounded bg-red-500/10 p-1.5 text-[11px] leading-snug text-red-200 line-clamp-4">
          <strong>Refazer:</strong> {d.reprovado_justificativa}
        </p>
      )}
      {d.carregada && d.prazo && (
        <p className="mt-0.5 text-[11px] text-red-300">↪ veio de {labelMes(mesDaSemana(d.prazo.slice(0, 10)))}</p>
      )}

      {aberto && (
        <div className="mt-1.5 inline-flex items-center gap-1 rounded-full bg-emerald-500/15 px-2 py-0.5 text-[11px] font-semibold text-emerald-300">
          <GlassIcon name="timer" /> {aberto.quem || 'Alguém'} {aberto.pausado ? 'pausou' : 'está tocando'} · {formatarDuracao(total)}
        </div>
      )}

      <div className="mt-2 flex min-h-6 items-center gap-2.5 text-[11px] text-slate-400">
        {prazo && (
          <span className={`inline-flex items-center gap-1 rounded px-1 py-0.5 ${prazo.cls}`} title="Prazo">
            <GlassIcon name="clock" /> {prazo.texto}
          </span>
        )}
        {temTexto && <span title="Tem descrição ou briefing"><GlassIcon name="note" /></span>}
        {audios > 0 && <span title="Briefing em áudio"><GlassIcon name="mic" /> {audios}</span>}
        {arquivos > 0 && <span title="Anexos"><GlassIcon name="paperclip" /> {arquivos}</span>}
        {!aberto && total > 0 && <span title="Tempo gasto"><GlassIcon name="timer" /> {formatarDuracao(total)}</span>}
        {d.responsavel_nome && (
          <span
            title={d.responsavel_nome}
            className="ml-auto flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-brand-500/30 text-[10px] font-bold text-brand-100"
          >
            {iniciais(d.responsavel_nome)}
          </span>
        )}
      </div>
    </div>
  );
}
