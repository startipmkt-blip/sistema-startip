import { useState } from 'react';
import { useSalvarIdeia, useExcluirIdeia, type IdeiaFormData } from '@/modules/aprovacao-conteudo/api/aprovacaoApi';
import type { ConteudoIdeia } from '@/modules/aprovacao-conteudo/types';
import { TIPO_LABEL, type ConteudoTipo } from '@/modules/conteudo/types';
import { useClientes } from '@/modules/clientes/api/clientesApi';
import { Modal } from '@/shared/ui/Modal';
import { Input } from '@/shared/ui/Input';
import { Select } from '@/shared/ui/Select';
import { Textarea } from '@/shared/ui/Textarea';
import { Button } from '@/shared/ui/Button';
import { AnexoUploader, type Anexo } from '@/shared/ui/AnexoUploader';

interface Props {
  open: boolean;
  onClose: () => void;
  clienteIdInicial?: string;
  mesInicial?: string;
  ideia?: ConteudoIdeia;
}

const FORMATO_OPTIONS = (Object.keys(TIPO_LABEL) as ConteudoTipo[]).map((t) => ({ value: t, label: TIPO_LABEL[t] }));

export function IdeiaFormModal({ open, onClose, clienteIdInicial, mesInicial, ideia }: Props) {
  const salvar = useSalvarIdeia();
  const excluir = useExcluirIdeia();
  const { data: clientes } = useClientes('');

  async function handleExcluir() {
    if (!ideia) return;
    if (!confirm(`Excluir a ideia "${ideia.titulo}"?`)) return;
    await excluir.mutateAsync(ideia.id);
    onClose();
  }
  const clienteOptions = (clientes ?? []).map((c) => ({ value: c.id, label: c.nome }));

  const [form, setForm] = useState<IdeiaFormData>({
    cliente_id: ideia?.cliente_id ?? clienteIdInicial ?? '',
    mes_referencia: ideia?.mes_referencia ?? mesInicial ?? new Date().toISOString().slice(0, 7),
    semana: ideia?.semana ?? 1,
    titulo: ideia?.titulo ?? '',
    descricao: ideia?.descricao ?? '',
    formato: ideia?.formato ?? 'reels',
    dia_postagem: ideia?.dia_postagem ?? null,
    anexos: ideia?.anexos ?? [],
  });

  function set<K extends keyof IdeiaFormData>(k: K, v: IdeiaFormData[K]) {
    setForm((f) => ({ ...f, [k]: v }));
  }
  const clienteValor = form.cliente_id || clienteOptions[0]?.value || '';

  async function handleSalvar() {
    if (!form.titulo.trim()) return;
    await salvar.mutateAsync({ id: ideia?.id, dados: { ...form, cliente_id: clienteValor } });
    onClose();
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={ideia ? 'Editar ideia' : 'Nova ideia de conteúdo'}
      footer={
        <div className="flex w-full items-center justify-between">
          <span>
            {ideia && (
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
        <div className="grid grid-cols-2 gap-4">
          <Select id="cliente" label="Cliente" options={clienteOptions} value={clienteValor} onChange={(e) => set('cliente_id', e.target.value)} />
          <Input id="mes" type="month" label="Mês de referência" value={form.mes_referencia} onChange={(e) => set('mes_referencia', e.target.value)} />
        </div>
        <Input id="titulo" label="Título da ideia" value={form.titulo} onChange={(e) => set('titulo', e.target.value)} />
        <Textarea id="descricao" label="Descrição / legenda" value={form.descricao} onChange={(e) => set('descricao', e.target.value)} />
        <div className="grid grid-cols-2 gap-4">
          <Select
            id="formato"
            label="Formato"
            options={FORMATO_OPTIONS}
            value={form.formato}
            onChange={(e) => set('formato', e.target.value as ConteudoTipo)}
          />
          <Select
            id="semana"
            label="Semana do mês"
            options={[1, 2, 3, 4].map((n) => ({ value: String(n), label: `Semana ${n}` }))}
            value={String(form.semana)}
            onChange={(e) => set('semana', Number(e.target.value))}
          />
        </div>
        <Input
          id="dia"
          type="date"
          label="Dia programado para postagem (opcional)"
          value={form.dia_postagem ?? ''}
          onChange={(e) => set('dia_postagem', e.target.value || null)}
        />
        <div>
          <label className="mb-1 block text-xs text-slate-300">
            Anexos (referências, imagens, PDF do briefing)
          </label>
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
