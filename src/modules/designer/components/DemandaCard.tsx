import { Badge } from '@/shared/ui/Badge';
import { TIPO_LABEL, type DesignerDemanda } from '../api/demandasApi';

interface Props {
  d: DesignerDemanda;
  onEditar: (d: DesignerDemanda) => void;
  onDragStart: (id: string) => void;
}

const TIPO_COR: Record<string, 'slate' | 'blue' | 'green' | 'amber' | 'red'> = {
  post: 'blue', carrossel: 'blue', reels: 'red', story: 'amber', web: 'green', extra: 'slate',
};

function diasAte(iso: string | null): { texto: string; tone: 'green' | 'amber' | 'red' | 'slate' } {
  if (!iso) return { texto: 'sem prazo', tone: 'slate' };
  const dias = Math.floor((new Date(iso).getTime() - Date.now()) / (24 * 3600 * 1000));
  if (dias < 0)  return { texto: `atrasada ${Math.abs(dias)}d`, tone: 'red' };
  if (dias === 0) return { texto: 'hoje', tone: 'amber' };
  if (dias <= 2)  return { texto: `${dias}d`, tone: 'amber' };
  return { texto: `${dias}d`, tone: 'green' };
}

export function DemandaCard({ d, onEditar, onDragStart }: Props) {
  const prazoInfo = diasAte(d.prazo);
  return (
    <div
      draggable
      onDragStart={(e) => { e.dataTransfer.effectAllowed = 'move'; onDragStart(d.id); }}
      onClick={() => onEditar(d)}
      className="cursor-pointer rounded-lg border border-white/10 bg-white/5 p-3 text-xs hover:border-brand-400/50 hover:bg-white/10"
    >
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
      <div className="mt-2 flex items-center justify-between text-[11px] text-slate-400">
        <span>{d.responsavel_nome ? `👤 ${d.responsavel_nome}` : 'sem responsável'}</span>
        <Badge tone={prazoInfo.tone}>{prazoInfo.texto}</Badge>
      </div>
    </div>
  );
}
