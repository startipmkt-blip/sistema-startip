import { useState } from 'react';
import {
  useSalvarDespesa,
  type DespesaFormData,
} from '@/modules/financeiro/api/financeiroApi';
import type { Despesa } from '@/modules/financeiro/types';
import { Modal } from '@/shared/ui/Modal';
import { Input } from '@/shared/ui/Input';
import { Select } from '@/shared/ui/Select';
import { Button } from '@/shared/ui/Button';

interface Props {
  open: boolean;
  onClose: () => void;
  despesa?: Despesa;
}

export function DespesaFormModal({ open, onClose, despesa }: Props) {
  const salvar = useSalvarDespesa();
  const [form, setForm] = useState<DespesaFormData>({
    descricao: despesa?.descricao ?? '',
    categoria: despesa?.categoria ?? 'assinatura',
    valor: despesa?.valor ?? 0,
    vencimento: despesa?.vencimento ?? new Date().toISOString().slice(0, 10),
    recorrente: despesa?.recorrente ?? true,
    parcela_atual: despesa?.parcela_atual ?? null,
    parcelas_total: despesa?.parcelas_total ?? null,
    status: despesa?.status ?? 'pendente',
  });
  const [modoRec, setModoRec] = useState<'unica' | 'mensal' | 'parcelado'>(
    despesa?.parcelas_total ? 'parcelado' : despesa?.recorrente ? 'mensal' : 'unica',
  );

  function set<K extends keyof DespesaFormData>(k: K, v: DespesaFormData[K]) {
    setForm((f) => ({ ...f, [k]: v }));
  }

  async function handleSalvar() {
    if (!form.descricao.trim()) return;
    const dados: DespesaFormData = {
      ...form,
      recorrente: modoRec !== 'unica',
      parcela_atual: modoRec === 'parcelado' ? form.parcela_atual ?? 1 : null,
      parcelas_total: modoRec === 'parcelado' ? form.parcelas_total ?? null : null,
    };
    await salvar.mutateAsync({ id: despesa?.id, dados });
    onClose();
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={despesa ? 'Editar despesa' : 'Nova despesa'}
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>Cancelar</Button>
          <Button onClick={handleSalvar} disabled={salvar.isPending || !form.descricao.trim()}>
            {salvar.isPending ? 'Salvando…' : 'Salvar'}
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        <Input
          id="descricao"
          label="Descrição"
          value={form.descricao}
          onChange={(e) => set('descricao', e.target.value)}
        />
        <div className="grid grid-cols-2 gap-4">
          <Select
            id="categoria"
            label="Categoria"
            options={[
              { value: 'assinatura', label: 'Assinatura' },
              { value: 'parcela', label: 'Parcela' },
              { value: 'imposto', label: 'Imposto' },
              { value: 'salario', label: 'Salário / Pró-labore' },
              { value: 'investimento', label: 'Investimento na agência' },
              { value: 'outro', label: 'Outro' },
            ]}
            value={form.categoria}
            onChange={(e) => set('categoria', e.target.value as DespesaFormData['categoria'])}
          />
          <Input
            id="valor"
            type="number"
            label="Valor (R$)"
            value={form.valor}
            onChange={(e) => set('valor', Number(e.target.value))}
          />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <Input
            id="vencimento"
            type="date"
            label="Vencimento"
            value={form.vencimento}
            onChange={(e) => set('vencimento', e.target.value)}
          />
          <Select
            id="recorrencia"
            label="Recorrência"
            options={[
              { value: 'unica', label: 'Única' },
              { value: 'mensal', label: 'Mensal (indefinida)' },
              { value: 'parcelado', label: 'Parcelado (X de Y)' },
            ]}
            value={modoRec}
            onChange={(e) => setModoRec(e.target.value as 'unica' | 'mensal' | 'parcelado')}
          />
        </div>
        {modoRec === 'parcelado' && (
          <div className="grid grid-cols-2 gap-4 rounded-md border border-brand-500/20 bg-brand-500/5 p-3">
            <Input
              id="p-atual" type="number" label="Parcela atual"
              value={form.parcela_atual ?? 1}
              onChange={(e) => set('parcela_atual', Number(e.target.value))}
            />
            <Input
              id="p-total" type="number" label="Total de parcelas"
              value={form.parcelas_total ?? 1}
              onChange={(e) => set('parcelas_total', Number(e.target.value))}
            />
          </div>
        )}
      </div>
    </Modal>
  );
}
