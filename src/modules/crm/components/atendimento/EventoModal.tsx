import { useState } from 'react';
import { Modal } from '@/shared/ui/Modal';
import { Button } from '@/shared/ui/Button';
import { Input } from '@/shared/ui/Input';
import { useEnviarEvento } from '@/modules/crm/api/crmApi';

interface Props {
  open: boolean;
  onClose: () => void;
  leadId: string;
}

// Converte "2026-08-30T15:30" (datetime-local) → ISO UTC.
function toIso(local: string): string {
  if (!local) return '';
  const d = new Date(local);
  return d.toISOString();
}

export function EventoModal({ open, onClose, leadId }: Props) {
  const [titulo, setTitulo] = useState('');
  const [inicio, setInicio] = useState('');
  const [fim, setFim] = useState('');
  const [local, setLocal] = useState('');
  const [descricao, setDescricao] = useState('');
  const enviar = useEnviarEvento();

  const podeEnviar = titulo.trim().length > 0 && inicio.length > 0;

  async function handleEnviar() {
    await enviar.mutateAsync({
      leadId,
      titulo: titulo.trim(),
      inicio: toIso(inicio),
      fim: fim ? toIso(fim) : null,
      local: local.trim() || null,
      descricao: descricao.trim() || null,
    });
    setTitulo(''); setInicio(''); setFim(''); setLocal(''); setDescricao('');
    onClose();
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Criar evento"
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>Cancelar</Button>
          <Button onClick={handleEnviar} disabled={!podeEnviar || enviar.isPending}>
            {enviar.isPending ? 'Enviando…' : 'Enviar evento'}
          </Button>
        </>
      }
    >
      <div className="space-y-3">
        <Input
          id="ev-titulo"
          label="Título do evento"
          value={titulo}
          onChange={(e) => setTitulo(e.target.value)}
          placeholder="Ex: Reunião de alinhamento"
        />
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <label className="block text-xs text-slate-300">
            Início
            <input
              type="datetime-local"
              value={inicio}
              onChange={(e) => setInicio(e.target.value)}
              className="mt-1 w-full rounded-md border border-white/10 bg-white/5 px-3 py-2 text-sm text-slate-100 [color-scheme:dark] focus:border-brand-400 focus:outline-none"
            />
          </label>
          <label className="block text-xs text-slate-300">
            Fim (opcional)
            <input
              type="datetime-local"
              value={fim}
              onChange={(e) => setFim(e.target.value)}
              className="mt-1 w-full rounded-md border border-white/10 bg-white/5 px-3 py-2 text-sm text-slate-100 [color-scheme:dark] focus:border-brand-400 focus:outline-none"
            />
          </label>
        </div>
        <Input
          id="ev-local"
          label="Local (opcional)"
          value={local}
          onChange={(e) => setLocal(e.target.value)}
          placeholder="Ex: Google Meet, endereço, sala…"
        />
        <label className="block text-xs text-slate-300">
          Descrição (opcional)
          <textarea
            value={descricao}
            onChange={(e) => setDescricao(e.target.value)}
            rows={3}
            className="mt-1 w-full resize-none rounded-md border border-white/10 bg-white/5 px-3 py-2 text-sm text-slate-100 focus:border-brand-400 focus:outline-none"
          />
        </label>
      </div>
    </Modal>
  );
}
