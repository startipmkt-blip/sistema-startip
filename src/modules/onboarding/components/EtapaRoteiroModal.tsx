import { useState } from 'react';
import { useSalvarEtapaRoteiro } from '@/modules/onboarding/api/roteiroApi';
import type { EtapaRoteiro } from '@/modules/onboarding/roteiro';
import { Modal } from '@/shared/ui/Modal';
import { Input } from '@/shared/ui/Input';
import { Textarea } from '@/shared/ui/Textarea';
import { Button } from '@/shared/ui/Button';

interface Props {
  open: boolean;
  onClose: () => void;
  etapa?: EtapaRoteiro;
}

export function EtapaRoteiroModal({ open, onClose, etapa }: Props) {
  const salvar = useSalvarEtapaRoteiro();
  const [titulo, setTitulo] = useState(etapa?.titulo ?? '');
  const [tempo, setTempo] = useState(etapa?.tempo ?? '');
  const [itensTexto, setItensTexto] = useState((etapa?.itens ?? []).join('\n'));

  async function handleSalvar() {
    if (!titulo.trim()) return;
    const itens = itensTexto.split('\n').map((s) => s.trim()).filter(Boolean);
    await salvar.mutateAsync({ numero: etapa?.numero, dados: { titulo, tempo, itens } });
    onClose();
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={etapa ? 'Editar etapa' : 'Nova etapa do fluxo'}
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>Cancelar</Button>
          <Button onClick={handleSalvar} disabled={salvar.isPending || !titulo.trim()}>
            {salvar.isPending ? 'Salvando…' : 'Salvar'}
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        <Input id="titulo" label="Título da etapa" value={titulo} onChange={(e) => setTitulo(e.target.value)} />
        <Input id="tempo" label="Tempo (opcional)" placeholder="Ex.: 1 dia, ~30 min, até 5 dias úteis" value={tempo} onChange={(e) => setTempo(e.target.value)} />
        <Textarea
          id="itens"
          label="Passos (um por linha)"
          className="min-h-[140px]"
          value={itensTexto}
          onChange={(e) => setItensTexto(e.target.value)}
        />
      </div>
    </Modal>
  );
}
