import { Modal } from '@/shared/ui/Modal';
import { Button } from '@/shared/ui/Button';
import { driveInfo } from '@/modules/gestao-conteudo/types';
import { CarrosselPasta } from './CarrosselPasta';
import { VideoDrive } from './VideoDrive';

export function PreviaDrive({
  open, onClose, titulo, link, formato,
}: { open: boolean; onClose: () => void; titulo: string; link: string | null; formato?: string }) {
  const info = driveInfo(link);

  return (
    <Modal open={open} onClose={onClose} title={titulo || 'Prévia'} size="xl" semBlur
      footer={info.abrirUrl ? (
        <a href={info.abrirUrl} target="_blank" rel="noreferrer noopener">
          <Button variant="secondary">Abrir no Drive ↗</Button>
        </a>
      ) : undefined}
    >
      {info.tipo === 'pasta' && info.id ? (
        <CarrosselPasta pastaId={info.id} titulo={titulo} />
      ) : formato === 'reels' && info.id ? (
        <VideoDrive id={info.id} titulo={titulo} abrirUrl={info.abrirUrl} thumbUrl={info.thumbUrl} />
      ) : info.previewUrl ? (
        <div className="space-y-2">
          <iframe
            key={info.previewUrl}
            src={info.previewUrl}
            title={titulo}
            allow="autoplay; fullscreen"
            allowFullScreen
            className="h-[70vh] w-full rounded-xl border border-white/10 bg-black"
          />
          <p className="text-[11px] text-slate-500">
            Se a prévia não carregar, o arquivo precisa estar compartilhado como
            "Qualquer pessoa com o link" no Drive (vale para pastas também).
          </p>
        </div>
      ) : (
        <p className="text-sm text-slate-300">
          Nenhum link do Drive válido neste conteúdo. Cole um link do tipo
          <code className="mx-1 rounded bg-white/10 px-1">drive.google.com/file/d/…</code>.
        </p>
      )}
    </Modal>
  );
}
