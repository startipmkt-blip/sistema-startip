import { useState, type DragEvent } from 'react';
import { urlDoArquivo } from '@/shared/lib/storage';
import {
  ACCEPT_ANEXOS, MAX_ANEXO_MB, ehImagem, formatarTamanho, iconeAnexo,
  type CriativoAnexo,
} from '@/modules/ideias/criativos/types';
import {
  descartarAnexo, enviarAnexo, urlParaBaixar, useUrlAnexo, validarArquivo,
} from '@/modules/ideias/criativos/criativosApi';

/** Miniatura (imagem) ou icone (documento) de um anexo ja enviado. */
export function MiniaturaAnexo({ anexo, className = 'h-16 w-16' }: { anexo: CriativoAnexo; className?: string }) {
  const imagem = ehImagem(anexo);
  const { data: url } = useUrlAnexo(imagem ? anexo.path : undefined);
  if (imagem && url) {
    return <img src={url} alt={anexo.name} className={`${className} shrink-0 rounded-lg object-cover`} loading="lazy" />;
  }
  return (
    <div className={`${className} grid shrink-0 place-items-center rounded-lg bg-white/5 text-2xl`}>
      {iconeAnexo(anexo)}
    </div>
  );
}

export async function abrirAnexo(a: CriativoAnexo, baixar = false): Promise<void> {
  const url = baixar ? await urlParaBaixar(a) : await urlDoArquivo('anexos-internos', a.path);
  window.open(url, '_blank', 'noopener');
}

interface Props {
  anexos: CriativoAnexo[];
  onChange: (anexos: CriativoAnexo[]) => void;
  /** Paths enviados nesta sessao do formulario (apagados do storage se removidos/cancelados). */
  novos: string[];
  onNovos: (paths: string[]) => void;
}

export function AnexosCriativo({ anexos, onChange, novos, onNovos }: Props) {
  const [enviando, setEnviando] = useState(false);
  const [arrastando, setArrastando] = useState(false);
  const [erros, setErros] = useState<string[]>([]);

  async function processar(files: FileList | File[] | null) {
    if (!files || files.length === 0) return;
    const msgs: string[] = [];
    const enviados: CriativoAnexo[] = [];
    setEnviando(true);
    for (const file of Array.from(files)) {
      const invalido = validarArquivo(file);
      if (invalido) { msgs.push(invalido); continue; }
      try {
        enviados.push(await enviarAnexo(file));
      } catch (e) {
        msgs.push(`"${file.name}": ${(e as Error).message || 'falha no envio'}`);
      }
    }
    setEnviando(false);
    setErros(msgs);
    if (enviados.length) {
      onChange([...anexos, ...enviados]);
      onNovos([...novos, ...enviados.map((a) => a.path)]);
    }
  }

  async function remover(a: CriativoAnexo) {
    onChange(anexos.filter((x) => x.path !== a.path));
    if (novos.includes(a.path)) {
      await descartarAnexo(a.path);
      onNovos(novos.filter((p) => p !== a.path));
    }
  }

  function aoSoltar(e: DragEvent<HTMLLabelElement>) {
    e.preventDefault();
    setArrastando(false);
    void processar(e.dataTransfer.files);
  }

  return (
    <div className="space-y-2">
      <label
        onDragOver={(e) => { e.preventDefault(); setArrastando(true); }}
        onDragLeave={() => setArrastando(false)}
        onDrop={aoSoltar}
        className={`flex cursor-pointer flex-col items-center gap-1 rounded-xl border border-dashed px-4 py-5 text-center text-sm transition-colors ${
          arrastando ? 'border-brand-400 bg-brand-500/10 text-slate-100' : 'border-white/15 bg-white/[0.02] text-slate-300 hover:border-brand-400/50'
        }`}
      >
        <span className="text-xl">📎</span>
        <span>{enviando ? 'Enviando…' : 'Arraste arquivos aqui ou toque para anexar'}</span>
        <span className="rounded-lg bg-brand-500/20 px-3 py-1 text-xs font-medium text-brand-100">Anexar arquivo</span>
        <span className="text-[11px] text-slate-500">
          Imagens, PDF, DOC, XLS, PPT e TXT · até {MAX_ANEXO_MB} MB cada
        </span>
        <input
          type="file"
          multiple
          accept={ACCEPT_ANEXOS}
          className="hidden"
          disabled={enviando}
          onChange={(e) => { void processar(e.target.files); e.target.value = ''; }}
        />
      </label>

      {erros.map((m) => (
        <p key={m} className="text-xs text-red-400">{m}</p>
      ))}

      {anexos.length > 0 && (
        <ul className="grid gap-2 sm:grid-cols-2">
          {anexos.map((a) => (
            <li key={a.path} className="flex items-center gap-3 rounded-xl border border-white/10 bg-white/[0.02] p-2">
              <MiniaturaAnexo anexo={a} className="h-12 w-12" />
              <div className="min-w-0 flex-1">
                <p className="truncate text-xs font-medium text-slate-100">{a.name}</p>
                <p className="text-[11px] text-slate-500">{formatarTamanho(a.size)}</p>
              </div>
              <button
                type="button"
                onClick={() => void remover(a)}
                className="rounded-lg px-2 py-1 text-slate-400 hover:bg-red-500/10 hover:text-red-300"
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
