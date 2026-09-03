import { useState } from 'react';
import {
  useSalvarDemanda,
  useExcluirDemanda,
  type DemandaFormData,
} from '@/modules/demandas/api/demandasApi';
import {
  DEMANDA_COLUNAS,
  DEMANDA_SETORES,
  PRIORIDADE_LABEL,
  RESPONSAVEIS,
  type DemandaPrioridade,
  type DemandaSetor,
  type DemandaView,
} from '@/modules/demandas/types';
import { useClientes } from '@/modules/clientes/api/clientesApi';
import { Modal } from '@/shared/ui/Modal';
import { Input } from '@/shared/ui/Input';
import { Select } from '@/shared/ui/Select';
import { Button } from '@/shared/ui/Button';

interface Props {
  open: boolean;
  onClose: () => void;
  demanda?: DemandaView;
}

const PRIORIDADE_OPTIONS = (Object.keys(PRIORIDADE_LABEL) as DemandaPrioridade[]).map((p) => ({
  value: p,
  label: PRIORIDADE_LABEL[p],
}));

export function DemandaFormModal({ open, onClose, demanda }: Props) {
  const salvar = useSalvarDemanda();
  const excluir = useExcluirDemanda();

  async function handleExcluir() {
    if (!demanda) return;
    if (!confirm(`Excluir "${demanda.titulo}"?`)) return;
    await excluir.mutateAsync(demanda.id);
    onClose();
  }
  const { data: clientes } = useClientes('');
  // '' = demanda interna (sem cliente).
  const clienteOptions = [
    { value: '', label: 'Interna (sem cliente)' },
    ...(clientes ?? []).map((c) => ({ value: c.id, label: c.nome })),
  ];

  const [form, setForm] = useState({
    cliente_id: demanda?.cliente_id ?? '',
    setor: demanda?.setor ?? 'geral',
    privada: demanda?.privada ?? false,
    titulo: demanda?.titulo ?? '',
    responsavel: demanda?.responsavel ?? '',
    prioridade: demanda?.prioridade ?? 'media',
    status: demanda?.status ?? 'aberta',
    prazo: demanda?.prazo ?? new Date().toISOString().slice(0, 10),
  });

  function set<K extends keyof typeof form>(k: K, v: (typeof form)[K]) {
    setForm((f) => ({ ...f, [k]: v }));
  }

  async function handleSalvar() {
    if (!form.titulo.trim()) return;
    const dados: DemandaFormData = {
      ...form,
      cliente_id: form.cliente_id || null, // vazio => interna
      setor: form.setor as DemandaSetor,
      prioridade: form.prioridade as DemandaPrioridade,
      status: form.status as DemandaFormData['status'],
    };
    await salvar.mutateAsync({ id: demanda?.id, dados });
    onClose();
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={demanda ? 'Editar demanda' : 'Nova demanda'}
      footer={
        <div className="flex w-full items-center justify-between">
          <span>
            {demanda && (
              <Button variant="ghost" onClick={handleExcluir} className="text-red-400">Excluir</Button>
            )}
          </span>
          <span className="flex gap-2">
            <Button variant="secondary" onClick={onClose}>Cancelar</Button>
            <Button onClick={handleSalvar} disabled={salvar.isPending || !form.titulo.trim()}>
              {salvar.isPending ? 'Salvando…' : 'Salvar'}
            </Button>
          </span>
        </div>
      }
    >
      <div className="space-y-4">
        <Input id="titulo" label="Título" value={form.titulo} onChange={(e) => set('titulo', e.target.value)} />
        <div className="grid grid-cols-2 gap-4">
          <Select
            id="setor"
            label="Setor"
            options={DEMANDA_SETORES.map((s) => ({ value: s.id, label: s.label }))}
            value={form.setor}
            onChange={(e) => set('setor', e.target.value as DemandaSetor)}
          />
          <label className="flex items-end gap-2 pb-2 text-sm text-slate-200">
            <input
              type="checkbox"
              checked={form.privada}
              onChange={(e) => set('privada', e.target.checked)}
            />
            Privada (só sócios)
          </label>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <Select
            id="cliente"
            label="Cliente"
            options={clienteOptions}
            value={form.cliente_id ?? ''}
            onChange={(e) => set('cliente_id', e.target.value)}
          />
          <Select
            id="responsavel"
            label="Responsável"
            options={[{ value: '', label: '— selecionar —' }, ...RESPONSAVEIS.map((r) => ({ value: r, label: r }))]}
            value={form.responsavel ?? ''}
            onChange={(e) => set('responsavel', e.target.value)}
          />
        </div>
        <div className="grid grid-cols-3 gap-4">
          <Select
            id="prioridade"
            label="Prioridade"
            options={PRIORIDADE_OPTIONS}
            value={form.prioridade}
            onChange={(e) => set('prioridade', e.target.value as DemandaPrioridade)}
          />
          <Select
            id="status"
            label="Status"
            options={DEMANDA_COLUNAS.map((c) => ({ value: c.id, label: c.label }))}
            value={form.status}
            onChange={(e) => set('status', e.target.value as typeof form.status)}
          />
          <Input id="prazo" type="date" label="Prazo" value={form.prazo ?? ''} onChange={(e) => set('prazo', e.target.value)} />
        </div>
      </div>
    </Modal>
  );
}
