import { useMemo, useState } from 'react';
import { Modal } from '@/shared/ui/Modal';
import { Button } from '@/shared/ui/Button';
import { Input } from '@/shared/ui/Input';
import { Badge } from '@/shared/ui/Badge';
import { useAdicionarDatasCliente } from '@/modules/datas-comemorativas/api/datasApi';
import { descreverRegra } from '@/modules/datas-comemorativas/lib/recorrencia';
import { PRIORIDADE_LABEL, PRIORIDADE_TONE, type DataBase, type DataCliente } from '@/modules/datas-comemorativas/types';

interface Props {
  open: boolean;
  onClose: () => void;
  clienteId: string;
  clienteNome: string;
  base: DataBase[];
  itens: DataCliente[];
}

export function AdicionarDatasModal({ open, onClose, clienteId, clienteNome, base, itens }: Props) {
  const adicionar = useAdicionarDatasCliente();
  const [busca, setBusca] = useState('');
  const [sel, setSel] = useState<Set<string>>(new Set());
  const mapa = useMemo(() => new Map(base.map((b) => [b.id, b])), [base]);

  const disponiveis = useMemo(() => {
    const usadas = new Set(itens.map((i) => i.data_id));
    const q = busca.trim().toLowerCase();
    return base
      .filter((b) => !usadas.has(b.id))
      .filter((b) => !q || b.nome.toLowerCase().includes(q) || b.categoria.toLowerCase().includes(q));
  }, [base, itens, busca]);

  function alternar(id: string) {
    setSel((s) => {
      const n = new Set(s);
      if (n.has(id)) n.delete(id); else n.add(id);
      return n;
    });
  }

  async function confirmar() {
    await adicionar.mutateAsync({ clienteId, dataIds: [...sel] });
    setSel(new Set());
    onClose();
  }

  return (
    <Modal open={open} onClose={onClose} title={`Adicionar datas — ${clienteNome}`} size="lg">
      <div className="space-y-3">
        <div className="flex gap-2">
          <div className="flex-1">
            <Input placeholder="Buscar na Base Mãe…" value={busca} onChange={(e) => setBusca(e.target.value)} />
          </div>
          <Button variant="secondary" onClick={() => setSel(new Set(disponiveis.map((b) => b.id)))} disabled={disponiveis.length === 0}>
            Marcar todas
          </Button>
        </div>
        <ul className="max-h-[50vh] divide-y divide-white/5 overflow-y-auto rounded-lg border border-white/10">
          {disponiveis.map((b) => (
            <li key={b.id}>
              <label className="flex cursor-pointer items-center gap-3 px-3 py-2 hover:bg-white/5">
                <input type="checkbox" checked={sel.has(b.id)} onChange={() => alternar(b.id)} />
                <div className="min-w-0 flex-1">
                  <div className="text-sm text-slate-100">{b.nome}</div>
                  <div className="text-[11px] text-slate-500">{descreverRegra(b, mapa)} · {b.categoria}</div>
                </div>
                <Badge tone={PRIORIDADE_TONE[b.prioridade]}>{PRIORIDADE_LABEL[b.prioridade]}</Badge>
              </label>
            </li>
          ))}
          {disponiveis.length === 0 && (
            <li className="p-6 text-center text-xs text-slate-500">
              {busca ? 'Nada encontrado.' : 'Este cliente já usa todas as datas da Base Mãe.'}
            </li>
          )}
        </ul>
        <div className="flex items-center justify-between gap-2">
          <span className="text-xs text-slate-400">{sel.size} selecionada(s)</span>
          <div className="flex gap-2">
            <Button variant="secondary" onClick={onClose}>Cancelar</Button>
            <Button onClick={() => void confirmar()} disabled={sel.size === 0 || adicionar.isPending}>Adicionar</Button>
          </div>
        </div>
      </div>
    </Modal>
  );
}
