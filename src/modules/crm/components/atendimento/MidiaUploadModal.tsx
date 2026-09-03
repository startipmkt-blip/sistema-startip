import { useMemo, useState } from 'react';
import { Modal } from '@/shared/ui/Modal';
import { Button } from '@/shared/ui/Button';
import { Input } from '@/shared/ui/Input';
import { useEnviarMidia } from '@/modules/crm/api/crmApi';

interface Props {
  open: boolean;
  onClose: () => void;
  leadId: string;
  tipo: 'imagem' | 'audio' | 'documento';
  arquivo: File;
}

function tamanho(bytes: number): string {
  if (bytes < 1024) return bytes + ' B';
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
  return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
}

export function MidiaUploadModal({ open, onClose, leadId, tipo, arquivo }: Props) {
  const [legenda, setLegenda] = useState('');
  const enviar = useEnviarMidia();

  const previewUrl = useMemo(() => URL.createObjectURL(arquivo), [arquivo]);

  async function handleEnviar() {
    await enviar.mutateAsync({
      leadId, tipo, arquivo,
      nome: arquivo.name,
      mime: arquivo.type,
      legenda: legenda.trim() || undefined,
    });
    URL.revokeObjectURL(previewUrl);
    onClose();
  }

  const rotulos: Record<typeof tipo, string> = {
    imagem: 'Enviar foto',
    audio: 'Enviar áudio',
    documento: 'Enviar documento',
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={rotulos[tipo]}
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>Cancelar</Button>
          <Button onClick={handleEnviar} disabled={enviar.isPending}>
            {enviar.isPending ? 'Enviando…' : 'Enviar'}
          </Button>
        </>
      }
    >
      <div className="space-y-3">
        {/* Preview */}
        <div className="flex justify-center rounded-md bg-white/5 p-3">
          {tipo === 'imagem' && (
            <img src={previewUrl} alt={arquivo.name} className="max-h-72 rounded-md" />
          )}
          {tipo === 'audio' && (
            <audio controls src={previewUrl} className="w-full" />
          )}
          {tipo === 'documento' && (
            <div className="text-center">
              <div className="text-4xl">📎</div>
              <div className="mt-2 text-sm font-medium text-slate-100">{arquivo.name}</div>
              <div className="text-xs text-slate-400">{tamanho(arquivo.size)}</div>
            </div>
          )}
        </div>

        {/* Legenda (só faz sentido em imagem/vídeo) */}
        {tipo === 'imagem' && (
          <Input
            id="legenda"
            label="Legenda (opcional)"
            value={legenda}
            onChange={(e) => setLegenda(e.target.value)}
            placeholder="Escreva algo pra ir junto com a foto…"
          />
        )}

        <p className="text-[11px] text-slate-500">
          O arquivo é enviado com segurança pelo Supabase Storage antes de ir para o WhatsApp.
        </p>
      </div>
    </Modal>
  );
}
