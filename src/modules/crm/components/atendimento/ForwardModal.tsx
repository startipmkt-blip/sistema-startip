import { useMemo, useState } from 'react';
import { Modal } from '@/shared/ui/Modal';
import { Button } from '@/shared/ui/Button';
import { useConversas } from '@/modules/crm/api/atendimentoApi';
import { useEncaminharMensagem } from '@/modules/crm/api/crmApi';

interface Props {
  open: boolean;
  onClose: () => void;
  leadIdOrigem: string;
  waMessageId: string;
}

export function ForwardModal({ open, onClose, leadIdOrigem, waMessageId }: Props) {
  const { data: conversas } = useConversas('todas', 'todas');
  const encaminhar = useEncaminharMensagem();
  const [busca, setBusca] = useState('');
  const [selecionados, setSelecionados] = useState<Set<string>>(new Set());

  const filtradas = useMemo(() => {
    const q = busca.trim().toLowerCase();
    return (conversas ?? [])
      .filter((c) => c.id !== leadIdOrigem)
      .filter((c) => !q || c.nome.toLowerCase().includes(q) || c.telefone.includes(q));
  }, [conversas, busca, leadIdOrigem]);

  function toggle(id: string) {
    setSelecionados((s) => {
      const novo = new Set(s);
      if (novo.has(id)) novo.delete(id);
      else novo.add(id);
      return novo;
    });
  }

  async function handleEncaminhar() {
    const alvos = (conversas ?? []).filter((c) => selecionados.has(c.id));
    await Promise.all(
      alvos.map((c) =>
        encaminhar.mutateAsync({ leadId: leadIdOrigem, waMessageId, paraTelefone: c.telefone }),
      ),
    );
    setSelecionados(new Set());
    onClose();
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Encaminhar mensagem"
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>Cancelar</Button>
          <Button
            onClick={handleEncaminhar}
            disabled={encaminhar.isPending || selecionados.size === 0}
          >
            {encaminhar.isPending
              ? 'Encaminhando…'
              : `Encaminhar (${selecionados.size})`}
          </Button>
        </>
      }
    >
      <div className="space-y-3">
        <input
          type="text"
          placeholder="Buscar conversa…"
          value={busca}
          onChange={(e) => setBusca(e.target.value)}
          className="w-full rounded-md border border-white/10 bg-white/5 px-3 py-2 text-sm text-slate-100 placeholder:text-slate-500 focus:border-brand-400 focus:outline-none"
        />
        <ul className="max-h-72 space-y-1 overflow-y-auto rounded-md border border-white/10 bg-white/[0.02] p-2">
          {filtradas.map((c) => (
            <li key={c.id}>
              <label className="flex items-center gap-2 rounded-md px-2 py-1.5 text-sm text-slate-200 hover:bg-white/5">
                <input
                  type="checkbox"
                  checked={selecionados.has(c.id)}
                  onChange={() => toggle(c.id)}
                />
                <span aria-hidden>{c.is_grupo ? '👥' : '👤'}</span>
                <span className="min-w-0 flex-1 truncate">{c.nome}</span>
                <span className="text-xs text-slate-500">{c.telefone}</span>
              </label>
            </li>
          ))}
          {filtradas.length === 0 && (
            <li className="p-4 text-center text-xs text-slate-500">Nenhuma conversa encontrada.</li>
          )}
        </ul>
      </div>
    </Modal>
  );
}
