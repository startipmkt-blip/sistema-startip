import { useEffect, useRef, useState, type ReactNode } from 'react';
import { GlassIcon } from '@/shared/ui/GlassIcon';
import { paraHtml, sanitizar, textoVazio } from './regras';

interface Props {
  value: string;
  onChange: (html: string) => void;
  placeholder?: string;
  /** Altura mínima em linhas (como o rows do textarea). */
  linhas?: number;
  id?: string;
  'aria-label'?: string;
}

// Cores com leitura boa no tema claro e no escuro.
const CORES = [
  { nome: 'Vermelho', cor: '#dc2626' }, { nome: 'Laranja', cor: '#ea580c' }, { nome: 'Amarelo', cor: '#ca8a04' },
  { nome: 'Verde', cor: '#16a34a' }, { nome: 'Azul Startip', cor: '#1e9be0' }, { nome: 'Azul escuro', cor: '#1d4ed8' },
  { nome: 'Roxo', cor: '#7c3aed' }, { nome: 'Rosa', cor: '#db2777' }, { nome: 'Cinza', cor: '#64748b' },
];

const ESTILOS = [
  { valor: 'div', rotulo: 'Normal' },
  { valor: 'h1', rotulo: 'Título 1' },
  { valor: 'h2', rotulo: 'Título 2' },
  { valor: 'h3', rotulo: 'Título 3' },
];

function Botao({ titulo, onClick, ativo, children }: { titulo: string; onClick: () => void; ativo?: boolean; children: ReactNode }) {
  return (
    <button
      type="button"
      title={titulo}
      aria-label={titulo}
      aria-pressed={ativo}
      // mousedown evita que o clique tire o foco (e a seleção) do texto.
      onMouseDown={(e) => { e.preventDefault(); onClick(); }}
      className={`flex h-7 min-w-[28px] items-center justify-center rounded-md px-1 text-[13px] font-semibold transition-colors ${
        ativo ? 'bg-brand-500/15 text-brand-300' : 'text-slate-300 hover:bg-white/10'}`}
    >
      {children}
    </button>
  );
}

/** Editor de texto com formatação (negrito, itálico, listas, cor...). Guarda HTML limpo. */
export function EditorRico({ value, onChange, placeholder, linhas = 4, id, ...rest }: Props) {
  const ref = useRef<HTMLDivElement>(null);
  const ultimo = useRef<string>('');
  const selecaoSalva = useRef<Range | null>(null);
  const [ativos, setAtivos] = useState<Record<string, boolean>>({});
  const [bloco, setBloco] = useState('div');
  const [painel, setPainel] = useState<'cor' | 'link' | null>(null);
  const [link, setLink] = useState('');

  // Só reescreve o conteúdo quando o valor muda por fora (abrir outro item, limpar);
  // assim o cursor não pula enquanto a pessoa digita.
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (value !== ultimo.current) {
      const html = sanitizar(paraHtml(value));
      el.innerHTML = html;
      ultimo.current = value;
    }
  }, [value]);

  function emitir() {
    const el = ref.current;
    if (!el) return;
    const html = textoVazio(el.innerHTML) && !el.querySelector('li') ? '' : el.innerHTML;
    ultimo.current = html;
    onChange(html);
    atualizarEstado();
  }

  function atualizarEstado() {
    try {
      setAtivos({
        bold: document.queryCommandState('bold'),
        italic: document.queryCommandState('italic'),
        underline: document.queryCommandState('underline'),
        strikeThrough: document.queryCommandState('strikeThrough'),
        insertOrderedList: document.queryCommandState('insertOrderedList'),
        insertUnorderedList: document.queryCommandState('insertUnorderedList'),
      });
      const b = String(document.queryCommandValue('formatBlock') || '').toLowerCase();
      setBloco(['h1', 'h2', 'h3'].includes(b) ? b : 'div');
    } catch { /* navegador sem queryCommandState */ }
  }

  function guardarSelecao() {
    const s = window.getSelection();
    if (s && s.rangeCount && ref.current?.contains(s.anchorNode)) selecaoSalva.current = s.getRangeAt(0).cloneRange();
  }
  function restaurarSelecao() {
    const r = selecaoSalva.current;
    ref.current?.focus();
    if (!r) return;
    const s = window.getSelection();
    s?.removeAllRanges();
    s?.addRange(r);
  }

  function cmd(comando: string, valor?: string) {
    ref.current?.focus();
    document.execCommand('styleWithCSS', false, comando === 'foreColor' ? 'true' : 'false');
    document.execCommand(comando, false, valor);
    emitir();
  }

  /** Tira só a cor do trecho selecionado (negrito, listas etc. continuam). */
  function removerCor() {
    restaurarSelecao();
    const el = ref.current;
    const s = window.getSelection();
    if (!el || !s || !s.rangeCount) return;
    const r = s.getRangeAt(0);
    const alvos = Array.from(el.querySelectorAll<HTMLElement>('span, font')).filter((n) => r.intersectsNode(n));
    for (const n of alvos) {
      n.style.removeProperty('color');
      n.removeAttribute('color');
      if (!n.getAttribute('style')) n.removeAttribute('style');
      if (n.attributes.length === 0) n.replaceWith(...Array.from(n.childNodes));
    }
    emitir();
  }

  function citar() {
    const b = String(document.queryCommandValue('formatBlock') || '').toLowerCase();
    cmd('formatBlock', b === 'blockquote' ? 'div' : 'blockquote');
  }

  function aplicarLink() {
    restaurarSelecao();
    const url = link.trim();
    if (url) {
      const final = /^(https?:|mailto:|tel:)/i.test(url) ? url : `https://${url}`;
      const sel = window.getSelection();
      if (sel && sel.isCollapsed) document.execCommand('insertHTML', false, `<a href="${final.replace(/"/g, '&quot;')}">${final.replace(/</g, '&lt;')}</a>&nbsp;`);
      else document.execCommand('createLink', false, final);
      emitir();
    }
    setLink('');
    setPainel(null);
  }

  function colar(e: React.ClipboardEvent<HTMLDivElement>) {
    // Arquivos/prints colados ficam para o campo de anexos do formulário.
    if (e.clipboardData.files.length) return;
    e.preventDefault();
    const html = e.clipboardData.getData('text/html');
    const texto = e.clipboardData.getData('text/plain');
    document.execCommand('insertHTML', false, html ? sanitizar(html) : paraHtml(texto));
    emitir();
  }

  return (
    <div className="editor-rico campo-form overflow-hidden rounded-lg border border-white/10 bg-white/[0.04] focus-within:border-brand-400 focus-within:ring-2 focus-within:ring-brand-400/20">
      <div className="barra-editor flex flex-wrap items-center gap-0.5 border-b border-white/10 px-1.5 py-1" role="toolbar" aria-label="Formatação do texto">
        <select
          aria-label="Estilo do parágrafo"
          value={bloco}
          onMouseDown={guardarSelecao}
          onChange={(e) => { restaurarSelecao(); cmd('formatBlock', e.target.value); }}
          className="h-7 rounded-md bg-transparent px-1 text-xs font-semibold text-slate-300 focus:outline-none [&>option]:bg-slate-900"
        >
          {ESTILOS.map((s) => <option key={s.valor} value={s.valor}>{s.rotulo}</option>)}
        </select>
        <span className="mx-1 h-4 w-px bg-white/10" />
        <Botao titulo="Negrito (Ctrl+B)" ativo={ativos.bold} onClick={() => cmd('bold')}><span className="font-extrabold">B</span></Botao>
        <Botao titulo="Itálico (Ctrl+I)" ativo={ativos.italic} onClick={() => cmd('italic')}><span className="font-serif italic">I</span></Botao>
        <Botao titulo="Sublinhado (Ctrl+U)" ativo={ativos.underline} onClick={() => cmd('underline')}><span className="underline">U</span></Botao>
        <Botao titulo="Tachado" ativo={ativos.strikeThrough} onClick={() => cmd('strikeThrough')}><span className="line-through">S</span></Botao>
        <div className="relative">
          <Botao titulo="Cor do texto" ativo={painel === 'cor'} onClick={() => { guardarSelecao(); setPainel((p) => (p === 'cor' ? null : 'cor')); }}>
            <span className="flex flex-col items-center leading-none">A<span className="mt-0.5 h-1 w-3.5 rounded-sm" style={{ background: 'linear-gradient(90deg,#dc2626,#ca8a04,#16a34a,#1e9be0,#7c3aed)' }} /></span>
          </Botao>
          {painel === 'cor' && (
            <div className="menu-no glass absolute left-0 top-8 z-30 w-44 p-2 shadow-pop">
              <div className="grid grid-cols-5 gap-1.5">
                {CORES.map((c) => (
                  <button key={c.cor} type="button" title={c.nome} aria-label={c.nome}
                    onMouseDown={(e) => { e.preventDefault(); restaurarSelecao(); cmd('foreColor', c.cor); setPainel(null); }}
                    className="h-6 w-6 rounded-full border border-white/20" style={{ backgroundColor: c.cor }} />
                ))}
              </div>
              <button type="button" onMouseDown={(e) => { e.preventDefault(); removerCor(); setPainel(null); }}
                className="mt-2 w-full rounded-md px-2 py-1 text-left text-xs font-semibold text-slate-300 hover:bg-white/10">
                Cor padrão
              </button>
            </div>
          )}
        </div>
        <span className="mx-1 h-4 w-px bg-white/10" />
        <Botao titulo="Lista numerada" ativo={ativos.insertOrderedList} onClick={() => cmd('insertOrderedList')}><span className="text-[11px] font-bold">1.</span><span className="ml-0.5 block h-px w-2.5 bg-current" /></Botao>
        <Botao titulo="Lista com marcadores" ativo={ativos.insertUnorderedList} onClick={() => cmd('insertUnorderedList')}><span className="text-base leading-none">•</span><span className="ml-0.5 block h-px w-2.5 bg-current" /></Botao>
        <span className="mx-1 h-4 w-px bg-white/10" />
        <Botao titulo="Citação" onClick={citar}><span className="text-base font-bold leading-none">”</span></Botao>
        <div className="relative">
          <Botao titulo="Inserir link" ativo={painel === 'link'} onClick={() => { guardarSelecao(); setPainel((p) => (p === 'link' ? null : 'link')); }}>
            <GlassIcon name="link" className="h-4 w-4" />
          </Botao>
          {painel === 'link' && (
            <div className="menu-no glass absolute left-0 top-8 z-30 flex w-64 gap-1.5 p-2 shadow-pop">
              <input
                autoFocus
                value={link}
                onChange={(e) => setLink(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); aplicarLink(); } if (e.key === 'Escape') setPainel(null); }}
                placeholder="https://..."
                aria-label="Endereço do link"
                className="campo-form min-w-0 flex-1 rounded-md border border-white/10 bg-white/[0.04] px-2 py-1 text-xs text-slate-100 focus:outline-none"
              />
              <button type="button" onClick={aplicarLink} className="rounded-md bg-gradient-brand px-2 text-xs font-semibold text-white">OK</button>
            </div>
          )}
        </div>
        <Botao titulo="Limpar formatação" onClick={() => { cmd('removeFormat'); cmd('formatBlock', 'div'); }}>
          <span className="relative text-[13px] italic">T<span className="absolute -bottom-0.5 -right-1 text-[9px] not-italic">x</span></span>
        </Botao>
      </div>
      <div
        ref={ref}
        id={id}
        role="textbox"
        aria-multiline="true"
        aria-label={rest['aria-label'] ?? placeholder}
        contentEditable
        suppressContentEditableWarning
        data-placeholder={placeholder}
        onInput={emitir}
        onKeyUp={atualizarEstado}
        onMouseUp={atualizarEstado}
        onBlur={() => { guardarSelecao(); }}
        onPaste={colar}
        onFocus={() => setPainel(null)}
        className="texto-rico editor-area max-h-[420px] resize-y overflow-y-auto px-3 py-2.5 text-sm leading-relaxed text-slate-100 focus:outline-none"
        style={{ minHeight: `${linhas * 1.6 + 1.25}rem` }}
      />
    </div>
  );
}
