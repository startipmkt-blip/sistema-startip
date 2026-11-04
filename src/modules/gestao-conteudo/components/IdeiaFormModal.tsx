import { useEffect, useMemo, useState } from 'react';
import { useSalvarIdeia } from '@/modules/gestao-conteudo/api/ideiasApi';
import { pilaresEditoriais } from '@/modules/gestao-conteudo/api/pilaresApi';
import { SEMANA_EXTRA, type Ideia, type IdeiaForm } from '@/modules/gestao-conteudo/types';
import { semanasRotuladas } from '@/modules/gestao-conteudo/lib/semanas';
import { inspiracoes, formatoParaConteudo, rotuloFormato } from '@/modules/gestao-conteudo/inspiracoes/inspiracoesApi';
import type { ConteudoTipo } from '@/modules/conteudo/types';
import { GlassIcon } from '@/shared/ui/GlassIcon';
import { ImagemCapa } from '@/shared/ui/form/CapaUpload';
import {
  Campo, Chips, EditorCenas, Escolha, FORMATOS_CONTEUDO, FUNIL, JanelaFormulario, OpcoesCartao,
  PLATAFORMAS, Rotulo, Secao, Texto,
} from '@/shared/ui/form/FormKit';
import { GerenciarPilares } from './GerenciarPilares';
import { EditorRico } from '@/shared/ui/texto-rico/EditorRico';
import { paraHtml } from '@/shared/ui/texto-rico/regras';

interface Props {
  open: boolean;
  onClose: () => void;
  clienteId: string;
  mes: string;
  ideia?: Ideia;
  semanaInicial?: number;
}

type Modo = 'zero' | 'inspiracao';

const VAZIO: IdeiaForm = {
  titulo: '', descricao: '', formato: 'reels', semana: 1, dia_postagem: null,
  pilar_id: null, plataformas: ['instagram'], funil: null, como_aplicar: '', cenas: [], inspiracao_id: null,
};

export function IdeiaFormModal({ open, onClose, clienteId, mes, ideia, semanaInicial }: Props) {
  const salvar = useSalvarIdeia();
  const pilares = pilaresEditoriais.useLista();
  const listaInsp = inspiracoes.useLista();
  const [form, setForm] = useState<IdeiaForm>(VAZIO);
  const [modo, setModo] = useState<Modo>('zero');
  const [gerenciar, setGerenciar] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const semanas = useMemo(() => semanasRotuladas(mes), [mes]);

  useEffect(() => {
    if (!open) return;
    setErro(null);
    setModo('zero');
    setForm(ideia
      ? {
        titulo: ideia.titulo, descricao: ideia.descricao, formato: ideia.formato, semana: ideia.semana,
        dia_postagem: ideia.dia_postagem, pilar_id: ideia.pilar_id ?? null, plataformas: ideia.plataformas ?? [],
        funil: ideia.funil ?? null, como_aplicar: ideia.como_aplicar ?? '', cenas: ideia.cenas ?? [],
        inspiracao_id: ideia.inspiracao_id ?? null,
      }
      : { ...VAZIO, semana: semanaInicial ?? 1 });
  }, [open, ideia, semanaInicial]);

  const set = <K extends keyof IdeiaForm>(k: K, v: IdeiaForm[K]) => setForm((f) => ({ ...f, [k]: v }));

  const inspDisponiveis = (listaInsp.data ?? []).filter((i) => !i.arquivada && (i.cliente_id === null || i.cliente_id === clienteId));

  function usarInspiracao(id: string) {
    const i = inspDisponiveis.find((x) => x.id === id);
    if (!i) return;
    setForm((f) => ({
      ...f,
      titulo: i.titulo,
      formato: formatoParaConteudo(i.formato),
      // Junta o texto (pode ser HTML do editor) com o link sem perder as quebras de linha.
      descricao: paraHtml(i.descricao) + (i.link ? paraHtml(`Referência: ${i.link}`) : ''),
      como_aplicar: i.insights,
      inspiracao_id: i.id,
    }));
    setModo('zero');
  }

  function handleSalvar() {
    if (!form.titulo.trim()) { setErro('Informe o título.'); return; }
    if (!form.pilar_id) { setErro('Escolha o pilar editorial.'); return; }
    setErro(null);
    salvar.mutate(
      { id: ideia?.id, clienteId, mes, dados: { ...form, titulo: form.titulo.trim() } },
      { onSuccess: onClose, onError: (e) => setErro(`Não foi possível salvar: ${(e as Error).message}`) },
    );
  }

  const [ano, mm] = mes.split('-');
  const pronto = Boolean(form.titulo.trim() && form.pilar_id);

  return (
    <>
      <JanelaFormulario
        open={open}
        onClose={onClose}
        largura="lg"
        titulo={ideia ? 'Editar item da Linha Editorial' : 'Adicionar à Linha Editorial'}
        subtitulo={`Preencha o item do ciclo editorial para ${ano}-${mm}`}
        topo={!ideia && (
          <div className="tabs-clean grid grid-cols-2 gap-1 rounded-xl border border-white/10 bg-white/[0.03] p-1" role="tablist">
            {([['zero', 'Criar do zero', ''], ['inspiracao', 'De Inspiração', 'sparkles']] as const).map(([id, label, icone]) => (
              <button
                key={id}
                role="tab"
                aria-selected={modo === id}
                onClick={() => setModo(id)}
                className={`flex items-center justify-center gap-1.5 rounded-lg py-2 text-sm font-semibold transition-colors ${
                  modo === id ? 'tab-ativa bg-white/10 text-white' : 'text-slate-400 hover:text-slate-200'}`}
              >
                {icone && <GlassIcon name={icone} className="h-4 w-4" />} {label}
              </button>
            ))}
          </div>
        )}
        rodape={
          <>
            {erro && <p role="alert" className="mr-auto text-xs text-red-400">{erro}</p>}
            <button type="button" onClick={onClose} className="rounded-lg border border-white/10 bg-white/[0.04] px-4 py-2 text-sm font-semibold text-slate-100 hover:bg-white/10">Cancelar</button>
            <button type="button" onClick={handleSalvar} disabled={!pronto || salvar.isPending}
              className="rounded-lg bg-gradient-brand px-4 py-2 text-sm font-semibold text-white disabled:opacity-50">
              {salvar.isPending ? 'Salvando…' : ideia ? 'Salvar' : 'Adicionar'}
            </button>
          </>
        }
      >
        {modo === 'inspiracao' ? (
          inspDisponiveis.length === 0 ? (
            <div className="flex flex-col items-center gap-1 py-10 text-center">
              <GlassIcon name="lightbulb" tone="brand" className="h-6 w-6" />
              <p className="text-sm font-semibold text-slate-100">Nenhuma inspiração ativa para este cliente</p>
              <p className="text-xs text-slate-400">Salve referências na aba Inspirações e elas aparecem aqui.</p>
            </div>
          ) : (
            <div className="flex flex-col gap-2">
              <p className="text-xs text-slate-400">Escolha uma inspiração: título, formato, contexto e "como aplicar" vêm preenchidos.</p>
              {inspDisponiveis.map((i) => (
                <button key={i.id} type="button" onClick={() => usarInspiracao(i.id)}
                  className="secao-form flex items-center gap-3 rounded-xl border border-white/10 p-2.5 text-left hover:border-brand-400">
                  <div className="h-12 w-16 shrink-0 overflow-hidden rounded-lg"><ImagemCapa capa={i.capa} icone="lightbulb" /></div>
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-sm font-semibold text-slate-100">{i.titulo}</div>
                    <div className="truncate text-xs text-slate-400">{rotuloFormato(i.formato)}{i.insights ? ` · ${i.insights}` : ''}</div>
                  </div>
                  <GlassIcon name="chevron-right" className="h-4 w-4" />
                </button>
              ))}
            </div>
          )
        ) : (
          <>
            {form.inspiracao_id && (
              <p className="flex items-center gap-1.5 rounded-lg bg-brand-500/10 px-3 py-2 text-xs font-medium text-brand-300">
                <GlassIcon name="sparkles" className="h-3.5 w-3.5" /> Criado a partir de uma inspiração.
              </p>
            )}
            <Secao icone="file-text" titulo="Sobre o conteúdo" subtitulo="Identifique o que vai ser produzido">
              <Campo label="Título" obrigatorio>
                <Texto placeholder="Ex: Fundação do conceito" value={form.titulo} onChange={(e) => set('titulo', e.target.value)} autoFocus />
              </Campo>
              <div className="flex flex-col gap-1.5">
                <Rotulo obrigatorio acao={
                  <button type="button" onClick={() => setGerenciar(true)} className="flex items-center gap-1 text-xs font-semibold text-brand-300 hover:underline">
                    <GlassIcon name="settings" className="h-3.5 w-3.5" /> Gerenciar
                  </button>
                }>Pilar editorial</Rotulo>
                <Escolha
                  opcoes={[{ value: '', label: 'Selecionar pilar...' }, ...(pilares.data ?? []).map((p) => ({ value: p.id, label: p.nome }))]}
                  value={form.pilar_id ?? ''}
                  onChange={(e) => set('pilar_id', e.target.value || null)}
                />
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                <Campo label="Semana">
                  <Escolha
                    opcoes={[...semanas.map((s) => ({ value: String(s.numero), label: `Semana ${s.numero}` })), { value: String(SEMANA_EXTRA), label: 'Conteúdo extra' }]}
                    value={String(form.semana)}
                    onChange={(e) => set('semana', Number(e.target.value))}
                  />
                </Campo>
                <Campo label="Formato">
                  <Escolha opcoes={FORMATOS_CONTEUDO} value={form.formato} onChange={(e) => set('formato', e.target.value as ConteudoTipo)} />
                </Campo>
              </div>
              <Campo label="Plataforma">
                <Chips opcoes={PLATAFORMAS} valores={form.plataformas ?? []} onChange={(v) => set('plataformas', v)} />
              </Campo>
            </Secao>

            <Secao icone="target" titulo="Estratégia" subtitulo="Direcione o tom e o objetivo do conteúdo">
              <Campo label="Funil de Conteúdo" icone="sparkles">
                <OpcoesCartao opcoes={FUNIL} colunas={4} desmarcavel valor={form.funil ?? null} onChange={(v) => set('funil', v)} />
              </Campo>
            </Secao>

            <Secao icone="lightbulb" titulo="Briefing" subtitulo="Contexto e orientações para a produção">
              <Campo label="Descrição / Contexto">
                <EditorRico placeholder="Breve contexto do item..." value={form.descricao} onChange={(v) => set('descricao', v)} />
              </Campo>
              <Campo label="Como aplicar">
                <EditorRico placeholder="Como adaptar / abordagem a usar (vira Ângulo/Abordagem no roteiro)..." value={form.como_aplicar ?? ''} onChange={(v) => set('como_aplicar', v)} />
              </Campo>
            </Secao>

            <Secao icone="clapperboard" titulo="Estrutura do formato">
              <EditorCenas cenas={form.cenas ?? []} onChange={(c) => set('cenas', c)} />
            </Secao>
          </>
        )}
      </JanelaFormulario>
      <GerenciarPilares open={gerenciar} onClose={() => setGerenciar(false)} />
    </>
  );
}
