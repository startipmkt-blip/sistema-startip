import { useState } from 'react';
import { Modal } from '@/shared/ui/Modal';
import { Button } from '@/shared/ui/Button';
import { Input } from '@/shared/ui/Input';
import { Textarea } from '@/shared/ui/Textarea';
import { useEnviarBotoes } from '@/modules/crm/api/crmApi';

interface Props {
  open: boolean;
  onClose: () => void;
  leadId: string;
}

export function BotoesModal({ open, onClose, leadId }: Props) {
  const [texto, setTexto] = useState('');
  const [botoes, setBotoes] = useState<string[]>(['', '']);
  const enviar = useEnviarBotoes();

  const validos = botoes.map((b) => b.trim()).filter(Boolean);
  const pode = texto.trim().length > 0 && validos.length >= 1;

  function atualizar(i: number, v: string) {
    setBotoes((arr) => arr.map((x, idx) => (idx === i ? v : x)));
  }
  function adicionar() {
    if (botoes.length < 3) setBotoes((arr) => [...arr, '']);
  }
  function remover(i: number) {
    if (botoes.length > 1) setBotoes((arr) => arr.filter((_, idx) => idx !== i));
  }

  async function handleEnviar() {
    await enviar.mutateAsync({
      leadId,
      texto: texto.trim(),
      botoes: validos.map((label) => ({ label })),
    });
    setTexto(''); setBotoes(['', '']);
    onClose();
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Mensagem com botões"
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>Cancelar</Button>
          <Button onClick={handleEnviar} disabled={!pode || enviar.isPending}>
            {enviar.isPending ? 'Enviando…' : 'Enviar'}
          </Button>
        </>
      }
    >
      <div className="space-y-3">
        <Textarea
          id="txt"
          label="Mensagem"
          rows={3}
          value={texto}
          onChange={(e) => setTexto(e.target.value)}
          placeholder="ex: Qual dessas opções você prefere?"
        />
        <div className="space-y-2">
          <div className="text-xs text-slate-400">Botões (máx 3)</div>
          {botoes.map((b, i) => (
            <div key={i} className="flex gap-2">
              <Input
                id={`btn-${i}`}
                value={b}
                onChange={(e) => atualizar(i, e.target.value)}
                placeholder={`Botão ${i + 1}`}
                maxLength={20}
              />
              {botoes.length > 1 && (
                <button
                  onClick={() => remover(i)}
                  className="rounded-md px-2 text-sm text-slate-400 hover:bg-white/5"
                  title="Remover"
                >
                  ✕
                </button>
              )}
            </div>
          ))}
          {botoes.length < 3 && (
            <button onClick={adicionar} className="text-xs text-brand-300 hover:underline">
              + adicionar botão
            </button>
          )}
        </div>
      </div>
    </Modal>
  );
}
