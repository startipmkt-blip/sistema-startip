import { useState } from 'react';
import {
  useSalvarConteudo,
  useExcluirConteudo,
  type ConteudoFormData,
} from '@/modules/conteudo/api/conteudoApi';
import {
  CONTEUDO_COLUNAS,
  TIPO_LABEL,
  type ConteudoTipo,
  type ConteudoView,
} from '@/modules/conteudo/types';
import { useClientes } from '@/modules/clientes/api/clientesApi';
import { Modal } from '@/shared/ui/Modal';
import { Input } from '@/shared/ui/Input';
import { Select } from '@/shared/ui/Select';
import { Button } from '@/shared/ui/Button';

interface Props {
  open: boolean;
  onClose: () => void;
  conteudo?: ConteudoView;
}

const TIPO_OPTIONS = (Object.keys(TIPO_LABEL) as ConteudoTipo[]).map((t) => ({
  value: t,
  label: TIPO_LABEL[t],
}));

export function ConteudoFormModal({ open, onClose, conteudo }: Props) {
  const salvar = useSalvarConteudo();
  const excluir = useExcluirConteudo();

  async function handleExcluir() {
    if (!conteudo) return;
    if (!confirm(`Excluir "${conteudo.titulo}"?`)) return;
    await excluir.mutateAsync(conteudo.id);
    onClose();
  }
  const { data: clientes } = useClientes('');
  const clienteOptions = (clientes ?? []).map((c) => ({ value: c.id, label: c.nome }));

  const [form, setForm] = useState<ConteudoFormData>({
    cliente_id: conteudo?.cliente_id ?? '',
    titulo: conteudo?.titulo ?? '',
    tipo: conteudo?.tipo ?? 'reels',
    status: conteudo?.status ?? 'ideia',
    data_publicacao: conteudo?.data_publicacao ?? new Date().toISOString().slice(0, 10),
  });

  function set<K extends keyof ConteudoFormData>(k: K, v: ConteudoFormData[K]) {
    setForm((f) => ({ ...f, [k]: v }));
  }

  const clienteValor = form.cliente_id || clienteOptions[0]?.value || '';

  async function handleSalvar() {
    if (!form.titulo.trim()) return;
    await salvar.mutateAsync({ id: conteudo?.id, dados: { ...form, cliente_id: clienteValor } });
    onClose();
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={conteudo ? 'Editar conteúdo' : 'Novo conteúdo'}
      footer={
        <div className="flex w-full items-center justify-between">
          <span>
            {conteudo && (
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
            id="cliente"
            label="Cliente"
            options={clienteOptions}
            value={clienteValor}
            onChange={(e) => set('cliente_id', e.target.value)}
          />
          <Input
            id="data"
            type="date"
            label="Data de publicação"
            value={form.data_publicacao}
            onChange={(e) => set('data_publicacao', e.target.value)}
          />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <Select
            id="tipo"
            label="Tipo"
            options={TIPO_OPTIONS}
            value={form.tipo}
            onChange={(e) => set('tipo', e.target.value as ConteudoTipo)}
          />
          <Select
            id="status"
            label="Status"
            options={CONTEUDO_COLUNAS.map((c) => ({ value: c.id, label: c.label }))}
            value={form.status}
            onChange={(e) => set('status', e.target.value as ConteudoFormData['status'])}
          />
        </div>
      </div>
    </Modal>
  );
}
