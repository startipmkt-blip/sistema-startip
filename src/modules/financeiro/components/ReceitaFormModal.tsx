import { useState } from 'react';
import {
  useSalvarReceita,
  type ReceitaFormData,
} from '@/modules/financeiro/api/financeiroApi';
import type { ReceitaClienteView } from '@/modules/financeiro/types';
import { useClientes } from '@/modules/clientes/api/clientesApi';
import { Modal } from '@/shared/ui/Modal';
import { Input } from '@/shared/ui/Input';
import { Select } from '@/shared/ui/Select';
import { Button } from '@/shared/ui/Button';

interface Props {
  open: boolean;
  onClose: () => void;
  receita?: ReceitaClienteView;
}

export function ReceitaFormModal({ open, onClose, receita }: Props) {
  const salvar = useSalvarReceita();
  const { data: clientes } = useClientes('');
  const clienteOptions = (clientes ?? []).map((c) => ({ value: c.id, label: c.nome }));
  const [form, setForm] = useState<ReceitaFormData>({
    cliente_id: receita?.cliente_id ?? '',
    valor_mensal: receita?.valor_mensal ?? 0,
    dia_vencimento: receita?.dia_vencimento ?? 5,
    status: receita?.status ?? 'em_dia',
    ativo: receita?.ativo ?? true,
  });

  function set<K extends keyof ReceitaFormData>(k: K, v: ReceitaFormData[K]) {
    setForm((f) => ({ ...f, [k]: v }));
  }

  const clienteValor = form.cliente_id || clienteOptions[0]?.value || '';

  async function handleSalvar() {
    await salvar.mutateAsync({ id: receita?.id, dados: { ...form, cliente_id: clienteValor } });
    onClose();
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={receita ? 'Editar pagamento do cliente' : 'Novo pagamento de cliente'}
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>Cancelar</Button>
          <Button onClick={handleSalvar} disabled={salvar.isPending}>
            {salvar.isPending ? 'Salvando…' : 'Salvar'}
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        <Select
          id="cliente"
          label="Cliente"
          options={clienteOptions}
          value={clienteValor}
          onChange={(e) => set('cliente_id', e.target.value)}
        />
        <div className="grid grid-cols-2 gap-4">
          <Input
            id="valor"
            type="number"
            label="Valor mensal (R$)"
            value={form.valor_mensal}
            onChange={(e) => set('valor_mensal', Number(e.target.value))}
          />
          <Input
            id="dia"
            type="number"
            min={1}
            max={31}
            label="Dia de vencimento"
            value={form.dia_vencimento}
            onChange={(e) => set('dia_vencimento', Number(e.target.value))}
          />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <Select
            id="status"
            label="Status"
            options={[
              { value: 'em_dia', label: 'Em dia' },
              { value: 'atrasado', label: 'Atrasado' },
            ]}
            value={form.status}
            onChange={(e) => set('status', e.target.value as ReceitaFormData['status'])}
          />
          <Select
            id="ativo"
            label="Contrato"
            options={[
              { value: 'true', label: 'Ativo' },
              { value: 'false', label: 'Inativo' },
            ]}
            value={String(form.ativo)}
            onChange={(e) => set('ativo', e.target.value === 'true')}
          />
        </div>
      </div>
    </Modal>
  );
}
