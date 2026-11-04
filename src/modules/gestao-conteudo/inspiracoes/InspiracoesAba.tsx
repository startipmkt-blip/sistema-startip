import { useMemo, useState } from 'react';
import { Card } from '@/shared/ui/Card';
import { Button } from '@/shared/ui/Button';
import { Spinner } from '@/shared/ui/Spinner';
import { GlassIcon } from '@/shared/ui/GlassIcon';
import { confirmar } from '@/shared/ui/ConfirmDialog';
import { ImagemCapa } from '@/shared/ui/form/CapaUpload';
import { descartarAnexo } from '@/modules/ideias/criativos/criativosApi';
import type { ClienteGestao } from '@/modules/gestao-conteudo/utils';
import { FaixaDestaque } from '@/modules/gestao-conteudo/components/FaixaDestaque';
import {
  FORMATOS_INSPIRACAO, ORIGENS_INSPIRACAO, inspiracoes, rotuloFormato, rotuloOrigem, type Inspiracao,
} from './inspiracoesApi';
import { InspiracaoFormModal } from './InspiracaoFormModal';

interface Props {
  clientes: ClienteGestao[];
  clienteId: string;
  onCliente: (id: string | null) => void;
}

/** Central de inspirações: referências, trends e ideias para reaproveitar na linha editorial. */
export function InspiracoesAba({ clientes, clienteId, onCliente }: Props) {
  const lista = inspiracoes.useLista();
  const salvar = inspiracoes.useSalvar();
  const excluir = inspiracoes.useExcluir();

  const [status, setStatus] = useState<'ativas' | 'arquivadas'>('ativas');
  const [visao, setVisao] = useState<'grade' | 'lista'>('grade');
  const [buscaAberta, setBuscaAberta] = useState(false);
  const [busca, setBusca] = useState('');
  const [filtroAberto, setFiltroAberto] = useState(false);
  const [formato, setFormato] = useState('');
  const [origem, setOrigem] = useState('');
  const [form, setForm] = useState<{ inspiracao?: Inspiracao } | null>(null);

  const nomeCliente = useMemo(() => new Map(clientes.map((c) => [c.id, c.nome])), [clientes]);
  const termo = busca.trim().toLowerCase();
  const todas = lista.data ?? [];
  // Com um cliente escolhido, mostra as dele e as gerais (servem para todos).
  const doEscopo = todas.filter((i) => !clienteId || i.cliente_id === clienteId || i.cliente_id === null);
  const visiveis = doEscopo.filter((i) =>
    i.arquivada === (status === 'arquivadas')
    && (!formato || i.formato === formato)
    && (!origem || i.origem === origem)
    && (!termo || `${i.titulo} ${i.descricao} ${i.insights} ${i.tags.join(' ')}`.toLowerCase().includes(termo)));
  const qtdAtivas = doEscopo.filter((i) => !i.arquivada).length;
  const qtdArquivadas = doEscopo.length - qtdAtivas;
  const filtrando = Boolean(formato || origem || termo);

  async function arquivar(i: Inspiracao) {
    await salvar.mutateAsync({ id: i.id, dados: { arquivada: !i.arquivada } });
  }
  async function apagar(i: Inspiracao) {
    if (!(await confirmar(`Excluir a inspiração "${i.titulo}"?`))) return;
    await excluir.mutateAsync(i.id);
    if (i.capa) void descartarAnexo(i.capa.path);
  }

  const iconeBotao = (ativo: boolean) =>
    `flex h-8 w-8 items-center justify-center rounded-lg border transition-colors ${ativo ? 'border-brand-400 bg-brand-500/10 text-brand-300' : 'border-white/10 text-slate-400 hover:border-white/25'}`;

  return (
    <div className="space-y-4">
      <FaixaDestaque selo="Central de inspirações" titulo="Inspirações" subtitulo="Salve referências, trends e ideias para reutilizar na linha editorial." />

      <div className="flex flex-wrap items-center gap-2">
        <div className="flex gap-1.5" role="tablist">
          {([['ativas', 'Ativas', qtdAtivas, 'lightbulb'], ['arquivadas', 'Arquivadas', qtdArquivadas, 'archive']] as const).map(([id, label, n, icone]) => (
            <button
              key={id}
              role="tab"
              aria-selected={status === id}
              onClick={() => setStatus(id)}
              className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors ${
                status === id ? 'aba-escura bg-[#0e1a24] text-[#ffffff]' : 'border border-white/10 text-slate-300 hover:border-white/25'}`}
            >
              <GlassIcon name={icone} className="h-3.5 w-3.5" /> {label}{n ? ` (${n})` : ''}
            </button>
          ))}
        </div>
        <select
          value={clienteId}
          onChange={(e) => onCliente(e.target.value || null)}
          className="glass-field ml-1 px-2.5 py-1.5 text-xs [&>option]:bg-slate-900"
          aria-label="Cliente"
        >
          <option value="">Todos os clientes</option>
          {clientes.map((c) => <option key={c.id} value={c.id}>{c.nome}</option>)}
        </select>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <button className={iconeBotao(buscaAberta || Boolean(termo))} onClick={() => setBuscaAberta((v) => !v)} aria-label="Buscar" title="Buscar">
          <GlassIcon name="search" className="h-4 w-4" />
        </button>
        <button className={iconeBotao(visao === 'lista')} onClick={() => setVisao((v) => (v === 'grade' ? 'lista' : 'grade'))} aria-label={visao === 'grade' ? 'Ver em lista' : 'Ver em grade'} title={visao === 'grade' ? 'Ver em lista' : 'Ver em grade'}>
          <GlassIcon name={visao === 'grade' ? 'grid' : 'list'} className="h-4 w-4" />
        </button>
        <button className={iconeBotao(filtroAberto || Boolean(formato || origem))} onClick={() => setFiltroAberto((v) => !v)} aria-label="Filtros" title="Filtros">
          <GlassIcon name="filter" className="h-4 w-4" />
        </button>
        {(buscaAberta || termo) && (
          <input autoFocus type="search" value={busca} onChange={(e) => setBusca(e.target.value)} placeholder="Buscar por título, tag..."
            className="glass-field w-56 px-3 py-1.5 text-sm focus:border-brand-400 focus:outline-none" aria-label="Buscar inspiração" />
        )}
        {(filtroAberto || formato || origem) && (
          <>
            <select value={formato} onChange={(e) => setFormato(e.target.value)} className="glass-field px-2.5 py-1.5 text-xs [&>option]:bg-slate-900" aria-label="Formato">
              <option value="">Todos os formatos</option>
              {FORMATOS_INSPIRACAO.map((f) => <option key={f.value} value={f.value}>{f.label}</option>)}
            </select>
            <select value={origem} onChange={(e) => setOrigem(e.target.value)} className="glass-field px-2.5 py-1.5 text-xs [&>option]:bg-slate-900" aria-label="Origem">
              <option value="">Todas as origens</option>
              {ORIGENS_INSPIRACAO.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
            </select>
          </>
        )}
        <Button className="ml-auto" size="sm" onClick={() => setForm({})}><GlassIcon name="plus" className="h-4 w-4" /> Nova Inspiração</Button>
      </div>

      {lista.isLoading ? (
        <Card className="flex justify-center p-12"><Spinner /></Card>
      ) : lista.error ? (
        <Card className="p-4 text-sm text-red-300">Erro ao carregar: {(lista.error as Error).message}. Se citar "inspiracoes", aplique a migration 0091.</Card>
      ) : visiveis.length === 0 ? (
        <Card className="flex flex-col items-center gap-1.5 px-6 py-14 text-center">
          <span className="chip-icone h-11 w-11 bg-brand-500/10"><GlassIcon name="lightbulb" tone="brand" className="h-5 w-5" /></span>
          <div className="mt-2 text-sm font-semibold text-slate-100">
            {filtrando ? 'Nenhuma inspiração com esses filtros' : status === 'ativas' ? 'Nenhuma inspiração ativa' : 'Nenhuma inspiração arquivada'}
          </div>
          {!filtrando && status === 'ativas' && (
            <>
              <p className="text-xs text-slate-400">Salve referências, trends e ideias para reutilizar na linha editorial.</p>
              <p className="text-xs text-slate-400">Clique em "Nova Inspiração" para adicionar a primeira referência.</p>
              <Button variant="secondary" size="sm" className="mt-2" onClick={() => setForm({})}><GlassIcon name="plus" className="h-4 w-4" /> Adicionar inspiração</Button>
            </>
          )}
        </Card>
      ) : visao === 'grade' ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {visiveis.map((i) => (
            <Card key={i.id} className="flex flex-col overflow-hidden p-0">
              <div className="aspect-video w-full overflow-hidden"><ImagemCapa capa={i.capa} icone="lightbulb" /></div>
              <div className="flex flex-1 flex-col gap-2 p-4">
                <div className="flex flex-wrap gap-1.5">
                  <span className="rounded-full bg-violet-500/10 px-2 py-0.5 text-[11px] font-semibold text-violet-300">{rotuloFormato(i.formato)}</span>
                  <span className="rounded-full bg-amber-500/10 px-2 py-0.5 text-[11px] font-semibold text-amber-300">{rotuloOrigem(i.origem)}</span>
                  {!clienteId && <span className="rounded-full bg-white/[0.06] px-2 py-0.5 text-[11px] font-semibold text-slate-300">{i.cliente_id ? nomeCliente.get(i.cliente_id) ?? 'Cliente' : 'Geral'}</span>}
                </div>
                <h3 className="text-sm font-bold text-slate-100">{i.titulo}</h3>
                {i.descricao && <p className="line-clamp-2 text-xs text-slate-400">{i.descricao}</p>}
                {i.insights && <p className="line-clamp-2 text-xs text-slate-300"><strong>Como aplicar:</strong> {i.insights}</p>}
                {i.tags.length > 0 && (
                  <div className="flex flex-wrap gap-1">{i.tags.map((t) => <span key={t} className="text-[11px] text-brand-300">#{t}</span>)}</div>
                )}
                <AcoesInspiracao i={i} onEditar={() => setForm({ inspiracao: i })} onArquivar={() => void arquivar(i)} onExcluir={() => void apagar(i)} />
              </div>
            </Card>
          ))}
        </div>
      ) : (
        <Card className="overflow-hidden p-0">
          <ul>
            {visiveis.map((i) => (
              <li key={i.id} className="flex items-center gap-3 border-b border-white/[0.06] px-4 py-3 last:border-b-0">
                <div className="h-12 w-16 shrink-0 overflow-hidden rounded-lg"><ImagemCapa capa={i.capa} icone="lightbulb" /></div>
                <div className="min-w-0 flex-1">
                  <div className="truncate text-sm font-semibold text-slate-100">{i.titulo}</div>
                  <div className="truncate text-xs text-slate-400">
                    {rotuloFormato(i.formato)} · {rotuloOrigem(i.origem)}{i.tags.length ? ` · ${i.tags.map((t) => `#${t}`).join(' ')}` : ''}
                  </div>
                </div>
                <AcoesInspiracao i={i} onEditar={() => setForm({ inspiracao: i })} onArquivar={() => void arquivar(i)} onExcluir={() => void apagar(i)} />
              </li>
            ))}
          </ul>
        </Card>
      )}

      {form && (
        <InspiracaoFormModal
          inspiracao={form.inspiracao}
          clientes={clientes}
          clienteInicial={clienteId || null}
          onClose={() => setForm(null)}
        />
      )}
    </div>
  );
}

function AcoesInspiracao({ i, onEditar, onArquivar, onExcluir }: { i: Inspiracao; onEditar: () => void; onArquivar: () => void; onExcluir: () => void }) {
  const botao = 'rounded-lg p-1.5 text-slate-400 hover:bg-white/10 hover:text-slate-200';
  return (
    <div className="mt-auto flex items-center gap-1 pt-1">
      {i.link && (
        <a href={i.link} target="_blank" rel="noreferrer" className={botao} title="Abrir referência" aria-label="Abrir referência">
          <GlassIcon name="link" className="h-4 w-4" />
        </a>
      )}
      <span className="flex-1" />
      <button className={botao} onClick={onEditar} title="Editar" aria-label="Editar"><GlassIcon name="pencil" className="h-4 w-4" /></button>
      <button className={botao} onClick={onArquivar} title={i.arquivada ? 'Reativar' : 'Arquivar'} aria-label={i.arquivada ? 'Reativar' : 'Arquivar'}>
        <GlassIcon name={i.arquivada ? 'refresh' : 'archive'} className="h-4 w-4" />
      </button>
      <button className={`${botao} hover:text-red-400`} onClick={onExcluir} title="Excluir" aria-label="Excluir"><GlassIcon name="trash" className="h-4 w-4" /></button>
    </div>
  );
}
