import { useEffect, useState } from 'react';
import { Modal } from '@/shared/ui/Modal';
import { Button } from '@/shared/ui/Button';
import { Input } from '@/shared/ui/Input';
import { Select } from '@/shared/ui/Select';
import { Textarea } from '@/shared/ui/Textarea';
import { useSalvarPost } from '@/modules/gestao-conteudo/api/gestaoApi';
import {
  FORMATO_OPCOES, driveInfo, type Post, type PostForm,
} from '@/modules/gestao-conteudo/types';
import type { ConteudoTipo } from '@/modules/conteudo/types';

interface Props {
  open: boolean;
  onClose: () => void;
  clienteId: string;
  mes: string;
  post?: Post;
  semanaInicial?: number;
}

const VAZIO: PostForm = {
  titulo: '', descricao: '', formato: 'reels', semana: 1, dia_postagem: null, link_drive: '',
};

export function PostFormModal({ open, onClose, clienteId, mes, post, semanaInicial }: Props) {
  const salvar = useSalvarPost();
  const [form, setForm] = useState<PostForm>(VAZIO);
  const [erro, setErro] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    setErro(null);
    setForm(post
      ? {
        titulo: post.titulo, descricao: post.descricao, formato: post.formato,
        semana: post.semana, dia_postagem: post.dia_postagem, link_drive: post.link_drive ?? '',
      }
      : { ...VAZIO, semana: semanaInicial ?? 1 });
  }, [open, post, semanaInicial]);

  const set = <K extends keyof PostForm>(k: K, v: PostForm[K]) => setForm((f) => ({ ...f, [k]: v }));
  const info = driveInfo(form.link_drive);

  function handleSalvar() {
    if (!form.titulo.trim()) { setErro('Informe o título do conteúdo.'); return; }
    if (form.link_drive?.trim() && info.tipo === 'invalido') {
      setErro('Link inválido. Cole o link de compartilhamento do Google Drive.');
      return;
    }
    setErro(null);
    salvar.mutate(
      { id: post?.id, clienteId, mes, dados: { ...form, titulo: form.titulo.trim() } },
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
      title={post ? 'Editar conteúdo' : 'Novo conteúdo'}
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
        <Input label="Título *" value={form.titulo} onChange={(e) => set('titulo', e.target.value)}
          placeholder="Ex: Reels — bastidores da produção" autoFocus />
        <Textarea label="Legenda / descrição" rows={3} value={form.descricao}
          onChange={(e) => set('descricao', e.target.value)} />
        <div className="grid grid-cols-2 gap-3">
          <Select label="Formato" value={form.formato}
            onChange={(e) => set('formato', e.target.value as ConteudoTipo)}
            options={FORMATO_OPCOES} />
          <Select label="Semana do mês" value={String(form.semana)}
            onChange={(e) => set('semana', Number(e.target.value))}
            options={[1, 2, 3, 4].map((n) => ({ value: String(n), label: `Semana ${n}` }))} />
        </div>
        <Input label="Dia da postagem" type="date" value={form.dia_postagem ?? ''}
          onChange={(e) => set('dia_postagem', e.target.value || null)} />
        <div className="space-y-1">
          <Input label="Link do arquivo no Drive" type="url" inputMode="url"
            placeholder="https://drive.google.com/file/d/…"
            value={form.link_drive ?? ''} onChange={(e) => set('link_drive', e.target.value)} />
          {info.tipo === 'arquivo' && <p className="text-[11px] text-emerald-400">✓ Arquivo reconhecido — a prévia aparece para você e para o cliente.</p>}
          {info.tipo === 'pasta' && <p className="text-[11px] text-amber-300">Isso é uma pasta. Cole o link do arquivo (vídeo ou imagem) para ter a prévia.</p>}
          <p className="text-[11px] text-slate-500">
            No Drive: Compartilhar → "Qualquer pessoa com o link" → Copiar link.
          </p>
        </div>
      </div>
    </Modal>
  );
}
