// =============================================================
// enviar-aviso-whatsapp — POST { cliente_id, texto }
// Envia mensagem via Z-API pro número/grupo do cliente
// (coluna clientes.whatsapp_chat_id).
// =============================================================

// deno-lint-ignore-file no-explicit-any
import { serve } from 'https://deno.land/std@0.224.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.4';

const SUPABASE_URL      = Deno.env.get('SUPABASE_URL') ?? '';
const SERVICE_ROLE      = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
const ZAPI_INSTANCE_ID  = Deno.env.get('ZAPI_INSTANCE_ID') ?? '';
const ZAPI_TOKEN        = Deno.env.get('ZAPI_TOKEN') ?? '';
const ZAPI_CLIENT_TOKEN = Deno.env.get('ZAPI_CLIENT_TOKEN') ?? '';

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};
function json(o: unknown, s = 200) {
  return new Response(JSON.stringify(o), { status: s, headers: { ...CORS, 'content-type': 'application/json' } });
}

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS });
  if (req.method !== 'POST') return new Response('Method Not Allowed', { status: 405, headers: CORS });

  const body = await req.json().catch(() => ({}));
  const { cliente_id, texto } = body as { cliente_id?: string; texto?: string };
  if (!cliente_id || !texto?.trim()) return json({ error: 'cliente_id e texto obrigatórios' }, 400);

  const sb = createClient(SUPABASE_URL, SERVICE_ROLE, { auth: { persistSession: false } });
  const { data: cli } = await sb.from('clientes').select('whatsapp_chat_id, nome').eq('id', cliente_id).maybeSingle();
  const chatId = (cli as any)?.whatsapp_chat_id;
  if (!chatId) return json({ error: 'Cliente sem whatsapp_chat_id cadastrado' }, 400);

  const url = `https://api.z-api.io/instances/${ZAPI_INSTANCE_ID}/token/${ZAPI_TOKEN}/send-text`;
  const resp = await fetch(url, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      ...(ZAPI_CLIENT_TOKEN ? { 'Client-Token': ZAPI_CLIENT_TOKEN } : {}),
    },
    body: JSON.stringify({ phone: chatId, message: texto }),
  });
  const rBody = await resp.json().catch(() => ({}));
  if (!resp.ok) return json({ error: rBody?.error ?? rBody?.message ?? 'falha z-api', raw: rBody }, 500);

  return json({ ok: true, id: rBody?.messageId ?? rBody?.zaapId });
});
