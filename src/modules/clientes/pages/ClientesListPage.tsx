import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useClientes } from '@/modules/clientes/api/clientesApi';
import { TIPO_NEGOCIO_LABEL } from '@/modules/clientes/types';
import { StatusBadge } from '@/modules/clientes/components/StatusBadge';
import { ClienteFormModal } from '@/modules/clientes/components/ClienteFormModal';
import { Input } from '@/shared/ui/Input';
import { Button } from '@/shared/ui/Button';
import { Card } from '@/shared/ui/Card';
import { Spinner } from '@/shared/ui/Spinner';

export function ClientesListPage() {
  const [busca, setBusca] = useState('');
  const [novoAberto, setNovoAberto] = useState(false);
  const { data: clientes, isLoading, isError } = useClientes(busca);

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-white">Clientes</h1>
          <p className="text-sm text-slate-400">
            Registro central da agência.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <div className="w-64">
            <Input
              id="busca"
              type="search"
              placeholder="Buscar por nome…"
              value={busca}
              onChange={(e) => setBusca(e.target.value)}
            />
          </div>
          <Button onClick={() => setNovoAberto(true)}>+ Novo cliente</Button>
        </div>
      </div>

      <ClienteFormModal open={novoAberto} onClose={() => setNovoAberto(false)} />

      <Card>
        {isLoading ? (
          <div className="flex items-center justify-center p-12">
            <Spinner />
          </div>
        ) : isError ? (
          <p className="p-6 text-sm text-red-400">
            Erro ao carregar clientes. Verifique a conexão com o Supabase.
          </p>
        ) : !clientes || clientes.length === 0 ? (
          <p className="p-12 text-center text-sm text-slate-400">
            {busca
              ? 'Nenhum cliente encontrado para essa busca.'
              : 'Nenhum cliente cadastrado ainda.'}
          </p>
        ) : (
          <ul className="divide-y divide-white/10">
            {clientes.map((cliente) => {
              const iniciais = cliente.nome.slice(0, 2).toUpperCase();
              return (
                <li key={cliente.id}>
                  <Link
                    to={`/clientes/${cliente.id}`}
                    className="flex items-center gap-4 px-5 py-3 transition-colors hover:bg-white/5"
                  >
                    {cliente.logo_url ? (
                      <img
                        src={cliente.logo_url}
                        alt=""
                        className="h-10 w-10 rounded-md border border-white/10 object-cover"
                      />
                    ) : (
                      <div className="flex h-10 w-10 items-center justify-center rounded-md bg-brand-500/10 text-sm font-semibold text-brand-300">
                        {iniciais}
                      </div>
                    )}
                    <div className="min-w-0 flex-1">
                      <div className="truncate font-medium text-slate-100">
                        {cliente.nome}
                      </div>
                      <div className="text-xs text-slate-400">
                        {TIPO_NEGOCIO_LABEL[cliente.tipo_negocio]}
                      </div>
                    </div>
                    <StatusBadge status={cliente.status} />
                  </Link>
                </li>
              );
            })}
          </ul>
        )}
      </Card>
    </div>
  );
}
