import { useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useSolicitacoes, useMudarStatusSolicitacao, useRemoverSolicitacao, useSolicitacoesRealtime, type SolicitacaoStatus } from '@/modules/crm/api/solicitacoesApi';
import { pillarInfo, PILLAR_KEYS } from '@/shared/lib/pillars';
import { Button } from '@/shared/ui/Button';
import { Badge } from '@/shared/ui/Badge';
import { Spinner } from '@/shared/ui/Spinner';
import { EmptyState } from '@/shared/ui/EmptyState';

const STATUS_TABS: { id: SolicitacaoStatus | 'todas'; label: string }[] = [
  { id: 'pendente',     label: 'Pendentes' },
  { id: 'em_andamento', label: 'Em andamento' },
  { id: 'concluida',    label: 'Concluídas' },
  { id: 'todas',        label: 'Todas' },
];

function tempoAtras(iso: string): string {
  const ms = Date.now() - new Date(iso).getTime();
  const min = Math.floor(ms / 60_000);
  if (min < 1) return 'agora';
  if (min < 60) return `há ${min}min`;
  const h = Math.floor(min / 60);
  if (h < 24) return `há ${h}h`;
  const d = Math.floor(h / 24);
  return `há ${d}d`;
}

export function SolicitacoesTab({ onAbrirConversa }: { onAbrirConversa: (leadId: string) => void }) {
  useSolicitacoesRealtime();

  const [aba, setAba] = useState<SolicitacaoStatus | 'todas'>('pendente');
  const [pilarFiltro, setPilarFiltro] = useState<string>('');
  const [busca, setBusca] = useState('');
  const { data: solicitacoes, isLoading } = useSolicitacoes(aba);
  const mudarStatus = useMudarStatusSolicitacao();
  const remover = useRemoverSolicitacao();
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [_sp, setSp] = useSearchParams();

  const filtradas = useMemo(() => {
    const q = busca.trim().toLowerCase();
    return (solicitacoes ?? []).filter((s) => {
      if (pilarFiltro && s.pilar !== pilarFiltro) return false;
      if (!q) return true;
      return (s.lead_nome?.toLowerCase() ?? '').includes(q) || s.texto.toLowerCase().includes(q);
    });
  }, [solicitacoes, busca, pilarFiltro]);

  // Agrupa por lead pra mostrar ranking "Solicitações por empresa".
  const porEmpresa = useMemo(() => {
    const m = new Map<string, { lead_id: string; nome: string; pilar: string | null; n: number; maisAntiga: string }>();
    for (const s of solicitacoes ?? []) {
      if (s.status !== 'pendente') continue;
      const cur = m.get(s.lead_id);
      if (cur) { cur.n += 1; if (s.origem_em < cur.maisAntiga) cur.maisAntiga = s.origem_em; }
      else m.set(s.lead_id, { lead_id: s.lead_id, nome: s.lead_nome ?? '—', pilar: s.pilar, n: 1, maisAntiga: s.origem_em });
    }
    return [...m.values()].sort((a, b) => b.n - a.n).slice(0, 8);
  }, [solicitacoes]);

  return (
    <div className="flex h-full min-h-0 flex-col gap-3 p-3">
      {/* Header + filtros */}
      <div className="flex flex-wrap items-center gap-2">
        <h2 className="mr-auto text-lg font-semibold text-slate-100">Solicitações · Agente Turbo</h2>
        <div className="flex items-center gap-1 rounded-md bg-white/5 p-1">
          {STATUS_TABS.map((t) => (
            <button
              key={t.id}
              onClick={() => setAba(t.id)}
              className={`rounded px-3 py-1 text-xs ${aba === t.id ? 'bg-brand-500 text-white' : 'text-slate-300 hover:bg-white/5'}`}
            >
              {t.label}
            </button>
          ))}
        </div>
        <select
          value={pilarFiltro}
          onChange={(e) => setPilarFiltro(e.target.value)}
          className="rounded-md border border-white/10 bg-slate-800 px-2 py-1 text-xs text-slate-100 [color-scheme:dark]"
        >
          <option value="">Todos os pilares</option>
          {PILLAR_KEYS.map((k) => <option key={k} value={k}>{pillarInfo(k).label}</option>)}
        </select>
        <input
          type="text"
          value={busca}
          onChange={(e) => setBusca(e.target.value)}
          placeholder="Buscar empresa ou texto…"
          className="w-48 rounded-md border border-white/10 bg-white/5 px-3 py-1 text-xs text-slate-100 placeholder:text-slate-500 focus:border-brand-400 focus:outline-none"
        />
      </div>

      {/* Ranking empresas pendentes */}
      {porEmpresa.length > 0 && (
        <section className="rounded-md border border-white/10 bg-white/[0.02] p-2">
          <h3 className="mb-2 text-xs font-semibold uppercase tracking-wider text-slate-500">Ranking · empresas com solicitações pendentes</h3>
          <ul className="flex flex-wrap gap-2">
            {porEmpresa.map((e) => {
              const p = pillarInfo(e.pilar);
              return (
                <li key={e.lead_id}>
                  <button
                    onClick={() => { onAbrirConversa(e.lead_id); setSp({ tab: 'atendimento', leadId: e.lead_id }); }}
                    className="flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs text-slate-200 hover:bg-white/10"
                  >
                    <span aria-hidden>{p.icone}</span>
                    <span className="max-w-40 truncate font-medium">{e.nome}</span>
                    <span className="rounded-full bg-red-500/20 px-1.5 text-red-200">{e.n}</span>
                    <span className="text-[10px] text-slate-500">pendente {tempoAtras(e.maisAntiga)}</span>
                  </button>
                </li>
              );
            })}
          </ul>
        </section>
      )}

      {/* Tabela */}
      <div className="min-h-0 flex-1 overflow-y-auto rounded-md border border-white/10">
        {isLoading ? (
          <div className="flex justify-center py-10"><Spinner /></div>
        ) : filtradas.length === 0 ? (
          <EmptyState message="Nenhuma solicitação nesse filtro. Ative 'Monitorar Agente' num grupo para começar." />
        ) : (
          <table className="w-full text-sm">
            <thead className="sticky top-0 bg-slate-900/95 text-left text-xs text-slate-400">
              <tr>
                <th className="p-2">Empresa</th>
                <th className="p-2">Demanda</th>
                <th className="p-2 w-24">Quando</th>
                <th className="p-2 w-40 text-right">Ações</th>
              </tr>
            </thead>
            <tbody>
              {filtradas.map((s) => {
                const p = pillarInfo(s.pilar);
                return (
                  <tr key={s.id} className="border-t border-white/5 hover:bg-white/[0.02]">
                    <td className="p-2 align-top">
                      <button
                        onClick={() => onAbrirConversa(s.lead_id)}
                        className="flex items-center gap-1 text-left text-brand-300 hover:underline"
                      >
                        <span aria-hidden>{p.icone}</span>
                        <span className="truncate font-medium">{s.lead_nome ?? '—'}</span>
                      </button>
                      {s.pilar && <div className="text-[10px] text-slate-500">{p.label}</div>}
                    </td>
                    <td className="p-2 align-top text-slate-200">
                      <div className="whitespace-pre-wrap break-words">{s.texto}</div>
                      {s.status !== 'pendente' && (
                        <Badge tone={s.status === 'concluida' ? 'green' : s.status === 'descartada' ? 'slate' : 'amber'}>
                          {s.status}
                        </Badge>
                      )}
                    </td>
                    <td className="p-2 align-top text-xs text-slate-400" title={new Date(s.origem_em).toLocaleString('pt-BR')}>
                      {tempoAtras(s.origem_em)}
                    </td>
                    <td className="p-2 align-top">
                      <div className="flex justify-end gap-1">
                        {s.status !== 'concluida' && (
                          <Button
                            variant="secondary"
                            onClick={() => mudarStatus.mutate({ id: s.id, status: 'concluida' })}
                          >
                            ✓ Concluir
                          </Button>
                        )}
                        {s.status === 'pendente' && (
                          <Button
                            variant="secondary"
                            onClick={() => mudarStatus.mutate({ id: s.id, status: 'em_andamento' })}
                          >
                            ⏳ Em andamento
                          </Button>
                        )}
                        <button
                          onClick={() => remover.mutate(s.id)}
                          className="rounded-md px-2 text-xs text-red-300 hover:bg-red-500/10"
                          title="Remover"
                        >
                          🗑️
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
