import { useState } from 'react';
import {
  categoriasPop,
  useSalvarProcessoDoc,
  type ProcessoFormData,
} from '@/modules/processos/api/processosApi';
import { POP_STATUS, type PopPasso, type PopStatus, type ProcessoDoc } from '@/modules/processos/types';
import { AnexoUploader, type Anexo } from '@/shared/ui/AnexoUploader';
import { CapaUpload } from '@/shared/ui/form/CapaUpload';
import { GlassIcon } from '@/shared/ui/GlassIcon';
import { descartarAnexo } from '@/modules/ideias/criativos/criativosApi';
import {
  CampoLink, BotaoTracejado, Campo, JanelaFormulario, SubtituloForm, Texto,
} from '@/shared/ui/form/FormKit';
import { EditorRico } from '@/shared/ui/texto-rico/EditorRico';

interface Props {
  open: boolean;
  onClose: () => void;
  doc?: ProcessoDoc;
  /** Categoria já escolhida ao criar a partir de uma seção. */
  categoriaInicial?: string | null;
}

// Documentos antigos só tinham texto: cada linha vira um passo ao editar pela primeira vez.
function passosDoTexto(texto: string): PopPasso[] {
  return texto
    .split('\n')
    .map((l) => l.replace(/^\s*\d+[.)-]?\s*/, '').trim())
    .filter(Boolean)
    .map((titulo) => ({ titulo, descricao: '' }));
}

export function ProcessoFormModal({ open, onClose, doc, categoriaInicial }: Props) {
  const salvar = useSalvarProcessoDoc();
  const categorias = categoriasPop.useLista();
  const [erro, setErro] = useState('');
  const [capaNova, setCapaNova] = useState<string | null>(null);
  const [form, setForm] = useState<ProcessoFormData>(() => ({
    categoria: doc?.categoria ?? 'geral',
    titulo: doc?.titulo ?? '',
    conteudo: doc?.conteudo ?? '',
    autor: doc?.autor ?? '',
    anexos: doc?.anexos ?? [],
    categoria_id: doc?.categoria_id ?? categoriaInicial ?? null,
    capa: doc?.capa ?? null,
    versao: doc?.versao ?? '1.0',
    status: doc?.status ?? 'rascunho',
    responsavel: doc?.responsavel ?? '',
    objetivo: doc?.objetivo ?? '',
    quem_executa: doc?.quem_executa ?? '',
    quem_aprova: doc?.quem_aprova ?? '',
    quem_impactado: doc?.quem_impactado ?? '',
    quando_utilizar: doc?.quando_utilizar ?? '',
    materiais: doc?.materiais ?? '',
    video_url: doc?.video_url ?? '',
    passos: doc?.passos?.length ? doc.passos : passosDoTexto(doc?.conteudo ?? ''),
    restricoes: doc?.restricoes ?? [],
  }));

  function set<K extends keyof ProcessoFormData>(k: K, v: ProcessoFormData[K]) {
    setForm((f) => ({ ...f, [k]: v }));
  }

  const passos = form.passos ?? [];
  const restricoes = form.restricoes ?? [];

  function fechar() {
    if (capaNova) void descartarAnexo(capaNova);
    onClose();
  }

  async function handleSalvar() {
    setErro('');
    if (!form.titulo.trim()) { setErro('Dê um título para a POP.'); return; }
    const video = (form.video_url ?? '').trim();
    if (video && !/^https?:\/\//i.test(video)) { setErro('O vídeo explicativo deve ser um link começando com http:// ou https://'); return; }
    try {
      await salvar.mutateAsync({
        id: doc?.id,
        dados: {
          ...form,
          titulo: form.titulo.trim(),
          autor: form.autor || form.responsavel || '',
          video_url: video || null,
          passos: passos.filter((p) => p.titulo.trim() || p.descricao.trim()),
          restricoes: restricoes.map((r) => r.trim()).filter(Boolean),
        },
      });
      // A capa antiga trocada sai do storage depois de salvar.
      if (doc?.capa && doc.capa.path !== form.capa?.path) void descartarAnexo(doc.capa.path);
      onClose();
    } catch (e) {
      setErro((e as Error).message);
    }
  }

  return (
    <JanelaFormulario
      open={open}
      onClose={fechar}
      largura="lg"
      titulo={doc ? 'Editar POP' : 'Nova POP'}
      rodape={
        <>
          {erro && <p role="alert" className="mr-auto text-xs text-red-400">{erro}</p>}
          <button type="button" onClick={fechar} className="rounded-lg border border-white/10 bg-white/[0.04] px-4 py-2 text-sm font-semibold text-slate-100 hover:bg-white/10">Cancelar</button>
          <button
            type="button"
            onClick={handleSalvar}
            disabled={salvar.isPending || !form.titulo.trim()}
            className="rounded-lg bg-gradient-brand px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
          >
            {salvar.isPending ? 'Salvando…' : doc ? 'Salvar POP' : 'Criar POP'}
          </button>
        </>
      }
    >
      <SubtituloForm icone="file-text" titulo="Informações Básicas" subtitulo="Identifique e classifique a POP" />
      <Campo label="Título" obrigatorio>
        <Texto placeholder="Ex: Criação de Legenda" value={form.titulo} onChange={(e) => set('titulo', e.target.value)} autoFocus />
      </Campo>

      <Campo label="Categoria">
        {(categorias.data ?? []).length === 0 ? (
          <p className="text-xs italic text-slate-400">Nenhuma categoria criada. Crie categorias pelo botão "Nova Categoria".</p>
        ) : (
          <div className="flex flex-wrap gap-2">
            {(categorias.data ?? []).map((c) => {
              const ativo = form.categoria_id === c.id;
              return (
                <button
                  key={c.id}
                  type="button"
                  aria-pressed={ativo}
                  onClick={() => set('categoria_id', ativo ? null : c.id)}
                  className={`chip-form inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-xs font-semibold transition-colors ${
                    ativo ? 'chip-ativo border-brand-400 bg-brand-500/10 text-brand-300' : 'border-white/10 text-slate-300 hover:border-white/25'}`}
                >
                  <span className="h-2 w-2 rounded-full" style={{ backgroundColor: c.cor }} /> {c.nome}
                </button>
              );
            })}
          </div>
        )}
      </Campo>

      <Campo label="Capa (opcional)">
        <CapaUpload
          compacta
          iconeVazio="file-text"
          valor={form.capa ?? null}
          onChange={(c) => set('capa', c)}
          onNovo={setCapaNova}
          dica="Sem capa, o card mostra o ícone da categoria."
        />
      </Campo>

      <div className="grid gap-4 sm:grid-cols-2">
        <Campo label="Versão">
          <Texto value={form.versao ?? ''} onChange={(e) => set('versao', e.target.value)} placeholder="1.0" />
        </Campo>
        <Campo label="Status">
          <div className="grid grid-cols-2 gap-2">
            {POP_STATUS.map((s) => {
              const ativo = form.status === s.id;
              return (
                <button
                  key={s.id}
                  type="button"
                  aria-pressed={ativo}
                  onClick={() => set('status', s.id as PopStatus)}
                  className={`chip-form flex items-center gap-2 rounded-lg border px-3 py-1.5 text-xs font-semibold transition-colors ${
                    ativo ? 'chip-ativo border-brand-400 bg-brand-500/10 text-slate-100' : 'border-white/10 text-slate-300 hover:border-white/25'}`}
                >
                  <span className={`h-2 w-2 rounded-full ${s.cor}`} /> {s.label}
                </button>
              );
            })}
          </div>
        </Campo>
      </div>

      <Campo label="Responsável">
        <Texto placeholder="Nome do responsável" value={form.responsavel ?? ''} onChange={(e) => set('responsavel', e.target.value)} />
      </Campo>

      <SubtituloForm icone="target" titulo="Objetivo e Contexto" subtitulo="O que esta POP garante e quem está envolvido" />
      <Campo label="Objetivo">
        <EditorRico linhas={2} placeholder="O que este processo garante? Ex: Padronizar a criação de legendas..." value={form.objetivo ?? ''} onChange={(v) => set('objetivo', v)} />
      </Campo>
      <div className="grid gap-4 sm:grid-cols-3">
        <Campo label="Quem Executa">
          <Texto placeholder="Ex: Copywriter" value={form.quem_executa ?? ''} onChange={(e) => set('quem_executa', e.target.value)} />
        </Campo>
        <Campo label="Quem Aprova">
          <Texto placeholder="Ex: Diretor" value={form.quem_aprova ?? ''} onChange={(e) => set('quem_aprova', e.target.value)} />
        </Campo>
        <Campo label="Quem é Impactado">
          <Texto placeholder="Ex: Tráfego" value={form.quem_impactado ?? ''} onChange={(e) => set('quem_impactado', e.target.value)} />
        </Campo>
      </div>
      <Campo label="Quando Utilizar">
        <Texto placeholder="Ex: Sempre que criar conteúdo para Instagram" value={form.quando_utilizar ?? ''} onChange={(e) => set('quando_utilizar', e.target.value)} />
      </Campo>

      <SubtituloForm icone="wrench" titulo="Recursos" subtitulo="Ferramentas e materiais necessários" />
      <Campo label="Materiais e Ferramentas">
        <EditorRico linhas={2} placeholder="Ex: Notion, Figma, Tabela de referências..." value={form.materiais ?? ''} onChange={(v) => set('materiais', v)} />
      </Campo>
      <Campo label="Vídeo Explicativo (URL)">
        <CampoLink prefixoIcone="video" value={form.video_url ?? ''} onChange={(v) => set('video_url', v)} />
      </Campo>
      <Campo label="Anexos (PDF, DOC, imagem)">
        <AnexoUploader bucket="anexos-internos" anexos={(form.anexos ?? []) as Anexo[]} onChange={(a) => set('anexos', a)} />
      </Campo>

      <SubtituloForm icone="list-checks" titulo="Passo a Passo" subtitulo="Descreva cada etapa em detalhe" />
      {passos.map((p, i) => (
        <div key={i} className="secao-form flex flex-col gap-2.5 rounded-xl border border-white/10 bg-white/[0.02] p-3.5">
          <div className="flex items-center justify-between">
            <span className="text-sm font-bold text-brand-300">Passo {i + 1}</span>
            <div className="flex items-center gap-1">
              <button type="button" disabled={i === 0} onClick={() => { const n = [...passos]; [n[i - 1], n[i]] = [n[i], n[i - 1]]; set('passos', n); }} className="rounded p-1 text-slate-400 hover:text-slate-200 disabled:opacity-30" aria-label="Subir passo">
                <GlassIcon name="chevron-down" className="h-4 w-4 rotate-180" />
              </button>
              <button type="button" disabled={i === passos.length - 1} onClick={() => { const n = [...passos]; [n[i + 1], n[i]] = [n[i], n[i + 1]]; set('passos', n); }} className="rounded p-1 text-slate-400 hover:text-slate-200 disabled:opacity-30" aria-label="Descer passo">
                <GlassIcon name="chevron-down" className="h-4 w-4" />
              </button>
              <button type="button" onClick={() => set('passos', passos.filter((_, k) => k !== i))} className="rounded p-1 text-slate-400 hover:text-red-400" aria-label={`Remover passo ${i + 1}`}>
                <GlassIcon name="x" className="h-4 w-4" />
              </button>
            </div>
          </div>
          <Texto placeholder="Título do passo" value={p.titulo} onChange={(e) => set('passos', passos.map((x, k) => (k === i ? { ...x, titulo: e.target.value } : x)))} />
          <EditorRico linhas={2} placeholder="Como fazer, detalhes, cuidados..." value={p.descricao} onChange={(v) => set('passos', passos.map((x, k) => (k === i ? { ...x, descricao: v } : x)))} />
        </div>
      ))}
      <BotaoTracejado onClick={() => set('passos', [...passos, { titulo: '', descricao: '' }])}>Adicionar passo</BotaoTracejado>

      <SubtituloForm icone="alert" titulo="Restrições" subtitulo="Uma linha para cada coisa que nunca deve ser feita" />
      {restricoes.map((r, i) => (
        <div key={i} className="flex items-center gap-2">
          <Texto placeholder="Ex: Nunca publicar sem aprovação do cliente" value={r} onChange={(e) => set('restricoes', restricoes.map((x, k) => (k === i ? e.target.value : x)))} />
          <button type="button" onClick={() => set('restricoes', restricoes.filter((_, k) => k !== i))} className="rounded p-2 text-slate-400 hover:text-red-400" aria-label="Remover restrição">
            <GlassIcon name="x" className="h-4 w-4" />
          </button>
        </div>
      ))}
      <BotaoTracejado onClick={() => set('restricoes', [...restricoes, ''])}>Adicionar restrição</BotaoTracejado>
    </JanelaFormulario>
  );
}
