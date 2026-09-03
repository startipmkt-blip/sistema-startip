// =============================================================
// enviar-telegram — POST { cliente_id, texto } → envia via bot pro chat
// do cliente. Requer secret TELEGRAM_BOT_TOKEN configurada no Supabase.
// =============================================================

// deno-lint-ignore-file no-explicit-any
import { serve } from 'https://deno.land/std@0.224.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.4';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL') ?? '';
const SERVICE_ROLE = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
const BOT_TOKEN    = Deno.env.get('TELEGRAM_BOT_TOKEN') ?? '';

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
  if (!BOT_TOKEN) return json({ error: 'TELEGRAM_BOT_TOKEN não configurado' }, 500);

  const body = await req.json().catch(() => ({}));
  const { cliente_id, texto } = body as { cliente_id?: string; texto?: string };
  if (!cliente_id || !texto?.trim()) return json({ error: 'cliente_id e texto obrigatórios' }, 400);

  const sb = createClient(SUPABASE_URL, SERVICE_ROLE, { auth: { persistSession: false } });
  const { data: cli } = await sb.from('clientes').select('telegram_chat_id, nome').eq('id', cliente_id).maybeSingle();
  const chatId = (cli as any)?.telegram_chat_id;
  if (!chatId) return json({ error: 'Cliente sem telegram_chat_id cadastrado' }, 400);

  const url = `https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`;
  const resp = await fetch(url, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({
      chat_id: chatId,
      text: texto,
      parse_mode: 'HTML',
      disable_web_page_preview: true,
    }),
  });
  const rBody = await resp.json().catch(() => ({}));
  if (!resp.ok || !rBody.ok) return json({ error: rBody?.description ?? 'falha telegram', raw: rBody }, 500);

  return json({ ok: true, message_id: rBody.result?.message_id });
});
