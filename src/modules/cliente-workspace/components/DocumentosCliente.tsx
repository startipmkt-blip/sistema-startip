import { useRef, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Card } from '@/shared/ui/Card';
import { Button } from '@/shared/ui/Button';
import { Spinner } from '@/shared/ui/Spinner';
import { AnexoLink } from '@/shared/ui/AnexoLink';
import { GlassIcon } from '@/shared/ui/GlassIcon';
import { formatDate } from '@/shared/lib/format';
import { listarArquivos, removerArquivo, uploadArquivo } from '@/shared/lib/storage';

const BUCKET = 'materiais-cliente';
const PASTA = 'documentos';
const LIMITE_MB = 20;

function formatarTamanho(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

export function DocumentosCliente({ clienteId }: { clienteId: string }) {
  const qc = useQueryClient();
  const inputRef = useRef<HTMLInputElement>(null);
  const [erro, setErro] = useState<string | null>(null);
  const queryKey = ['cliente-workspace', 'documentos', clienteId];

  const { data: arquivos, isLoading } = useQuery({
    queryKey,
    queryFn: () => listarArquivos(BUCKET, `${clienteId}/${PASTA}`),
  });

  const enviar = useMutation({
    mutationFn: async (files: File[]) => {
      for (const file of files) {
        if (file.size > LIMITE_MB * 1024 * 1024) {
          throw new Error(`"${file.name}" passa de ${LIMITE_MB} MB.`);
        }
        await uploadArquivo({ bucket: BUCKET, clienteId, file, pasta: PASTA });
      }
    },
    onSuccess: () => qc.invalidateQueries({ queryKey }),
    onError: (e) => setErro((e as Error).message || 'Falha ao enviar o arquivo.'),
  });

  const excluir = useMutation({
    mutationFn: (path: string) => removerArquivo(BUCKET, path),
    onSuccess: () => qc.invalidateQueries({ queryKey }),
    onError: (e) => setErro((e as Error).message || 'Falha ao excluir o arquivo.'),
  });

  function aoEscolher(files: FileList | null) {
    if (!files || files.length === 0) return;
    setErro(null);
    enviar.mutate(Array.from(files));
    if (inputRef.current) inputRef.current.value = '';
  }

  return (
    <Card className="p-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="flex items-center gap-2 text-lg font-semibold text-white">
            <span aria-hidden><GlassIcon emoji="📄" /></span>
            Documentos
          </h2>
          <p className="mt-1 text-xs text-slate-400">
            Contratos, propostas, briefings e outros arquivos do cliente (até {LIMITE_MB} MB cada).
          </p>
        </div>
        <Button onClick={() => inputRef.current?.click()} disabled={enviar.isPending}>
          {enviar.isPending ? 'Enviando…' : 'Enviar arquivos'}
        </Button>
        <input
          ref={inputRef}
          type="file"
          multiple
          className="hidden"
          onChange={(e) => aoEscolher(e.target.files)}
        />
      </div>

      {erro && <p className="mt-3 text-sm text-red-400">{erro}</p>}

      <div className="mt-4">
        {isLoading ? (
          <div className="flex justify-center p-8"><Spinner /></div>
        ) : !arquivos || arquivos.length === 0 ? (
          <div className="rounded-md border border-dashed border-white/10 p-8 text-center text-sm text-slate-400">
            Nenhum documento ainda. Clique em “Enviar arquivos” para adicionar.
          </div>
        ) : (
          <ul className="divide-y divide-white/10 rounded-md border border-white/10">
            {arquivos.map((a) => (
              <li key={a.path} className="flex items-center gap-3 px-3 py-2 text-sm">
                <AnexoLink
                  bucket={BUCKET}
                  path={a.path}
                  prefixo="📎"
                  className="flex-1 truncate text-brand-300 hover:underline"
                />
                <span className="text-xs text-slate-400">{formatarTamanho(a.tamanho)}</span>
                {a.criadoEm && (
                  <span className="hidden text-xs text-slate-400 sm:inline">{formatDate(a.criadoEm)}</span>
                )}
                <button
                  type="button"
                  className="text-xs text-red-400 hover:underline disabled:opacity-50"
                  disabled={excluir.isPending}
                  onClick={() => {
                    if (window.confirm(`Excluir "${a.nome}"? Não dá para desfazer.`)) excluir.mutate(a.path);
                  }}
                >
                  excluir
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </Card>
  );
}
