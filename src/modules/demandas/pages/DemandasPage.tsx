import { useMemo, useState } from 'react';
import { useDemandas, useAtualizarStatusDemanda } from '@/modules/demandas/api/demandasApi';
import {
  DEMANDA_COLUNAS,
  DEMANDA_SETORES,
  PRIORIDADE_LABEL,
  PRIORIDADE_TONE,
  type DemandaSetor,
  type DemandaStatus,
  type DemandaView,
} from '@/modules/demandas/types';
import { DemandaFormModal } from '@/modules/demandas/components/DemandaFormModal';
import { TarefasRecorrentes } from '@/modules/demandas/components/TarefasRecorrentes';
import { useClientes } from '@/modules/clientes/api/clientesApi';
import { useAuth } from '@/shared/auth/AuthProvider';
import { PageHeader } from '@/shared/ui/PageHeader';
import { Select } from '@/shared/ui/Select';
import { Button } from '@/shared/ui/Button';
import { Card } from '@/shared/ui/Card';
import { Spinner } from '@/shared/ui/Spinner';
import { Badge } from '@/shared/ui/Badge';
import { KanbanBoard } from '@/shared/ui/KanbanBoard';
import { EmptyState } from '@/shared/ui/EmptyState';
import { formatDate } from '@/shared/lib/format';

type Aba = 'quadro' | 'concluidas' | 'recorrentes';

// Segunda-feira da semana da data (usada para agrupar concluídas).
function semanaChave(iso: string): string {
  const d = new Date(iso);
  const dia = d.getDay(); // 0=Dom
  const offset = dia === 0 ? -6 : 1 - dia;
  d.setDate(d.getDate() + offset);
  return d.toISOString().slice(0, 10);
}
function labelSemana(iso: string): string {
  const d = new Date(iso);
  const fim = new Date(d); fim.setDate(fim.getDate() + 6);
  return `Semana de ${d.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' })} a ${fim.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' })}`;
}

export function DemandasPage() {
  const { isAdmin } = useAuth();
  const [clienteId, setClienteId] = useState('');
  const { data: demandas, isLoading } = useDemandas(clienteId);
  const { data: clientes } = useClientes('');
  const atualizarStatus = useAtualizarStatusDemanda();
  const [formOpen, setFormOpen] = useState(false);
  const [editando, setEditando] = useState<DemandaView | undefined>();
  const [aba, setAba] = useState<Aba>('quadro');

  const setoresVisiveis = DEMANDA_SETORES.filter((s) => !s.adminOnly || isAdmin);
  const [setor, setSetor] = useState<DemandaSetor>(setoresVisiveis[0]?.id ?? 'geral');

  const clienteOptions = useMemo(
    () => [{ value: '', label: 'Todos os clientes' }, ...(clientes ?? [])
      .filter((c) => c.status === 'ativo')
      .sort((a, b) => a.nome.localeCompare(b.nome))
      .map((c) => ({ value: c.id, label: c.nome }))],
    [clientes],
  );

  const doSetor = useMemo(() => {
    const base = (demandas ?? []).filter((d) => d.setor === setor);
    return isAdmin ? base : base.filter((d) => !d.privada);
  }, [demandas, setor, isAdmin]);

  const quadro   = doSetor.filter((d) => d.status !== 'concluida');
  const concluidas = doSetor.filter((d) => d.status === 'concluida');

  // Agrupamento de concluídas por semana.
  const concluidasPorSemana = useMemo(() => {
    const mapa = new Map<string, DemandaView[]>();
    for (const d of concluidas) {
      const k = semanaChave(d.prazo || d.created_at);
      if (!mapa.has(k)) mapa.set(k, []);
      mapa.get(k)!.push(d);
    }
    return [...mapa.entries()].sort((a, b) => b[0].localeCompare(a[0]));
  }, [concluidas]);

  const CARD = (d: DemandaView) => (
    <button onClick={() => { setEditando(d); setFormOpen(true); }} className="w-full text-left">
      <div className="flex items-start justify-between gap-2">
        <span className="font-medium text-slate-100">
          {d.privada && <span title="Privada">🔒 </span>}
          {d.titulo}
        </span>
        <Badge tone={PRIORIDADE_TONE[d.prioridade]}>{PRIORIDADE_LABEL[d.prioridade]}</Badge>
      </div>
      <div className="text-xs text-slate-400">{d.cliente_nome}</div>
      <div className="mt-1 flex items-center justify-between text-xs text-slate-400">
        <span>👤 {d.responsavel || '—'}</span>
        <span>📅 {formatDate(d.prazo)}</span>
      </div>
    </button>
  );

  return (
    <div className="space-y-6">
      <div className="flex gap-1 border-b border-white/10">
        {([
          { id: 'quadro',      label: 'Quadro (aberta / andamento)' },
          { id: 'concluidas',  label: `Concluídas${concluidas.length ? ` (${concluidas.length})` : ''}` },
          { id: 'recorrentes', label: 'Tarefas recorrentes' },
        ] as const).map((t) => (
          <button
            key={t.id}
            onClick={() => setAba(t.id)}
            className={`border-b-2 px-4 py-2 text-sm font-medium transition-colors ${
              aba === t.id ? 'border-brand-500 text-brand-300' : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {aba === 'recorrentes' ? (
        <TarefasRecorrentes />
      ) : (
        <>
          <PageHeader title="Demandas da equipe" subtitle="Arraste os cards entre as colunas para mudar o status.">
            <Select options={clienteOptions} value={clienteId} onChange={(e) => setClienteId(e.target.value)} />
            <Button onClick={() => { setEditando(undefined); setFormOpen(true); }}>+ Nova demanda</Button>
          </PageHeader>

          {/* Abas por setor */}
          <div className="flex flex-wrap gap-1 border-b border-white/10">
            {setoresVisiveis.map((s) => (
              <button
                key={s.id}
                onClick={() => setSetor(s.id)}
                className={`border-b-2 px-4 py-2 text-sm font-medium transition-colors ${
                  setor === s.id ? 'border-brand-600 text-brand-300' : 'border-transparent text-slate-400 hover:text-slate-100'
                }`}
              >
                {s.label}
                {s.adminOnly && <span className="ml-1" title="Privado dos sócios">🔒</span>}
              </button>
            ))}
          </div>

          {isLoading ? (
            <Card className="flex justify-center p-12"><Spinner /></Card>
          ) : aba === 'quadro' ? (
            <KanbanBoard<DemandaView>
              columns={DEMANDA_COLUNAS.filter((c) => c.id !== 'concluida')}
              items={quadro}
              columnOf={(d) => d.status}
              keyOf={(d) => d.id}
              renderCard={CARD}
              onMove={(d, novaCol) => atualizarStatus.mutate({ id: d.id, status: novaCol as DemandaStatus })}
            />
          ) : concluidas.length === 0 ? (
            <Card><EmptyState message="Nenhuma tarefa concluída neste setor ainda." /></Card>
          ) : (
            <div className="space-y-5">
              {concluidasPorSemana.map(([sem, itens]) => (
                <Card key={sem} className="p-4">
                  <div className="mb-3 flex items-center gap-2 text-xs">
                    <span className="rounded-full bg-emerald-500/20 px-3 py-1 font-semibold text-emerald-200">
                      ✅ {itens.length}
                    </span>
                    <span className="text-slate-300">{labelSemana(sem)}</span>
                  </div>
                  <ul className="divide-y divide-white/5">
                    {itens.map((d) => (
                      <li key={d.id} className="flex items-center justify-between py-2 text-sm">
                        <button onClick={() => { setEditando(d); setFormOpen(true); }} className="min-w-0 flex-1 text-left">
                          <div className="truncate text-slate-100 line-through opacity-70">{d.titulo}</div>
                          <div className="text-xs text-slate-500">{d.cliente_nome} · 👤 {d.responsavel || '—'}</div>
                        </button>
                        <span className="text-xs text-slate-500">📅 {formatDate(d.prazo)}</span>
                      </li>
                    ))}
                  </ul>
                </Card>
              ))}
            </div>
          )}

          {formOpen && (
            <DemandaFormModal open={formOpen} onClose={() => setFormOpen(false)} demanda={editando} />
          )}
        </>
      )}
    </div>
  );
}
