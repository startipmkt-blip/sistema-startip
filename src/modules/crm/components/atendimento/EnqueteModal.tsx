import { useState } from 'react';
import { Modal } from '@/shared/ui/Modal';
import { Button } from '@/shared/ui/Button';
import { Input } from '@/shared/ui/Input';
import { useEnviarEnquete } from '@/modules/crm/api/crmApi';

interface Props {
  open: boolean;
  onClose: () => void;
  leadId: string;
}

export function EnqueteModal({ open, onClose, leadId }: Props) {
  const [pergunta, setPergunta] = useState('');
  const [opcoes, setOpcoes] = useState<string[]>(['', '']);
  const [multi, setMulti] = useState(false);
  const enviar = useEnviarEnquete();

  function atualizarOpcao(i: number, v: string) {
    setOpcoes((arr) => arr.map((x, idx) => (idx === i ? v : x)));
  }
  function adicionarOpcao() {
    if (opcoes.length < 12) setOpcoes((arr) => [...arr, '']);
  }
  function removerOpcao(i: number) {
    if (opcoes.length > 2) setOpcoes((arr) => arr.filter((_, idx) => idx !== i));
  }

  const opcoesValidas = opcoes.map((o) => o.trim()).filter(Boolean);
  const podeEnviar = pergunta.trim().length > 0 && opcoesValidas.length >= 2;

  async function handleEnviar() {
    await enviar.mutateAsync({
      leadId, pergunta: pergunta.trim(), opcoes: opcoesValidas, multi,
    });
    setPergunta(''); setOpcoes(['', '']); setMulti(false);
    onClose();
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Criar enquete"
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>Cancelar</Button>
          <Button onClick={handleEnviar} disabled={!podeEnviar || enviar.isPending}>
            {enviar.isPending ? 'Enviando…' : 'Enviar enquete'}
          </Button>
        </>
      }
    >
      <div className="space-y-3">
        <Input
          id="pergunta"
          label="Pergunta"
          value={pergunta}
          onChange={(e) => setPergunta(e.target.value)}
          placeholder="Ex: Qual horário funciona melhor pra você?"
        />
        <div className="space-y-2">
          <div className="text-xs text-slate-400">Opções (mínimo 2, máximo 12)</div>
          {opcoes.map((o, i) => (
            <div key={i} className="flex gap-2">
              <input
                type="text"
                value={o}
                onChange={(e) => atualizarOpcao(i, e.target.value)}
                placeholder={`Opção ${i + 1}`}
                className="flex-1 rounded-md border border-white/10 bg-white/5 px-3 py-2 text-sm text-slate-100 placeholder:text-slate-500 focus:border-brand-400 focus:outline-none"
              />
              {opcoes.length > 2 && (
                <button
                  onClick={() => removerOpcao(i)}
                  className="rounded-md px-2 text-sm text-slate-400 hover:bg-white/5"
                  title="Remover opção"
                >
                  ✕
                </button>
              )}
            </div>
          ))}
          {opcoes.length < 12 && (
            <button
              onClick={adicionarOpcao}
              className="text-xs text-brand-300 hover:underline"
            >
              + adicionar opção
            </button>
          )}
        </div>
        <label className="flex items-center gap-2 text-xs text-slate-300">
          <input type="checkbox" checked={multi} onChange={(e) => setMulti(e.target.checked)} />
          Permitir múltiplas respostas
        </label>
      </div>
    </Modal>
  );
}
