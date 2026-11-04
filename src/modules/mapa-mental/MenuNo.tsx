import { useState, type ReactNode } from 'react';
import { GlassIcon } from '@/shared/ui/GlassIcon';
import { CORES_NO, ICONES_NO, STATUS_NO, type FormatoNo, type LinkNo, type NoMapa } from './types';

interface Props {
  no: NoMapa;
  temFilhos: boolean;
  /** Posição na tela (px), já convertida do canvas. */
  x: number;
  y: number;
  onMudar: (m: Partial<NoMapa>) => void;
  onAdicionarFilho: () => void;
  onEditarTexto: () => void;
  onCriarRoteiro: () => void;
  onExcluir: () => void;
  onFechar: () => void;
}

const FORMATOS: { id: FormatoNo; label: string }[] = [
  { id: 'retangulo', label: 'Retângulo' },
  { id: 'arredondado', label: 'Arredondado' },
  { id: 'pilula', label: 'Pílula' },
];

function Grupo({ titulo, children }: { titulo: string; children: ReactNode }) {
  return (
    <div className="border-t border-white/10 py-1.5 first:border-t-0">
      <div className="px-3 pb-1 pt-1 text-[10.5px] font-bold uppercase tracking-[0.12em] text-slate-400">{titulo}</div>
      {children}
    </div>
  );
}

function Item({ icone, rotulo, atalho, onClick, perigo }: { icone: string; rotulo: string; atalho?: string; onClick: () => void; perigo?: boolean }) {
  return (
    <button type="button" onClick={onClick}
      className={`flex w-full items-center gap-2.5 px-3 py-1.5 text-left text-sm hover:bg-white/[0.06] ${perigo ? 'text-red-400' : 'text-slate-100'}`}>
      <GlassIcon name={icone} className="h-4 w-4" />
      <span className="flex-1">{rotulo}</span>
      {atalho && <kbd className="text-xs text-slate-400">{atalho}</kbd>}
    </button>
  );
}

function Expansivel({ icone, rotulo, aberto, onAlternar, children, resumo }: {
  icone: string; rotulo: string; aberto: boolean; onAlternar: () => void; children: ReactNode; resumo?: string;
}) {
  return (
    <div>
      <button type="button" onClick={onAlternar} aria-expanded={aberto}
        className="flex w-full items-center gap-2.5 px-3 py-1.5 text-left text-sm text-slate-100 hover:bg-white/[0.06]">
        <GlassIcon name={icone} className="h-4 w-4" />
        <span className="flex-1">{rotulo}</span>
        {resumo && <span className="max-w-[90px] truncate text-xs text-slate-400">{resumo}</span>}
        <GlassIcon name={aberto ? 'chevron-down' : 'chevron-right'} className="h-3.5 w-3.5" />
      </button>
      {aberto && <div className="px-3 pb-2 pt-1">{children}</div>}
    </div>
  );
}

const CAMPO = 'campo-form w-full rounded-lg border border-white/10 bg-white/[0.04] px-2.5 py-1.5 text-sm text-slate-100 focus:border-brand-400 focus:outline-none';

/** Menu "⋮" de um nó do mapa mental. */
export function MenuNo({ no, temFilhos, x, y, onMudar, onAdicionarFilho, onEditarTexto, onCriarRoteiro, onExcluir, onFechar }: Props) {
  const [aberto, setAberto] = useState<string | null>(null);
  const [novoLink, setNovoLink] = useState<LinkNo>({ rotulo: '', url: '' });
  const alternar = (k: string) => setAberto((a) => (a === k ? null : k));
  const raiz = no.pai === null;

  function addLink() {
    const url = novoLink.url.trim();
    if (!url) return;
    onMudar({ links: [...no.links, { rotulo: novoLink.rotulo.trim() || url, url: /^https?:\/\//i.test(url) ? url : `https://${url}` }] });
    setNovoLink({ rotulo: '', url: '' });
  }

  return (
    <>
      <div className="fixed inset-0 z-40" onClick={onFechar} aria-hidden />
      <div
        role="menu"
        className="menu-no glass absolute z-50 max-h-[420px] w-64 overflow-y-auto py-1 shadow-pop"
        style={{ left: x, top: y }}
        onKeyDown={(e) => { if (e.key === 'Escape') onFechar(); e.stopPropagation(); }}
      >
        <Grupo titulo="Ações">
          <Item icone="plus" rotulo="Adicionar Filho" atalho="Tab" onClick={onAdicionarFilho} />
          <Item icone="pencil" rotulo="Editar Texto" atalho="F2" onClick={onEditarTexto} />
          <Item icone="file-text" rotulo="Criar Roteiro" onClick={onCriarRoteiro} />
        </Grupo>

        <Grupo titulo="Estilo">
          <Expansivel icone="palette" rotulo="Cor de Fundo" aberto={aberto === 'cor'} onAlternar={() => alternar('cor')}>
            <div className="flex flex-wrap gap-1.5">
              {CORES_NO.map((c) => (
                <button key={c} type="button" aria-label={`Cor ${c}`} aria-pressed={no.cor === c} onClick={() => onMudar({ cor: c })}
                  className={`h-6 w-6 rounded-full border ${no.cor === c ? 'ring-2 ring-brand-400 ring-offset-1' : ''}`}
                  style={{ backgroundColor: c, borderColor: c === '#ffffff' ? '#cbd5e1' : c }} />
              ))}
            </div>
          </Expansivel>
          <Expansivel icone="smile" rotulo="Ícone" aberto={aberto === 'icone'} onAlternar={() => alternar('icone')}>
            <div className="grid grid-cols-7 gap-1">
              <button type="button" onClick={() => onMudar({ icone: '' })} aria-label="Sem ícone"
                className={`flex h-7 items-center justify-center rounded-md border text-xs text-slate-400 ${!no.icone ? 'border-brand-400' : 'border-white/10'}`}>—</button>
              {ICONES_NO.map((i) => (
                <button key={i} type="button" onClick={() => onMudar({ icone: i })} aria-label={`Ícone ${i}`}
                  className={`flex h-7 items-center justify-center rounded-md border ${no.icone === i ? 'border-brand-400 bg-brand-500/10' : 'border-white/10'}`}>
                  <GlassIcon name={i} className="h-4 w-4" />
                </button>
              ))}
            </div>
          </Expansivel>
          <Expansivel icone="square" rotulo="Formato" aberto={aberto === 'formato'} onAlternar={() => alternar('formato')}
            resumo={FORMATOS.find((f) => f.id === no.formato)?.label}>
            <div className="flex gap-1.5">
              {FORMATOS.map((f) => (
                <button key={f.id} type="button" onClick={() => onMudar({ formato: f.id })}
                  className={`flex-1 rounded-md border px-1.5 py-1 text-xs font-semibold ${no.formato === f.id ? 'border-brand-400 bg-brand-500/10 text-brand-300' : 'border-white/10 text-slate-300'}`}>
                  {f.label}
                </button>
              ))}
            </div>
          </Expansivel>
          <button type="button" role="switch" aria-checked={no.negrito} onClick={() => onMudar({ negrito: !no.negrito })}
            className="flex w-full items-center gap-2.5 px-3 py-1.5 text-left text-sm text-slate-100 hover:bg-white/[0.06]">
            <GlassIcon name="bold" className="h-4 w-4" />
            <span className="flex-1">Negrito</span>
            <span className={`relative h-5 w-9 rounded-full transition-colors ${no.negrito ? 'bg-brand-500' : 'bg-slate-500/40'}`}>
              <span className={`absolute top-0.5 h-4 w-4 rounded-full bg-white transition-all ${no.negrito ? 'left-[18px]' : 'left-0.5'}`} />
            </span>
          </button>
        </Grupo>

        <Grupo titulo="Detalhes">
          <Expansivel icone="circle-dot" rotulo="Status" aberto={aberto === 'status'} onAlternar={() => alternar('status')}
            resumo={no.status ? STATUS_NO.find((s) => s.id === no.status)?.label : undefined}>
            <div className="flex flex-col gap-0.5">
              {STATUS_NO.map((s) => (
                <button key={s.id || 'nenhum'} type="button" onClick={() => onMudar({ status: s.id })}
                  className={`flex items-center gap-2 rounded-md px-2 py-1 text-left text-xs font-semibold ${no.status === s.id ? 'bg-brand-500/10 text-slate-100' : 'text-slate-300 hover:bg-white/[0.06]'}`}>
                  <span className="h-2 w-2 rounded-full" style={{ backgroundColor: s.cor }} /> {s.label}
                </button>
              ))}
            </div>
          </Expansivel>
          <Expansivel icone="note" rotulo={no.nota ? 'Editar Nota' : 'Adicionar Nota'} aberto={aberto === 'nota'} onAlternar={() => alternar('nota')}>
            <textarea rows={3} className={CAMPO} placeholder="Escreva uma nota..." value={no.nota} onChange={(e) => onMudar({ nota: e.target.value })} />
          </Expansivel>
          <Expansivel icone="calendar" rotulo="Definir Data" aberto={aberto === 'data'} onAlternar={() => alternar('data')}
            resumo={no.data ? no.data.split('-').reverse().join('/') : undefined}>
            <div className="flex gap-2">
              <input type="date" className={CAMPO} value={no.data} onChange={(e) => onMudar({ data: e.target.value })} aria-label="Data" />
              {no.data && <button type="button" onClick={() => onMudar({ data: '' })} className="text-xs text-slate-400">Limpar</button>}
            </div>
          </Expansivel>
          <Expansivel icone="link" rotulo="Vincular Item" aberto={aberto === 'vinculo'} onAlternar={() => alternar('vinculo')} resumo={no.vinculo?.rotulo}>
            <div className="flex flex-col gap-1.5">
              <input className={CAMPO} placeholder="Nome (ex.: Roteiro, Demanda)" value={no.vinculo?.rotulo ?? ''}
                onChange={(e) => onMudar({ vinculo: { rotulo: e.target.value, url: no.vinculo?.url ?? '' } })} />
              <input className={CAMPO} placeholder="Link do item no sistema ou fora dele" value={no.vinculo?.url ?? ''}
                onChange={(e) => onMudar({ vinculo: { rotulo: no.vinculo?.rotulo ?? '', url: e.target.value } })} />
              {no.vinculo && <button type="button" onClick={() => onMudar({ vinculo: null })} className="self-start text-xs text-red-400">Remover vínculo</button>}
            </div>
          </Expansivel>
          <Expansivel icone="paperclip" rotulo="Anexos e Links" aberto={aberto === 'links'} onAlternar={() => alternar('links')}
            resumo={no.links.length ? String(no.links.length) : undefined}>
            <div className="flex flex-col gap-1.5">
              {no.links.map((l, i) => (
                <div key={i} className="flex items-center gap-1.5 text-xs">
                  <a href={l.url} target="_blank" rel="noreferrer" className="min-w-0 flex-1 truncate text-brand-300 hover:underline">{l.rotulo}</a>
                  <button type="button" onClick={() => onMudar({ links: no.links.filter((_, k) => k !== i) })} aria-label="Remover link" className="text-slate-400 hover:text-red-400">
                    <GlassIcon name="x" className="h-3.5 w-3.5" />
                  </button>
                </div>
              ))}
              <input className={CAMPO} placeholder="Nome (opcional)" value={novoLink.rotulo} onChange={(e) => setNovoLink({ ...novoLink, rotulo: e.target.value })} />
              <div className="flex gap-1.5">
                <input className={CAMPO} placeholder="https://..." value={novoLink.url} onChange={(e) => setNovoLink({ ...novoLink, url: e.target.value })}
                  onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addLink(); } }} />
                <button type="button" onClick={addLink} className="rounded-lg bg-brand-500/15 px-2 text-xs font-semibold text-brand-300">+</button>
              </div>
            </div>
          </Expansivel>
        </Grupo>

        <Grupo titulo="Organização">
          {temFilhos && (
            <Item icone={no.recolhido ? 'chevron-right' : 'chevron-down'} rotulo={no.recolhido ? 'Expandir' : 'Recolher'} onClick={() => onMudar({ recolhido: !no.recolhido })} />
          )}
          {!raiz && <Item icone="trash" rotulo="Excluir nó" atalho="Del" perigo onClick={onExcluir} />}
          {raiz && !temFilhos && <p className="px-3 py-1 text-xs text-slate-400">O nó principal não pode ser excluído.</p>}
        </Grupo>
      </div>
    </>
  );
}
