import { useEffect, useMemo, useState } from 'react';
import { Modal } from '@/shared/ui/Modal';
import { Button } from '@/shared/ui/Button';
import { Input } from '@/shared/ui/Input';
import { Select } from '@/shared/ui/Select';
import { Textarea } from '@/shared/ui/Textarea';
import { useSalvarIdeia } from '@/modules/gestao-conteudo/api/ideiasApi';
import { FORMATO_OPCOES, type Ideia, type IdeiaForm } from '@/modules/gestao-conteudo/types';
import { semanasRotuladas } from '@/modules/gestao-conteudo/lib/semanas';
import type { ConteudoTipo } from '@/modules/conteudo/types';

interface Props {
  open: boolean;
  onClose: () => void;
  clienteId: string;
  mes: string;
  ideia?: Ideia;
  semanaInicial?: number;
}

const VAZIO: IdeiaForm = { titulo: '', descricao: '', formato: 'reels', semana: 1, dia_postagem: null };

export function IdeiaFormModal({ open, onClose, clienteId, mes, ideia, semanaInicial }: Props) {
  const salvar = useSalvarIdeia();
  const [form, setForm] = useState<IdeiaForm>(VAZIO);
  const [erro, setErro] = useState<string | null>(null);
  const semanas = useMemo(() => semanasRotuladas(mes), [mes]);
  const semanaAtual = semanas.find((s) => s.numero === form.semana);

  useEffect(() => {
    if (!open) return;
    setErro(null);
    setForm(ideia
      ? {
        titulo: ideia.titulo, descricao: ideia.descricao, formato: ideia.formato,
        semana: ideia.semana, dia_postagem: ideia.dia_postagem,
      }
      : { ...VAZIO, semana: semanaInicial ?? 1 });
  }, [open, ideia, semanaInicial]);

  const set = <K extends keyof IdeiaForm>(k: K, v: IdeiaForm[K]) => setForm((f) => ({ ...f, [k]: v }));

  function handleSalvar() {
    if (!form.titulo.trim()) { setErro('Informe o título da ideia.'); return; }
    if (form.dia_postagem && semanaAtual && (form.dia_postagem < semanaAtual.ini || form.dia_postagem > semanaAtual.fim)) {
      setErro(`O dia da postagem precisa estar dentro da semana escolhida (${semanaAtual.periodo}).`);
      return;
    }
    setErro(null);
    salvar.mutate(
      { id: ideia?.id, clienteId, mes, dados: { ...form, titulo: form.titulo.trim() } },
      {
        onSuccess: onClose,
        onError: (e) => setErro(`Não foi possível salvar: ${(e as Error).message}`),
      },
    );
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={ideia ? 'Editar ideia' : 'Nova ideia de conteúdo'}
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
        {erro && (
          <p className="rounded-lg border border-red-500/40 bg-red-500/10 px-3 py-2 text-sm text-red-300">{erro}</p>
        )}
        <Input label="Título da ideia *" value={form.titulo} onChange={(e) => set('titulo', e.target.value)}
          placeholder="Ex: Reels — 3 erros que clientes cometem ao…" autoFocus />
        <Textarea label="Explique a ideia (o que vai ser mostrado/dito)" rows={5} value={form.descricao}
          onChange={(e) => set('descricao', e.target.value)} />
        <div className="grid grid-cols-2 gap-3">
          <Select label="Formato" value={form.formato}
            onChange={(e) => set('formato', e.target.value as ConteudoTipo)}
            options={FORMATO_OPCOES} />
          <Select label="Semana" value={String(form.semana)}
            onChange={(e) => set('semana', Number(e.target.value))}
            options={semanas.map((s) => ({ value: String(s.numero), label: s.label }))} />
        </div>
        <Input label="Dia da postagem (opcional)" type="date" value={form.dia_postagem ?? ''}
          min={semanaAtual?.ini} max={semanaAtual?.fim}
          onChange={(e) => set('dia_postagem', e.target.value || null)} />
      </div>
    </Modal>
  );
}
