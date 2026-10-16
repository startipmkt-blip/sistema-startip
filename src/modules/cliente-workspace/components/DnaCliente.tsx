import { useState } from 'react';
import { Card } from '@/shared/ui/Card';
import { Spinner } from '@/shared/ui/Spinner';
import { GlassIcon, glassify } from '@/shared/ui/GlassIcon';
import { useClienteDocs, useSalvarClienteDoc } from '@/modules/cliente-workspace/api/clienteWorkspaceApi';
import { removerArquivo, uploadArquivo, urlDoArquivo } from '@/shared/lib/storage';
import { formatarTamanho, iconeAnexo, type CriativoAnexo } from '@/modules/ideias/criativos/types';

const CHAVE = 'dna';
const BUCKET = 'materiais-cliente';
const MAX_MB = 20;
const ACCEPT = 'application/pdf,.pdf,.doc,.docx,.txt,.png,.jpg,.jpeg';

// Vários arquivos ficam em cliente_docs.anexo_url como JSON. Antes desta tela o
// campo guardava só um path (string solta), então esse formato antigo ainda é lido.
function lerAnexos(raw?: string | null): CriativoAnexo[] {
  if (!raw) return [];
  if (raw.startsWith('[')) {
    try { return JSON.parse(raw) as CriativoAnexo[]; } catch { return []; }
  }
  return [{ path: raw, name: raw.split('/').pop() ?? raw, type: '', size: 0 }];
}

/** Pasta de DNA do cliente: PDFs do DNA, ICP e demais documentos de base. */
export function DnaCliente({ clienteId }: { clienteId: string }) {
  const { data: docs, isLoading } = useClienteDocs(clienteId);
  const salvar = useSalvarClienteDoc(clienteId);
  const [enviando, setEnviando] = useState(false);
  const [arrastando, setArrastando] = useState(false);
  const [erros, setErros] = useState<string[]>([]);

  const atual = docs?.[CHAVE];
  const anexos = lerAnexos(atual?.anexo_url);

  async function gravar(lista: CriativoAnexo[]) {
    await salvar.mutateAsync({
      chave: CHAVE,
      conteudo: atual?.conteudo ?? '',
      anexo_url: lista.length ? JSON.stringify(lista) : null,
    });
  }

  async function processar(files: FileList | File[] | null) {
    if (!files || files.length === 0) return;
    const msgs: string[] = [];
    let lista = anexos;
    setEnviando(true);
    for (const file of Array.from(files)) {
      if (file.size > MAX_MB * 1024 * 1024) { msgs.push(`"${file.name}": acima de ${MAX_MB} MB.`); continue; }
      try {
        const { path } = await uploadArquivo({ bucket: BUCKET, clienteId, file });
        lista = [...lista, { path, name: file.name, type: file.type || 'application/octet-stream', size: file.size }];
        await gravar(lista);
      } catch (e) {
        msgs.push(`"${file.name}": ${(e as Error).message || 'falha no envio'}`);
      }
    }
    setEnviando(false);
    setErros(msgs);
  }

  async function abrir(a: CriativoAnexo) {
    try {
      window.open(await urlDoArquivo(BUCKET, a.path), '_blank', 'noopener');
    } catch (e) {
      alert(`Não foi possível abrir: ${(e as Error).message}`);
    }
  }

  async function excluir(a: CriativoAnexo) {
    if (!confirm(`Excluir "${a.name}"?`)) return;
    try {
      await gravar(anexos.filter((x) => x.path !== a.path));
      await removerArquivo(BUCKET, a.path).catch(() => undefined);
    } catch (e) {
      alert(`Não foi possível excluir: ${(e as Error).message}`);
    }
  }

  return (
    <Card className="space-y-4 p-5">
      <div>
        <h2 className="text-lg font-semibold text-white"><GlassIcon emoji="🧬" /> DNA</h2>
        <p className="text-xs text-slate-400">
          PDF do DNA do cliente, ICP e outros documentos de base. Pode anexar quantos precisar.
        </p>
      </div>

      <label
        onDragOver={(e) => { e.preventDefault(); setArrastando(true); }}
        onDragLeave={() => setArrastando(false)}
        onDrop={(e) => { e.preventDefault(); setArrastando(false); void processar(e.dataTransfer.files); }}
        className={`flex cursor-pointer flex-col items-center gap-1 rounded-xl border border-dashed px-4 py-6 text-center text-sm transition-colors ${
          arrastando ? 'border-brand-400 bg-brand-500/10 text-slate-100' : 'border-white/15 bg-white/[0.02] text-slate-300 hover:border-brand-400/50'
        }`}
      >
        <span className="text-xl"><GlassIcon name="paperclip" /></span>
        <span>{enviando ? 'Enviando…' : 'Arraste os arquivos aqui ou clique para anexar'}</span>
        <span className="text-[11px] text-slate-500">PDF, Word, TXT e imagens · até {MAX_MB} MB cada</span>
        <input
          type="file"
          multiple
          accept={ACCEPT}
          className="hidden"
          disabled={enviando}
          onChange={(e) => { void processar(e.target.files); e.target.value = ''; }}
        />
      </label>

      {erros.map((m) => <p key={m} className="text-xs text-red-400">{m}</p>)}
      {isLoading && <div className="flex justify-center py-4"><Spinner /></div>}

      {!isLoading && anexos.length === 0 && (
        <p className="rounded-md border border-dashed border-white/10 px-3 py-6 text-center text-xs text-slate-500">
          Nenhum arquivo ainda. Anexe o DNA deste cliente.
        </p>
      )}

      {anexos.length > 0 && (
        <ul className="space-y-2">
          {anexos.map((a) => (
            <li key={a.path} className="flex items-center gap-3 rounded-xl border border-white/10 bg-white/[0.03] px-3 py-2">
              <span className="text-xl">{glassify(iconeAnexo(a))}</span>
              <button type="button" className="min-w-0 flex-1 text-left" title="Ver" onClick={() => void abrir(a)}>
                <p className="truncate text-sm font-medium text-slate-100">{a.name}</p>
                {a.size > 0 && <p className="text-[11px] text-slate-500">{formatarTamanho(a.size)}</p>}
              </button>
              <button className="text-xs text-slate-300 hover:underline" onClick={() => void abrir(a)}>Ver</button>
              <button className="text-xs text-red-400 hover:underline" onClick={() => void excluir(a)}>Excluir</button>
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}
