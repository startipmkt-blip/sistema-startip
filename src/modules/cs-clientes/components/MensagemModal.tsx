import { useState } from 'react';
import { useEnviarMensagemCliente } from '@/modules/cs-clientes/api/csClientesApi';
import { useEnviarCs } from '@/modules/cs-clientes/api/csEnviosApi';
import { linkCs, montarMensagem } from '@/modules/cs-clientes/lib/mensagens';
import type { Cliente } from '@/shared/types/database';
import { Button } from '@/shared/ui/Button';
import { Modal } from '@/shared/ui/Modal';
import { Textarea } from '@/shared/ui/Textarea';
import { GlassIcon } from '@/shared/ui/GlassIcon';

type Modelo = 'livre' | 'semanal';

interface Props {
  cliente: Cliente;
  grupoNome: string;
  slug: string | undefined;
  msgSemanal: string;
  onClose: () => void;
}

export function MensagemModal({ cliente, grupoNome, slug, msgSemanal, onClose }: Props) {
  const enviarLivre = useEnviarMensagemCliente();
  const enviarCs = useEnviarCs();
  const [modelo, setModelo] = useState<Modelo>('livre');
  const [texto, setTexto] = useState('');
  const [erro, setErro] = useState<string | null>(null);
  const [enviado, setEnviado] = useState(false);
  const enviando = enviarLivre.isPending || enviarCs.isPending;

  function escolher(m: Modelo) {
    setModelo(m);
    setErro(null);
    setTexto(m === 'semanal' && slug ? montarMensagem(msgSemanal, linkCs(slug)) : '');
  }

  async function confirmar() {
    setErro(null);
    try {
      if (modelo === 'semanal') await enviarCs.mutateAsync({ clienteId: cliente.id, tipo: 'semanal', texto: texto.trim() });
      else await enviarLivre.mutateAsync({ clienteId: cliente.id, texto: texto.trim() });
      setEnviado(true);
    } catch (e) {
      setErro((e as Error).message);
    }
  }

  const opcoes: Array<{ id: Modelo | 'nps'; label: string; desativada?: string }> = [
    { id: 'livre', label: 'Mensagem livre' },
    { id: 'semanal', label: 'CS de sexta', desativada: slug ? undefined : 'Link do cliente ainda não foi criado' },
    { id: 'nps', label: 'NPS', desativada: 'Em breve' },
  ];

  return (
    <Modal open onClose={onClose} title={`Mensagem para ${cliente.nome}`}>
      {enviado ? (
        <div className="space-y-3 text-center">
          <div className="text-3xl"><GlassIcon name="check-circle" /></div>
          <p className="text-sm text-slate-200">Mensagem enviada para <strong>{grupoNome}</strong>.</p>
          <Button onClick={onClose}>Fechar</Button>
        </div>
      ) : (
        <div className="space-y-3">
          <div className="flex flex-wrap gap-1.5">
            {opcoes.map((o) => (
              <button
                key={o.id}
                onClick={() => o.id !== 'nps' && escolher(o.id)}
                disabled={!!o.desativada}
                title={o.desativada}
                className={`rounded-full border px-3 py-1 text-xs disabled:cursor-not-allowed disabled:opacity-40 ${
                  modelo === o.id ? 'border-brand-400 bg-brand-500/20 text-white' : 'border-white/10 text-slate-300 hover:bg-white/5'
                }`}
              >
                {o.label}{o.id === 'nps' && ' (em breve)'}
              </button>
            ))}
          </div>

          <div className="rounded-md border border-amber-500/20 bg-amber-500/5 p-2 text-xs text-amber-200">
            Será enviada <strong>agora</strong> no WhatsApp para: <strong>{grupoNome}</strong>. O cliente vai ver.
          </div>
          <Textarea
            id="cs-msg"
            label={modelo === 'semanal' ? 'Mensagem (já com o link deste cliente)' : 'Mensagem'}
            value={texto}
            onChange={(e) => setTexto(e.target.value)}
            rows={9}
          />
          {erro && <div className="rounded-md border border-red-500/20 bg-red-500/5 p-2 text-xs text-red-300">{erro}</div>}
          <div className="flex justify-end gap-2">
            <Button variant="secondary" onClick={onClose}>Cancelar</Button>
            <Button onClick={() => void confirmar()} disabled={!texto.trim() || enviando}>
              {enviando ? 'Enviando…' : 'Enviar no grupo'}
            </Button>
          </div>
        </div>
      )}
    </Modal>
  );
}
