import { useState } from 'react';
import { Modal } from '@/shared/ui/Modal';
import { Button } from '@/shared/ui/Button';
import { Input } from '@/shared/ui/Input';
import { useRespostasRapidas, type RespostaRapida } from '@/modules/crm/api/respostasRapidasApi';

interface Props {
  open: boolean;
  onClose: () => void;
}

export function RespostasRapidasModal({ open, onClose }: Props) {
  const { lista, salvar, remover } = useRespostasRapidas();
  const [editando, setEditando] = useState<Partial<RespostaRapida> | null>(null);

  function handleSalvar() {
    if (!editando) return;
    if (!editando.atalho?.trim() || !editando.texto?.trim()) return;
    salvar({ id: editando.id, atalho: editando.atalho.trim(), texto: editando.texto.trim() });
    setEditando(null);
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Respostas rápidas"
      footer={<Button variant="secondary" onClick={onClose}>Fechar</Button>}
    >
      <div className="space-y-4">
        <p className="text-xs text-slate-400">
          Digite <code className="rounded bg-white/10 px-1">/</code> seguido do atalho no
          compositor da conversa para inserir a resposta.
        </p>

        <ul className="max-h-64 space-y-2 overflow-y-auto rounded-md border border-white/10 bg-white/[0.02] p-2">
          {lista.length === 0 && <li className="p-4 text-center text-xs text-slate-500">Nenhuma resposta cadastrada.</li>}
          {lista.map((r) => (
            <li key={r.id} className="rounded-md border border-white/5 bg-white/[0.03] px-3 py-2">
              <div className="flex items-start gap-3">
                <div className="min-w-0 flex-1">
                  <div className="text-xs font-mono text-brand-300">/{r.atalho}</div>
                  <div className="text-sm text-slate-200">{r.texto}</div>
                </div>
                <button
                  onClick={() => setEditando(r)}
                  className="rounded px-2 py-1 text-xs text-slate-400 hover:bg-white/10"
                >
                  editar
                </button>
                <button
                  onClick={() => remover(r.id)}
                  className="rounded px-2 py-1 text-xs text-red-300 hover:bg-red-500/10"
                >
                  remover
                </button>
              </div>
            </li>
          ))}
        </ul>

        {editando ? (
          <div className="space-y-3 rounded-md border border-brand-400/40 bg-brand-500/5 p-3">
            <Input
              id="rr-atalho"
              label="Atalho (sem barra)"
              value={editando.atalho ?? ''}
              onChange={(e) => setEditando({ ...editando, atalho: e.target.value })}
              placeholder="ex: orcamento"
            />
            <label className="block text-xs text-slate-300">
              Mensagem
              <textarea
                value={editando.texto ?? ''}
                onChange={(e) => setEditando({ ...editando, texto: e.target.value })}
                rows={3}
                placeholder="Texto que será inserido no compositor…"
                className="mt-1 w-full resize-none rounded-md border border-white/10 bg-white/5 px-3 py-2 text-sm text-slate-100 placeholder:text-slate-500 focus:border-brand-400 focus:outline-none"
              />
            </label>
            <div className="flex justify-end gap-2">
              <Button variant="secondary" onClick={() => setEditando(null)}>Cancelar</Button>
              <Button onClick={handleSalvar}>Salvar</Button>
            </div>
          </div>
        ) : (
          <Button variant="secondary" onClick={() => setEditando({ atalho: '', texto: '' })}>
            + Nova resposta
          </Button>
        )}
      </div>
    </Modal>
  );
}
