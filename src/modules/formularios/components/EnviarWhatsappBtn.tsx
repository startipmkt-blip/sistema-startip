import { useState } from 'react';
import { Button } from '@/shared/ui/Button';
import { supabase } from '@/shared/lib/supabaseClient';
import { mensagemWhatsapp } from '@/modules/formularios/lib/mensagensWhatsapp';
import type { Formulario } from '@/modules/formularios/types';
import { glassify } from '@/shared/ui/GlassIcon';

interface Props {
  formulario: Formulario;
  whatsappChatId: string | null | undefined;
  linkPublico: string;
}

export function EnviarWhatsappBtn({ formulario, whatsappChatId, linkPublico }: Props) {
  const [estado, setEstado] = useState<'idle' | 'enviando' | 'ok' | 'erro'>('idle');
  const [erro, setErro] = useState('');

  async function enviar() {
    if (!whatsappChatId) {
      setErro('Cliente sem WhatsApp cadastrado (campo whatsapp_chat_id).');
      setEstado('erro');
      return;
    }
    setEstado('enviando');
    setErro('');
    const texto = mensagemWhatsapp(formulario.tipo, linkPublico);
    const { data, error } = await supabase.functions.invoke('zapi-enviar', {
      body: { telefone: whatsappChatId, acao: 'text', texto },
    });
    if (error || (data as { error?: string })?.error) {
      setErro(error?.message ?? (data as { error?: string })?.error ?? 'Falha ao enviar.');
      setEstado('erro');
      return;
    }
    setEstado('ok');
    setTimeout(() => setEstado('idle'), 2500);
  }

  return (
    <div className="inline-flex flex-col items-start gap-1">
      <Button variant="secondary" onClick={enviar} disabled={estado === 'enviando'}>
        {glassify(estado === 'enviando' ? '⏳ Enviando…' : estado === 'ok' ? '✅ Enviado' : '📱 Enviar via WhatsApp')}
      </Button>
      {estado === 'erro' && <span className="text-xs text-red-400">{erro}</span>}
    </div>
  );
}
