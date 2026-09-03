import { useEffect, useState } from 'react';
import { supabase } from '@/shared/lib/supabaseClient';
import { IS_DEMO } from '@/shared/lib/env';
import type { CrmMensagem } from '@/modules/crm/types';
import { AudioPlayer } from './AudioPlayer';

interface Props {
  msg: CrmMensagem;
}

// Gera URL assinada para um path no bucket crm-media, com cache no window
// por 50min (URLs assinadas duram 1h).
const urlCache = new Map<string, { url: string; validoAte: number }>();
async function urlAssinadaCache(path: string): Promise<string> {
  if (IS_DEMO) return path;
  const agora = Date.now();
  const cached = urlCache.get(path);
  if (cached && cached.validoAte > agora) return cached.url;
  const { data, error } = await supabase.storage.from('crm-media').createSignedUrl(path, 3600);
  if (error) throw error;
  urlCache.set(path, { url: data.signedUrl, validoAte: agora + 50 * 60 * 1000 });
  return data.signedUrl;
}

function usaUrlAssinada(path: string | null | undefined): string | null {
  const [url, setUrl] = useState<string | null>(null);
  useEffect(() => {
    if (!path) { setUrl(null); return; }
    let ativo = true;
    urlAssinadaCache(path).then((u) => { if (ativo) setUrl(u); }).catch(() => { if (ativo) setUrl(null); });
    return () => { ativo = false; };
  }, [path]);
  return url;
}


export function MidiaBubble({ msg }: Props) {
  const url = usaUrlAssinada(msg.midia_path);

  if (msg.tipo === 'imagem') {
    return (
      <div className="max-w-xs">
        {url ? (
          <div className="group/mid relative">
            <a href={url} target="_blank" rel="noopener noreferrer">
              <img
                src={url}
                alt={msg.midia_nome ?? 'imagem'}
                className="max-h-64 w-full rounded-md object-cover"
                loading="lazy"
              />
            </a>
            <a
              href={url}
              download={msg.midia_nome ?? 'imagem'}
              className="absolute right-1 top-1 rounded-full bg-slate-900/70 px-2 py-1 text-xs text-white opacity-0 transition-opacity group-hover/mid:opacity-100 hover:bg-slate-900"
              title="Baixar imagem"
              onClick={(e) => e.stopPropagation()}
            >
              ⬇
            </a>
          </div>
        ) : (
          <div className="flex h-48 w-full items-center justify-center rounded-md bg-slate-800 text-slate-500">📷 …</div>
        )}
        {msg.texto && <div className="mt-1 whitespace-pre-wrap break-words text-sm">{msg.texto}</div>}
      </div>
    );
  }

  if (msg.tipo === 'audio') {
    return (
      <div className="flex min-w-56 items-center gap-2">
        {url ? (
          <>
            <AudioPlayer src={url} duracaoInicial={msg.midia_duracao ?? null} />
            <a
              href={url}
              download={msg.midia_nome ?? 'audio'}
              className="rounded-full px-1 text-slate-300 hover:bg-white/10"
              title="Baixar áudio"
            >
              ⬇
            </a>
          </>
        ) : (
          <span className="text-xs text-slate-400">🎵 carregando…</span>
        )}
      </div>
    );
  }

  if (msg.tipo === 'documento') {
    return (
      <div className="flex items-center gap-2 rounded-md bg-white/5 p-2">
        <span className="text-xl" aria-hidden>📎</span>
        <div className="min-w-0 flex-1">
          <div className="truncate text-sm font-medium">{msg.midia_nome ?? 'Documento'}</div>
          {url && (
            <a
              href={url}
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs text-brand-300 hover:underline"
            >
              Abrir/Baixar
            </a>
          )}
        </div>
      </div>
    );
  }

  if (msg.tipo === 'video') {
    return (
      <div className="max-w-xs">
        {url ? (
          <div className="group/mid relative">
            <video controls src={url} className="max-h-64 w-full rounded-md" />
            <a
              href={url}
              download={msg.midia_nome ?? 'video'}
              className="absolute right-1 top-1 rounded-full bg-slate-900/70 px-2 py-1 text-xs text-white opacity-0 transition-opacity group-hover/mid:opacity-100 hover:bg-slate-900"
              title="Baixar vídeo"
              onClick={(e) => e.stopPropagation()}
            >
              ⬇
            </a>
          </div>
        ) : (
          <div className="flex h-48 w-full items-center justify-center rounded-md bg-slate-800 text-slate-500">🎬 …</div>
        )}
        {msg.texto && <div className="mt-1 whitespace-pre-wrap break-words text-sm">{msg.texto}</div>}
      </div>
    );
  }

  if (msg.tipo === 'sticker') {
    return url
      ? <img src={url} alt="figurinha" className="h-32 w-32 rounded" />
      : <div className="h-32 w-32 rounded bg-slate-800 text-center text-4xl leading-32">🌟</div>;
  }

  // Fallback: texto puro
  return <div className="whitespace-pre-wrap break-words">{msg.texto}</div>;
}
