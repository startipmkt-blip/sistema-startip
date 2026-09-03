import { useMemo, useState } from 'react';
import { useIdeiasAprovadas, useMoverProducaoStatus } from '@/modules/aprovacao-conteudo/api/aprovacaoApi';
import { PRODUCAO_COLUNAS, type ConteudoIdeia, type ProducaoStatus } from '@/modules/aprovacao-conteudo/types';
import { TIPO_LABEL } from '@/modules/conteudo/types';
import { useClientes } from '@/modules/clientes/api/clientesApi';
import { PageHeader } from '@/shared/ui/PageHeader';
import { Select } from '@/shared/ui/Select';
import { Card } from '@/shared/ui/Card';
import { Spinner } from '@/shared/ui/Spinner';
import { Badge } from '@/shared/ui/Badge';
import { EmptyState } from '@/shared/ui/EmptyState';
import { KanbanBoard } from '@/shared/ui/KanbanBoard';
import { Link } from 'react-router-dom';

export function ConteudoPage() {
  const [clienteId, setClienteId] = useState('');
  const { data: ideias, isLoading } = useIdeiasAprovadas(clienteId);
  const { data: clientes } = useClientes('');
  const mover = useMoverProducaoStatus();

  const clienteOptions = useMemo(
    () => [{ value: '', label: 'Todos' }, ...(clientes ?? [])
      .filter((c) => c.status === 'ativo' && (c.servicos ?? []).includes('social_midia'))
      .sort((a, b) => a.nome.localeCompare(b.nome))
      .map((c) => ({ value: c.id, label: c.nome }))],
    [clientes],
  );

  // Mapa cliente_id → nome para exibir no card
  const nomeCliente = useMemo(() => {
    const m = new Map<string, string>();
    (clientes ?? []).forEach((c) => m.set(c.id, c.nome));
    return m;
  }, [clientes]);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Conteúdo (produção)"
        subtitle="Kanban de produção das ideias já aprovadas pelo cliente. Arraste entre colunas."
      >
        <Select
          options={clienteOptions}
          value={clienteId}
          onChange={(e) => setClienteId(e.target.value)}
        />
      </PageHeader>

      <div className="rounded-md border border-dashed border-white/10 bg-white/[0.02] px-3 py-2 text-xs text-slate-400">
        💡 Ideias começam em <Link to="/aprovacao-conteudo" className="text-brand-300 hover:underline">Aprovação de conteúdo</Link>.
        Só entram aqui depois que o cliente aprova no portal.
      </div>

      {isLoading ? (
        <Card className="flex justify-center p-12"><Spinner /></Card>
      ) : (ideias ?? []).length === 0 ? (
        <Card><EmptyState message="Nenhuma ideia aprovada pelo cliente ainda para produção." /></Card>
      ) : (
        <KanbanBoard<ConteudoIdeia>
          columns={PRODUCAO_COLUNAS}
          items={ideias ?? []}
          columnOf={(i) => i.producao_status ?? 'ideia'}
          keyOf={(i) => i.id}
          onMove={(item, novaCol) => mover.mutate({ id: item.id, producao_status: novaCol as ProducaoStatus })}
          renderCard={(i) => (
            <div className="w-full text-left">
              <div className="mb-1 flex items-center gap-1.5">
                <Badge tone="blue">Sem {i.semana}</Badge>
                <Badge tone="slate">{TIPO_LABEL[i.formato]}</Badge>
                {i.dia_postagem && (
                  <span className="text-[10px] text-slate-400">
                    📅 {new Date(i.dia_postagem).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' })}
                  </span>
                )}
              </div>
              <div className="font-medium text-slate-100">{i.titulo}</div>
              <div className="mt-0.5 text-[11px] text-slate-400">{nomeCliente.get(i.cliente_id) ?? '—'}</div>
              {i.descricao && (
                <p className="mt-1 line-clamp-2 text-xs text-slate-400">{i.descricao}</p>
              )}
            </div>
          )}
        />
      )}
    </div>
  );
}
