import { useMemo, useState } from 'react';
import { useDemandas, useAtualizarStatusDemanda, useSalvarDemanda } from '@/modules/demandas/api/demandasApi';
import {
  DEMANDA_COLUNAS,
  DEMANDA_SETORES,
  PRIORIDADE_LABEL,
  PRIORIDADE_TONE,
  RESPONSAVEIS,
  type DemandaPrioridade,
  type DemandaSetor,
  type DemandaStatus,
  type DemandaView,
} from '@/modules/demandas/types';
import { useTocadoresAtivos, type Tocador } from '@/modules/demandas/api/cronometroApi';
import { TocadorModal } from '@/modules/demandas/components/TocadorModal';
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
import { GlassIcon, glassify } from '@/shared/ui/GlassIcon';
import { Linkify } from '@/shared/ui/Linkify';

type Aba = 'quadro' | 'concluidas' | 'recorrentes';

// Segunda-feira da semana da data (usada para agrupar concluídas).
function semanaChave(iso: string): string {
  const d = new Date(iso);
  const dia = d.getDay(); // 0=Dom
  const offset = dia === 0 ? -6 : 1 - dia;
  d.setDate(d.getDate() + offset);
  return d.toISOString().slice(0, 10);
}
type FiltroRapido = 'todas' | 'hoje' | 'atrasadas';
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
  const salvar = useSalvarDemanda();
  const hoje = new Date().toLocaleDateString('sv-SE');
  const [busca, setBusca] = useState('');
  const [responsavel, setResponsavel] = useState('');
  const [rapido, setRapido] = useState<FiltroRapido>('todas');
  const [prioridade, setPrioridade] = useState<DemandaPrioridade | ''>('');
  const [rapida, setRapida] = useState('');
  const [formOpen, setFormOpen] = useState(false);
  const [editando, setEditando] = useState<DemandaView | undefined>();
  const [aba, setAba] = useState<Aba>('quadro');
  // Demanda aguardando a escolha de quem vai tocá-la (antes de ir para "Em andamento").
  const [iniciando, setIniciando] = useState<DemandaView | null>(null);
  const { data: tocadores } = useTocadoresAtivos();

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
    const termo = busca.trim().toLowerCase();
    let base = (demandas ?? []).filter((d) => d.setor === setor);
    if (!isAdmin) base = base.filter((d) => !d.privada);
    if (responsavel) base = base.filter((d) => d.responsavel === responsavel);
    if (termo) {
      base = base.filter((d) =>
        `${d.titulo} ${d.descricao} ${d.cliente_nome} ${d.responsavel}`.toLowerCase().includes(termo),
      );
    }
    if (prioridade) base = base.filter((d) => d.prioridade === prioridade);
    return base;
  }, [demandas, setor, isAdmin, busca, responsavel, prioridade]);

  const atrasadasCount = doSetor.filter((d) => d.status !== 'concluida' && !!d.prazo && d.prazo < hoje).length;
  const hojeCount = doSetor.filter((d) => d.status !== 'concluida' && d.prazo === hoje).length;
  const filtradas = useMemo(() => {
    if (rapido === 'hoje') return doSetor.filter((d) => d.prazo === hoje);
    if (rapido === 'atrasadas') return doSetor.filter((d) => d.status !== 'concluida' && !!d.prazo && d.prazo < hoje);
    return doSetor;
  }, [doSetor, rapido, hoje]);

  const quadro   = filtradas.filter((d) => d.status !== 'concluida');
  const concluidas = filtradas.filter((d) => d.status === 'concluida');

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

  function avisarCronometro(r: { cronometroErro?: string } | undefined) {
    if (r?.cronometroErro) {
      alert(`A demanda foi atualizada, mas o cronômetro não acompanhou:\n\n${r.cronometroErro}`);
    }
  }

  function mover(d: DemandaView, status: DemandaStatus) {
    atualizarStatus.mutate(
      { id: d.id, status, titulo: d.titulo, de: d.status },
      { onSuccess: avisarCronometro },
    );
  }

  function concluir(d: DemandaView) {
    mover(d, 'concluida');
  }

  // Ir para "Em andamento" exige escolher quem toca; as outras colunas movem direto.
  function aoMover(d: DemandaView, novaCol: string) {
    if (novaCol === 'fazendo') setIniciando(d);
    else mover(d, novaCol as DemandaStatus);
  }

  function confirmarInicio(tocador: Tocador) {
    const d = iniciando;
    if (!d) return;
    setIniciando(null);
    atualizarStatus.mutate(
      { id: d.id, status: 'fazendo', titulo: d.titulo, de: d.status, tocador },
      { onSuccess: avisarCronometro },
    );
  }

  function criarRapida() {
    const titulo = rapida.trim();
    if (!titulo) return;
    salvar.mutate(
      {
        dados: {
          cliente_id: clienteId || null,
          setor,
          privada: setor === 'socios',
          titulo,
          descricao: '',
          responsavel: '',
          prioridade: 'media',
          status: 'aberta',
          prazo: hoje,
        },
      },
      { onSuccess: () => setRapida('') },
    );
  }

  const CARD = (d: DemandaView) => {
    const atrasada = !!d.prazo && d.prazo < hoje;
    const venceHoje = d.prazo === hoje;
    return (
      <div className="flex items-start gap-2">
        <button
          type="button"
          onClick={() => concluir(d)}
          title="Marcar como concluída"
          aria-label={`Concluir ${d.titulo}`}
          className="mt-0.5 h-5 w-5 shrink-0 rounded-full border border-slate-500 transition-colors hover:border-emerald-400 hover:bg-emerald-500/20"
        />
        <button onClick={() => { setEditando(d); setFormOpen(true); }} className="min-w-0 flex-1 text-left">
          <div className="flex items-start justify-between gap-2">
            <span className="text-[13px] font-medium leading-snug text-slate-100">
              {d.privada && <span title="Privada"><GlassIcon name="lock" /> </span>}
              {d.titulo}
            </span>
            <Badge tone={PRIORIDADE_TONE[d.prioridade]} className="shrink-0 !px-2 !py-0 text-[10px]">{PRIORIDADE_LABEL[d.prioridade]}</Badge>
          </div>
          {d.descricao && (
            <p className="mt-0.5 line-clamp-2 whitespace-pre-wrap text-[11px] leading-snug text-slate-300"><Linkify texto={d.descricao} /></p>
          )}
          <div className="text-[11px] text-slate-400">{d.cliente_nome}</div>
          {tocadores?.[d.id] && (
            <div className="mt-1 inline-flex items-center gap-1 rounded-full bg-emerald-500/15 px-2 py-0.5 text-[11px] font-semibold text-emerald-300">
              <GlassIcon name="timer" /> {tocadores[d.id]} está tocando
            </div>
          )}
          <div className="mt-1 flex items-center justify-between text-[11px] text-slate-400">
            <span><GlassIcon name="user" /> {d.responsavel || '—'}</span>
            <span className={atrasada ? 'font-semibold text-red-400' : venceHoje ? 'font-semibold text-amber-300' : ''}>
              {glassify(atrasada ? '⚠ ' : '📅 ')}{formatDate(d.prazo)}
            </span>
          </div>
          <div className="mt-0.5 text-[10px] text-slate-500" title="Data em que a demanda foi criada">
            Criada em {formatDate(d.created_at)}
          </div>
        </button>
      </div>
    );
  };

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
          <PageHeader title="Demandas da equipe" subtitle="Arraste os cards entre as colunas ou clique no círculo para concluir.">
            <Select options={clienteOptions} value={clienteId} onChange={(e) => setClienteId(e.target.value)} />
            <Button onClick={() => { setEditando(undefined); setFormOpen(true); }}>+ Nova demanda</Button>
          </PageHeader>

          <div className="flex flex-wrap items-center gap-2">
            <input
              value={busca}
              onChange={(e) => setBusca(e.target.value)}
              placeholder="Buscar por título, cliente ou responsável"
              className="w-72 rounded-md border border-white/10 bg-white/5 px-3 py-2 text-sm text-slate-100 placeholder:text-slate-500 focus:border-brand-400 focus:outline-none"
            />
            <Select
              options={[{ value: '', label: 'Todos os responsáveis' }, ...RESPONSAVEIS.map((r) => ({ value: r, label: r }))]}
              value={responsavel}
              onChange={(e) => setResponsavel(e.target.value)}
            />
            <input
              value={rapida}
              onChange={(e) => setRapida(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') criarRapida(); }}
              disabled={salvar.isPending}
              placeholder="＋ Criação rápida: digite e aperte Enter"
              className="min-w-[260px] flex-1 rounded-md border border-white/10 bg-white/5 px-3 py-2 text-sm text-slate-100 placeholder:text-slate-500 focus:border-brand-400 focus:outline-none"
            />
            <Select
              options={[
                { value: '', label: 'Toda importância' },
                { value: 'alta', label: 'Importância alta' },
                { value: 'media', label: 'Importância média' },
                { value: 'baixa', label: 'Importância baixa' },
              ]}
              value={prioridade}
              onChange={(e) => setPrioridade(e.target.value as DemandaPrioridade | '')}
            />
          </div>

          <div className="flex flex-wrap items-center gap-1.5">
            {([
              { id: 'todas',     label: 'Todas',          n: null,           cor: '' },
              { id: 'hoje',      label: 'Do dia',         n: hojeCount,      cor: 'amber' },
              { id: 'atrasadas', label: 'Atrasadas',      n: atrasadasCount, cor: 'red' },
            ] as const).map((f) => {
              const ativo = rapido === f.id;
              const tom = f.cor === 'red'
                ? 'border-red-500/60 bg-red-500/20 text-red-200'
                : f.cor === 'amber'
                  ? 'border-amber-400/60 bg-amber-500/20 text-amber-200'
                  : 'border-brand-400 bg-brand-500/20 text-brand-100';
              return (
                <button
                  key={f.id}
                  type="button"
                  onClick={() => setRapido(f.id)}
                  className={`rounded-full border px-3 py-1 text-xs font-medium transition-colors ${
                    ativo ? tom : 'border-white/10 bg-white/5 text-slate-300 hover:bg-white/10'
                  }`}
                >
                  {f.label}{f.n !== null ? ` · ${f.n}` : ''}
                </button>
              );
            })}
          </div>

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
                {s.adminOnly && <span className="ml-1" title="Privado dos sócios"><GlassIcon name="lock" /></span>}
              </button>
            ))}
          </div>

          {isLoading ? (
            <Card className="flex justify-center p-12"><Spinner /></Card>
          ) : aba === 'quadro' ? (
            <KanbanBoard<DemandaView>
              columns={DEMANDA_COLUNAS.filter((c) => c.id !== 'concluida' && (setor === 'socios' || !c.socios_only))}
              items={quadro}
              columnOf={(d) => d.status}
              keyOf={(d) => d.id}
              renderCard={CARD}
              onMove={aoMover}
              compact
            />
          ) : concluidas.length === 0 ? (
            <Card><EmptyState message="Nenhuma tarefa concluída neste setor ainda." /></Card>
          ) : (
            <div className="space-y-5">
              {concluidasPorSemana.map(([sem, itens]) => (
                <Card key={sem} className="p-4">
                  <div className="mb-3 flex items-center gap-2 text-xs">
                    <span className="rounded-full bg-emerald-500/20 px-3 py-1 font-semibold text-emerald-200">
                      <GlassIcon name="check-circle" /> {itens.length}
                    </span>
                    <span className="text-slate-300">{labelSemana(sem)}</span>
                  </div>
                  <ul className="divide-y divide-white/5">
                    {itens.map((d) => (
                      <li key={d.id} className="flex items-center justify-between py-2 text-sm">
                        <button onClick={() => { setEditando(d); setFormOpen(true); }} className="min-w-0 flex-1 text-left">
                          <div className="truncate text-slate-100 line-through opacity-70">{d.titulo}</div>
                          <div className="text-xs text-slate-500">{d.cliente_nome} · <GlassIcon name="user" /> {d.responsavel || '—'} · criada em {formatDate(d.created_at)}</div>
                        </button>
                        <span className="text-xs text-slate-500"><GlassIcon name="calendar" /> {formatDate(d.prazo)}</span>
                        <button
                          type="button"
                          onClick={() => mover(d, 'aberta')}
                          title="Reabrir demanda"
                          className="ml-3 rounded-md border border-white/10 px-2 py-1 text-xs text-slate-300 hover:bg-white/10"
                        >
                          ↩ Reabrir
                        </button>
                      </li>
                    ))}
                  </ul>
                </Card>
              ))}
            </div>
          )}

          {formOpen && (
            <DemandaFormModal
              open={formOpen}
              onClose={() => setFormOpen(false)}
              demanda={editando}
              setorInicial={setor}
            />
          )}

          {iniciando && (
            <TocadorModal
              titulo={iniciando.titulo}
              onEscolher={confirmarInicio}
              onCancelar={() => setIniciando(null)}
            />
          )}
        </>
      )}
    </div>
  );
}
