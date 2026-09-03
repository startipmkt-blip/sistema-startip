import type { FiltroInbox } from '@/modules/crm/types';
import type { Operador } from '@/modules/crm/api/atendimentoApi';
import { usePushDesktop } from '@/modules/crm/hooks/useInboxBadge';

interface Props {
  filtro: FiltroInbox;
  atendente: string | 'todas' | 'nao_atribuidas';
  operadores: Operador[];
  contagens: Record<FiltroInbox, number>;
  meuId?: string | null;
  onFiltro: (f: FiltroInbox) => void;
  onAtendente: (a: string | 'todas' | 'nao_atribuidas') => void;
}

const FILTROS: { id: FiltroInbox; label: string; icone: string }[] = [
  { id: 'todas',        label: 'Todas',              icone: '📥' },
  { id: 'nao_lidas',    label: 'Não lidas',          icone: '🟢' },
  { id: 'fixadas',      label: 'Fixadas',            icone: '📌' },
  { id: 'grupos',       label: 'Grupos',             icone: '👥' },
  { id: 'sem_resposta', label: 'Sem resposta 3+ dias', icone: '⏰' },
  { id: 'arquivadas',   label: 'Arquivadas',         icone: '📦' },
];

export function InboxSidebar({
  filtro, atendente, operadores, contagens, meuId, onFiltro, onAtendente,
}: Props) {
  const push = usePushDesktop();
  return (
    <aside className="hidden w-56 shrink-0 flex-col gap-6 border-r border-white/5 pr-3 sm:flex">
      {/* Categorias */}
      <div>
        <h3 className="mb-2 text-xs font-semibold uppercase tracking-wider text-slate-500">
          Categorias
        </h3>
        <ul className="space-y-0.5">
          {FILTROS.map((f) => {
            const ativo = filtro === f.id;
            const n = contagens[f.id] ?? 0;
            return (
              <li key={f.id}>
                <button
                  onClick={() => onFiltro(f.id)}
                  className={`flex w-full items-center justify-between rounded-md px-2 py-1.5 text-left text-sm transition-colors ${
                    ativo ? 'bg-brand-500/15 text-brand-200' : 'text-slate-300 hover:bg-white/5'
                  }`}
                >
                  <span className="flex items-center gap-2">
                    <span aria-hidden>{f.icone}</span>
                    <span>{f.label}</span>
                  </span>
                  {n > 0 && (
                    <span
                      className={`min-w-5 rounded-full px-1.5 text-center text-[10px] font-semibold ${
                        f.id === 'nao_lidas'
                          ? 'bg-emerald-500/20 text-emerald-300'
                          : 'bg-white/10 text-slate-300'
                      }`}
                    >
                      {n}
                    </span>
                  )}
                </button>
              </li>
            );
          })}
        </ul>
      </div>

      {/* Atendente */}
      <div>
        <h3 className="mb-2 text-xs font-semibold uppercase tracking-wider text-slate-500">
          Atendente
        </h3>
        <ul className="space-y-0.5">
          {(
            [
              { id: 'todas' as const, label: 'Todos' },
              { id: 'nao_atribuidas' as const, label: 'Não atribuídas' },
              ...(meuId ? [{ id: meuId, label: 'Minhas conversas' }] : []),
              ...operadores.filter((o) => o.id !== meuId).map((o) => ({ id: o.id, label: o.nome })),
            ] as { id: string; label: string }[]
          ).map((o) => {
            const ativo = atendente === o.id;
            return (
              <li key={o.id}>
                <button
                  onClick={() => onAtendente(o.id as string | 'todas' | 'nao_atribuidas')}
                  className={`flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-sm transition-colors ${
                    ativo ? 'bg-brand-500/15 text-brand-200' : 'text-slate-300 hover:bg-white/5'
                  }`}
                >
                  <span
                    className={`h-2 w-2 rounded-full ${
                      o.id === 'nao_atribuidas'
                        ? 'bg-slate-500'
                        : o.id === 'todas'
                          ? 'bg-brand-400'
                          : 'bg-emerald-400'
                    }`}
                    aria-hidden
                  />
                  <span className="truncate">{o.label}</span>
                </button>
              </li>
            );
          })}
        </ul>
      </div>

      {/* Push desktop */}
      <div className="mt-auto">
        <h3 className="mb-2 text-xs font-semibold uppercase tracking-wider text-slate-500">
          Alertas
        </h3>
        {push.estado === 'nao-suportado' && (
          <p className="text-[11px] text-slate-500">Este navegador não suporta notificações.</p>
        )}
        {push.estado === 'pedido-recusado' && (
          <p className="text-[11px] text-slate-500">
            Notificações bloqueadas nas permissões do navegador.
          </p>
        )}
        {push.estado === 'desligado' && (
          <button
            onClick={() => push.ligar()}
            className="flex w-full items-center gap-2 rounded-md border border-brand-500/30 bg-brand-500/10 px-2 py-1.5 text-xs text-brand-200 hover:bg-brand-500/20"
          >
            🔔 Ativar alertas do desktop
          </button>
        )}
        {push.estado === 'ligado' && (
          <button
            onClick={() => push.desligar()}
            className="flex w-full items-center gap-2 rounded-md border border-white/10 bg-white/5 px-2 py-1.5 text-xs text-slate-300 hover:bg-white/10"
          >
            🔕 Desligar alertas do desktop
          </button>
        )}
      </div>
    </aside>
  );
}
