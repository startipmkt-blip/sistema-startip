import type { CrmConversa } from '@/modules/crm/types';
import { ETAPAS_ATIVAS } from '@/modules/crm/types';
import { pillarInfo } from '@/shared/lib/pillars';
import { EmptyState } from '@/shared/ui/EmptyState';
import { Spinner } from '@/shared/ui/Spinner';

const TRES_DIAS_MS = 3 * 24 * 60 * 60 * 1000;

function precisaFollowUp(c: CrmConversa): number {
  if (c.arquivado) return 0;
  if (!ETAPAS_ATIVAS.includes(c.etapa as (typeof ETAPAS_ATIVAS)[number])) return 0;
  if (!c.ultima_saida_em) return 0;
  const diff = Date.now() - new Date(c.ultima_saida_em).getTime();
  if (diff < TRES_DIAS_MS) return 0;
  return Math.floor(diff / (24 * 60 * 60 * 1000));
}

interface Props {
  conversas: CrmConversa[];
  isLoading: boolean;
  buscaTexto: string;
  selecionadaId: string | null;
  onBuscar: (q: string) => void;
  onSelecionar: (leadId: string) => void;
}

function inicial(nome: string): string {
  const partes = (nome || '?').trim().split(/\s+/);
  const first = partes[0]?.[0] ?? '?';
  const second = partes.length > 1 ? partes[partes.length - 1][0] : '';
  return (first + second).toUpperCase();
}

function tempoRelativo(iso: string | null): string {
  if (!iso) return '';
  const diffMs = Date.now() - new Date(iso).getTime();
  const min = Math.floor(diffMs / 60_000);
  if (min < 1) return 'agora';
  if (min < 60) return `${min}m`;
  const h = Math.floor(min / 60);
  if (h < 24) return `${h}h`;
  const d = Math.floor(h / 24);
  if (d < 7) return `${d}d`;
  return new Date(iso).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
}

export function InboxLista({
  conversas, isLoading, buscaTexto, selecionadaId, onBuscar, onSelecionar,
}: Props) {
  return (
    <div className="flex w-full min-w-0 flex-col md:w-96">
      {/* Busca */}
      <div className="mb-2 px-1">
        <div className="relative">
          <input
            type="text"
            placeholder="Buscar por nome, telefone…"
            value={buscaTexto}
            onChange={(e) => onBuscar(e.target.value)}
            className="w-full rounded-md border border-white/10 bg-white/5 px-8 py-2 text-sm text-slate-100 placeholder:text-slate-500 focus:border-brand-400 focus:outline-none"
          />
          <span className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-500">🔍</span>
        </div>
      </div>

      {/* Lista */}
      <div className="flex-1 overflow-y-auto pr-1">
        {isLoading ? (
          <div className="flex justify-center p-10"><Spinner /></div>
        ) : conversas.length === 0 ? (
          <EmptyState message="Nenhuma conversa neste filtro." />
        ) : (
          <ul className="space-y-1">
            {conversas.map((c) => {
              const ativo = c.id === selecionadaId;
              return (
                <li key={c.id}>
                  <button
                    onClick={() => onSelecionar(c.id)}
                    className={`flex w-full items-start gap-3 rounded-lg border px-3 py-2.5 text-left transition-colors ${
                      ativo
                        ? 'border-brand-500/40 bg-brand-500/10'
                        : 'border-transparent hover:border-white/10 hover:bg-white/[0.03]'
                    }`}
                  >
                    {c.foto_url ? (
                      <img
                        src={c.foto_url}
                        alt=""
                        loading="lazy"
                        onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = 'none'; }}
                        className="h-10 w-10 shrink-0 rounded-full border border-white/10 object-cover"
                      />
                    ) : (
                      <div
                        className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-xs font-semibold ${
                          c.is_grupo
                            ? 'bg-amber-500/15 text-amber-300'
                            : 'bg-brand-500/15 text-brand-200'
                        }`}
                      >
                        {c.is_grupo ? '👥' : inicial(c.nome)}
                      </div>
                    )}
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex min-w-0 items-center gap-1.5">
                          {c.fixado && <span className="text-[10px] text-amber-300" title="Fixada">📌</span>}
                          <span className="truncate text-sm font-medium text-slate-100">{c.nome}</span>
                        </div>
                        <span className="shrink-0 text-[11px] text-slate-500">{tempoRelativo(c.ultima_em)}</span>
                      </div>
                      <div className="mt-0.5 flex items-center justify-between gap-2">
                        <span className="truncate text-xs text-slate-400">
                          {c.ultima_direcao === 'enviada' && '↗ '}
                          {c.ultima_mensagem ?? <span className="italic text-slate-500">sem mensagens</span>}
                        </span>
                        {c.nao_lidas > 0 && (
                          <span className="shrink-0 rounded-full bg-emerald-500 px-1.5 text-[10px] font-semibold text-white">
                            {c.nao_lidas > 99 ? '99+' : c.nao_lidas}
                          </span>
                        )}
                      </div>
                      {c.atendente_nome && (
                        <div className="mt-0.5 truncate text-[10px] text-slate-500">👤 {c.atendente_nome}</div>
                      )}
                      {c.pilar && (() => {
                        const p = pillarInfo(c.pilar);
                        return (
                          <div className="mt-0.5 inline-flex items-center gap-1 text-[10px] text-slate-500">
                            <span aria-hidden>{p.icone}</span>
                            <span>{p.label}</span>
                          </div>
                        );
                      })()}
                      {(() => {
                        const dias = precisaFollowUp(c);
                        if (!dias) return null;
                        return (
                          <div className="mt-0.5 inline-flex items-center gap-1 rounded-full bg-amber-500/15 px-1.5 py-0.5 text-[10px] font-medium text-amber-300">
                            ⏰ Follow-up {dias}d
                          </div>
                        );
                      })()}
                    </div>
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
}
