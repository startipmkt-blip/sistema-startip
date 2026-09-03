import { useState } from 'react';
import { useAuth } from '@/shared/auth/AuthProvider';
import { useIndicacoes, useSalvarIndicacao } from '@/modules/indicacao/api/indicacaoApi';
import { INDICACAO_STATUS_LABEL } from '@/modules/indicacao/types';
import { Card } from '@/shared/ui/Card';
import { Input } from '@/shared/ui/Input';
import { Button } from '@/shared/ui/Button';
import { Badge } from '@/shared/ui/Badge';
import { Spinner } from '@/shared/ui/Spinner';
import { EmptyState } from '@/shared/ui/EmptyState';
import { formatDate } from '@/shared/lib/format';

export function PortalIndicacoes() {
  const { profile } = useAuth();
  const clienteId = profile?.cliente_id ?? '';
  const { data: indicacoes, isLoading } = useIndicacoes(clienteId);
  const salvar = useSalvarIndicacao();

  const [nome, setNome] = useState('');
  const [contato, setContato] = useState('');

  async function adicionar() {
    if (!nome.trim() || !clienteId) return;
    await salvar.mutateAsync({
      dados: { cliente_id: clienteId, nome_indicado: nome, contato, status: 'novo', recompensa: 0 },
    });
    setNome('');
    setContato('');
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-white">Indique e ganhe</h1>
        <p className="text-sm text-slate-400">
          Indique contatos para a Startip. Só você vê as suas indicações.
        </p>
      </div>

      {/* Formulário de indicação */}
      <Card className="p-5">
        <h2 className="mb-3 text-sm font-semibold text-slate-200">Nova indicação</h2>
        <div className="flex flex-wrap items-end gap-3">
          <div className="w-56">
            <Input label="Nome do indicado" value={nome} onChange={(e) => setNome(e.target.value)} />
          </div>
          <div className="w-56">
            <Input label="Contato (telefone/WhatsApp)" value={contato} onChange={(e) => setContato(e.target.value)} />
          </div>
          <Button onClick={adicionar} disabled={salvar.isPending || !nome.trim()}>
            {salvar.isPending ? 'Enviando…' : 'Enviar indicação'}
          </Button>
        </div>
      </Card>

      {/* Minhas indicações */}
      <Card className="p-5">
        <h2 className="mb-3 text-sm font-semibold text-slate-200">Suas indicações</h2>
        {isLoading ? (
          <Spinner />
        ) : !indicacoes || indicacoes.length === 0 ? (
          <EmptyState message="Você ainda não indicou ninguém." />
        ) : (
          <ul className="divide-y divide-white/10">
            {indicacoes.map((i) => (
              <li key={i.id} className="flex items-center justify-between py-2 text-sm">
                <div>
                  <div className="font-medium text-slate-100">{i.nome_indicado}</div>
                  <div className="text-xs text-slate-400">
                    {i.contato || '—'} · {formatDate(i.created_at)}
                  </div>
                </div>
                <Badge tone="blue">{INDICACAO_STATUS_LABEL[i.status]}</Badge>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </div>
  );
}
