import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/shared/lib/supabaseClient';
import { IS_DEMO } from '@/shared/lib/env';
import { demoClientes } from '@/shared/lib/demoData';

export interface GrupoWhatsapp {
  /** Identificador do grupo na Z-API (o mesmo valor gravado em clientes.whatsapp_chat_id). */
  chatId: string;
  nome: string;
}

const demoGrupos: GrupoWhatsapp[] = [
  { chatId: '120363000000000001-group', nome: 'Marketing - Padaria do Bairro' },
  { chatId: '120363000000000002-group', nome: 'Tráfego Pago - Loja XYZ' },
  { chatId: '120363000000000003-group', nome: 'Startip - Diretoria' },
];

const keys = {
  grupos: ['cs-clientes', 'grupos'] as const,
};

async function fetchGrupos(): Promise<GrupoWhatsapp[]> {
  if (IS_DEMO) return demoGrupos;
  const { data, error } = await supabase
    .from('crm_leads')
    .select('nome, telefone')
    .eq('is_grupo', true)
    .order('nome');
  if (error) throw error;
  return ((data ?? []) as Array<{ nome: string | null; telefone: string | null }>)
    .filter((g) => !!g.telefone)
    .map((g) => ({ chatId: g.telefone!, nome: g.nome?.trim() || g.telefone! }));
}

async function vincularGrupo(clienteId: string, chatId: string | null): Promise<void> {
  if (IS_DEMO) {
    const i = demoClientes.findIndex((x) => x.id === clienteId);
    if (i >= 0) demoClientes[i] = { ...demoClientes[i], whatsapp_chat_id: chatId };
    return;
  }
  const { error } = await supabase
    .from('clientes')
    .update({ whatsapp_chat_id: chatId } as never)
    .eq('id', clienteId);
  if (error) throw error;
}

async function enviarMensagem(clienteId: string, texto: string): Promise<void> {
  if (IS_DEMO) return;
  const { error } = await supabase.functions.invoke('enviar-aviso-whatsapp', {
    body: { cliente_id: clienteId, texto },
  });
  if (!error) return;
  const e = error as { message?: string; context?: Response };
  let detalhe: string | undefined;
  try { detalhe = (await e.context?.json())?.error; } catch { /* usa a mensagem genérica */ }
  throw new Error(detalhe ?? e.message ?? 'Falha ao enviar o WhatsApp.');
}

export function useGruposWhatsapp() {
  return useQuery({ queryKey: keys.grupos, queryFn: fetchGrupos });
}

export function useVincularGrupo() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (p: { clienteId: string; chatId: string | null }) => vincularGrupo(p.clienteId, p.chatId),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['clientes'] }),
  });
}

export function useVincularVarios() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (pares: Array<{ clienteId: string; chatId: string }>) => {
      for (const p of pares) await vincularGrupo(p.clienteId, p.chatId);
    },
    onSettled: () => qc.invalidateQueries({ queryKey: ['clientes'] }),
  });
}

export function useEnviarMensagemCliente() {
  return useMutation({
    mutationFn: (p: { clienteId: string; texto: string }) => enviarMensagem(p.clienteId, p.texto),
  });
}
