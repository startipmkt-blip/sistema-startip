import { useMemo, useState } from 'react';
import { useAnotacoes, useMarcarFeita } from '@/modules/anotacoes/api/anotacoesApi';
import { AnotacaoFormModal } from '@/modules/anotacoes/components/AnotacaoFormModal';
import { CriacaoRapida } from '@/modules/anotacoes/components/CriacaoRapida';
import { PRIORIDADE_LABEL, PRIORIDADE_TONE, type AnotacaoPrioridade, type AnotacaoView } from '@/modules/anotacoes/types';
import { useClientes } from '@/modules/clientes/api/clientesApi';
import { useAuth } from '@/shared/auth/AuthProvider';
import { PageHeader } from '@/shared/ui/PageHeader';
import { Button } from '@/shared/ui/Button';
import { Card } from '@/shared/ui/Card';
import { Badge } from '@/shared/ui/Badge';
import { Select } from '@/shared/ui/Select';
import { Spinner } from '@/shared/ui/Spinner';
import { EmptyState } from '@/shared/ui/EmptyState';

type Aba = 'pendentes' | 'feitas';

function diasAte(iso: string | null): number | null {
  if (!iso) return null;
  const d = new Date(iso); d.setHours(23, 59, 59, 999);
  return Math.floor((d.getTime() - Date.now()) / (24 * 60 * 60 * 1000));
}

export function AnotacoesPage() {
  const { data: anotacoes, isLoading } = useAnotacoes('');
  const { data: clientes } = useClientes('');
  const marcar = useMarcarFeita();
  const { profile } = useAuth();

  const [aba, setAba] = useState<Aba>('pendentes');
  const [clienteFiltro, setClienteFiltro] = useState('');
  const [autorFiltro, setAutorFiltro] = useState('');
  const [prioFiltro, setPrioFiltro] = useState('');
  const [busca, setBusca] = useState('');
  const [formOpen, setFormOpen] = useState(false);
  const [editando, setEditando] = useState<AnotacaoView | undefined>();

  // Lista única de autores (dos próprios dados)
  const autores = useMemo(() => {
    const map = new Map<string, string>();
    for (const a of anotacoes ?? []) if (a.autor_id && a.autor_nome) map.set(a.autor_id, a.autor_nome);
    return [...map.entries()].map(([id, nome]) => ({ id, nome }));
  }, [anotacoes]);

  // Contagem de pendentes por cliente (pra mostrar no filtro)
  const pendentesPorCliente = useMemo(() => {
    const map = new Map<string, number>();
    for (const a of anotacoes ?? []) {
      if (a.status !== 'pendente') continue;
      const k = a.cliente_id ?? '__geral__';
      map.set(k, (map.get(k) ?? 0) + 1);
    }
    return map;
  }, [anotacoes]);

  const clienteOpts = useMemo(() => {
    const ordenados = (clientes ?? []).filter((c) => c.status === 'ativo').sort((a, b) => a.nome.localeCompare(b.nome));
    return [
      { value: '',          label: `Todas${pendentesPorCliente.size > 0 ? ` (${(anotacoes ?? []).filter((a) => a.status === 'pendente').length})` : ''}` },
      { value: '__geral__', label: `Geral (${pendentesPorCliente.get('__geral__') ?? 0})` },
      ...ordenados.map((c) => ({ value: c.id, label: `${c.nome} (${pendentesPorCliente.get(c.id) ?? 0})` })),
    ];
  }, [clientes, pendentesPorCliente, anotacoes]);

  // Filtro + ordenação
  const filtradas = useMemo(() => {
    const q = busca.trim().toLowerCase();
    const lista = (anotacoes ?? []).filter((a) => {
      if (aba === 'pendentes' && a.status !== 'pendente') return false;
      if (aba === 'feitas'    && a.status !== 'feita')    return false;
      if (clienteFiltro === '__geral__' && a.cliente_id !== null) return false;
      if (clienteFiltro && clienteFiltro !== '__geral__' && a.cliente_id !== clienteFiltro) return false;
      if (autorFiltro && a.autor_id !== autorFiltro) return false;
      if (prioFiltro && a.prioridade !== prioFiltro) return false;
      if (q && !a.texto.toLowerCase().includes(q)) return false;
      return true;
    });
    // Ordenação: urgentes + vencidas primeiro, depois por data desc
    const rankPrio: Record<AnotacaoPrioridade, number> = { urgente: 0, importante: 1, normal: 2 };
    return [...lista].sort((a, b) => {
      const vA = (diasAte(a.prazo) ?? 999) < 0 ? -1 : 0;
      const vB = (diasAte(b.prazo) ?? 999) < 0 ? -1 : 0;
      if (vA !== vB) return vA - vB;
      if (rankPrio[a.prioridade] !== rankPrio[b.prioridade]) return rankPrio[a.prioridade] - rankPrio[b.prioridade];
      return b.criada_em.localeCompare(a.criada_em);
    });
  }, [anotacoes, aba, clienteFiltro, autorFiltro, prioFiltro, busca]);

  function abrirNova() { setEditando(undefined); setFormOpen(true); }

  return (
    <div className="space-y-4">
      <PageHeader title="Anotações" subtitle="Lembretes rápidos do dia a dia, ligados ou não a um cliente.">
        <Button onClick={abrirNova}>+ Nova anotação</Button>
      </PageHeader>

      <CriacaoRapida />

      {/* Filtros */}
      <div className="flex flex-wrap items-center gap-2">
        <div className="min-w-[240px] flex-1">
          <Select
            id="f-cli"
            options={clienteOpts}
            value={clienteFiltro}
            onChange={(e) => setClienteFiltro(e.target.value)}
          />
        </div>
        <input
          value={busca}
          onChange={(e) => setBusca(e.target.value)}
          placeholder="🔎 Buscar no texto…"
          className="min-w-[200px] flex-1 rounded-md border border-white/10 bg-white/5 px-3 py-2 text-sm text-slate-100 placeholder:text-slate-500"
        />
        <Select
          id="f-aut"
          options={[{ value: '', label: 'Todos autores' }, ...autores.map((a) => ({ value: a.id, label: a.nome }))]}
          value={autorFiltro}
          onChange={(e) => setAutorFiltro(e.target.value)}
        />
        <Select
          id="f-prio"
          options={[{ value: '', label: 'Toda prioridade' }, { value: 'urgente', label: '🔴 Urgente' }, { value: 'importante', label: '🟠 Importante' }, { value: 'normal', label: '⚪ Normal' }]}
          value={prioFiltro}
          onChange={(e) => setPrioFiltro(e.target.value)}
        />
      </div>

      {/* Abas */}
      <div className="flex gap-1 border-b border-white/10">
        {([
          { id: 'pendentes', label: 'Pendentes' },
          { id: 'feitas',    label: 'Feitas' },
        ] as const).map((t) => (
          <button
            key={t.id}
            onClick={() => setAba(t.id)}
            className={`border-b-2 px-4 py-2 text-sm font-medium ${
              aba === t.id ? 'border-brand-500 text-brand-300' : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {isLoading ? (
        <Card className="flex justify-center p-10"><Spinner /></Card>
      ) : filtradas.length === 0 ? (
        <Card><EmptyState message={aba === 'pendentes' ? 'Nenhuma anotação pendente.' : 'Nenhuma anotação feita.'} /></Card>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {filtradas.map((a) => <CardAnotacao key={a.id} a={a} profileId={profile?.id ?? null} onEditar={() => { setEditando(a); setFormOpen(true); }} onToggle={() => marcar.mutate({ id: a.id, feita: a.status !== 'feita', autor_id: profile?.id })} />)}
        </div>
      )}

      {formOpen && (
        <AnotacaoFormModal
          open={formOpen}
          onClose={() => { setFormOpen(false); setEditando(undefined); }}
          anotacao={editando}
        />
      )}
    </div>
  );
}

interface CardProps { a: AnotacaoView; profileId: string | null; onEditar: () => void; onToggle: () => void }
function CardAnotacao({ a, onEditar, onToggle }: CardProps) {
  const [expandido, setExpandido] = useState(false);
  const dias = diasAte(a.prazo);
  const vencida = a.status === 'pendente' && dias !== null && dias < 0;
  const feita = a.status === 'feita';
  const textoLinhas = a.texto.split('\n').length;
  const textoLongo = a.texto.length > 180 || textoLinhas > 3;

  return (
    <div className={`rounded-2xl border p-4 shadow-sm ${
      vencida ? 'border-red-500/40 bg-red-500/5' :
      feita ? 'border-white/5 bg-white/[0.02] opacity-60' :
      'border-white/10 bg-white/[0.03] hover:border-white/20'
    }`}>
      <div className="flex items-start gap-2">
        <button
          onClick={onToggle}
          className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-md border text-xs ${
            feita ? 'border-emerald-500/50 bg-emerald-500/20 text-emerald-200' : 'border-white/20 text-transparent hover:border-brand-400'
          }`}
          title={feita ? 'Reabrir' : 'Marcar como feita'}
        >
          {feita ? '✓' : ''}
        </button>
        <div className="min-w-0 flex-1">
          <p className={`whitespace-pre-wrap break-words text-sm leading-relaxed ${feita ? 'text-slate-400 line-through' : 'text-slate-100'} ${!expandido && textoLongo ? 'line-clamp-3' : ''}`}>
            {a.texto}
          </p>
          {textoLongo && (
            <button onClick={() => setExpandido((v) => !v)} className="mt-0.5 text-[11px] text-brand-300 hover:underline">
              {expandido ? 'ver menos' : 'ver mais'}
            </button>
          )}

          <div className="mt-2 flex flex-wrap items-center gap-1.5 text-[10px]">
            <Badge tone="slate">🏢 {a.cliente_nome ?? 'Geral'}</Badge>
            {a.autor_nome && <Badge tone="slate">👤 {a.autor_nome}</Badge>}
            {a.prioridade !== 'normal' && <Badge tone={PRIORIDADE_TONE[a.prioridade]}>{PRIORIDADE_LABEL[a.prioridade]}</Badge>}
            {a.prazo && (
              <Badge tone={vencida ? 'red' : 'amber'}>
                📅 {new Date(a.prazo).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' })}
                {vencida && ' · vencida'}
              </Badge>
            )}
            {(a.anexos?.length ?? 0) > 0 && <Badge tone="slate">📎 {a.anexos.length}</Badge>}
            {a.demanda_id && <Badge tone="green">↗ virou demanda</Badge>}
          </div>

          <div className="mt-2 flex justify-end">
            <button onClick={onEditar} className="text-[11px] font-medium text-brand-300 hover:underline">
              ✎ Editar
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
