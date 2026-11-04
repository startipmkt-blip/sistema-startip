import { useState } from 'react';
import { createPortal } from 'react-dom';
import { GlassIcon } from '@/shared/ui/GlassIcon';
import { confirmar } from '@/shared/ui/ConfirmDialog';
import { CORES_PILAR, Rotulo, Texto } from '@/shared/ui/form/FormKit';

export interface ItemCategoria {
  id: string;
  nome: string;
  cor: string;
}

interface Props {
  open: boolean;
  onClose: () => void;
  titulo: string;
  rotuloNovo: string;
  placeholder: string;
  itens: ItemCategoria[];
  onCriar: (nome: string, cor: string) => Promise<unknown>;
  onSalvar: (id: string, nome: string, cor: string) => Promise<unknown>;
  onExcluir: (id: string) => Promise<unknown>;
  /** Texto do aviso ao excluir (o que acontece com o que usava a categoria). */
  avisoExcluir: string;
}

/** Lista editável de categorias com cor (pilares editoriais, categorias de POP). Abre por cima de outra janela. */
export function GerenciarCategorias({ open, onClose, titulo, rotuloNovo, placeholder, itens, onCriar, onSalvar, onExcluir, avisoExcluir }: Props) {
  const [novo, setNovo] = useState('');
  const [cor, setCor] = useState(CORES_PILAR[0]);
  const [editando, setEditando] = useState<{ id: string; nome: string; cor: string } | null>(null);
  const [erro, setErro] = useState('');
  const [salvando, setSalvando] = useState(false);

  if (!open) return null;

  async function rodar(f: () => Promise<unknown>) {
    setErro('');
    setSalvando(true);
    try { await f(); } catch (e) { setErro((e as Error).message); } finally { setSalvando(false); }
  }

  return createPortal(
    <div className="janela-fundo fixed inset-0 z-[60] flex items-center justify-center bg-slate-950/60 p-3">
      <div className="janela-form flex max-h-[90vh] w-full max-w-[460px] flex-col overflow-hidden rounded-2xl border border-white/10 bg-[#121a24] shadow-pop">
        <div className="flex items-center justify-between px-6 pb-3 pt-5">
          <h2 className="text-lg font-bold text-white">{titulo}</h2>
          <button onClick={onClose} className="rounded-lg p-1 text-slate-400 hover:bg-white/10" aria-label="Fechar"><GlassIcon name="x" /></button>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto px-6 pb-2">
          <ul className="flex flex-col gap-2">
            {itens.map((it) => (
              <li key={it.id} className="secao-form flex items-center gap-3 rounded-xl border border-white/10 bg-white/[0.02] px-3.5 py-2.5">
                {editando?.id === it.id ? (
                  <div className="flex w-full flex-col gap-2">
                    <Texto value={editando.nome} onChange={(e) => setEditando({ ...editando, nome: e.target.value })} autoFocus />
                    <div className="flex flex-wrap items-center gap-2">
                      {CORES_PILAR.map((c) => (
                        <button key={c} type="button" onClick={() => setEditando({ ...editando, cor: c })} aria-label={`Cor ${c}`}
                          className={`h-6 w-6 rounded-full ${editando.cor === c ? 'ring-2 ring-offset-2 ring-offset-transparent ring-brand-400' : ''}`} style={{ backgroundColor: c }} />
                      ))}
                      <span className="ml-auto flex gap-2">
                        <button type="button" onClick={() => setEditando(null)} className="text-xs font-semibold text-slate-400">Cancelar</button>
                        <button
                          type="button"
                          disabled={!editando.nome.trim() || salvando}
                          onClick={() => void rodar(async () => { await onSalvar(editando.id, editando.nome.trim(), editando.cor); setEditando(null); })}
                          className="text-xs font-semibold text-brand-300 disabled:opacity-50"
                        >
                          Salvar
                        </button>
                      </span>
                    </div>
                  </div>
                ) : (
                  <>
                    <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ backgroundColor: it.cor }} />
                    <span className="min-w-0 flex-1 truncate text-sm font-medium text-slate-100">{it.nome}</span>
                    <button type="button" onClick={() => setEditando({ ...it })} className="rounded p-1 text-slate-400 hover:text-slate-200" aria-label={`Editar ${it.nome}`}>
                      <GlassIcon name="pencil" className="h-4 w-4" />
                    </button>
                    <button
                      type="button"
                      onClick={async () => { if (await confirmar(`Excluir "${it.nome}"? ${avisoExcluir}`)) void rodar(() => onExcluir(it.id)); }}
                      className="rounded p-1 text-slate-400 hover:text-red-400"
                      aria-label={`Excluir ${it.nome}`}
                    >
                      <GlassIcon name="trash" className="h-4 w-4" />
                    </button>
                  </>
                )}
              </li>
            ))}
            {itens.length === 0 && <li className="py-3 text-center text-sm text-slate-400">Nada cadastrado ainda.</li>}
          </ul>

          <div className="mt-4 flex flex-col gap-2 border-t border-white/10 pt-4">
            <Rotulo>{rotuloNovo}</Rotulo>
            <Texto
              placeholder={placeholder} value={novo} onChange={(e) => setNovo(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter' && novo.trim()) { e.preventDefault(); void rodar(async () => { await onCriar(novo.trim(), cor); setNovo(''); }); } }}
            />
            <div className="flex flex-wrap gap-2">
              {CORES_PILAR.map((c) => (
                <button key={c} type="button" onClick={() => setCor(c)} aria-label={`Cor ${c}`} aria-pressed={cor === c}
                  className="flex h-7 w-7 items-center justify-center rounded-full" style={{ backgroundColor: c }}>
                  {cor === c && <GlassIcon name="check" tone="white" className="h-4 w-4" />}
                </button>
              ))}
            </div>
            <button
              type="button"
              disabled={!novo.trim() || salvando}
              onClick={() => void rodar(async () => { await onCriar(novo.trim(), cor); setNovo(''); })}
              className="botao-adicionar flex items-center justify-center gap-2 rounded-lg bg-brand-500/15 py-2.5 text-sm font-semibold text-brand-300 disabled:opacity-50"
            >
              <GlassIcon name="plus" className="h-4 w-4" /> {rotuloNovo.replace(/^Novo |^Nova /, 'Adicionar ').toLowerCase().replace(/^adicionar/, 'Adicionar')}
            </button>
            {erro && <p role="alert" className="text-xs text-red-400">{erro}</p>}
          </div>
        </div>
        <div className="flex justify-end px-6 pb-5 pt-3">
          <button type="button" onClick={onClose} className="rounded-lg border border-white/10 bg-white/[0.04] px-4 py-2 text-sm font-semibold text-slate-100 hover:bg-white/10">Concluir</button>
        </div>
      </div>
    </div>,
    document.body,
  );
}
