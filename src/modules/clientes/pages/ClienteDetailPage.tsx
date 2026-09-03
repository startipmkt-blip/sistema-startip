import { useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useCliente } from '@/modules/clientes/api/clientesApi';
import { useContasAnuncio } from '@/modules/clientes/api/contasApi';
import { ClienteHeader } from '@/modules/clientes/components/ClienteHeader';
import { ClienteFormModal } from '@/modules/clientes/components/ClienteFormModal';
import { ClienteWorkspace } from '@/modules/cliente-workspace/components/ClienteWorkspace';
import { ScoreSaudeCard } from '@/modules/clientes/components/ScoreSaudeCard';
import { CentralLinkCard } from '@/modules/clientes/components/CentralLinkCard';
import { Button } from '@/shared/ui/Button';
import { Badge } from '@/shared/ui/Badge';
import { Card } from '@/shared/ui/Card';
import { Spinner } from '@/shared/ui/Spinner';

export function ClienteDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { data: cliente, isLoading, isError } = useCliente(id);
  const [editando, setEditando] = useState(false);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-12">
        <Spinner />
      </div>
    );
  }

  if (isError || !cliente) {
    return (
      <div className="mx-auto max-w-4xl">
        <p className="text-sm text-red-400">
          Cliente não encontrado ou sem permissão de acesso.
        </p>
        <Link to="/clientes" className="text-sm text-brand-300 hover:underline">
          ← Voltar para Clientes
        </Link>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <Link to="/clientes" className="text-sm text-brand-300 hover:underline">
        ← Clientes
      </Link>

      <Card className="p-6">
        <div className="flex items-start justify-between gap-4">
          <ClienteHeader cliente={cliente} />
          <Button variant="secondary" onClick={() => setEditando(true)}>
            Editar
          </Button>
        </div>
      </Card>

      <ClienteFormModal
        open={editando}
        onClose={() => setEditando(false)}
        cliente={cliente}
      />

      {/* Score de saúde + Central pública */}
      <div className="grid gap-4 lg:grid-cols-[2fr,1fr]">
        <ScoreSaudeCard clienteId={cliente.id} />
        <CentralLinkCard clienteId={cliente.id} />
      </div>

      {/* Painel do cliente (materiais + fluxo de trabalho) */}
      <ClienteWorkspace clienteId={cliente.id} />

      {/* Contas de anúncio */}
      <ContasSection clienteId={cliente.id} />
    </div>
  );
}

function ContasSection({ clienteId }: { clienteId: string }) {
  const { data: contas, isLoading } = useContasAnuncio(clienteId);
  return (
    <Card className="p-5">
      <h3 className="mb-3 text-sm font-semibold text-slate-200">Contas de anúncio</h3>
      {isLoading ? (
        <Spinner />
      ) : !contas || contas.length === 0 ? (
        <p className="text-sm text-slate-400">Nenhuma conta de anúncio cadastrada.</p>
      ) : (
        <ul className="space-y-2">
          {contas.map((c) => (
            <li
              key={c.id}
              className="flex items-center justify-between rounded-md border border-white/10 px-4 py-2"
            >
              <div>
                <div className="text-sm font-medium text-slate-100">{c.nome_exibicao}</div>
                <div className="text-xs text-slate-400">ID: {c.id_externo}</div>
              </div>
              <Badge tone={c.plataforma === 'meta' ? 'blue' : 'amber'}>
                {c.plataforma === 'meta' ? 'Meta' : 'Google'}
              </Badge>
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}
