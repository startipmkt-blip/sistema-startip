import { useState } from 'react';
import {
  useSalvarProcessoDoc,
  type ProcessoFormData,
} from '@/modules/processos/api/processosApi';
import { CATEGORIA_OPTIONS, type ProcessoDoc } from '@/modules/processos/types';
import { Modal } from '@/shared/ui/Modal';
import { Input } from '@/shared/ui/Input';
import { Select } from '@/shared/ui/Select';
import { Textarea } from '@/shared/ui/Textarea';
import { Button } from '@/shared/ui/Button';
import { AnexoUploader, type Anexo } from '@/shared/ui/AnexoUploader';

interface Props {
  open: boolean;
  onClose: () => void;
  doc?: ProcessoDoc;
}

export function ProcessoFormModal({ open, onClose, doc }: Props) {
  const salvar = useSalvarProcessoDoc();
  const [form, setForm] = useState<ProcessoFormData>({
    categoria: doc?.categoria ?? 'geral',
    titulo: doc?.titulo ?? '',
    conteudo: doc?.conteudo ?? '',
    autor: doc?.autor ?? '',
    anexos: doc?.anexos ?? [],
  });

  function set<K extends keyof ProcessoFormData>(k: K, v: ProcessoFormData[K]) {
    setForm((f) => ({ ...f, [k]: v }));
  }

  async function handleSalvar() {
    if (!form.titulo.trim()) return;
    await salvar.mutateAsync({ id: doc?.id, dados: form });
    onClose();
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={doc ? 'Editar documento' : 'Novo documento'}
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>Cancelar</Button>
          <Button onClick={handleSalvar} disabled={salvar.isPending || !form.titulo.trim()}>
            {salvar.isPending ? 'Salvando…' : 'Salvar'}
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        <Input id="titulo" label="Título" value={form.titulo} onChange={(e) => set('titulo', e.target.value)} />
        <div className="grid grid-cols-2 gap-4">
          <Select
            id="categoria"
            label="Categoria"
            options={CATEGORIA_OPTIONS}
            value={form.categoria}
            onChange={(e) => set('categoria', e.target.value as ProcessoFormData['categoria'])}
          />
          <Input id="autor" label="Autor" value={form.autor} onChange={(e) => set('autor', e.target.value)} />
        </div>
        <Textarea
          id="conteudo"
          label="Conteúdo (passo a passo)"
          className="min-h-[200px]"
          value={form.conteudo}
          onChange={(e) => set('conteudo', e.target.value)}
        />
        <div>
          <label className="mb-1 block text-xs text-slate-300">Anexos (PDF, DOC, imagem)</label>
          <AnexoUploader
            bucket="anexos-internos"
            anexos={(form.anexos ?? []) as Anexo[]}
            onChange={(a) => set('anexos', a)}
          />
        </div>
      </div>
    </Modal>
  );
}
