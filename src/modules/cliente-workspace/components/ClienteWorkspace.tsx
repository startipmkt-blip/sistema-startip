import { useMemo, useState } from 'react';
import {
  useClienteDocs,
  useSalvarClienteDoc,
} from '@/modules/cliente-workspace/api/clienteWorkspaceApi';
import {
  DOC_ITENS,
  GRUPO_LABEL,
  itensDoGrupo,
  type DocItem,
} from '@/modules/cliente-workspace/catalog';
import { ReunioesPanel } from '@/modules/reunioes/ReunioesPanel';
import { Card } from '@/shared/ui/Card';
import { Button } from '@/shared/ui/Button';
import { Textarea } from '@/shared/ui/Textarea';
import { Spinner } from '@/shared/ui/Spinner';
import { formatDate } from '@/shared/lib/format';
import { uploadArquivo } from '@/shared/lib/storage';
import { AnexoLink } from '@/shared/ui/AnexoLink';

export function ClienteWorkspace({ clienteId }: { clienteId: string }) {
  const { data: docs, isLoading } = useClienteDocs(clienteId);
  const salvar = useSalvarClienteDoc(clienteId);

  const [selecionada, setSelecionada] = useState<string>('info');
  const [editando, setEditando] = useState(false);
  const [rascunho, setRascunho] = useState('');
  const [anexo, setAnexo] = useState<string | null>(null);
  const [enviandoAnexo, setEnviandoAnexo] = useState(false);
  const [erroAnexo, setErroAnexo] = useState<string | null>(null);

  async function anexarArquivo(file: File) {
    setErroAnexo(null);
    if (file.size > 20 * 1024 * 1024) {
      setErroAnexo('Arquivo acima de 20 MB.');
      return;
    }
    setEnviandoAnexo(true);
    try {
      const { path } = await uploadArquivo({ bucket: 'materiais-cliente', clienteId, file });
      setAnexo(path);
    } catch (e) {
      setErroAnexo((e as Error).message || 'Falha ao enviar o arquivo.');
    } finally {
      setEnviandoAnexo(false);
    }
  }

  const item = useMemo(
    () => DOC_ITENS.find((i) => i.chave === selecionada) ?? DOC_ITENS[0],
    [selecionada],
  );
  const doc = docs?.[item.chave];
  const preenchido = (chave: string) => Boolean(docs?.[chave]?.conteudo?.trim());

  function abrir(chave: string) {
    setSelecionada(chave);
    setEditando(false);
  }
  function iniciarEdicao() {
    setRascunho(doc?.conteudo ?? '');
    setAnexo(doc?.anexo_url ?? null);
    setEditando(true);
  }
  async function handleSalvar() {
    await salvar.mutateAsync({ chave: item.chave, conteudo: rascunho, anexo_url: anexo });
    setEditando(false);
  }

  if (isLoading) {
    return <Card className="flex justify-center p-12"><Spinner /></Card>;
  }

  return (
    <div className="space-y-4">
      {/* Duas colunas de "documentos" (igual ao Notion) */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        {(['materiais', 'fluxo'] as const).map((grupo) => (
          <Card key={grupo} className="p-4">
            <h3 className="mb-3 border-b border-white/10 pb-2 text-sm font-semibold text-emerald-300">
              {GRUPO_LABEL[grupo]}
            </h3>
            <ul className="space-y-1">
              {itensDoGrupo(grupo).map((it: DocItem) => {
                const ativo = it.chave === selecionada;
                const ok = preenchido(it.chave);
                return (
                  <li key={it.chave}>
                    <button
                      onClick={() => abrir(it.chave)}
                      className={`flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-sm transition-colors ${
                        ativo ? 'bg-brand-500/10 text-brand-300' : 'text-slate-200 hover:bg-white/5'
                      }`}
                    >
                      <span
                        className={`flex h-4 w-4 items-center justify-center rounded-full text-[10px] ${
                          ok ? 'bg-emerald-500/15 text-emerald-300' : 'border border-white/15 text-transparent'
                        }`}
                        title={ok ? 'Preenchido' : 'Em branco'}
                      >
                        ✓
                      </span>
                      <span aria-hidden>{it.icon}</span>
                      <span className="flex-1">{it.titulo}</span>
                    </button>
                  </li>
                );
              })}
            </ul>
          </Card>
        ))}
      </div>

      {/* Documento selecionado */}
      {item.chave === 'reunioes' ? (
        <Card className="p-6">
          <h2 className="mb-4 flex items-center gap-2 text-lg font-semibold text-white">
            <span aria-hidden>{item.icon}</span>
            {item.titulo}
          </h2>
          <ReunioesPanel clienteId={clienteId} />
        </Card>
      ) : (
      <Card className="p-6">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 className="flex items-center gap-2 text-lg font-semibold text-white">
              <span aria-hidden>{item.icon}</span>
              {item.titulo}
            </h2>
            {doc?.updated_at && !editando && (
              <p className="mt-1 text-xs text-slate-400">
                atualizado {formatDate(doc.updated_at)}
              </p>
            )}
          </div>
          {!editando && (
            <Button variant="secondary" onClick={iniciarEdicao}>
              {doc?.conteudo ? 'Editar' : 'Preencher'}
            </Button>
          )}
        </div>

        <div className="mt-4">
          {editando ? (
            <div className="space-y-3">
              <Textarea
                className="min-h-[200px]"
                value={rascunho}
                onChange={(e) => setRascunho(e.target.value)}
                placeholder={`Escreva aqui: ${item.titulo}`}
              />
              {/* Anexar PDF / documento */}
              <div className="flex flex-wrap items-center gap-3 rounded-md border border-white/10 bg-white/5 px-3 py-2 text-xs">
                <label className="cursor-pointer font-medium text-brand-300 hover:underline">
                  {enviandoAnexo ? '⏳ Enviando…' : '📎 Anexar PDF / documento'}
                  <input
                    type="file"
                    accept="application/pdf,.doc,.docx"
                    className="hidden"
                    disabled={enviandoAnexo}
                    onChange={(e) => { const f = e.target.files?.[0]; if (f) anexarArquivo(f); }}
                  />
                </label>
                {anexo && (
                  <span className="flex items-center gap-2 text-slate-400">
                    {anexo}
                    <button type="button" className="text-red-500 hover:underline" onClick={() => setAnexo(null)}>remover</button>
                  </span>
                )}
                {erroAnexo && <span className="text-red-400">{erroAnexo}</span>}
              </div>
              <div className="flex justify-end gap-2">
                <Button variant="secondary" onClick={() => setEditando(false)}>Cancelar</Button>
                <Button onClick={handleSalvar} disabled={salvar.isPending}>
                  {salvar.isPending ? 'Salvando…' : 'Salvar'}
                </Button>
              </div>
            </div>
          ) : doc?.conteudo || doc?.anexo_url ? (
            <div className="space-y-3">
              {doc?.conteudo && (
                <div className="whitespace-pre-wrap text-sm leading-relaxed text-slate-200">
                  {doc.conteudo}
                </div>
              )}
              {doc?.anexo_url && (
                <AnexoLink
                  bucket="materiais-cliente"
                  path={doc.anexo_url}
                  prefixo="📎"
                  className="inline-flex items-center gap-2 rounded-md border border-white/10 px-3 py-2 text-sm text-brand-300 hover:underline"
                />
              )}
            </div>
          ) : (
            <div className="rounded-md border border-dashed border-white/10 p-8 text-center text-sm text-slate-400">
              Ainda não preenchido. Clique em “Preencher” para adicionar o conteúdo ou anexar um PDF.
            </div>
          )}
        </div>
      </Card>
      )}
    </div>
  );
}
