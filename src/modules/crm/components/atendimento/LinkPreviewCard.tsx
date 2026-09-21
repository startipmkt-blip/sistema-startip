import { useEffect, useState } from 'react';
import { supabase } from '@/shared/lib/supabaseClient';

export interface LinkPreview {
  url: string;
  title: string | null;
  description: string | null;
  image: string | null;
  site_name: string | null;
}

const URL_RX = /https?:\/\/[^\s<>"']+/i;

interface Props {
  texto: string;
  mensagemId: string;
  linkPreviewCache: LinkPreview | null;
}

// Cache in-memory pra evitar re-fetch entre re-renders da mesma sessão.
const memoria = new Map<string, LinkPreview | null>();

export function LinkPreviewCard({ texto, mensagemId, linkPreviewCache }: Props) {
  const url = texto?.match(URL_RX)?.[0] ?? null;
  const [preview, setPreview] = useState<LinkPreview | null>(linkPreviewCache);

  useEffect(() => {
    if (!url) return;
    if (linkPreviewCache?.url === url) { setPreview(linkPreviewCache); return; }
    if (memoria.has(url)) { setPreview(memoria.get(url) ?? null); return; }
    let vivo = true;
    (async () => {
      try {
        const { data } = await supabase.functions.invoke('link-preview', {
          body: { url, mensagem_id: mensagemId },
        });
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const p: LinkPreview | null = (data as any)?.preview ?? null;
        memoria.set(url, p);
        if (vivo) setPreview(p);
      } catch { /* ignora */ }
    })();
    return () => { vivo = false; };
  }, [url, mensagemId, linkPreviewCache]);

  if (!url || !preview || (!preview.title && !preview.description && !preview.image)) return null;

  return (
    <a href={preview.url} target="_blank" rel="noopener noreferrer"
      className="mb-1 mt-1 block overflow-hidden rounded-md border border-white/10 bg-white/5 text-xs text-slate-200 no-underline hover:bg-white/10">
      {preview.image && (
        <img src={preview.image} alt="" className="max-h-40 w-full object-cover" loading="lazy" />
      )}
      <div className="p-2">
        {preview.site_name && (
          <p className="mb-0.5 text-[10px] uppercase tracking-wide text-slate-500">{preview.site_name}</p>
        )}
        {preview.title && <p className="line-clamp-2 font-semibold text-slate-100">{preview.title}</p>}
        {preview.description && <p className="mt-1 line-clamp-2 text-slate-400">{preview.description}</p>}
      </div>
    </a>
  );
}
