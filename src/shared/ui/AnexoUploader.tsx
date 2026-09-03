import { useState } from 'react';
import { uploadArquivo, urlDoArquivo, removerArquivo, type BucketId } from '@/shared/lib/storage';

export interface Anexo {
  path: string;
  name: string;
  type: string;
}

interface Props {
  bucket: BucketId;
  /** Anexos atuais. Passe o array salvo no registro. */
  anexos: Anexo[];
  /** Retorna a lista atualizada. */
  onChange: (anexos: Anexo[]) => void;
  /** Aceitar quais tipos? Ex: "image/*,application/pdf,.doc,.docx" */
  accept?: string;
  /** Se true, tenta apagar do storage ao remover. Cuidado em edição. */
  apagarDoStorageAoRemover?: boolean;
  /** Limite em MB. Default 20. */
  maxMb?: number;
  /** Passa o cliente_id se for bucket escopado; para anexos-internos, deixe vazio. */
  clienteId?: string;
}

function ehImagem(t: string): boolean { return t.startsWith('image/'); }
function iconeArquivo(a: Anexo): string {
  if (ehImagem(a.type)) return '🖼️';
  if (a.type === 'application/pdf') return '📄';
  if (a.type.includes('word') || a.name.endsWith('.docx') || a.name.endsWith('.doc')) return '📝';
  return '📎';
}

export function AnexoUploader({
  bucket, anexos, onChange, accept = 'image/*,application/pdf,.doc,.docx',
  apagarDoStorageAoRemover = false, maxMb = 20, clienteId,
}: Props) {
  const [enviando, setEnviando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  async function enviar(files: FileList | null) {
    if (!files || files.length === 0) return;
    setErro(null);
    setEnviando(true);
    try {
      const novos: Anexo[] = [];
      for (const file of Array.from(files)) {
        if (file.size > maxMb * 1024 * 1024) {
          setErro(`"${file.name}" acima de ${maxMb} MB — pulado.`);
          continue;
        }
        const { path } = await uploadArquivo({ bucket, clienteId, file });
        novos.push({ path, name: file.name, type: file.type || 'application/octet-stream' });
      }
      if (novos.length) onChange([...anexos, ...novos]);
    } catch (e) {
      setErro((e as Error).message || 'Falha no upload.');
    } finally {
      setEnviando(false);
    }
  }

  async function abrir(a: Anexo) {
    try {
      const url = await urlDoArquivo(bucket, a.path);
      window.open(url, '_blank', 'noopener');
    } catch (e) {
      setErro((e as Error).message || 'Não consegui abrir.');
    }
  }

  async function remover(a: Anexo) {
    if (apagarDoStorageAoRemover) {
      try { await removerArquivo(bucket, a.path); } catch { /* segue mesmo se falhar */ }
    }
    onChange(anexos.filter((x) => x.path !== a.path));
  }

  return (
    <div className="space-y-2">
      <label className="flex cursor-pointer items-center gap-2 rounded-md border border-dashed border-white/15 bg-white/[0.02] px-3 py-2 text-xs text-slate-300 hover:border-brand-400/50 hover:text-slate-100">
        <span>{enviando ? '⏳ Enviando…' : '📎 Anexar arquivo (PDF, DOC, imagem)'}</span>
        <input
          type="file"
          multiple
          accept={accept}
          className="hidden"
          disabled={enviando}
          onChange={(e) => { void enviar(e.target.files); e.target.value = ''; }}
        />
      </label>

      {erro && <div className="text-[11px] text-red-400">{erro}</div>}

      {anexos.length > 0 && (
        <ul className="space-y-1">
          {anexos.map((a) => (
            <li
              key={a.path}
              className="flex items-center gap-2 rounded-md border border-white/10 bg-white/[0.02] px-2 py-1.5 text-xs"
            >
              <span>{iconeArquivo(a)}</span>
              <button
                onClick={() => void abrir(a)}
                className="min-w-0 flex-1 truncate text-left text-brand-300 hover:underline"
                type="button"
              >
                {a.name}
              </button>
              <button
                onClick={() => void remover(a)}
                className="rounded px-1.5 text-slate-400 hover:bg-red-500/10 hover:text-red-300"
                type="button"
                title="Remover"
              >
                ✕
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
