import { useState } from 'react';
import {
  useSalvarIndicacao,
  useExcluirIndicacao,
  type IndicacaoFormData,
} from '@/modules/indicacao/api/indicacaoApi';
import {
  INDICACAO_STATUS_LABEL,
  type IndicacaoStatus,
  type IndicacaoView,
} from '@/modules/indicacao/types';
import { useClientes } from '@/modules/clientes/api/clientesApi';
import { Modal } from '@/shared/ui/Modal';
import { Input } from '@/shared/ui/Input';
import { Select } from '@/shared/ui/Select';
import { Button } from '@/shared/ui/Button';

interface Props {
  open: boolean;
  onClose: () => void;
  indicacao?: IndicacaoView;
}

const STATUS_OPTIONS = (Object.keys(INDICACAO_STATUS_LABEL) as IndicacaoStatus[]).map((s) => ({
  value: s,
  label: INDICACAO_STATUS_LABEL[s],
}));

export function IndicacaoFormModal({ open, onClose, indicacao }: Props) {
  const salvar = useSalvarIndicacao();
  const excluir = useExcluirIndicacao();

  async function handleExcluir() {
    if (!indicacao) return;
    if (!confirm(`Excluir a indicação "${indicacao.nome_indicado}"?`)) return;
    await excluir.mutateAsync(indicacao.id);
    onClose();
  }
  const { data: clientes } = useClientes('');
  const clienteOptions = (clientes ?? []).map((c) => ({ value: c.id, label: c.nome }));

  const [form, setForm] = useState<IndicacaoFormData>({
    cliente_id: indicacao?.cliente_id ?? '',
    nome_indicado: indicacao?.nome_indicado ?? '',
    contato: indicacao?.contato ?? '',
    status: indicacao?.status ?? 'novo',
    recompensa: indicacao?.recompensa ?? 0,
  });

  function set<K extends keyof IndicacaoFormData>(k: K, v: IndicacaoFormData[K]) {
    setForm((f) => ({ ...f, [k]: v }));
  }

  const clienteValor = form.cliente_id || clienteOptions[0]?.value || '';

  async function handleSalvar() {
    if (!form.nome_indicado.trim()) return;
    await salvar.mutateAsync({ id: indicacao?.id, dados: { ...form, cliente_id: clienteValor } });
    onClose();
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={indicacao ? 'Editar indicação' : 'Nova indicação'}
      footer={
        <div className="flex w-full items-center justify-between">
          <span>
            {indicacao && (
              <Button variant="ghost" onClick={handleExcluir} className="text-red-400">Excluir</Button>
            )}
          </span>
          <span className="flex gap-2">
            <Button variant="secondary" onClick={onClose}>Cancelar</Button>
            <Button onClick={handleSalvar} disabled={salvar.isPending || !form.nome_indicado.trim()}>
              {salvar.isPending ? 'Salvando…' : 'Salvar'}
            </Button>
          </span>
        </div>
      }
    >
      <div className="space-y-4">
        <Input id="indicado" label="Nome do indicado" value={form.nome_indicado} onChange={(e) => set('nome_indicado', e.target.value)} />
        <div className="grid grid-cols-2 gap-4">
          <Select
            id="cliente"
            label="Indicado por (cliente)"
            options={clienteOptions}
            value={clienteValor}
            onChange={(e) => set('cliente_id', e.target.value)}
          />
          <Input id="contato" label="Contato" value={form.contato} onChange={(e) => set('contato', e.target.value)} />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <Select
            id="status"
            label="Status"
            options={STATUS_OPTIONS}
            value={form.status}
            onChange={(e) => set('status', e.target.value as IndicacaoStatus)}
          />
          <Input id="recompensa" type="number" label="Recompensa (R$)" value={form.recompensa} onChange={(e) => set('recompensa', Number(e.target.value))} />
        </div>
      </div>
    </Modal>
  );
}
