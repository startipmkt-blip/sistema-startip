import { useMemo, useState } from 'react';
import { pilaresEditoriais } from '@/modules/gestao-conteudo/api/pilaresApi';
import { useSalvarPost } from '@/modules/gestao-conteudo/api/gestaoApi';
import { SEMANA_EXTRA } from '@/modules/gestao-conteudo/types';
import { semanasRotuladas, semanaParaDia } from '@/modules/gestao-conteudo/lib/semanas';
import { GerenciarPilares } from '@/modules/gestao-conteudo/components/GerenciarPilares';
import { AnexosCriativo } from '@/modules/ideias/criativos/components/AnexosCriativo';
import { descartarAnexo } from '@/modules/ideias/criativos/criativosApi';
import type { CriativoAnexo } from '@/modules/ideias/criativos/types';
import type { ConteudoTipo } from '@/modules/conteudo/types';
import { GlassIcon } from '@/shared/ui/GlassIcon';
import {
  CampoLink, AreaTexto, Campo, Chips, EditorCenas, Escolha, FORMATOS_CONTEUDO, FUNIL, GATILHOS, JanelaFormulario, OpcoesCartao,
  PLATAFORMAS, Rotulo, Secao, Texto, type Cena,
} from '@/shared/ui/form/FormKit';
import { TIPOS_ROTEIRO, roteiros, type Roteiro, type TipoRoteiro } from './roteirosApi';
import { EditorRico } from '@/shared/ui/texto-rico/EditorRico';

interface Props {
  onClose: () => void;
  mes: string;
  clientes: { id: string; nome: string }[];
  /** Cliente já escolhido (aba filtrada). Sem ele, o formulário pede o cliente. */
  clienteId?: string;
  roteiro?: Roteiro;
  /** Pré-preenchimento (ex.: "Criar roteiro" a partir de um nó do mapa mental). */
  inicial?: Partial<Pick<Roteiro, 'titulo' | 'descricao' | 'tipo'>>;
  onCriado?: (r: Roteiro) => void;
}

export function RoteiroFormModal({ onClose, mes, clientes, clienteId, roteiro, inicial, onCriado }: Props) {
  const salvar = roteiros.useSalvar();
  const salvarPost = useSalvarPost();
  const pilares = pilaresEditoriais.useLista();
  const semanas = useMemo(() => semanasRotuladas(mes), [mes]);
  const [gerenciar, setGerenciar] = useState(false);
  const [erro, setErro] = useState('');
  const [anexos, setAnexos] = useState<CriativoAnexo[]>(roteiro?.anexos ?? []);
  const [novos, setNovos] = useState<string[]>([]);
  const [form, setForm] = useState({
    cliente_id: roteiro?.cliente_id ?? clienteId ?? '',
    tipo: (roteiro?.tipo ?? inicial?.tipo ?? 'organico') as TipoRoteiro,
    titulo: roteiro?.titulo ?? inicial?.titulo ?? '',
    pilar_id: roteiro?.pilar_id ?? '',
    semana: roteiro?.semana ?? 1,
    formato: (roteiro?.formato ?? 'reels') as ConteudoTipo,
    plataformas: roteiro?.plataformas ?? ['instagram'],
    funil: roteiro?.funil ?? null as string | null,
    gatilhos: roteiro?.gatilhos ?? [],
    descricao: roteiro?.descricao ?? inicial?.descricao ?? '',
    como_aplicar: roteiro?.como_aplicar ?? '',
    observacao: roteiro?.observacao ?? '',
    link_inspiracao: roteiro?.link_inspiracao ?? '',
    cenas: (roteiro?.cenas ?? []) as Cena[],
    legenda: roteiro?.legenda ?? '',
    data_publicacao: roteiro?.data_publicacao ?? '',
  });

  function set<K extends keyof typeof form>(k: K, v: (typeof form)[K]) {
    setForm((f) => ({ ...f, [k]: v }));
  }

  function fechar() {
    for (const p of novos) void descartarAnexo(p);
    onClose();
  }

  const pronto = Boolean(form.titulo.trim() && form.pilar_id && form.cliente_id);
  const [ano, mm] = mes.split('-');

  async function handleSalvar() {
    setErro('');
    if (!form.cliente_id) { setErro('Escolha o cliente.'); return; }
    if (!form.titulo.trim()) { setErro('Informe o título.'); return; }
    if (!form.pilar_id) { setErro('Escolha o pilar editorial.'); return; }
    const link = form.link_inspiracao.trim();
    const dados: Partial<Roteiro> = {
      cliente_id: form.cliente_id,
      mes_referencia: roteiro?.mes_referencia ?? mes,
      tipo: form.tipo,
      titulo: form.titulo.trim(),
      pilar_id: form.pilar_id || null,
      semana: form.semana,
      formato: form.formato,
      plataformas: form.plataformas,
      funil: form.funil,
      gatilhos: form.gatilhos,
      descricao: form.descricao.trim(),
      como_aplicar: form.como_aplicar.trim(),
      observacao: form.observacao.trim(),
      link_inspiracao: link ? (/^https?:\/\//i.test(link) ? link : `https://${link}`) : null,
      anexos,
      cenas: form.cenas,
      legenda: form.legenda.trim(),
      data_publicacao: form.data_publicacao || null,
      ...(roteiro ? {} : { status: 'pendente' as const }),
    };
    try {
      const salvo = await salvar.mutateAsync({ id: roteiro?.id, dados });
      // Mantidos não saem do storage; os removidos sim.
      const mantidos = new Set(anexos.map((a) => a.path));
      for (const a of roteiro?.anexos ?? []) if (!mantidos.has(a.path)) void descartarAnexo(a.path);
      setNovos([]);

      // "Publicação" preenchida num roteiro novo: já nasce o conteúdo em edição na Gestão.
      if (!roteiro && (dados.legenda || dados.data_publicacao)) {
        const mesPost = dados.data_publicacao ? dados.data_publicacao.slice(0, 7) : mes;
        await salvarPost.mutateAsync({
          clienteId: form.cliente_id,
          mes: mesPost,
          categoria: form.tipo === 'trafego' ? 'criativo' : 'organico',
          dados: {
            titulo: dados.titulo ?? '',
            descricao: dados.legenda ?? '',
            formato: form.formato,
            semana: dados.data_publicacao ? semanaParaDia(mesPost, dados.data_publicacao, form.semana) : Math.min(form.semana, 5),
            dia_postagem: dados.data_publicacao ?? null,
            link_drive: null,
          },
        });
      }
      onCriado?.(salvo);
      onClose();
    } catch (e) {
      setErro((e as Error).message);
    }
  }

  return (
    <>
      <JanelaFormulario
        open
        onClose={fechar}
        largura="lg"
        icone="clapperboard"
        titulo={roteiro ? 'Editar Roteiro' : 'Novo Roteiro'}
        subtitulo={`Preencha o roteiro de produção para ${ano}-${mm}`}
        topo={
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
            <div className="tabs-clean grid flex-1 grid-cols-2 gap-1 rounded-xl border border-white/10 bg-white/[0.03] p-1" role="radiogroup" aria-label="Tipo de roteiro">
              {TIPOS_ROTEIRO.map((t) => (
                <button
                  key={t.id}
                  role="radio"
                  aria-checked={form.tipo === t.id}
                  onClick={() => set('tipo', t.id)}
                  className={`flex items-center justify-center gap-1.5 rounded-lg py-2 text-sm font-semibold transition-colors ${
                    form.tipo === t.id ? 'tab-ativa bg-white/10 text-white' : 'text-slate-400 hover:text-slate-200'}`}
                >
                  <GlassIcon name={t.icone} className="h-4 w-4" /> {t.label}
                </button>
              ))}
            </div>
            {!clienteId && (
              <Escolha
                aria-label="Cliente"
                className="sm:!w-56"
                opcoes={[{ value: '', label: 'Escolher cliente...' }, ...clientes.map((c) => ({ value: c.id, label: c.nome }))]}
                value={form.cliente_id}
                onChange={(e) => set('cliente_id', e.target.value)}
              />
            )}
          </div>
        }
        rodape={
          <>
            {erro && <p role="alert" className="mr-auto text-xs text-red-400">{erro}</p>}
            <button type="button" onClick={fechar} className="rounded-lg border border-white/10 bg-white/[0.04] px-4 py-2 text-sm font-semibold text-slate-100 hover:bg-white/10">Cancelar</button>
            <button type="button" onClick={handleSalvar} disabled={!pronto || salvar.isPending}
              className="rounded-lg bg-gradient-brand px-4 py-2 text-sm font-semibold text-white disabled:opacity-50">
              {salvar.isPending ? 'Salvando…' : roteiro ? 'Salvar Roteiro' : 'Criar Roteiro'}
            </button>
          </>
        }
      >
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
              value={form.pilar_id}
              onChange={(e) => set('pilar_id', e.target.value)}
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
            <Chips opcoes={PLATAFORMAS} valores={form.plataformas} onChange={(v) => set('plataformas', v)} />
          </Campo>
        </Secao>

        <Secao icone="target" titulo="Estratégia" subtitulo="Direcione o tom e o objetivo do conteúdo">
          <Campo label="Funil de Conteúdo" icone="filter">
            <OpcoesCartao opcoes={FUNIL} colunas={4} desmarcavel valor={form.funil} onChange={(v) => set('funil', v)} />
          </Campo>
          <Campo label="Gatilho Mental" icone="sparkles">
            <Chips opcoes={GATILHOS} comMais valores={form.gatilhos} onChange={(v) => set('gatilhos', v)} />
            <p className="text-xs italic text-slate-400">Selecione os gatilhos que fazem mais sentido para este conteúdo.</p>
          </Campo>
        </Secao>

        <Secao icone="lightbulb" titulo="Briefing" subtitulo="Contexto e orientações para a produção">
          <Campo label="Descrição / Contexto">
            <EditorRico placeholder="Breve contexto do item..." value={form.descricao} onChange={(v) => set('descricao', v)} />
          </Campo>
          <Campo label="Como aplicar">
            <EditorRico placeholder="Como adaptar / abordagem a usar (vira Ângulo/Abordagem no roteiro)..." value={form.como_aplicar} onChange={(v) => set('como_aplicar', v)} />
          </Campo>
          <Campo label="Observação">
            <EditorRico linhas={2} placeholder="Observações gerais sobre o roteiro..." value={form.observacao} onChange={(v) => set('observacao', v)} />
          </Campo>
        </Secao>

        <Secao icone="paperclip" titulo="Referências" subtitulo="Opcional — tudo aqui é opcional">
          <Campo label="Link de Inspiração" icone="link">
            <CampoLink value={form.link_inspiracao ?? ''} onChange={(v) => set('link_inspiracao', v)} />
          </Campo>
          <Campo label="Anexar Arquivo" icone="paperclip">
            <AnexosCriativo anexos={anexos} onChange={setAnexos} novos={novos} onNovos={setNovos} />
          </Campo>
        </Secao>

        <Secao icone="clapperboard" titulo="Estrutura do formato">
          <EditorCenas cenas={form.cenas} onChange={(c) => set('cenas', c)} />
        </Secao>

        <Secao icone="calendar" titulo="Publicação" subtitulo={roteiro ? 'Legenda e data planejadas' : 'Opcional — se preenchido, vai para a Edição'}>
          <Campo label="Legenda" icone="file-text">
            <AreaTexto placeholder="Legenda que será usada na publicação (opcional)..." value={form.legenda} onChange={(e) => set('legenda', e.target.value)} />
          </Campo>
          <Campo label="Data de Publicação" icone="calendar">
            <Texto type="date" value={form.data_publicacao} onChange={(e) => set('data_publicacao', e.target.value)} />
          </Campo>
        </Secao>

        <label className="secao-form flex cursor-not-allowed items-start gap-3 rounded-xl border border-brand-500/20 bg-brand-500/5 p-3.5 opacity-70">
          <input type="checkbox" disabled className="mt-1" />
          <span>
            <span className="flex items-center gap-1.5 text-sm font-semibold text-slate-100"><GlassIcon name="sparkles" className="h-4 w-4" /> Criar roteiro com IA</span>
            <span className="block text-xs text-slate-400">Disponível quando a IA for integrada ao sistema. Ela vai ler o contexto da marca e escrever o roteiro completo.</span>
          </span>
        </label>
      </JanelaFormulario>
      <GerenciarPilares open={gerenciar} onClose={() => setGerenciar(false)} />
    </>
  );
}
