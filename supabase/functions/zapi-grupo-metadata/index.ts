// =============================================================
// zapi-grupo-metadata — busca membros de um grupo WhatsApp via Z-API e
// cacheia em crm_grupo_participantes.
// =============================================================
// POST { leadId: uuid, refresh?: boolean }
//   - Lê o lead (precisa is_grupo=true) e usa telefone como groupId.
//   - Se refresh=true, chama a Z-API. Se não, retorna cache.
//   - Cache stale (> 6h) sempre revalida.

// deno-lint-ignore-file no-explicit-any
import { serve } from 'https://deno.land/std@0.224.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.4';

const ZAPI_INSTANCE_ID = Deno.env.get('ZAPI_INSTANCE_ID') ?? '';
const ZAPI_TOKEN       = Deno.env.get('ZAPI_TOKEN') ?? '';
const ZAPI_CLIENT_TOKEN = Deno.env.get('ZAPI_CLIENT_TOKEN') ?? '';
const SUPABASE_URL     = Deno.env.get('SUPABASE_URL') ?? '';
const ANON_KEY         = Deno.env.get('SUPABASE_ANON_KEY') ?? '';
const SERVICE_ROLE     = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

const STALE_MS = 6 * 60 * 60 * 1000;

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS });
  if (req.method !== 'POST')    return new Response('Method Not Allowed', { status: 405, headers: CORS });

  const auth = req.headers.get('Authorization');
  if (!auth) return new Response('Unauthorized', { status: 401, headers: CORS });

  const sbUser = createClient(SUPABASE_URL, ANON_KEY, {
    global: { headers: { Authorization: auth } },
  });
  const { data: user } = await sbUser.auth.getUser();
  if (!user?.user) return new Response('Unauthorized', { status: 401, headers: CORS });

  let body: any;
  try { body = await req.json(); }
  catch { return new Response('Bad Request', { status: 400, headers: CORS }); }

  const leadId: string | undefined = body?.leadId;
  const refresh: boolean = body?.refresh === true;
  if (!leadId) {
    return new Response(JSON.stringify({ error: 'leadId obrigatório' }), {
      status: 400, headers: { ...CORS, 'content-type': 'application/json' },
    });
  }

  const sb = createClient(SUPABASE_URL, SERVICE_ROLE, { auth: { persistSession: false } });

  const { data: lead, error: e0 } = await sb
    .from('crm_leads')
    .select('id, telefone, is_grupo, grupo_metadata_em, grupo_assunto, grupo_owner_telefone')
    .eq('id', leadId)
    .maybeSingle();
  if (e0 || !lead) {
    return new Response(JSON.stringify({ error: 'lead não encontrado' }), {
      status: 404, headers: { ...CORS, 'content-type': 'application/json' },
    });
  }
  if (!lead.is_grupo) {
    return new Response(JSON.stringify({ error: 'lead não é grupo' }), {
      status: 400, headers: { ...CORS, 'content-type': 'application/json' },
    });
  }

  const idadeMs = lead.grupo_metadata_em
    ? Date.now() - new Date(lead.grupo_metadata_em).getTime()
    : Infinity;
  const precisaBuscar = refresh || idadeMs > STALE_MS;

  if (precisaBuscar) {
    const url =
      `https://api.z-api.io/instances/${ZAPI_INSTANCE_ID}/token/${ZAPI_TOKEN}` +
      `/group-metadata/${encodeURIComponent(lead.telefone)}`;
    const headers: Record<string, string> = {};
    if (ZAPI_CLIENT_TOKEN) headers['Client-Token'] = ZAPI_CLIENT_TOKEN;

    const resp = await fetch(url, { method: 'GET', headers });
    if (!resp.ok) {
      const txt = await resp.text();
      return new Response(JSON.stringify({ error: 'zapi_erro', detalhe: txt }), {
        status: 502, headers: { ...CORS, 'content-type': 'application/json' },
      });
    }
    const meta: any = await resp.json();
    const participants: any[] = Array.isArray(meta?.participants) ? meta.participants : [];

    await sb.from('crm_leads').update({
      grupo_assunto: meta?.subject ?? lead.grupo_assunto ?? null,
      grupo_owner_telefone: meta?.owner ?? lead.grupo_owner_telefone ?? null,
      grupo_metadata_em: new Date().toISOString(),
    }).eq('id', leadId);

    const telsAtuais = participants
      .map((p) => String(p?.phone ?? '').trim())
      .filter(Boolean);

    if (telsAtuais.length > 0) {
      const linhas = participants.map((p) => ({
        lead_id: leadId,
        telefone: String(p?.phone ?? '').trim(),
        nome: p?.name ?? p?.short ?? null,
        is_admin: p?.isAdmin === true,
        is_super_admin: p?.isSuperAdmin === true,
        atualizado_em: new Date().toISOString(),
      })).filter((l) => l.telefone);

      await sb
        .from('crm_grupo_participantes')
        .upsert(linhas, { onConflict: 'lead_id,telefone' });

      await sb
        .from('crm_grupo_participantes')
        .delete()
        .eq('lead_id', leadId)
        .not('telefone', 'in', `(${telsAtuais.map((t) => `"${t}"`).join(',')})`);
    }
  }

  const { data: cache } = await sb
    .from('crm_grupo_participantes')
    .select('telefone, nome, is_admin, is_super_admin, atualizado_em')
    .eq('lead_id', leadId)
    .order('is_super_admin', { ascending: false })
    .order('is_admin', { ascending: false })
    .order('nome', { ascending: true, nullsFirst: false });

  const { data: leadPos } = await sb
    .from('crm_leads')
    .select('grupo_assunto, grupo_owner_telefone, grupo_metadata_em')
    .eq('id', leadId)
    .single();

  return new Response(JSON.stringify({
    ok: true,
    fresh: precisaBuscar,
    grupo: {
      assunto: leadPos?.grupo_assunto ?? null,
      owner: leadPos?.grupo_owner_telefone ?? null,
      atualizado_em: leadPos?.grupo_metadata_em ?? null,
    },
    participantes: cache ?? [],
    total: (cache ?? []).length,
  }), {
    status: 200, headers: { ...CORS, 'content-type': 'application/json' },
  });
});
