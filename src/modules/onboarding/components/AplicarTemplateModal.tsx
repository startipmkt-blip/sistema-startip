import { useState } from 'react';
import { useIniciarOnboarding } from '@/modules/onboarding/api/onboardingApi';
import type { OnboardingTemplate } from '@/modules/onboarding/types';
import { useClientes } from '@/modules/clientes/api/clientesApi';
import { Modal } from '@/shared/ui/Modal';
import { Select } from '@/shared/ui/Select';
import { Button } from '@/shared/ui/Button';

interface Props {
  open: boolean;
  onClose: () => void;
  template: OnboardingTemplate | null;
}

export function AplicarTemplateModal({ open, onClose, template }: Props) {
  const iniciar = useIniciarOnboarding();
  // Lista de clientes ao vivo (inclui clientes recém-criados).
  const { data: clientes } = useClientes('');
  const clienteOptions = (clientes ?? []).map((c) => ({ value: c.id, label: c.nome }));
  const [clienteId, setClienteId] = useState('');

  // valor efetivo: o escolhido, ou o primeiro da lista.
  const valor = clienteId || clienteOptions[0]?.value || '';

  async function handleAplicar() {
    if (!template || !valor) return;
    await iniciar.mutateAsync({ templateId: template.id, clienteId: valor });
    onClose();
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={`Aplicar "${template?.nome ?? ''}" a um cliente`}
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>Cancelar</Button>
          <Button onClick={handleAplicar} disabled={iniciar.isPending}>
            {iniciar.isPending ? 'Iniciando…' : 'Iniciar onboarding'}
          </Button>
        </>
      }
    >
      <div className="space-y-3">
        <p className="text-sm text-slate-300">
          Escolha o cliente que entrou. As {template?.etapas.length ?? 0} etapas do
          template serão criadas como um novo andamento.
        </p>
        <Select
          id="cliente"
          label="Cliente"
          options={clienteOptions}
          value={valor}
          onChange={(e) => setClienteId(e.target.value)}
        />
      </div>
    </Modal>
  );
}
