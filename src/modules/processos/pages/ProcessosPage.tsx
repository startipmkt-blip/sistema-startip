import { useMemo, useState } from 'react';
import {
  categoriasPop,
  useProcessosDocs,
  useExcluirProcessoDoc,
} from '@/modules/processos/api/processosApi';
import { POP_STATUS, type ProcessoAnexo, type ProcessoDoc } from '@/modules/processos/types';
import { ProcessoFormModal } from '@/modules/processos/components/ProcessoFormModal';
import { PageHeader } from '@/shared/ui/PageHeader';
import { Card } from '@/shared/ui/Card';
import { Button } from '@/shared/ui/Button';
import { Spinner } from '@/shared/ui/Spinner';
import { formatDate } from '@/shared/lib/format';
import { urlDoArquivo } from '@/shared/lib/storage';
import { GlassIcon } from '@/shared/ui/GlassIcon';
import { Linkify } from '@/shared/ui/Linkify';
import { confirmar } from '@/shared/ui/ConfirmDialog';
import { ImagemCapa } from '@/shared/ui/form/CapaUpload';
import { JanelaFormulario, SubtituloForm } from '@/shared/ui/form/FormKit';
import { GerenciarCategorias } from '@/shared/ui/form/GerenciarCategorias';

const SEM_CATEGORIA = '__sem__';

function statusInfo(d: ProcessoDoc) {
  return POP_STATUS.find((s) => s.id === (d.status ?? 'ativo')) ?? POP_STATUS[0];
}

function AnexosList({ anexos }: { anexos: ProcessoAnexo[] }) {
  async function abrir(a: ProcessoAnexo) {
    try {
      const url = await urlDoArquivo('anexos-internos', a.path);
      window.open(url, '_blank', 'noopener');
    } catch (e) {
      alert((e as Error).message || 'Falha ao abrir.');
    }
  }
  return (
    <ul className="space-y-1">
      {anexos.map((a) => (
        <li key={a.path} className="flex items-center gap-2 rounded-lg border border-white/10 px-3 py-1.5 text-xs">
          <GlassIcon name={a.type.startsWith('image/') ? 'image' : 'paperclip'} className="h-3.5 w-3.5" />
          <button onClick={() => void abrir(a)} className="min-w-0 flex-1 truncate text-left text-brand-300 hover:underline" type="button">{a.name}</button>
        </li>
      ))}
    </ul>
  );
}

/** Leitura completa de uma POP, com Editar e Excluir. */
function VisualizarPop({ doc, categoria, onClose, onEditar, onExcluir }: {
  doc: ProcessoDoc; categoria?: { nome: string; cor: string }; onClose: () => void; onEditar: () => void; onExcluir: () => void;
}) {
  const st = statusInfo(doc);
  const papeis = [['Quem executa', doc.quem_executa], ['Quem aprova', doc.quem_aprova], ['Quem é impactado', doc.quem_impactado]] as const;
  return (
    <JanelaFormulario
      open
      onClose={onClose}
      largura="lg"
      titulo={doc.titulo}
      subtitulo={[categoria?.nome, `versão ${doc.versao ?? '1.0'}`, doc.responsavel && `responsável: ${doc.responsavel}`, `atualizada em ${formatDate(doc.updated_at)}`].filter(Boolean).join(' · ')}
      rodape={
        <>
          <button type="button" onClick={onExcluir} className="mr-auto text-sm font-semibold text-red-400 hover:underline">Excluir</button>
          <button type="button" onClick={onClose} className="rounded-lg border border-white/10 bg-white/[0.04] px-4 py-2 text-sm font-semibold text-slate-100 hover:bg-white/10">Fechar</button>
          <button type="button" onClick={onEditar} className="rounded-lg bg-gradient-brand px-4 py-2 text-sm font-semibold text-white">Editar POP</button>
        </>
      }
    >
      <div className="flex items-center gap-2 text-xs font-semibold text-slate-300">
        <span className={`h-2 w-2 rounded-full ${st.cor}`} /> {st.label}
      </div>
      {doc.capa && <div className="aspect-video max-w-full overflow-hidden rounded-xl"><ImagemCapa capa={doc.capa} /></div>}

      {(doc.objetivo || doc.quando_utilizar || papeis.some(([, v]) => v)) && (
        <>
          <SubtituloForm icone="target" titulo="Objetivo e Contexto" />
          {doc.objetivo && <p className="whitespace-pre-line text-sm text-slate-200"><Linkify texto={doc.objetivo} /></p>}
          <div className="grid gap-2 sm:grid-cols-3">
            {papeis.filter(([, v]) => v).map(([k, v]) => (
              <div key={k} className="secao-form rounded-xl border border-white/10 px-3 py-2">
                <div className="text-[11px] font-bold uppercase tracking-wide text-slate-400">{k}</div>
                <div className="text-sm font-medium text-slate-100">{v}</div>
              </div>
            ))}
          </div>
          {doc.quando_utilizar && <p className="text-sm text-slate-300"><strong className="text-slate-100">Quando utilizar:</strong> {doc.quando_utilizar}</p>}
        </>
      )}

      {(doc.materiais || doc.video_url || (doc.anexos?.length ?? 0) > 0) && (
        <>
          <SubtituloForm icone="wrench" titulo="Recursos" />
          {doc.materiais && <p className="whitespace-pre-line text-sm text-slate-200"><Linkify texto={doc.materiais} /></p>}
          {doc.video_url && (
            <a href={doc.video_url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-2 text-sm font-semibold text-brand-300 hover:underline">
              <GlassIcon name="video" className="h-4 w-4" /> Assistir vídeo explicativo
            </a>
          )}
          {(doc.anexos?.length ?? 0) > 0 && <AnexosList anexos={doc.anexos!} />}
        </>
      )}

      <SubtituloForm icone="list-checks" titulo="Passo a Passo" />
      {(doc.passos?.length ?? 0) > 0 ? (
        <ol className="flex flex-col gap-2">
          {doc.passos!.map((p, i) => (
            <li key={i} className="secao-form flex gap-3 rounded-xl border border-white/10 p-3">
              <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-brand-500/15 text-xs font-bold text-brand-300">{i + 1}</span>
              <div className="min-w-0">
                <div className="text-sm font-semibold text-slate-100">{p.titulo}</div>
                {p.descricao && <p className="mt-0.5 whitespace-pre-line text-sm text-slate-300"><Linkify texto={p.descricao} /></p>}
              </div>
            </li>
          ))}
        </ol>
      ) : doc.conteudo ? (
        <p className="whitespace-pre-wrap text-sm leading-relaxed text-slate-200"><Linkify texto={doc.conteudo} /></p>
      ) : (
        <p className="text-sm text-slate-400">Nenhum passo cadastrado.</p>
      )}

      {(doc.restricoes?.length ?? 0) > 0 && (
        <>
          <SubtituloForm icone="alert" titulo="Restrições" />
          <ul className="flex flex-col gap-1.5">
            {doc.restricoes!.map((r, i) => (
              <li key={i} className="flex items-start gap-2 rounded-lg bg-red-500/10 px-3 py-2 text-sm text-red-300">
                <GlassIcon name="ban" className="mt-0.5 h-4 w-4 shrink-0" /> {r}
              </li>
            ))}
          </ul>
        </>
      )}
    </JanelaFormulario>
  );
}

export function ProcessosPage() {
  const { data: docs, isLoading } = useProcessosDocs();
  const excluir = useExcluirProcessoDoc();
  const categoriasQ = categoriasPop.useLista();
  const salvarCat = categoriasPop.useSalvar();
  const excluirCat = categoriasPop.useExcluir();

  const [busca, setBusca] = useState('');
  const [filtroCat, setFiltroCat] = useState('');
  const [vendo, setVendo] = useState<ProcessoDoc | null>(null);
  const [form, setForm] = useState<{ doc?: ProcessoDoc; categoria?: string | null } | null>(null);
  const [gerenciar, setGerenciar] = useState(false);

  const categorias = categoriasQ.data ?? [];
  const catPorId = useMemo(() => new Map(categorias.map((c) => [c.id, c])), [categorias]);

  const termo = busca.trim().toLowerCase();
  const visiveis = (docs ?? []).filter((d) =>
    (!filtroCat || (filtroCat === SEM_CATEGORIA ? !d.categoria_id || !catPorId.has(d.categoria_id) : d.categoria_id === filtroCat))
    && (!termo || `${d.titulo} ${d.objetivo ?? ''} ${d.responsavel ?? ''}`.toLowerCase().includes(termo)));

  const grupos = useMemo(() => {
    const lista: { id: string; nome: string; cor: string; docs: ProcessoDoc[] }[] = categorias.map((c) => ({ ...c, docs: [] }));
    const sem = { id: SEM_CATEGORIA, nome: 'Sem categoria', cor: '#94a3b8', docs: [] as ProcessoDoc[] };
    for (const d of visiveis) {
      const g = lista.find((x) => x.id === d.categoria_id);
      (g ?? sem).docs.push(d);
    }
    return [...lista, sem].filter((g) => g.docs.length > 0);
  }, [categorias, visiveis]);

  const vazio = !isLoading && (docs ?? []).length === 0;

  return (
    <div className="space-y-6">
      <PageHeader title="Processos / POPs" subtitle="Base de procedimentos operacionais padrão da sua agência.">
        <Button variant="secondary" onClick={() => setGerenciar(true)}><GlassIcon name="folder" className="h-4 w-4" /> Nova Categoria</Button>
        <Button onClick={() => setForm({})}><GlassIcon name="plus" className="h-4 w-4" /> Nova POP</Button>
      </PageHeader>

      {isLoading ? (
        <Card className="flex justify-center p-12"><Spinner /></Card>
      ) : vazio ? (
        <Card className="flex flex-col items-center gap-2 px-6 py-14 text-center">
          <span className="chip-icone h-12 w-12 bg-brand-500/10"><GlassIcon name="file-text" tone="brand" className="h-6 w-6" /></span>
          <div className="mt-1 text-sm font-semibold text-slate-100">Nenhuma POP cadastrada</div>
          <p className="text-xs text-slate-400">Comece criando uma categoria e depois sua primeira POP.</p>
          <div className="mt-2 flex gap-2">
            <Button variant="secondary" size="sm" onClick={() => setGerenciar(true)}><GlassIcon name="folder" className="h-4 w-4" /> Nova Categoria</Button>
            <Button size="sm" onClick={() => setForm({})}><GlassIcon name="plus" className="h-4 w-4" /> Nova POP</Button>
          </div>
        </Card>
      ) : (
        <>
          <div className="flex flex-wrap items-center gap-2">
            <div className="relative w-full sm:w-64">
              <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"><GlassIcon name="search" className="h-4 w-4" /></span>
              <input
                type="search" value={busca} onChange={(e) => setBusca(e.target.value)} placeholder="Buscar POP…" aria-label="Buscar POP"
                className="glass-field w-full py-2 pl-9 pr-3 text-sm focus:border-brand-400 focus:outline-none"
              />
            </div>
            {[{ id: '', nome: 'Todas', cor: '' }, ...categorias].map((c) => (
              <button
                key={c.id || 'todas'}
                onClick={() => setFiltroCat(c.id)}
                aria-pressed={filtroCat === c.id}
                className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-semibold transition-colors ${
                  filtroCat === c.id ? 'border-brand-500 bg-brand-500 text-white' : 'border-white/10 text-slate-300 hover:border-white/25'}`}
              >
                {c.cor && <span className="h-2 w-2 rounded-full" style={{ backgroundColor: c.cor }} />} {c.nome}
              </button>
            ))}
          </div>

          {grupos.length === 0 && <Card className="p-10 text-center text-sm text-slate-400">Nenhuma POP encontrada.</Card>}

          {grupos.map((g) => (
            <section key={g.id} className="space-y-3">
              <div className="flex items-center gap-2">
                <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: g.cor }} />
                <h2 className="text-[15px] font-bold text-slate-100">{g.nome}</h2>
                <span className="text-xs text-slate-400">{g.docs.length}</span>
                {g.id !== SEM_CATEGORIA && (
                  <button onClick={() => setForm({ categoria: g.id })} className="ml-1 text-xs font-semibold text-brand-300 hover:underline">+ POP</button>
                )}
              </div>
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                {g.docs.map((d) => {
                  const st = statusInfo(d);
                  const passos = d.passos?.length ?? 0;
                  return (
                    <button key={d.id} onClick={() => setVendo(d)} className="glass group flex flex-col overflow-hidden text-left transition-colors hover:border-brand-400">
                      <div className="aspect-[16/8] w-full overflow-hidden">
                        {d.capa ? <ImagemCapa capa={d.capa} /> : (
                          <div className="flex h-full w-full items-center justify-center" style={{ backgroundColor: `${g.cor}1f` }}>
                            <GlassIcon name="file-text" className="h-8 w-8" tone="brand" />
                          </div>
                        )}
                      </div>
                      <div className="flex flex-1 flex-col gap-1.5 p-4">
                        <div className="flex items-center gap-1.5 text-[11px] font-semibold text-slate-400">
                          <span className={`h-1.5 w-1.5 rounded-full ${st.cor}`} /> {st.label} · v{d.versao ?? '1.0'}
                        </div>
                        <h3 className="line-clamp-2 text-sm font-bold text-slate-100">{d.titulo}</h3>
                        {d.objetivo && <p className="line-clamp-2 text-xs text-slate-400">{d.objetivo}</p>}
                        <div className="mt-auto flex items-center justify-between pt-2 text-xs text-slate-400">
                          <span className="truncate">{d.responsavel || d.autor || 'Sem responsável'}</span>
                          <span className="shrink-0">{passos ? `${passos} passos` : `atualizada ${formatDate(d.updated_at)}`}</span>
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            </section>
          ))}
        </>
      )}

      {vendo && (
        <VisualizarPop
          doc={vendo}
          categoria={vendo.categoria_id ? catPorId.get(vendo.categoria_id) : undefined}
          onClose={() => setVendo(null)}
          onEditar={() => { setForm({ doc: vendo }); setVendo(null); }}
          onExcluir={async () => {
            if (await confirmar(`Excluir a POP "${vendo.titulo}"?`)) { excluir.mutate(vendo.id); setVendo(null); }
          }}
        />
      )}
      {form && (
        <ProcessoFormModal open onClose={() => setForm(null)} doc={form.doc} categoriaInicial={form.categoria} />
      )}
      <GerenciarCategorias
        open={gerenciar}
        onClose={() => setGerenciar(false)}
        titulo="Categorias de POP"
        rotuloNovo="Nova categoria"
        placeholder="Ex: Social media, Comercial..."
        itens={categorias}
        avisoExcluir="As POPs dela ficam em 'Sem categoria'."
        onCriar={(nome, cor) => salvarCat.mutateAsync({ dados: { nome, cor, ordem: categorias.length + 1 } })}
        onSalvar={(id, nome, cor) => salvarCat.mutateAsync({ id, dados: { nome, cor } })}
        onExcluir={(id) => excluirCat.mutateAsync(id)}
      />
    </div>
  );
}
