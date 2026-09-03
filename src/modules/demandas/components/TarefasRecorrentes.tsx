import { useState } from 'react';
import {
  useRecorrentes,
  useConcluirRecorrente,
  useExcluirRecorrente,
  pendenteHoje,
  ehParaHoje,
  hojeStr,
  recorrenciaLabel,
  estaAtrasada,
  type TarefaRecorrente,
} from '@/modules/demandas/recorrentesApi';
import { TarefaRecorrenteModal } from '@/modules/demandas/components/TarefaRecorrenteModal';
import { Card } from '@/shared/ui/Card';
import { Button } from '@/shared/ui/Button';
import { Badge } from '@/shared/ui/Badge';
import { Spinner } from '@/shared/ui/Spinner';
import { EmptyState } from '@/shared/ui/EmptyState';

export function TarefasRecorrentes() {
  const { data: tarefas, isLoading } = useRecorrentes();
  const concluir = useConcluirRecorrente();
  const excluir = useExcluirRecorrente();
  const [formOpen, setFormOpen] = useState(false);
  const [editando, setEditando] = useState<TarefaRecorrente | undefined>();

  if (isLoading) return <Card className="flex justify-center p-12"><Spinner /></Card>;

  const lista = tarefas ?? [];
  const paraHoje = lista.filter(pendenteHoje);

  function abrirNova() { setEditando(undefined); setFormOpen(true); }
  function abrirEditar(t: TarefaRecorrente) { setEditando(t); setFormOpen(true); }

  const linha = (t: TarefaRecorrente) => {
    const pend = pendenteHoje(t);
    const feitaHoje = ehParaHoje(t) && t.ultima_conclusao === hojeStr();
    const atrasada = estaAtrasada(t);
    return (
      <li key={t.id} className={`flex items-center justify-between gap-3 py-3 ${atrasada ? 'rounded-md bg-red-500/5 px-2' : ''}`}>
        <button
          onClick={() => concluir.mutate({ id: t.id, concluir: !feitaHoje })}
          className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full border text-xs ${
            feitaHoje ? 'border-emerald-500/40 bg-emerald-500/20 text-emerald-300' : 'border-white/20 text-transparent hover:border-brand-400'
          }`}
          title={ehParaHoje(t) ? (feitaHoje ? 'Desfazer' : 'Concluir') : 'Só no dia da recorrência'}
          disabled={!ehParaHoje(t)}
        >
          ✓
        </button>
        <div className="min-w-0 flex-1">
          <div className={`text-sm ${feitaHoje ? 'text-slate-500 line-through' : atrasada ? 'text-red-300' : 'text-slate-100'}`}>{t.titulo}</div>
          <div className={`text-xs ${atrasada ? 'text-red-400' : 'text-slate-400'}`}>
            {recorrenciaLabel(t)}{t.responsavel ? ` · ${t.responsavel}` : ''}
          </div>
        </div>
        {atrasada ? <Badge tone="red">⏰ atrasada</Badge> : pend && <Badge tone="amber">hoje</Badge>}
        <button className="text-xs font-medium text-brand-300 hover:underline" onClick={() => abrirEditar(t)}>Editar</button>
        <button className="text-xs font-medium text-red-400 hover:underline" onClick={() => { if (confirm('Excluir?')) excluir.mutate(t.id); }}>Excluir</button>
      </li>
    );
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <p className="text-sm text-slate-400">Tarefas que se repetem (todo dia ou num dia fixo da semana) — para todos os setores.</p>
        <Button onClick={abrirNova}>+ Nova recorrente</Button>
      </div>

      <Card className="p-5">
        <h2 className="mb-1 text-sm font-semibold text-slate-100">✅ Para hoje</h2>
        {paraHoje.length === 0 ? (
          <EmptyState message="Nada pendente para hoje. Bom trabalho!" />
        ) : (
          <ul className="divide-y divide-white/5">{paraHoje.map(linha)}</ul>
        )}
      </Card>

      <Card className="p-5">
        <h2 className="mb-1 text-sm font-semibold text-slate-100">Todas as recorrentes</h2>
        {lista.length === 0 ? (
          <EmptyState message="Nenhuma tarefa recorrente. Crie a primeira." />
        ) : (
          <ul className="divide-y divide-white/5">{lista.map(linha)}</ul>
        )}
      </Card>

      {formOpen && <TarefaRecorrenteModal open={formOpen} onClose={() => setFormOpen(false)} tarefa={editando} />}
    </div>
  );
}
