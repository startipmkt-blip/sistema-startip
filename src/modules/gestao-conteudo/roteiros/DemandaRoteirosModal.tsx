import { useMemo, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { pilaresEditoriais } from '@/modules/gestao-conteudo/api/pilaresApi';
import { SEMANA_EXTRA } from '@/modules/gestao-conteudo/types';
import { semanasRotuladas } from '@/modules/gestao-conteudo/lib/semanas';
import type { ConteudoTipo } from '@/modules/conteudo/types';
import { GlassIcon } from '@/shared/ui/GlassIcon';
import { confirmar } from '@/shared/ui/ConfirmDialog';
import { EditorRico } from '@/shared/ui/texto-rico/EditorRico';
import {
  AreaTexto, Campo, EditorCenas, Escolha, FORMATOS_CONTEUDO, JanelaFormulario, Texto, type Cena,
} from '@/shared/ui/form/FormKit';
import {
  TIPOS_ROTEIRO, roteiroDemandas, roteiros, type Roteiro, type RoteiroDemanda, type TipoRoteiro,
} from './roteirosApi';
import { baixarPdfRoteiros } from './pdfRoteiros';

interface Props {
  onClose: () => void;
  mes: string;
  clientes: { id: string; nome: string }[];
  clienteId?: string;
  tipoInicial?: TipoRoteiro;
  demanda?: RoteiroDemanda;
  /** Roteiros já salvos desta demanda. */
  existentes?: Roteiro[];
}

interface Rascunho {
  chave: string;
  id?: string;
  titulo: string;
  pilar_id: string;
  semana: number;
  formato: ConteudoTipo;
  descricao: string;
  cenas: Cena[];
  legenda: string;
  /** Campos que o editor não mexe, preservados ao salvar. */
  resto: Partial<Roteiro>;
}

let contador = 0;
const novaChave = () => `n${++contador}`;

function vazio(semana = 1): Rascunho {
  return { chave: novaChave(), titulo: '', pilar_id: '', semana, formato: 'reels', descricao: '', cenas: [], legenda: '', resto: {} };
}

function deRoteiro(r: Roteiro): Rascunho {
  return {
    chave: r.id, id: r.id, titulo: r.titulo, pilar_id: r.pilar_id ?? '', semana: r.semana, formato: r.formato,
    descricao: r.descricao, cenas: r.cenas as Cena[], legenda: r.legenda, resto: {},
  };
}

/** Editor tipo "documento": uma demanda com vários roteiros em sub-abas. */
export function DemandaRoteirosModal({ onClose, mes, clientes, clienteId, tipoInicial, demanda, existentes }: Props) {
  const qc = useQueryClient();
  const excluirRoteiro = roteiros.useExcluir();
  const pilares = pilaresEditoriais.useLista();
  const semanas = useMemo(() => semanasRotuladas(mes), [mes]);

  const [titulo, setTitulo] = useState(demanda?.titulo ?? '');
  const [cliente, setCliente] = useState(demanda?.cliente_id ?? clienteId ?? '');
  const [tipo, setTipo] = useState<TipoRoteiro>(demanda?.tipo ?? tipoInicial ?? 'organico');
  const [itens, setItens] = useState<Rascunho[]>(() => {
    const ord = [...(existentes ?? [])].sort((a, b) => (a.ordem ?? 0) - (b.ordem ?? 0) || a.created_at.localeCompare(b.created_at));
    return ord.length ? ord.map(deRoteiro) : [vazio()];
  });
  const [ativa, setAtiva] = useState(itens[0].chave);
  const [removidos, setRemovidos] = useState<string[]>([]);
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState('');

  const atual = itens.find((i) => i.chave === ativa) ?? itens[0];

  function mudar(campo: Partial<Rascunho>) {
    setItens((l) => l.map((i) => (i.chave === atual.chave ? { ...i, ...campo } : i)));
  }
  function adicionar() {
    const n = vazio(atual.semana);
    setItens((l) => [...l, n]);
    setAtiva(n.chave);
  }
  async function remover(i: Rascunho) {
    const preenchido = i.titulo.trim() || i.descricao.trim() || i.cenas.length;
    if (preenchido && !(await confirmar(`Remover o roteiro "${i.titulo || 'sem título'}" desta demanda?`))) return;
    if (i.id) setRemovidos((r) => [...r, i.id as string]);
    const restantes = itens.filter((x) => x.chave !== i.chave);
    const lista = restantes.length ? restantes : [vazio()];
    setItens(lista);
    if (i.chave === ativa) setAtiva(lista[0].chave);
  }

  function comoRoteiros(): Roteiro[] {
    return itens.map((i, k) => ({
      id: i.id ?? i.chave, created_at: '', cliente_id: cliente, mes_referencia: demanda?.mes_referencia ?? mes, tipo,
      titulo: i.titulo.trim() || `Roteiro ${k + 1}`, pilar_id: i.pilar_id || null, semana: i.semana, formato: i.formato,
      plataformas: [], funil: null, gatilhos: [], descricao: i.descricao, como_aplicar: '', observacao: '',
      link_inspiracao: null, anexos: [], cenas: i.cenas, legenda: i.legenda, data_publicacao: null, status: 'pendente',
    }));
  }

  function baixar() {
    void baixarPdfRoteiros({
      titulo: titulo.trim() || 'Demanda de roteiros', mes: demanda?.mes_referencia ?? mes, roteiros: comoRoteiros(),
      arquivo: titulo.trim() || 'demanda',
      nomeCliente: (id) => clientes.find((c) => c.id === id)?.nome ?? '', nomePilar: (id) => (id ? (pilares.data ?? []).find((p) => p.id === id)?.nome ?? '' : ''),
    });
  }

  async function salvar() {
    setErro('');
    if (!cliente) { setErro('Escolha o cliente.'); return; }
    if (!titulo.trim()) { setErro('Dê um nome para a demanda.'); return; }
    setSalvando(true);
    try {
      const salva = await roteiroDemandas.salvar(demanda?.id, {
        cliente_id: cliente, mes_referencia: demanda?.mes_referencia ?? mes, tipo, titulo: titulo.trim(),
      });
      for (const id of removidos) await excluirRoteiro.mutateAsync(id);
      for (const [k, i] of itens.entries()) {
        const vazioTotal = !i.id && !i.titulo.trim() && !i.descricao.trim() && !i.cenas.length && !i.legenda.trim();
        if (vazioTotal) continue;
        await roteiros.salvar(i.id, {
          ...i.resto,
          cliente_id: cliente, mes_referencia: salva.mes_referencia, tipo, demanda_id: salva.id, ordem: k,
          titulo: i.titulo.trim() || `Roteiro ${k + 1}`, pilar_id: i.pilar_id || null, semana: i.semana,
          formato: i.formato, descricao: i.descricao, cenas: i.cenas, legenda: i.legenda,
          ...(i.id ? {} : { status: 'pendente' as const }),
        });
      }
      await qc.invalidateQueries({ queryKey: ['gestao-conteudo'] });
      onClose();
    } catch (e) {
      setErro((e as Error).message);
    } finally {
      setSalvando(false);
    }
  }

  return (
    <JanelaFormulario
      open
      onClose={onClose}
      largura="xl"
      icone="clapperboard"
      titulo={demanda ? 'Editar demanda de roteiros' : 'Nova demanda de roteiros'}
      subtitulo="Crie vários roteiros num só lugar e baixe tudo junto em um único PDF"
      topo={
        <div className="space-y-2 px-4 pb-2 sm:px-6">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
            <div className="min-w-0 flex-1">
              <Texto placeholder="Nome da demanda (ex: Roteiros de novembro)" value={titulo} onChange={(e) => setTitulo(e.target.value)} autoFocus={!demanda} />
            </div>
            {!clienteId && !demanda && (
              <Escolha
                aria-label="Cliente" className="sm:!w-52"
                opcoes={[{ value: '', label: 'Escolher cliente...' }, ...clientes.map((c) => ({ value: c.id, label: c.nome }))]}
                value={cliente} onChange={(e) => setCliente(e.target.value)}
              />
            )}
            <div className="tabs-clean grid grid-cols-2 gap-1 rounded-xl border border-white/10 bg-white/[0.03] p-1" role="radiogroup" aria-label="Tipo">
              {TIPOS_ROTEIRO.map((t) => (
                <button key={t.id} role="radio" aria-checked={tipo === t.id} onClick={() => setTipo(t.id)}
                  className={`flex items-center justify-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors ${
                    tipo === t.id ? 'tab-ativa bg-white/10 text-white' : 'text-slate-400 hover:text-slate-200'}`}>
                  <GlassIcon name={t.icone} className="h-3.5 w-3.5" /> {t.label}
                </button>
              ))}
            </div>
          </div>

          <div className="abas-linha flex items-center gap-1 overflow-x-auto border-b border-white/10" role="tablist" aria-label="Roteiros da demanda">
            {itens.map((i, k) => (
              <button key={i.chave} role="tab" aria-selected={i.chave === atual.chave} onClick={() => setAtiva(i.chave)}
                className={`-mb-px inline-flex max-w-[12rem] shrink-0 items-center gap-1.5 border-b-2 px-3 py-2 text-xs font-semibold transition-colors ${
                  i.chave === atual.chave ? 'border-brand-400 text-brand-300' : 'border-transparent text-slate-400 hover:text-slate-200'}`}>
                <span className="truncate">{i.titulo.trim() || `Roteiro ${k + 1}`}</span>
              </button>
            ))}
            <button onClick={adicionar} title="Adicionar roteiro" aria-label="Adicionar roteiro"
              className="ml-1 inline-flex shrink-0 items-center gap-1 rounded-lg px-2 py-1.5 text-xs font-semibold text-brand-300 hover:bg-white/5">
              <GlassIcon name="plus" className="h-3.5 w-3.5" /> Roteiro
            </button>
          </div>
        </div>
      }
      rodape={
        <>
          {erro && <p role="alert" className="mr-auto text-xs text-red-400">{erro}</p>}
          <button type="button" onClick={baixar}
            className="inline-flex items-center gap-1.5 rounded-lg border border-white/10 bg-white/[0.04] px-4 py-2 text-sm font-semibold text-slate-100 hover:bg-white/10">
            <GlassIcon name="download" className="h-4 w-4" /> Baixar tudo (PDF)
          </button>
          <button type="button" onClick={onClose} className="rounded-lg border border-white/10 bg-white/[0.04] px-4 py-2 text-sm font-semibold text-slate-100 hover:bg-white/10">Cancelar</button>
          <button type="button" onClick={() => void salvar()} disabled={salvando}
            className="rounded-lg bg-gradient-brand px-4 py-2 text-sm font-semibold text-white disabled:opacity-50">
            {salvando ? 'Salvando…' : 'Salvar demanda'}
          </button>
        </>
      }
    >
      <div key={atual.chave} className="space-y-4">
        <div className="flex items-end gap-2">
          <div className="min-w-0 flex-1">
            <Campo label="Título do roteiro">
              <Texto placeholder="Ex: Fundação do conceito" value={atual.titulo} onChange={(e) => mudar({ titulo: e.target.value })} />
            </Campo>
          </div>
          <button onClick={() => void remover(atual)} title="Remover este roteiro" aria-label="Remover este roteiro"
            className="mb-1 rounded p-2 text-slate-400 hover:bg-red-500/10 hover:text-red-400">
            <GlassIcon name="trash" className="h-4 w-4" />
          </button>
        </div>
        <div className="grid gap-3 sm:grid-cols-3">
          <Campo label="Pilar editorial">
            <Escolha
              opcoes={[{ value: '', label: 'Sem pilar' }, ...(pilares.data ?? []).map((p) => ({ value: p.id, label: p.nome }))]}
              value={atual.pilar_id} onChange={(e) => mudar({ pilar_id: e.target.value })}
            />
          </Campo>
          <Campo label="Semana">
            <Escolha
              opcoes={[...semanas.map((s) => ({ value: String(s.numero), label: `Semana ${s.numero}` })), { value: String(SEMANA_EXTRA), label: 'Conteúdo extra' }]}
              value={String(atual.semana)} onChange={(e) => mudar({ semana: Number(e.target.value) })}
            />
          </Campo>
          <Campo label="Formato">
            <Escolha opcoes={FORMATOS_CONTEUDO} value={atual.formato} onChange={(e) => mudar({ formato: e.target.value as ConteudoTipo })} />
          </Campo>
        </div>
        <Campo label="Roteiro / Contexto">
          <EditorRico placeholder="Escreva o roteiro, o briefing ou as orientações..." value={atual.descricao} onChange={(v) => mudar({ descricao: v })} />
        </Campo>
        <Campo label="Cenas" icone="clapperboard">
          <EditorCenas cenas={atual.cenas} onChange={(c) => mudar({ cenas: c })} />
        </Campo>
        <Campo label="Legenda" icone="file-text">
          <AreaTexto placeholder="Legenda da publicação (opcional)..." value={atual.legenda} onChange={(e) => mudar({ legenda: e.target.value })} />
        </Campo>
      </div>
    </JanelaFormulario>
  );
}
