import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/shared/lib/supabaseClient';
import { IS_DEMO } from '@/shared/lib/env';
import { MSG_SEMANAL_PADRAO } from '@/modules/cs-clientes/lib/mensagens';

export type CsTipo = 'semanal' | 'nps';

export interface CsConfig {
  grupo_avisos_chat_id: string | null;
  msg_semanal: string;
}

export interface CsResposta {
  id: string;
  cliente_id: string;
  tipo: CsTipo;
  respostas: Array<{ pergunta: string; resposta: string }>;
  nota: number | null;
  created_at: string;
}

export interface CsEnvio {
  cliente_id: string;
  tipo: CsTipo;
  enviado_em: string;
}

// ---------- Stores demo (mutáveis) ----------
const demoConfig: CsConfig = { grupo_avisos_chat_id: '120363000000000003-group', msg_semanal: MSG_SEMANAL_PADRAO };
const demoLinks: Record<string, string> = { c1: 'padaria-do-bairro-a1b2c3', c2: 'loja-online-xyz-d4e5f6' };
const demoEnvios: CsEnvio[] = [];
const demoRespostas: CsResposta[] = [
  {
    id: 'r1', cliente_id: 'c1', tipo: 'semanal', nota: null, created_at: '2026-10-09T18:00:00Z',
    respostas: [
      { pergunta: 'Quais foram as maiores dificuldades da semana?', resposta: 'Faltou tempo para gravar os stories.' },
      { pergunta: 'Tem alguma necessidade para os próximos dias?', resposta: 'Material para a promoção de sábado.' },
    ],
  },
];

const keys = {
  config: ['cs-clientes', 'config'] as const,
  links: ['cs-clientes', 'links'] as const,
  respostas: ['cs-clientes', 'respostas'] as const,
  envios: ['cs-clientes', 'envios'] as const,
};

async function fetchConfig(): Promise<CsConfig> {
  if (IS_DEMO) return { ...demoConfig };
  const { data, error } = await supabase.from('cs_config').select('grupo_avisos_chat_id, msg_semanal').eq('id', 1).maybeSingle();
  if (error) throw error;
  return (data as CsConfig | null) ?? { grupo_avisos_chat_id: null, msg_semanal: MSG_SEMANAL_PADRAO };
}

async function salvarConfig(patch: Partial<CsConfig>): Promise<void> {
  if (IS_DEMO) { Object.assign(demoConfig, patch); return; }
  const { error } = await supabase
    .from('cs_config')
    .update({ ...patch, updated_at: new Date().toISOString() } as never)
    .eq('id', 1);
  if (error) throw error;
}

/** Mapa cliente_id → slug do link público. Cria os que faltam antes de ler. */
async function fetchLinks(): Promise<Record<string, string>> {
  if (IS_DEMO) return { ...demoLinks };
  const { error: eRpc } = await supabase.rpc('cs_garantir_links' as never);
  if (eRpc) throw eRpc;
  const { data, error } = await supabase.from('cs_links').select('cliente_id, slug');
  if (error) throw error;
  return Object.fromEntries(((data ?? []) as Array<{ cliente_id: string; slug: string }>).map((l) => [l.cliente_id, l.slug]));
}

async function fetchRespostas(): Promise<CsResposta[]> {
  if (IS_DEMO) return demoRespostas.map((r) => ({ ...r }));
  const { data, error } = await supabase
    .from('cs_respostas')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(500);
  if (error) throw error;
  return (data ?? []) as CsResposta[];
}

async function fetchEnvios(): Promise<CsEnvio[]> {
  if (IS_DEMO) return demoEnvios.map((e) => ({ ...e }));
  const desde = new Date(Date.now() - 45 * 24 * 60 * 60 * 1000).toISOString();
  const { data, error } = await supabase
    .from('cs_envios')
    .select('cliente_id, tipo, enviado_em')
    .gte('enviado_em', desde)
    .order('enviado_em', { ascending: false });
  if (error) throw error;
  return (data ?? []) as CsEnvio[];
}

/** Envia o texto no grupo do cliente e registra o disparo. */
export async function enviarCs(clienteId: string, tipo: CsTipo, texto: string): Promise<void> {
  if (IS_DEMO) {
    demoEnvios.unshift({ cliente_id: clienteId, tipo, enviado_em: new Date().toISOString() });
    return;
  }
  const { error } = await supabase.functions.invoke('enviar-aviso-whatsapp', {
    body: { cliente_id: clienteId, texto },
  });
  if (error) {
    const e = error as { message?: string; context?: Response };
    let detalhe: string | undefined;
    try { detalhe = (await e.context?.json())?.error; } catch { /* usa a mensagem genérica */ }
    throw new Error(detalhe ?? e.message ?? 'Falha ao enviar o WhatsApp.');
  }
  // O envio já aconteceu: falha ao registrar não pode virar "erro de envio".
  await supabase.from('cs_envios').insert({ cliente_id: clienteId, tipo } as never);
}

export function useCsConfig() {
  return useQuery({ queryKey: keys.config, queryFn: fetchConfig });
}

export function useSalvarCsConfig() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: salvarConfig,
    onSuccess: () => qc.invalidateQueries({ queryKey: keys.config }),
  });
}

export function useCsLinks() {
  return useQuery({ queryKey: keys.links, queryFn: fetchLinks, staleTime: 5 * 60_000 });
}

export function useCsRespostas() {
  return useQuery({ queryKey: keys.respostas, queryFn: fetchRespostas, refetchInterval: 60_000 });
}

export function useCsEnvios() {
  return useQuery({ queryKey: keys.envios, queryFn: fetchEnvios });
}

export function useEnviarCs() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (p: { clienteId: string; tipo: CsTipo; texto: string }) => enviarCs(p.clienteId, p.tipo, p.texto),
    onSettled: () => qc.invalidateQueries({ queryKey: keys.envios }),
  });
}

export function useInvalidarEnvios() {
  const qc = useQueryClient();
  return () => qc.invalidateQueries({ queryKey: keys.envios });
}
