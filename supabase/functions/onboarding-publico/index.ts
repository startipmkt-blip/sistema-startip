// =============================================================
// onboarding-publico — GET /?slug=... | POST { slug, dados }
// =============================================================
// Endpoint público (sem JWT) para o formulário /cadastro/:slug.
// GET valida o slug e devolve o mínimo (título, se existe cliente pré,
// se expirou). POST grava dados em onboarding_forms.
// Nunca escreve direto em `clientes` — a equipe revisa e materializa.
// =============================================================

// deno-lint-ignore-file no-explicit-any
import { serve } from 'https://deno.land/std@0.224.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.4';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL') ?? '';
const SERVICE_ROLE = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
};

function json(obj: unknown, status = 200) {
  return new Response(JSON.stringify(obj), {
    status,
    headers: { ...CORS, 'content-type': 'application/json' },
  });
}

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS });
  const sb = createClient(SUPABASE_URL, SERVICE_ROLE, { auth: { persistSession: false } });

  if (req.method === 'GET') {
    const url = new URL(req.url);
    const slug = url.searchParams.get('slug') ?? '';
    if (!slug) return json({ error: 'slug obrigatório' }, 400);
    const { data, error } = await sb
      .from('onboarding_forms')
      .select('id, slug, status, expira_em, preenchido_em, cliente_id, dados')
      .eq('slug', slug)
      .maybeSingle();
    if (error) return json({ error: error.message }, 500);
    if (!data) return json({ error: 'link inválido' }, 404);
    const expirado = data.expira_em ? new Date(data.expira_em).getTime() < Date.now() : false;
    if (expirado) return json({ error: 'link expirou' }, 410);
    return json({
      slug: data.slug,
      status: data.status,
      preenchido: !!data.preenchido_em,
      dados: data.dados ?? {},
    });
  }

  if (req.method === 'POST') {
    let body: any;
    try { body = await req.json(); } catch { return json({ error: 'body inválido' }, 400); }
    const slug = String(body?.slug ?? '');
    const dados = body?.dados;
    if (!slug || !dados || typeof dados !== 'object') {
      return json({ error: 'slug e dados obrigatórios' }, 400);
    }
    const { data: form, error: fErr } = await sb
      .from('onboarding_forms')
      .select('id, status, expira_em')
      .eq('slug', slug)
      .maybeSingle();
    if (fErr) return json({ error: fErr.message }, 500);
    if (!form) return json({ error: 'link inválido' }, 404);
    const expirado = form.expira_em ? new Date(form.expira_em).getTime() < Date.now() : false;
    if (expirado) return json({ error: 'link expirou' }, 410);

    const { error: uErr } = await sb
      .from('onboarding_forms')
      .update({
        dados,
        status: 'preenchido',
        preenchido_em: new Date().toISOString(),
      })
      .eq('id', form.id);
    if (uErr) return json({ error: uErr.message }, 500);
    return json({ ok: true });
  }

  return new Response('Method Not Allowed', { status: 405, headers: CORS });
});
