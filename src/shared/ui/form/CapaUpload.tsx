import { useEffect, useRef, useState } from 'react';
import { GlassIcon } from '@/shared/ui/GlassIcon';
import { IS_DEMO } from '@/shared/lib/env';
import { enviarAnexo, useUrlAnexo, validarArquivo } from '@/modules/ideias/criativos/criativosApi';
import type { CriativoAnexo } from '@/modules/ideias/criativos/types';

// No modo demonstração o arquivo não vai a lugar nenhum: guardamos uma URL local para a prévia.
const previasDemo = new Map<string, string>();

export function useUrlCapa(capa: CriativoAnexo | null | undefined): string | undefined {
  const remota = useUrlAnexo(capa?.path);
  if (!capa) return undefined;
  return IS_DEMO ? previasDemo.get(capa.path) : remota.data;
}

export function ImagemCapa({ capa, className = '', icone = 'image' }: { capa: CriativoAnexo | null | undefined; className?: string; icone?: string }) {
  const url = useUrlCapa(capa);
  if (url) return <img src={url} alt="" className={`h-full w-full object-cover ${className}`} />;
  return (
    <div className={`capa-vazia flex h-full w-full items-center justify-center bg-brand-500/10 ${className}`}>
      <GlassIcon name={icone} tone="brand" className="h-8 w-8" />
    </div>
  );
}

/** Área tracejada "Selecionar arquivo" que vira a imagem escolhida. Aceita colar (Ctrl+V). */
export function CapaUpload({ valor, onChange, onNovo, compacta = false, iconeVazio = 'image', dica }: {
  valor: CriativoAnexo | null;
  /** Quadradinho + botão "Enviar capa" (formulário de POP). */
  compacta?: boolean;
  iconeVazio?: string;
  dica?: string;
  onChange: (c: CriativoAnexo | null) => void;
  /** Chamado com o path enviado nesta abertura (para descartar se cancelar). */
  onNovo?: (path: string) => void;
}) {
  const input = useRef<HTMLInputElement>(null);
  const [enviando, setEnviando] = useState(false);
  const [erro, setErro] = useState('');

  async function enviar(file: File | undefined) {
    if (!file) return;
    if (!file.type.startsWith('image/')) { setErro('Escolha uma imagem (JPG, PNG ou WEBP).'); return; }
    const invalido = validarArquivo(file);
    if (invalido) { setErro(invalido); return; }
    setErro('');
    setEnviando(true);
    try {
      const a = await enviarAnexo(file);
      if (IS_DEMO) previasDemo.set(a.path, URL.createObjectURL(file));
      onChange(a);
      onNovo?.(a.path);
    } catch (e) {
      setErro((e as Error).message || 'Falha no envio.');
    } finally {
      setEnviando(false);
    }
  }

  const enviarRef = useRef(enviar);
  enviarRef.current = enviar;
  useEffect(() => {
    function aoColar(e: ClipboardEvent) {
      const f = Array.from(e.clipboardData?.files ?? []).find((x) => x.type.startsWith('image/'));
      if (!f) return;
      e.preventDefault();
      void enviarRef.current(f);
    }
    window.addEventListener('paste', aoColar);
    return () => window.removeEventListener('paste', aoColar);
  }, []);

  if (compacta) {
    return (
      <div className="flex flex-col gap-1.5">
        <input ref={input} type="file" accept="image/*" className="hidden" onChange={(e) => void enviar(e.target.files?.[0])} />
        <div className="flex items-start gap-3">
          <div className="h-[88px] w-[88px] shrink-0 overflow-hidden rounded-xl border border-white/10">
            <ImagemCapa capa={valor} icone={iconeVazio} />
          </div>
          <div className="flex flex-col gap-1.5">
            <div className="flex gap-2">
              <button type="button" onClick={() => input.current?.click()} className="flex items-center gap-2 rounded-lg border border-white/10 bg-white/[0.04] px-3 py-1.5 text-xs font-semibold text-slate-100 hover:bg-white/10">
                <GlassIcon name="image-plus" className="h-4 w-4" /> {enviando ? 'Enviando…' : valor ? 'Trocar capa' : 'Enviar capa'}
              </button>
              {valor && (
                <button type="button" onClick={() => onChange(null)} className="text-xs font-semibold text-red-400 hover:underline">Remover</button>
              )}
            </div>
            {dica && <p className="max-w-[16rem] text-xs text-slate-400">{dica}</p>}
          </div>
        </div>
        {erro && <p className="text-xs text-red-400">{erro}</p>}
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-1.5">
      <input ref={input} type="file" accept="image/*" className="hidden" onChange={(e) => void enviar(e.target.files?.[0])} />
      {valor ? (
        <div className="relative overflow-hidden rounded-xl border border-white/10">
          <div className="aspect-video max-w-full"><ImagemCapa capa={valor} /></div>
          <div className="absolute right-2 top-2 flex gap-1.5">
            <button type="button" onClick={() => input.current?.click()} className="rounded-lg bg-slate-950/70 px-2.5 py-1 text-xs font-semibold text-white">Trocar</button>
            <button type="button" onClick={() => onChange(null)} className="rounded-lg bg-slate-950/70 px-2.5 py-1 text-xs font-semibold text-white">Remover</button>
          </div>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => input.current?.click()}
          onDragOver={(e) => e.preventDefault()}
          onDrop={(e) => { e.preventDefault(); void enviar(e.dataTransfer.files?.[0]); }}
          className="botao-tracejado flex flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-white/15 py-8 text-sm text-slate-400 hover:border-brand-400/60"
        >
          <GlassIcon name="upload" className="h-5 w-5" />
          {enviando ? 'Enviando…' : 'Selecionar arquivo'}
          <span className="text-xs text-slate-400">ou arraste / cole a imagem aqui</span>
        </button>
      )}
      {erro && <p className="text-xs text-red-400">{erro}</p>}
    </div>
  );
}
