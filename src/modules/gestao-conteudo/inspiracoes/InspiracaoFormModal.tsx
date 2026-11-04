import { useState } from 'react';
import { CapaUpload } from '@/shared/ui/form/CapaUpload';
import { Campo, Escolha, JanelaFormulario, Secao, Texto } from '@/shared/ui/form/FormKit';
import { descartarAnexo } from '@/modules/ideias/criativos/criativosApi';
import type { ClienteGestao } from '@/modules/gestao-conteudo/utils';
import {
  FORMATOS_INSPIRACAO, ORIGENS_INSPIRACAO, inspiracoes,
  type FormatoInspiracao, type Inspiracao, type OrigemInspiracao,
} from './inspiracoesApi';
import { EditorRico } from '@/shared/ui/texto-rico/EditorRico';

interface Props {
  onClose: () => void;
  inspiracao?: Inspiracao;
  clientes: ClienteGestao[];
  clienteInicial: string | null;
}

export function InspiracaoFormModal({ onClose, inspiracao, clientes, clienteInicial }: Props) {
  const salvar = inspiracoes.useSalvar();
  const [erro, setErro] = useState('');
  const [capaNova, setCapaNova] = useState<string | null>(null);
  const [form, setForm] = useState({
    cliente_id: inspiracao ? inspiracao.cliente_id ?? '' : clienteInicial ?? '',
    titulo: inspiracao?.titulo ?? '',
    formato: (inspiracao?.formato ?? 'video') as FormatoInspiracao,
    origem: (inspiracao?.origem ?? 'tendencia') as OrigemInspiracao,
    link: inspiracao?.link ?? '',
    capa: inspiracao?.capa ?? null,
    descricao: inspiracao?.descricao ?? '',
    insights: inspiracao?.insights ?? '',
    tags: (inspiracao?.tags ?? []).join(', '),
  });

  function set<K extends keyof typeof form>(k: K, v: (typeof form)[K]) {
    setForm((f) => ({ ...f, [k]: v }));
  }

  function fechar() {
    if (capaNova) void descartarAnexo(capaNova);
    onClose();
  }

  const pronto = Boolean(form.titulo.trim() && form.capa);

  async function handleSalvar() {
    setErro('');
    if (!form.titulo.trim()) { setErro('Dê um título.'); return; }
    if (!form.capa) { setErro('Escolha uma imagem de capa.'); return; }
    const link = form.link.trim();
    try {
      await salvar.mutateAsync({
        id: inspiracao?.id,
        dados: {
          cliente_id: form.cliente_id || null,
          titulo: form.titulo.trim(),
          formato: form.formato,
          origem: form.origem,
          link: link ? (/^https?:\/\//i.test(link) ? link : `https://${link}`) : null,
          capa: form.capa,
          descricao: form.descricao.trim(),
          insights: form.insights.trim(),
          tags: form.tags.split(',').map((t) => t.trim()).filter(Boolean),
          ...(inspiracao ? {} : { arquivada: false }),
        },
      });
      if (inspiracao?.capa && inspiracao.capa.path !== form.capa.path) void descartarAnexo(inspiracao.capa.path);
      onClose();
    } catch (e) {
      setErro((e as Error).message);
    }
  }

  return (
    <JanelaFormulario
      open
      onClose={fechar}
      titulo={inspiracao ? 'Editar Inspiração' : 'Nova Inspiração'}
      rodape={
        <>
          {erro && <p role="alert" className="mr-auto text-xs text-red-400">{erro}</p>}
          <button type="button" onClick={fechar} className="rounded-lg border border-white/10 bg-white/[0.04] px-4 py-2 text-sm font-semibold text-slate-100 hover:bg-white/10">Cancelar</button>
          <button type="button" onClick={handleSalvar} disabled={!pronto || salvar.isPending}
            className="rounded-lg bg-gradient-brand px-4 py-2 text-sm font-semibold text-white disabled:opacity-50">
            {salvar.isPending ? 'Salvando…' : inspiracao ? 'Salvar' : 'Adicionar'}
          </button>
        </>
      }
    >
      <Secao icone="file-text" titulo="Sobre a inspiração" subtitulo="Identifique o que é e de onde veio">
        <Campo label="Título" obrigatorio>
          <Texto placeholder="Ex: Trend de transição criativa no Reels" value={form.titulo} onChange={(e) => set('titulo', e.target.value)} autoFocus />
        </Campo>
        <div className="grid gap-3 sm:grid-cols-2">
          <Campo label="Formato">
            <Escolha opcoes={FORMATOS_INSPIRACAO} value={form.formato} onChange={(e) => set('formato', e.target.value as FormatoInspiracao)} />
          </Campo>
          <Campo label="Origem">
            <Escolha opcoes={ORIGENS_INSPIRACAO} value={form.origem} onChange={(e) => set('origem', e.target.value as OrigemInspiracao)} />
          </Campo>
        </div>
        <Campo label="Cliente">
          <Escolha
            opcoes={[{ value: '', label: 'Geral (serve para todos os clientes)' }, ...clientes.map((c) => ({ value: c.id, label: c.nome }))]}
            value={form.cliente_id}
            onChange={(e) => set('cliente_id', e.target.value)}
          />
        </Campo>
      </Secao>

      <Secao icone="link" titulo="Conteúdo" subtitulo="Link e imagem de referência">
        <Campo label="Link (YouTube, Instagram, site...)" icone="link">
          <Texto type="url" placeholder="https://..." value={form.link} onChange={(e) => set('link', e.target.value)} />
        </Campo>
        <Campo label="Capa" obrigatorio>
          <CapaUpload valor={form.capa} onChange={(c) => set('capa', c)} onNovo={setCapaNova} />
        </Campo>
      </Secao>

      <Secao icone="lightbulb" titulo="Contexto" subtitulo="Descreva e explique como aplicar">
        <Campo label="Descrição / Contexto">
          <EditorRico placeholder="O que é, por que é relevante..." value={form.descricao} onChange={(v) => set('descricao', v)} />
        </Campo>
        <Campo label="Insights / Como aplicar">
          <EditorRico placeholder="Como podemos adaptar isso para o cliente?" value={form.insights} onChange={(v) => set('insights', v)} />
        </Campo>
        <Campo label="Tags (separadas por vírgula)">
          <Texto placeholder="reels, transição, viral, autoridade..." value={form.tags} onChange={(e) => set('tags', e.target.value)} />
        </Campo>
      </Secao>
    </JanelaFormulario>
  );
}
