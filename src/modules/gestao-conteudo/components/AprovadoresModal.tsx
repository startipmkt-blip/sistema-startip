import { useState } from 'react';
import { Modal } from '@/shared/ui/Modal';
import { Button } from '@/shared/ui/Button';
import { Input } from '@/shared/ui/Input';
import { Badge } from '@/shared/ui/Badge';
import {
  useAprovadores, useExcluirAprovador, useSalvarAprovador,
} from '@/modules/gestao-conteudo/api/aprovadoresApi';

interface Props {
  open: boolean;
  onClose: () => void;
  clienteId: string;
  clienteNome: string;
}

export function AprovadoresModal({ open, onClose, clienteId, clienteNome }: Props) {
  const q = useAprovadores(clienteId);
  const salvar = useSalvarAprovador();
  const excluir = useExcluirAprovador();
  const [nome, setNome] = useState('');
  const [erro, setErro] = useState<string | null>(null);
  const lista = q.data ?? [];
  const ativos = lista.filter((a) => a.ativo).length;

  async function adicionar() {
    setErro(null);
    if (!nome.trim()) { setErro('Informe o nome do aprovador.'); return; }
    try {
      await salvar.mutateAsync({ cliente_id: clienteId, nome, ordem: lista.length });
      setNome('');
    } catch (e) {
      setErro((e as Error).message);
    }
  }

  return (
    <Modal open={open} onClose={onClose} title={`Aprovadores — ${clienteNome}`} size="lg">
      <div className="space-y-4">
        <p className="text-sm text-slate-300">
          {ativos >= 2
            ? `Aprovação em conjunto ativa: o conteúdo só fica aprovado quando os ${ativos} aprovadores aprovarem. Se um recusar, ele precisa justificar e o conteúdo volta para alteração.`
            : 'Com 0 ou 1 aprovador, uma única decisão aprova o conteúdo (comportamento padrão). Cadastre 2 ou mais para exigir a aprovação de todos.'}
        </p>

        <div className="flex gap-2">
          <div className="flex-1">
            <Input
              placeholder="Nome do sócio / aprovador"
              value={nome}
              onChange={(e) => setNome(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') void adicionar(); }}
            />
          </div>
          <Button onClick={adicionar} disabled={salvar.isPending}>Adicionar</Button>
        </div>
        {erro && <p className="text-sm text-red-300">{erro}</p>}

        <ul className="divide-y divide-white/10 rounded-lg border border-white/10">
          {lista.length === 0 && <li className="p-4 text-center text-sm text-slate-400">Nenhum aprovador cadastrado.</li>}
          {lista.map((a) => (
            <li key={a.id} className="flex items-center gap-3 px-3 py-2">
              <span className="flex-1 text-sm text-slate-100">{a.nome}</span>
              <Badge tone={a.ativo ? 'green' : 'slate'}>{a.ativo ? 'Ativo' : 'Inativo'}</Badge>
              <Button variant="ghost" onClick={() => salvar.mutate({ ...a, ativo: !a.ativo })}>
                {a.ativo ? 'Desativar' : 'Ativar'}
              </Button>
              <Button
                variant="ghost"
                onClick={() => { if (confirm(`Remover ${a.nome}? Os votos dele nos conteúdos pendentes também são apagados.`)) excluir.mutate(a.id); }}
              >
                Remover
              </Button>
            </li>
          ))}
        </ul>
        <p className="text-xs text-slate-500">
          Na página de aprovação, cada sócio escolhe o próprio nome e aprova por si. Conteúdos que já estão aguardando
          continuam pendentes e passam a exigir todos os aprovadores ativos.
        </p>
      </div>
    </Modal>
  );
}
