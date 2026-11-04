import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useClientes } from '@/modules/clientes/api/clientesApi';
import { STATUS_LABEL, TIPO_NEGOCIO_LABEL, type ClienteStatus } from '@/modules/clientes/types';
import { StatusBadge } from '@/modules/clientes/components/StatusBadge';
import { ClienteFormModal } from '@/modules/clientes/components/ClienteFormModal';
import { PageHeader } from '@/shared/ui/PageHeader';
import { Button } from '@/shared/ui/Button';
import { Card } from '@/shared/ui/Card';
import { Badge } from '@/shared/ui/Badge';
import { Spinner } from '@/shared/ui/Spinner';
import { LogoCliente } from '@/shared/ui/LogoCliente';
import { GlassIcon } from '@/shared/ui/GlassIcon';
import { SinoLembretes } from '@/modules/cliente-lembretes/components/SinoLembretes';

type FiltroStatus = ClienteStatus | 'todos';

const SERVICOS_BADGE = [
  { id: 'trafego_pago', label: 'Tráfego' },
  { id: 'social_midia', label: 'Social' },
  { id: 'google_meu_negocio', label: 'GMN' },
] as const;

function iniciais(nome: string) {
  const partes = nome.trim().split(/\s+/);
  return (partes.length > 1 ? partes[0][0] + partes[1][0] : nome.slice(0, 2)).toUpperCase();
}

export function ClientesListPage() {
  const [busca, setBusca] = useState('');
  const [filtro, setFiltro] = useState<FiltroStatus>('todos');
  const [novoAberto, setNovoAberto] = useState(false);
  const { data: clientes, isLoading, isError } = useClientes(busca);

  const lista = clientes ?? [];
  const contagem = useMemo(() => {
    const c: Record<FiltroStatus, number> = { todos: lista.length, ativo: 0, prospect: 0, inativo: 0 };
    for (const cl of lista) c[cl.status] += 1;
    return c;
  }, [lista]);
  const visiveis = filtro === 'todos' ? lista : lista.filter((c) => c.status === filtro);

  const filtros: FiltroStatus[] = ['todos', 'ativo', 'prospect', 'inativo'];

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      <PageHeader
        title="Clientes"
        subtitle={`${contagem.ativo} ${contagem.ativo === 1 ? 'conta ativa' : 'contas ativas'}`}
      >
        <div className="relative w-56">
          <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">
            <GlassIcon name="search" className="h-4 w-4" />
          </span>
          <input
            type="search"
            placeholder="Buscar por nome…"
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
            className="glass-field w-full py-2 pl-9 pr-3 text-sm focus:border-brand-400 focus:outline-none"
            aria-label="Buscar cliente"
          />
        </div>
        <Button onClick={() => setNovoAberto(true)}><GlassIcon name="plus" className="h-4 w-4" /> Novo cliente</Button>
      </PageHeader>

      <div className="flex flex-wrap gap-2" role="tablist" aria-label="Filtrar por status">
        {filtros.map((f) => (
          <button
            key={f}
            role="tab"
            aria-selected={filtro === f}
            onClick={() => setFiltro(f)}
            className={`rounded-full border px-3 py-1 text-xs font-semibold transition-colors ${
              filtro === f ? 'border-brand-500 bg-brand-500 text-white' : 'border-white/10 bg-white/[0.03] text-slate-300 hover:border-white/25'}`}
          >
            {f === 'todos' ? 'Todos' : STATUS_LABEL[f]} · {contagem[f]}
          </button>
        ))}
      </div>

      <ClienteFormModal open={novoAberto} onClose={() => setNovoAberto(false)} />

      {isLoading ? (
        <Card className="flex items-center justify-center p-12"><Spinner /></Card>
      ) : isError ? (
        <Card className="p-6 text-sm text-red-400">Erro ao carregar clientes. Verifique a conexão com o Supabase.</Card>
      ) : visiveis.length === 0 ? (
        <Card className="p-12 text-center text-sm text-slate-400">
          {busca ? 'Nenhum cliente encontrado para essa busca.' : lista.length ? 'Nenhum cliente com esse status.' : 'Nenhum cliente cadastrado ainda.'}
        </Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {visiveis.map((cliente) => (
            <Card key={cliente.id} className="group flex flex-col p-5 transition-colors hover:border-brand-400">
              <div className="flex items-start justify-between gap-2">
                <Link to={`/clientes/${cliente.id}`} className="shrink-0" aria-label={`Abrir ${cliente.nome}`}>
                  {cliente.logo_url ? (
                    <LogoCliente src={cliente.logo_url} alt="" className="h-11 w-11 rounded-xl border border-white/10 object-cover" />
                  ) : (
                    <div className="logo-iniciais flex h-11 w-11 items-center justify-center rounded-xl bg-[#0e1a24] font-display text-sm font-bold text-[#ffffff]">
                      {iniciais(cliente.nome)}
                    </div>
                  )}
                </Link>
                <StatusBadge status={cliente.status} />
              </div>

              <Link to={`/clientes/${cliente.id}`} className="mt-4 min-w-0">
                <h3 className="truncate text-[15px] font-bold text-slate-100">{cliente.nome}</h3>
                <p className="text-xs text-slate-400">{TIPO_NEGOCIO_LABEL[cliente.tipo_negocio]}</p>
              </Link>

              <div className="mt-3 flex min-h-[22px] flex-wrap gap-1.5">
                {SERVICOS_BADGE.filter((s) => cliente.servicos?.includes(s.id)).map((s) => (
                  <Badge key={s.id} tone="blue">{s.label}</Badge>
                ))}
              </div>

              <div className="mt-auto flex items-center justify-between border-t border-white/[0.08] pt-3 mt-4">
                <SinoLembretes clienteId={cliente.id} clienteNome={cliente.nome} />
                <Link to={`/clientes/${cliente.id}`} className="text-xs font-semibold text-slate-400 group-hover:text-brand-300">
                  Abrir →
                </Link>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
