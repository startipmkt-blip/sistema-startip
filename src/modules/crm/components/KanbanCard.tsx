import type { CrmLead, Etiqueta } from '@/modules/crm/types';
import { Badge } from '@/shared/ui/Badge';

interface Props {
  lead: CrmLead;
  onEtiquetaInfo: (id: string) => Etiqueta;
  onAbrirConversa: () => void;
  onEditar: () => void;
  onConverterCliente: () => void;
}

// Formata "27/08/26 às 21:51" a partir de um ISO date-time.
function formatEntradaCurto(iso: string): string {
  try {
    const d = new Date(iso);
    const dia = d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: '2-digit' });
    const hora = d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
    return `${dia} às ${hora}`;
  } catch {
    return iso;
  }
}

// Formata telefone brasileiro pra ficar mais legível.
// Ex.: "5511988887777" → "+55 11 98888-7777"
// IDs de grupo (`120363XXX-group`) devolvem null — quem chama esconde a linha.
function formatTelefone(t: string | null | undefined): string | null {
  if (!t) return null;
  if (t.endsWith('-group')) return null; // id de grupo, não é telefone
  const s = t.replace(/\D/g, '');
  if (s.length >= 20) return null; // não parece telefone real
  if (s.length === 13 && s.startsWith('55')) {
    return `+${s.slice(0, 2)} ${s.slice(2, 4)} ${s.slice(4, 9)}-${s.slice(9)}`;
  }
  if (s.length === 12 && s.startsWith('55')) {
    return `+${s.slice(0, 2)} ${s.slice(2, 4)} ${s.slice(4, 8)}-${s.slice(8)}`;
  }
  return t;
}

export function KanbanCard({ lead, onEtiquetaInfo, onAbrirConversa, onEditar, onConverterCliente }: Props) {
  const veioWhatsApp = (lead.origem ?? '').toLowerCase().includes('whatsapp');

  return (
    <div className="flex flex-col gap-2">
      {/* Nome e menu */}
      <div className="flex items-start justify-between gap-2">
        <button onClick={onEditar} className="min-w-0 text-left">
          <div className="truncate text-sm font-semibold text-slate-100">
            {lead.nome || <span className="italic text-slate-500">sem nome</span>}
          </div>
          {lead.empresa && (
            <div className="truncate text-xs text-slate-400">{lead.empresa}</div>
          )}
        </button>
      </div>

      {/* Metadados */}
      <div className="space-y-0.5 text-[11px] text-slate-400">
        {lead.created_at && (
          <div>🕒 Entrou em {formatEntradaCurto(lead.created_at)}</div>
        )}
        {(() => {
          const tel = formatTelefone(lead.telefone);
          return tel ? <div>📞 {tel}</div> : null;
        })()}
        {veioWhatsApp && (
          <div className="inline-flex items-center gap-1 rounded bg-emerald-500/15 px-1.5 py-0.5 text-emerald-300">
            <span aria-hidden>🟢</span> WhatsApp
          </div>
        )}
      </div>

      {/* Etiquetas */}
      {lead.etiquetas.length > 0 && (
        <div className="flex flex-wrap gap-1">
          {lead.etiquetas.map((e) => {
            const info = onEtiquetaInfo(e);
            return <Badge key={e} tone={info.tone}>{info.label}</Badge>;
          })}
        </div>
      )}

      {/* Ações principais */}
      <div className="mt-1 flex flex-wrap items-center gap-1.5 border-t border-white/5 pt-2">
        <button
          onClick={(e) => { e.stopPropagation(); onAbrirConversa(); }}
          className="rounded-md bg-brand-500/15 px-2 py-1 text-[11px] font-medium text-brand-200 hover:bg-brand-500/25"
          title="Abrir conversa na aba Atendimento"
        >
          💬 Conversa
        </button>
        <button
          onClick={(e) => { e.stopPropagation(); onConverterCliente(); }}
          className="rounded-md bg-white/5 px-2 py-1 text-[11px] font-medium text-slate-200 hover:bg-white/10"
          title="Cadastrar este contato como cliente da agência"
        >
          ➕ Virar cliente
        </button>
        <span className="ml-auto text-xs font-medium text-emerald-400">
          {lead.valor > 0 ? `R$ ${lead.valor.toLocaleString('pt-BR')}` : ''}
        </span>
      </div>
    </div>
  );
}
