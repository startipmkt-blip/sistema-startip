// =============================================================
// alertas-api — ações do painel STARTIP ALERTAS que precisam da Z-API.
// =============================================================
// POST { acao: 'sincronizar_grupos' }  → lista os grupos da Z-API e cataloga
//                                        (monitorar nasce DESLIGADO).
// POST { acao: 'testar_envio' }        → manda uma mensagem de teste ao grupo
//                                        interno configurado.
// Exige usuário autenticado da equipe.

// deno-lint-ignore-file no-explicit-any
import { serve } from 'https://deno.land/std@0.224.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.4';

const SUPABASE_URL      = Deno.env.get('SUPABASE_URL') ?? '';
const ANON_KEY          = Deno.env.get('SUPABASE_ANON_KEY') ?? '';
const SERVICE_ROLE      = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
const ZAPI_INSTANCE_ID  = Deno.env.get('ZAPI_INSTANCE_ID') ?? '';
const ZAPI_TOKEN        = Deno.env.get('ZAPI_TOKEN') ?? '';
const ZAPI_CLIENT_TOKEN = Deno.env.get('ZAPI_CLIENT_TOKEN') ?? '';

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};
const json = (o: unknown, s = 200) =>
  new Response(JSON.stringify(o), { status: s, headers: { ...CORS, 'content-type': 'application/json' } });

const base = () => `https://api.z-api.io/instances/${ZAPI_INSTANCE_ID}/token/${ZAPI_TOKEN}`;
const zh = (): Record<string, string> =>
  ZAPI_CLIENT_TOKEN
    ? { 'Client-Token': ZAPI_CLIENT_TOKEN, 'content-type': 'application/json' }
    : { 'content-type': 'application/json' };

// Tenta /groups e cai para /chats — o formato varia entre instâncias.
async function listarGrupos(): Promise<{ chat_id: string; nome: string | null }[]> {
  const achados = new Map<string, string | null>();
  for (const rota of ['groups', 'chats']) {
    for (let page = 1; page <= 30; page++) {
      const r = await fetch(`${base()}/${rota}?page=${page}&pageSize=100`, { headers: zh() });
      if (!r.ok) break;
      const lista = await r.json().catch(() => []);
      if (!Array.isArray(lista) || lista.length === 0) break;
      for (const it of lista as any[]) {
        const phone = String(it?.phone ?? it?.id ?? '');
        const ehGrupo = it?.isGroup === true || phone.includes('-group') || phone.endsWith('@g.us') || /^\d+-\d+$/.test(phone);
        if (!phone || !ehGrupo) continue;
        achados.set(phone, it?.name ?? it?.subject ?? null);
      }
      if (lista.length < 100) break;
    }
    if (achados.size > 0) break;
  }
  return [...achados].map(([chat_id, nome]) => ({ chat_id, nome }));
}

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS });
  if (req.method !== 'POST') return new Response('Method Not Allowed', { status: 405, headers: CORS });

  const auth = req.headers.get('Authorization');
  if (!auth) return json({ erro: 'não autenticado' }, 401);
  const sbUser = createClient(SUPABASE_URL, ANON_KEY, { global: { headers: { Authorization: auth } } });
  const { data: u } = await sbUser.auth.getUser();
  if (!u?.user) return json({ erro: 'não autenticado' }, 401);
  const { data: ehEquipe } = await sbUser.rpc('is_equipe');
  if (ehEquipe !== true) return json({ erro: 'acesso restrito à equipe' }, 403);

  let body: any = {};
  try { body = await req.json(); } catch { /* corpo vazio */ }
  const sb = createClient(SUPABASE_URL, SERVICE_ROLE, { auth: { persistSession: false } });

  if (body?.acao === 'sincronizar_grupos') {
    if (!ZAPI_INSTANCE_ID || !ZAPI_TOKEN) return json({ erro: 'credenciais Z-API ausentes' }, 500);
    const grupos = await listarGrupos();
    if (grupos.length === 0) return json({ ok: true, total: 0, aviso: 'Nenhum grupo retornado pela Z-API.' });
    const { error } = await sb.from('alertas_grupos').upsert(
      grupos.map((g) => ({ chat_id: g.chat_id, nome_grupo: g.nome })),
      { onConflict: 'chat_id' },
    );
    if (error) return json({ erro: error.message }, 500);
    return json({ ok: true, total: grupos.length });
  }

  if (body?.acao === 'testar_envio') {
    const { data: cfg } = await sb.from('alertas_config').select('grupo_interno_id').eq('id', true).maybeSingle();
    if (!cfg?.grupo_interno_id) return json({ erro: 'Selecione o grupo interno primeiro.' }, 400);
    const r = await fetch(`${base()}/send-text`, {
      method: 'POST', headers: zh(),
      body: JSON.stringify({
        phone: cfg.grupo_interno_id,
        message: '✅ STARTIP ALERTAS: teste de conexão. Os alertas de atendimento chegarão neste grupo.',
      }),
    });
    if (!r.ok) return json({ erro: `Z-API respondeu ${r.status}` }, 502);
    await sb.from('alertas_log').insert({ tipo: 'teste_envio', usuario_id: u.user.id });
    return json({ ok: true });
  }

  return json({ erro: 'ação desconhecida' }, 400);
});
