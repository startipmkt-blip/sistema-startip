import { useState } from 'react';
import { useEtapasCrm, useAddEtapaCrm, useRemoverEtapaCrm } from '@/modules/crm/api/crmApi';
import { Modal } from '@/shared/ui/Modal';
import { Input } from '@/shared/ui/Input';
import { Button } from '@/shared/ui/Button';

export function GerenciarEtapasModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { data: etapas } = useEtapasCrm();
  const add = useAddEtapaCrm();
  const remover = useRemoverEtapaCrm();
  const [nova, setNova] = useState('');

  async function handleAdd() {
    if (!nova.trim()) return;
    await add.mutateAsync(nova.trim());
    setNova('');
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Etapas do funil"
      footer={<Button onClick={onClose}>Fechar</Button>}
    >
      <div className="space-y-4">
        <p className="text-xs text-slate-400">
          Crie ou remova colunas do funil. Ao remover uma etapa, os leads dela voltam para a primeira.
        </p>
        <ul className="space-y-2">
          {(etapas ?? []).map((e) => (
            <li key={e.id} className="flex items-center justify-between rounded-md border border-white/10 px-3 py-2 text-sm">
              <span className="text-slate-200">{e.label}</span>
              <button
                className="text-xs font-medium text-red-400 hover:underline disabled:opacity-40"
                disabled={(etapas?.length ?? 0) <= 1}
                onClick={() => remover.mutate(e.id)}
              >
                Remover
              </button>
            </li>
          ))}
        </ul>
        <div className="flex items-end gap-2">
          <div className="flex-1">
            <Input label="Nova etapa" placeholder="Ex.: Follow-up" value={nova} onChange={(e) => setNova(e.target.value)} />
          </div>
          <Button onClick={handleAdd} disabled={add.isPending || !nova.trim()}>Adicionar</Button>
        </div>
      </div>
    </Modal>
  );
}
