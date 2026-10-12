import { useState, type DragEvent } from 'react';
import { Card } from '@/shared/ui/Card';
import { Button } from '@/shared/ui/Button';
import { Textarea } from '@/shared/ui/Textarea';
import { Spinner } from '@/shared/ui/Spinner';
import { GlassIcon, glassify } from '@/shared/ui/GlassIcon';
import { useClienteDocs, useSalvarClienteDoc } from '@/modules/cliente-workspace/api/clienteWorkspaceApi';
import { abrirAnexo } from '@/modules/ideias/criativos/components/AnexosCriativo';
import { useUrlAnexo } from '@/modules/ideias/criativos/criativosApi';
import { formatarTamanho, iconeAnexo } from '@/modules/ideias/criativos/types';
import {
  ACCEPT_IDENTIDADE, MAX_IDENTIDADE_MB, validarIdentidade,
  useArquivosIdentidade, useEnviarIdentidade, useExcluirIdentidade,
  type ArquivoIdentidade,
} from '../api/identidadeApi';

const CHAVE_NOTAS = 'identidade';

const ehImg = (a: Pick<ArquivoIdentidade, 'type' | 'name'>) =>
  a.type.startsWith('image/') || /\.(png|jpe?g|webp|gif|svg)$/i.test(a.name);

function Miniatura({ a }: { a: ArquivoIdentidade }) {
  const imagem = ehImg(a);
  const { data: url } = useUrlAnexo(imagem ? a.path : undefined);
  return (
    <div className="grid aspect-square w-full place-items-center overflow-hidden rounded-lg bg-white/5">
      {imagem && url ? (
        <img src={url} alt={a.name} loading="lazy" className="h-full w-full object-contain p-1" />
      ) : (
        <span className="text-3xl">{glassify(iconeAnexo(a))}</span>
      )}
    </div>
  );
}

function Notas({ clienteId }: { clienteId: string }) {
  const { data: docs } = useClienteDocs(clienteId);
  const salvar = useSalvarClienteDoc(clienteId);
  const atual = docs?.[CHAVE_NOTAS]?.conteudo ?? '';
  const [texto, setTexto] = useState<string | null>(null);
  const valor = texto ?? atual;
  const alterado = texto !== null && texto !== atual;

  return (
    <div className="space-y-2">
      <Textarea
        label="Observações da identidade (cores, fontes, uso do logo)"
        rows={4}
        placeholder="Ex.: Azul #0A3D91 e laranja #FF7A00. Fonte Poppins. Logo nunca sobre fundo vermelho."
        value={valor}
        onChange={(e) => setTexto(e.target.value)}
      />
      {alterado && (
        <div className="flex justify-end gap-2">
          <Button variant="secondary" onClick={() => setTexto(null)}>Descartar</Button>
          <Button
            disabled={salvar.isPending}
            onClick={() => salvar.mutate(
              { chave: CHAVE_NOTAS, conteudo: valor, anexo_url: docs?.[CHAVE_NOTAS]?.anexo_url ?? null },
              {
                onSuccess: () => setTexto(null),
                onError: (e) => alert(`Não foi possível salvar: ${(e as Error).message}`),
              },
            )}
          >
            {salvar.isPending ? 'Salvando…' : 'Salvar observações'}
          </Button>
        </div>
      )}
    </div>
  );
}

/** Pasta de identidade visual do cliente: logos, manual da marca, fontes, paleta. */
export function IdentidadeVisual({ clienteId }: { clienteId: string }) {
  const { data: arquivos, isLoading, error } = useArquivosIdentidade(clienteId);
  const enviar = useEnviarIdentidade(clienteId);
  const excluir = useExcluirIdentidade(clienteId);
  const [enviando, setEnviando] = useState(false);
  const [arrastando, setArrastando] = useState(false);
  const [erros, setErros] = useState<string[]>([]);

  async function processar(files: FileList | File[] | null) {
    if (!files || files.length === 0) return;
    const msgs: string[] = [];
    setEnviando(true);
    for (const file of Array.from(files)) {
      const invalido = validarIdentidade(file);
      if (invalido) { msgs.push(invalido); continue; }
      try {
        await enviar.mutateAsync(file);
      } catch (e) {
        msgs.push(`"${file.name}": ${(e as Error).message || 'falha no envio'}`);
      }
    }
    setEnviando(false);
    setErros(msgs);
  }

  function aoSoltar(e: DragEvent<HTMLLabelElement>) {
    e.preventDefault();
    setArrastando(false);
    void processar(e.dataTransfer.files);
  }

  const falha = (e: unknown) => alert(`Não foi possível abrir: ${(e as Error).message}`);

  return (
    <Card className="space-y-4 p-5">
      <div>
        <h2 className="text-lg font-semibold text-white"><GlassIcon name="palette" /> Identidade visual</h2>
        <p className="text-xs text-slate-400">
          Logos, manual da marca, fontes e paleta do cliente. O designer consulta aqui antes de criar.
        </p>
      </div>

      <label
        onDragOver={(e) => { e.preventDefault(); setArrastando(true); }}
        onDragLeave={() => setArrastando(false)}
        onDrop={aoSoltar}
        className={`flex cursor-pointer flex-col items-center gap-1 rounded-xl border border-dashed px-4 py-6 text-center text-sm transition-colors ${
          arrastando ? 'border-brand-400 bg-brand-500/10 text-slate-100' : 'border-white/15 bg-white/[0.02] text-slate-300 hover:border-brand-400/50'
        }`}
      >
        <span className="text-xl"><GlassIcon name="paperclip" /></span>
        <span>{enviando ? 'Enviando…' : 'Arraste arquivos aqui ou clique para anexar'}</span>
        <span className="text-[11px] text-slate-500">
          Imagens, SVG, PDF, AI, EPS, PSD, fontes, ZIP e documentos · até {MAX_IDENTIDADE_MB} MB cada
        </span>
        <input
          type="file"
          multiple
          accept={ACCEPT_IDENTIDADE}
          className="hidden"
          disabled={enviando}
          onChange={(e) => { void processar(e.target.files); e.target.value = ''; }}
        />
      </label>

      {erros.map((m) => <p key={m} className="text-xs text-red-400">{m}</p>)}
      {error && <p className="text-sm text-red-300">Erro ao carregar os arquivos: {(error as Error).message}</p>}
      {isLoading && <div className="flex justify-center py-4"><Spinner /></div>}

      {!isLoading && !error && (arquivos?.length ?? 0) === 0 && (
        <p className="rounded-md border border-dashed border-white/10 px-3 py-6 text-center text-xs text-slate-500">
          Nenhum arquivo ainda. Anexe a identidade visual deste cliente.
        </p>
      )}

      {(arquivos?.length ?? 0) > 0 && (
        <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
          {arquivos!.map((a) => (
            <li key={a.id} className="space-y-1.5 rounded-xl border border-white/10 bg-white/[0.03] p-2">
              <button type="button" className="block w-full" title="Ver" onClick={() => void abrirAnexo(a).catch(falha)}>
                <Miniatura a={a} />
              </button>
              <p className="truncate text-xs font-medium text-slate-100" title={a.name}>{a.name}</p>
              <p className="text-[11px] text-slate-500">{formatarTamanho(a.size)}</p>
              <div className="flex gap-3 text-[11px]">
                <button className="text-slate-300 hover:underline" onClick={() => void abrirAnexo(a).catch(falha)}>Ver</button>
                <button className="text-slate-300 hover:underline" onClick={() => void abrirAnexo(a, true).catch(falha)}>Baixar</button>
                <button
                  className="ml-auto text-red-400 hover:underline"
                  onClick={() => {
                    if (confirm(`Excluir "${a.name}"?`)) {
                      excluir.mutate(a, { onError: (e) => alert(`Não foi possível excluir: ${(e as Error).message}`) });
                    }
                  }}
                >
                  Excluir
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}

      <Notas clienteId={clienteId} />
    </Card>
  );
}
