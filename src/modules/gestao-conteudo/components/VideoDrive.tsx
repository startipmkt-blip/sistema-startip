import { useState } from 'react';

/** Link direto do arquivo no Drive (suporta Range, então o <video> adianta/volta normalmente). */
export const videoDriveUrl = (id: string) =>
  `https://drive.usercontent.google.com/download?id=${id}&export=download&confirm=t`;

/**
 * Player nativo do navegador para vídeo do Drive. O player embutido do Drive (iframe)
 * desenha controles duplicados por cima do vídeo em vários celulares.
 */
export function VideoDrive({
  id, titulo, abrirUrl, thumbUrl,
}: { id: string; titulo: string; abrirUrl: string; thumbUrl?: string }) {
  const [falhou, setFalhou] = useState(false);

  if (falhou) {
    return (
      <div className="space-y-3 rounded-xl border border-white/10 bg-black p-4 text-center">
        {thumbUrl && <img src={thumbUrl} alt={titulo} className="mx-auto max-h-[50vh] rounded-lg opacity-80" />}
        <p className="text-sm text-slate-300">Não foi possível tocar o vídeo aqui.</p>
        <a
          href={abrirUrl} target="_blank" rel="noreferrer noopener"
          className="inline-block rounded-xl bg-brand-500 px-4 py-2 text-sm font-medium text-white"
        >
          Abrir vídeo no Drive ↗
        </a>
      </div>
    );
  }

  return (
    <video
      key={id}
      src={videoDriveUrl(id)}
      poster={thumbUrl}
      controls
      playsInline
      preload="metadata"
      onError={() => setFalhou(true)}
      className="mx-auto max-h-[65vh] w-full rounded-xl border border-white/10 bg-black"
    >
      {titulo}
    </video>
  );
}
