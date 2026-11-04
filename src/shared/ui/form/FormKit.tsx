// =============================================================
// Kit de formulários no padrão "App Level": janela central estreita,
// blocos com ícone, rótulos discretos, escolhas em cards e chips.
// Use estas peças em todo formulário novo para manter o mesmo visual.
// =============================================================
import { useState, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { GlassIcon, glassify } from '@/shared/ui/GlassIcon';

// ---------- Janela ----------
interface JanelaProps {
  open: boolean;
  onClose: () => void;
  titulo: string;
  subtitulo?: string;
  icone?: string;
  /** md ≈ 560px (tarefa, inspiração) · lg ≈ 640px (linha editorial, roteiro, POP). */
  largura?: 'md' | 'lg' | 'xl';
  /** Conteúdo fixo entre o título e a área que rola (ex.: abas "Criar do zero / De Inspiração"). */
  topo?: ReactNode;
  rodape?: ReactNode;
  children: ReactNode;
}

const LARGURAS = { md: 'max-w-[560px]', lg: 'max-w-[660px]', xl: 'max-w-[880px]' } as const;

/** Fecha só pelo X ou pelos botões (clicar fora não perde o que foi digitado). */
export function JanelaFormulario({ open, onClose, titulo, subtitulo, icone, largura = 'md', topo, rodape, children }: JanelaProps) {
  if (!open) return null;
  return createPortal(
    <div className="janela-fundo fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-3">
      <div className={`janela-form flex max-h-[94vh] w-full ${LARGURAS[largura]} flex-col overflow-hidden rounded-2xl border border-white/10 bg-[#121a24] shadow-pop`}>
        <div className="flex shrink-0 items-start justify-between gap-3 px-6 pb-3 pt-5">
          <div className="min-w-0">
            <h2 className="flex items-center gap-2 text-lg font-bold tracking-tight text-white">
              {icone && <GlassIcon name={icone} className="h-5 w-5" />}
              {glassify(titulo)}
            </h2>
            {subtitulo && <p className="mt-0.5 text-sm text-slate-400">{subtitulo}</p>}
          </div>
          <button onClick={onClose} className="rounded-lg p-1 text-slate-400 hover:bg-white/10 hover:text-slate-200" aria-label="Fechar">
            <GlassIcon name="x" />
          </button>
        </div>
        {topo && <div className="shrink-0 px-6 pb-3">{topo}</div>}
        <div className="min-h-0 flex-1 overflow-y-auto px-6 pb-4">
          <div className="flex flex-col gap-4">{children}</div>
        </div>
        {rodape && <div className="flex shrink-0 items-center justify-end gap-2 px-6 pb-5 pt-2">{rodape}</div>}
      </div>
    </div>,
    document.body,
  );
}

// ---------- Blocos ----------
export function Secao({ icone, titulo, subtitulo, children, acao }: {
  icone: string; titulo: string; subtitulo?: string; children: ReactNode; acao?: ReactNode;
}) {
  return (
    <section className="secao-form flex flex-col gap-3.5 rounded-xl border border-white/10 bg-white/[0.02] p-4">
      <div className="flex items-center gap-3">
        <span className="chip-icone h-8 w-8 bg-brand-500/10"><GlassIcon name={icone} tone="brand" className="h-4 w-4" /></span>
        <div className="min-w-0 flex-1">
          <div className="text-[13px] font-bold uppercase tracking-wide text-slate-100">{titulo}</div>
          {subtitulo && <div className="text-xs text-slate-400">{subtitulo}</div>}
        </div>
        {acao}
      </div>
      {children}
    </section>
  );
}

/** Título de bloco sem card (formulário "Nova Tarefa" e "Nova POP"). */
export function SubtituloForm({ icone, titulo, subtitulo }: { icone: string; titulo: string; subtitulo?: string }) {
  return (
    <div className="flex items-start gap-3 pt-1">
      <span className="chip-icone h-8 w-8 bg-brand-500/10"><GlassIcon name={icone} tone="brand" className="h-4 w-4" /></span>
      <div>
        <div className="text-sm font-bold text-slate-100">{titulo}</div>
        {subtitulo && <div className="text-xs text-slate-400">{subtitulo}</div>}
      </div>
    </div>
  );
}

// ---------- Rótulos e campos ----------
export function Rotulo({ children, obrigatorio, dica, caixaAlta, icone, htmlFor, acao }: {
  children: ReactNode; obrigatorio?: boolean; dica?: string; caixaAlta?: boolean; icone?: string; htmlFor?: string; acao?: ReactNode;
}) {
  return (
    <div className="flex items-center justify-between gap-2">
      <label
        htmlFor={htmlFor}
        className={caixaAlta
          ? 'flex items-center gap-1.5 text-[11.5px] font-bold uppercase tracking-wide text-slate-400'
          : 'flex items-center gap-1.5 text-sm font-semibold text-slate-200'}
      >
        {icone && <GlassIcon name={icone} className="h-3.5 w-3.5" />}
        {children}
        {obrigatorio && <span className="text-red-400">*</span>}
        {dica && <span className="text-xs font-normal normal-case tracking-normal text-slate-400">({dica})</span>}
      </label>
      {acao}
    </div>
  );
}

const CAMPO = 'campo-form w-full rounded-lg border border-white/10 bg-white/[0.04] px-3 py-2.5 text-sm text-slate-100 placeholder:text-slate-500 focus:border-brand-400 focus:outline-none focus:ring-2 focus:ring-brand-400/20';

export function Campo({ label, obrigatorio, dica, caixaAlta, icone, children }: {
  label?: string; obrigatorio?: boolean; dica?: string; caixaAlta?: boolean; icone?: string; children: ReactNode;
}) {
  return (
    <div className="flex min-w-0 flex-col gap-1.5">
      {label && <Rotulo obrigatorio={obrigatorio} dica={dica} caixaAlta={caixaAlta} icone={icone}>{label}</Rotulo>}
      {children}
    </div>
  );
}

export function Texto(props: React.InputHTMLAttributes<HTMLInputElement> & { prefixoIcone?: string; sufixo?: string }) {
  const { prefixoIcone, sufixo, className = '', ...rest } = props;
  if (!prefixoIcone && !sufixo) return <input {...rest} className={`${CAMPO} ${className}`} />;
  return (
    <div className="relative">
      {prefixoIcone && (
        <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">
          <GlassIcon name={prefixoIcone} className="h-4 w-4" />
        </span>
      )}
      <input {...rest} className={`${CAMPO} ${prefixoIcone ? 'pl-9' : ''} ${sufixo ? 'pr-12' : ''} ${className}`} />
      {sufixo && <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-xs text-slate-400">{sufixo}</span>}
    </div>
  );
}

export function AreaTexto(props: React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
  const { className = '', rows = 3, ...rest } = props;
  return <textarea rows={rows} {...rest} className={`${CAMPO} resize-y leading-relaxed ${className}`} />;
}

export function Escolha({ opcoes, className = '', ...rest }: React.SelectHTMLAttributes<HTMLSelectElement> & {
  opcoes: { value: string; label: string }[];
}) {
  return (
    <select {...rest} className={`${CAMPO} [&>option]:bg-slate-900 [&>option]:text-slate-100 ${className}`}>
      {opcoes.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
    </select>
  );
}

// ---------- Escolhas ----------
export interface OpcaoCartao { id: string; titulo: string; descricao?: string }

/** Cards grandes de escolha única (Agência/Cliente, Funil de conteúdo). Clicar de novo desmarca se `desmarcavel`. */
export function OpcoesCartao({ opcoes, valor, onChange, colunas = 2, desmarcavel = false }: {
  opcoes: OpcaoCartao[]; valor: string | null; onChange: (v: string | null) => void; colunas?: 2 | 4; desmarcavel?: boolean;
}) {
  return (
    <div className={`grid gap-2.5 ${colunas === 4 ? 'grid-cols-2' : 'grid-cols-1 sm:grid-cols-2'}`}>
      {opcoes.map((o) => {
        const ativo = valor === o.id;
        return (
          <button
            key={o.id}
            type="button"
            aria-pressed={ativo}
            onClick={() => onChange(ativo && desmarcavel ? null : o.id)}
            className={`opcao-cartao rounded-xl border px-3.5 py-2.5 text-left transition-colors ${
              ativo ? 'opcao-ativa border-brand-400 bg-brand-500/10' : 'border-white/10 bg-white/[0.02] hover:border-white/25'}`}
          >
            <div className="text-sm font-semibold text-slate-100">{o.titulo}</div>
            {o.descricao && <div className="text-xs text-slate-400">{o.descricao}</div>}
          </button>
        );
      })}
    </div>
  );
}

export interface OpcaoChip { id: string; label: string; icone?: string }

/** Chips de escolha (categoria, plataformas, gatilhos). `multi` permite vários. `comMais` mostra "+" nos não marcados. */
export function Chips({ opcoes, valores, onChange, multi = true, comMais = false }: {
  opcoes: OpcaoChip[]; valores: string[]; onChange: (v: string[]) => void; multi?: boolean; comMais?: boolean;
}) {
  function alternar(id: string) {
    const tem = valores.includes(id);
    if (multi) onChange(tem ? valores.filter((v) => v !== id) : [...valores, id]);
    else onChange(tem ? [] : [id]);
  }
  return (
    <div className="flex flex-wrap gap-2">
      {opcoes.map((o) => {
        const ativo = valores.includes(o.id);
        return (
          <button
            key={o.id}
            type="button"
            aria-pressed={ativo}
            onClick={() => alternar(o.id)}
            className={`chip-form inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-xs font-semibold transition-colors ${
              ativo ? 'chip-ativo border-brand-400 bg-brand-500/10 text-brand-300' : 'border-white/10 bg-white/[0.02] text-slate-300 hover:border-white/25'}`}
          >
            {o.icone ? <GlassIcon name={o.icone} className="h-3.5 w-3.5" /> : comMais && !ativo ? <span className="text-slate-400">+</span> : null}
            {comMais && ativo && !o.icone && <GlassIcon name="check" className="h-3.5 w-3.5" />}
            {o.label}
          </button>
        );
      })}
    </div>
  );
}

// ---------- Prioridade ----------
export type PrioridadeForm = 'urgente' | 'alta' | 'media' | 'baixa';

const PRIORIDADES_FORM: { id: PrioridadeForm; label: string; ativo: string; inativo: string }[] = [
  { id: 'urgente', label: 'Urgente', ativo: 'bg-red-600 border-red-600 text-white', inativo: 'border-red-300/60 text-red-500 bg-red-500/5' },
  { id: 'alta', label: 'Alta', ativo: 'bg-rose-500 border-rose-500 text-white', inativo: 'border-rose-300/60 text-rose-500 bg-rose-500/5' },
  { id: 'media', label: 'Média', ativo: 'bg-orange-500 border-orange-500 text-white', inativo: 'border-orange-300/60 text-orange-500 bg-orange-500/5' },
  { id: 'baixa', label: 'Baixa', ativo: 'bg-blue-600 border-blue-600 text-white', inativo: 'border-blue-300/60 text-blue-600 bg-blue-500/5' },
];

export function SeletorPrioridade({ valor, onChange, opcoes = ['urgente', 'alta', 'media', 'baixa'] }: {
  valor: string; onChange: (v: PrioridadeForm) => void; opcoes?: PrioridadeForm[];
}) {
  return (
    <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
      {PRIORIDADES_FORM.filter((p) => opcoes.includes(p.id)).map((p) => (
        <button
          key={p.id}
          type="button"
          aria-pressed={valor === p.id}
          onClick={() => onChange(p.id)}
          className={`prioridade-form rounded-lg border py-2 text-sm font-semibold transition-colors ${valor === p.id ? p.ativo : p.inativo}`}
        >
          {p.label}
        </button>
      ))}
    </div>
  );
}

// ---------- Listas ----------
/** Lista de links: campo + "Adicionar", cada link vira uma linha removível. */
export function ListaLinks({ valores, onChange, placeholder = 'https://...' }: {
  valores: string[]; onChange: (v: string[]) => void; placeholder?: string;
}) {
  const [novo, setNovo] = useState('');
  function add() {
    const v = novo.trim();
    if (!v) return;
    onChange([...valores, /^https?:\/\//i.test(v) ? v : `https://${v}`]);
    setNovo('');
  }
  return (
    <div className="flex flex-col gap-2">
      <div className="flex gap-2">
        <div className="flex-1">
          <Texto
            prefixoIcone="link" placeholder={placeholder} value={novo}
            onChange={(e) => setNovo(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); add(); } }}
          />
        </div>
        <button
          type="button" onClick={add} disabled={!novo.trim()}
          className="botao-adicionar rounded-lg bg-brand-500/15 px-3 text-sm font-semibold text-brand-300 hover:bg-brand-500/25 disabled:opacity-50"
        >
          + Adicionar
        </button>
      </div>
      {valores.map((l, i) => (
        <div key={`${l}-${i}`} className="flex items-center gap-2 rounded-lg border border-white/10 px-3 py-1.5 text-sm">
          <GlassIcon name="link" className="h-3.5 w-3.5" />
          <a href={l} target="_blank" rel="noreferrer" className="min-w-0 flex-1 truncate text-brand-300 hover:underline">{l}</a>
          <button type="button" onClick={() => onChange(valores.filter((_, k) => k !== i))} className="text-slate-400 hover:text-red-400" aria-label="Remover link">
            <GlassIcon name="x" className="h-3.5 w-3.5" />
          </button>
        </div>
      ))}
    </div>
  );
}

/** Lista simples de textos (subtarefas, restrições). Enter ou "+" adiciona. */
export function ListaItens({ valores, onChange, placeholder, comCheck = false, marcados = [], onMarcar }: {
  valores: string[]; onChange: (v: string[]) => void; placeholder: string;
  comCheck?: boolean; marcados?: boolean[]; onMarcar?: (i: number, v: boolean) => void;
}) {
  const [novo, setNovo] = useState('');
  function add() {
    const v = novo.trim();
    if (!v) return;
    onChange([...valores, v]);
    setNovo('');
  }
  return (
    <div className="flex flex-col gap-2">
      {valores.map((t, i) => (
        <div key={i} className="flex items-center gap-2 rounded-lg border border-white/10 px-3 py-1.5 text-sm">
          {comCheck && (
            <input type="checkbox" checked={Boolean(marcados[i])} onChange={(e) => onMarcar?.(i, e.target.checked)} aria-label="Concluída" />
          )}
          <span className={`min-w-0 flex-1 ${comCheck && marcados[i] ? 'text-slate-400 line-through' : 'text-slate-200'}`}>{t}</span>
          <button type="button" onClick={() => onChange(valores.filter((_, k) => k !== i))} className="text-slate-400 hover:text-red-400" aria-label="Remover">
            <GlassIcon name="x" className="h-3.5 w-3.5" />
          </button>
        </div>
      ))}
      <div className="flex items-center gap-2">
        <div className="flex-1">
          <Texto
            placeholder={placeholder} value={novo}
            onChange={(e) => setNovo(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); add(); } }}
          />
        </div>
        <button type="button" onClick={add} className="rounded-lg p-2 text-slate-300 hover:bg-white/10" aria-label="Adicionar">
          <GlassIcon name="plus" className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}

/** Botão tracejado de largura total ("+ Adicionar passo", "+ Adicionar Cena"). */
export function BotaoTracejado({ children, onClick, destaque = false }: { children: ReactNode; onClick: () => void; destaque?: boolean }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`botao-tracejado flex w-full items-center justify-center gap-2 rounded-xl border border-dashed py-2.5 text-sm font-medium transition-colors ${
        destaque ? 'border-brand-400 text-slate-100' : 'border-white/15 text-slate-300 hover:border-brand-400/60'}`}
    >
      <GlassIcon name="plus" className="h-4 w-4" /> {children}
    </button>
  );
}

// ---------- Cenas (estrutura do formato) ----------
export interface Cena {
  acontece: string;
  fala: string;
  audio: string;
  foto_apoio: boolean;
}

export const TIPOS_AUDIO = [
  { value: '', label: 'Selecionar...' },
  { value: 'narracao', label: 'Narração / locução' },
  { value: 'original', label: 'Áudio original' },
  { value: 'musica', label: 'Música de fundo' },
  { value: 'trend', label: 'Áudio em alta (trend)' },
  { value: 'sem', label: 'Sem áudio' },
];

export function EditorCenas({ cenas, onChange }: { cenas: Cena[]; onChange: (c: Cena[]) => void }) {
  function mudar(i: number, campo: Partial<Cena>) {
    onChange(cenas.map((c, k) => (k === i ? { ...c, ...campo } : c)));
  }
  return (
    <div className="flex flex-col gap-3">
      <div className="text-[11.5px] font-bold uppercase tracking-wide text-slate-400">Cenas</div>
      {cenas.length === 0 && <p className="py-1 text-center text-xs text-slate-400">Clique em "Cena" para adicionar a primeira cena</p>}
      {cenas.map((c, i) => (
        <div key={i} className="cena-form flex flex-col gap-3 rounded-xl border border-white/10 bg-white/[0.02] p-3.5">
          <div className="flex items-center justify-between">
            <span className="text-sm font-bold uppercase text-brand-300">Cena {i + 1}</span>
            <button type="button" onClick={() => onChange(cenas.filter((_, k) => k !== i))} className="text-slate-400 hover:text-red-400" aria-label={`Remover cena ${i + 1}`}>
              <GlassIcon name="x" className="h-4 w-4" />
            </button>
          </div>
          <Campo label="O que acontece">
            <AreaTexto rows={2} placeholder="Descreva a cena..." value={c.acontece} onChange={(e) => mudar(i, { acontece: e.target.value })} />
          </Campo>
          <Campo label="Fala / Locução">
            <AreaTexto rows={2} placeholder="O que será falado nesta cena..." value={c.fala} onChange={(e) => mudar(i, { fala: e.target.value })} />
          </Campo>
          <div className="flex items-center justify-between gap-3">
            <Rotulo>Tipo de Áudio</Rotulo>
            <Escolha opcoes={TIPOS_AUDIO} value={c.audio} onChange={(e) => mudar(i, { audio: e.target.value })} className="!w-auto" />
          </div>
          <label className="flex items-center gap-2 text-sm font-medium text-slate-200">
            <input type="checkbox" checked={c.foto_apoio} onChange={(e) => mudar(i, { foto_apoio: e.target.checked })} />
            Precisa de foto de apoio nesta cena
          </label>
        </div>
      ))}
      <BotaoTracejado destaque={cenas.length > 0} onClick={() => onChange([...cenas, { acontece: '', fala: '', audio: '', foto_apoio: false }])}>
        Adicionar Cena
      </BotaoTracejado>
    </div>
  );
}

// ---------- Constantes de conteúdo (linha editorial, roteiros, inspirações) ----------
export const PLATAFORMAS: OpcaoChip[] = [
  { id: 'instagram', label: 'Instagram', icone: 'instagram' },
  { id: 'youtube', label: 'YouTube', icone: 'youtube' },
  { id: 'tiktok', label: 'TikTok', icone: 'tiktok' },
  { id: 'linkedin', label: 'LinkedIn', icone: 'linkedin' },
  { id: 'facebook', label: 'Facebook', icone: 'facebook' },
  { id: 'website', label: 'Website', icone: 'globe' },
];

export const FUNIL: OpcaoCartao[] = [
  { id: 'topo', titulo: 'Topo', descricao: 'Atração e conscientização' },
  { id: 'meio', titulo: 'Meio', descricao: 'Consideração e interesse' },
  { id: 'fundo', titulo: 'Fundo', descricao: 'Decisão e conversão' },
  { id: 'pos', titulo: 'Pós-vendas', descricao: 'Retenção e fidelização' },
];

export const GATILHOS: OpcaoChip[] = [
  'Escassez', 'Urgência', 'Prova Social', 'Autoridade', 'Reciprocidade', 'Novidade', 'Pertencimento',
  'Curiosidade', 'Transformação', 'Conexão', 'Segurança', 'Exclusividade', 'Resultado Rápido', 'Antecipação',
].map((g) => ({ id: g.toLowerCase().replace(/\s+/g, '-'), label: g }));

/** Formatos aceitos pela linha editorial (mesmos valores do enum de posts). */
export const FORMATOS_CONTEUDO = [
  { value: 'reels', label: 'Vídeo' },
  { value: 'carrossel', label: 'Carrossel' },
  { value: 'estatico', label: 'Imagem estática' },
];

export const CORES_PILAR = ['#1e9be0', '#3b82f6', '#8b5cf6', '#f59e0b', '#ef4444', '#10b981', '#ec4899', '#6366f1'];
