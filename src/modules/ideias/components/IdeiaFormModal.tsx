import { useState, useEffect } from 'react';
import { useSalvarIdeia, useExcluirIdeia } from '@/modules/ideias/api/ideiasApi';
import { CATEGORIAS, type Ideia, type IdeiaCategoria } from '@/modules/ideias/types';
import { useAuth } from '@/shared/auth/AuthProvider';
import { Button } from '@/shared/ui/Button';
import { Select } from '@/shared/ui/Select';

interface Props {
  open: boolean;
  onClose: () => void;
  ideia?: Ideia;
}

export function IdeiaFormModal({ open, onClose, ideia }: Props) {
  const { profile } = useAuth();
  const salvar = useSalvarIdeia();
  const excluir = useExcluirIdeia();

  const [titulo, setTitulo] = useState('');
  const [descricao, setDescricao] = useState('');
  const [categoria, setCategoria] = useState<IdeiaCategoria>('geral');

  useEffect(() => {
    if (ideia) {
      setTitulo(ideia.titulo);
      setDescricao(ideia.descricao);
      setCategoria(ideia.categoria);
    } else {
      setTitulo('');
      setDescricao('');
      setCategoria('geral');
    }
  }, [ideia]);

  if (!open) return null;

  const handleSalvar = () => {
    if (!titulo.trim()) return;
    salvar.mutate(
      {
        id: ideia?.id,
        dados: {
          titulo: titulo.trim(),
          descricao: descricao.trim(),
          categoria,
          autor_nome: ideia?.autor_nome ?? profile?.nome ?? '',
        },
      },
      { onSuccess: onClose },
    );
  };

  const handleExcluir = () => {
    if (!ideia) return;
    excluir.mutate(ideia.id, { onSuccess: onClose });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4" onClick={onClose}>
      <div
        className="w-full max-w-lg rounded-xl border border-white/10 bg-slate-800 p-6 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="mb-4 text-lg font-semibold text-slate-100">
          {ideia ? 'Editar ideia' : 'Nova ideia'}
        </h2>

        <div className="space-y-4">
          <div>
            <label className="mb-1 block text-sm text-slate-300">Título</label>
            <input
              type="text"
              value={titulo}
              onChange={(e) => setTitulo(e.target.value)}
              placeholder="Ex: Criar série de vídeos curtos..."
              className="w-full rounded-lg border border-white/10 bg-slate-700 px-3 py-2 text-sm text-slate-100 placeholder-slate-500 outline-none focus:border-brand-500"
              autoFocus
            />
          </div>

          <div>
            <label className="mb-1 block text-sm text-slate-300">Descrição</label>
            <textarea
              value={descricao}
              onChange={(e) => setDescricao(e.target.value)}
              placeholder="Descreva a ideia com mais detalhes..."
              rows={4}
              className="w-full rounded-lg border border-white/10 bg-slate-700 px-3 py-2 text-sm text-slate-100 placeholder-slate-500 outline-none focus:border-brand-500"
            />
          </div>

          <div>
            <label className="mb-1 block text-sm text-slate-300">Categoria</label>
            <Select
              value={categoria}
              onChange={(e) => setCategoria(e.target.value as IdeiaCategoria)}
              options={CATEGORIAS.map((c) => ({ value: c.id, label: c.label }))}
            />
          </div>
        </div>

        <div className="mt-6 flex items-center justify-between">
          <div>
            {ideia && (
              <button
                onClick={handleExcluir}
                className="text-sm text-red-400 hover:text-red-300"
                disabled={excluir.isPending}
              >
                Excluir
              </button>
            )}
          </div>
          <div className="flex gap-2">
            <Button variant="ghost" onClick={onClose}>Cancelar</Button>
            <Button onClick={handleSalvar} disabled={!titulo.trim() || salvar.isPending}>
              {salvar.isPending ? 'Salvando...' : 'Salvar'}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
