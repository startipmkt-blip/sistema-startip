import { useState } from 'react';
import { useCrmMensagens, useEnviarMensagem } from '@/modules/crm/api/crmApi';
import { etiquetaInfo, type CrmLead } from '@/modules/crm/types';
import { Modal } from '@/shared/ui/Modal';
import { Button } from '@/shared/ui/Button';
import { Badge } from '@/shared/ui/Badge';
import { Spinner } from '@/shared/ui/Spinner';
import { formatMoney } from '@/shared/lib/format';

interface Props {
  open: boolean;
  onClose: () => void;
  lead: CrmLead;
  onEditar: () => void;
}

export function LeadConversasModal({ open, onClose, lead, onEditar }: Props) {
  const { data: mensagens, isLoading } = useCrmMensagens(open ? lead.id : undefined);
  const enviar = useEnviarMensagem();
  const [texto, setTexto] = useState('');

  async function handleEnviar() {
    if (!texto.trim()) return;
    await enviar.mutateAsync({ leadId: lead.id, texto: texto.trim() });
    setTexto('');
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={`${lead.nome} — ${lead.empresa || 'sem empresa'}`}
      footer={
        <Button variant="secondary" onClick={onEditar}>
          Editar dados do lead
        </Button>
      }
    >
      <div className="space-y-3">
        {/* Dados do lead */}
        <div className="flex flex-wrap items-center gap-2 text-xs text-slate-400">
          <span>📞 {lead.telefone || '—'}</span>
          <span>· {lead.origem || 'origem —'}</span>
          <span>· {formatMoney(lead.valor)}</span>
          {lead.etiquetas.map((e) => {
            const info = etiquetaInfo(e);
            return <Badge key={e} tone={info.tone}>{info.label}</Badge>;
          })}
        </div>

        {/* Conversa */}
        <div className="max-h-72 space-y-2 overflow-y-auto rounded-md bg-white/5 p-3">
          {isLoading ? (
            <div className="flex justify-center py-6"><Spinner /></div>
          ) : !mensagens || mensagens.length === 0 ? (
            <p className="py-6 text-center text-xs text-slate-400">
              Sem conversas ainda.
            </p>
          ) : (
            mensagens.map((m) => (
              <div
                key={m.id}
                className={`flex ${m.direcao === 'enviada' ? 'justify-end' : 'justify-start'}`}
              >
                <div
                  className={`max-w-[75%] rounded-lg px-3 py-2 text-sm ${
                    m.direcao === 'enviada'
                      ? 'bg-brand-600 text-white'
                      : 'border border-white/10 bg-white/5 text-slate-200'
                  }`}
                >
                  {m.texto}
                </div>
              </div>
            ))
          )}
        </div>

        {/* Responder */}
        <div className="flex gap-2">
          <input
            className="flex-1 rounded-md border border-white/15 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
            placeholder="Escreva uma resposta…"
            value={texto}
            onChange={(e) => setTexto(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleEnviar()}
          />
          <Button onClick={handleEnviar} disabled={enviar.isPending || !texto.trim()}>
            Enviar
          </Button>
        </div>
        <p className="text-[11px] text-slate-400">
          As mensagens entram/saem pelo WhatsApp da agência via Z-API (a conectar
          pelo programador). No modo demo, a resposta fica só aqui.
        </p>
      </div>
    </Modal>
  );
}
