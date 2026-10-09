import { Modal } from '@/shared/ui/Modal';
import { Button } from '@/shared/ui/Button';
import { driveInfo } from '@/modules/gestao-conteudo/types';

export function PreviaDrive({
  open, onClose, titulo, link,
}: { open: boolean; onClose: () => void; titulo: string; link: string | null }) {
  const info = driveInfo(link);

  return (
    <Modal open={open} onClose={onClose} title={titulo || 'Prévia'} size="xl"
      footer={info.abrirUrl ? (
        <a href={info.abrirUrl} target="_blank" rel="noreferrer noopener">
          <Button variant="secondary">Abrir no Drive ↗</Button>
        </a>
      ) : undefined}
    >
      {info.tipo === 'arquivo' && info.previewUrl ? (
        <div className="space-y-2">
          <iframe
            src={info.previewUrl}
            title={titulo}
            allow="autoplay; fullscreen"
            allowFullScreen
            className="h-[70vh] w-full rounded-xl border border-white/10 bg-black"
          />
          <p className="text-[11px] text-slate-500">
            Se a prévia não carregar, o arquivo precisa estar compartilhado como
            "Qualquer pessoa com o link" no Drive.
          </p>
        </div>
      ) : info.tipo === 'pasta' ? (
        <p className="text-sm text-slate-300">
          Esse link é de uma <strong>pasta</strong>. Para ver a prévia aqui, cole o link de um
          arquivo específico (vídeo ou imagem).
        </p>
      ) : (
        <p className="text-sm text-slate-300">
          Nenhum link do Drive válido neste conteúdo. Cole um link do tipo
          <code className="mx-1 rounded bg-white/10 px-1">drive.google.com/file/d/…</code>.
        </p>
      )}
    </Modal>
  );
}
