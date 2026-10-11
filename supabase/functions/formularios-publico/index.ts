// =============================================================
// formularios-publico — GET /?slug=... | POST { slug, respostas }
// =============================================================
// Endpoint público (sem JWT) para /formulario/:slug.
// GET devolve título + perguntas + se já preenchido.
// POST grava respostas e dispara (fire-and-forget) a notificação
// interna (Gmail + grupo WhatsApp da equipe).
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
    const slug = new URL(req.url).searchParams.get('slug') ?? '';
    if (!slug) return json({ error: 'slug obrigatório' }, 400);

    const { data, error } = await sb
      .from('formularios')
      .select('id, slug, titulo, tipo, status, perguntas, respostas, expira_em, preenchido_em')
      .eq('slug', slug)
      .maybeSingle();
    if (error) return json({ error: error.message }, 500);
    if (!data) return json({ error: 'link inválido' }, 404);

    const expirado = data.expira_em ? new Date(data.expira_em).getTime() < Date.now() : false;
    if (expirado) return json({ error: 'link expirou' }, 410);

    return json({
      slug: data.slug,
      titulo: data.titulo,
      tipo: data.tipo,
      perguntas: data.perguntas,
      preenchido: !!data.preenchido_em,
    });
  }

  if (req.method === 'POST') {
    let body: any;
    try { body = await req.json(); } catch { return json({ error: 'body inválido' }, 400); }
    const slug = String(body?.slug ?? '');
    const respostas = body?.respostas;
    if (!slug || !respostas || typeof respostas !== 'object') {
      return json({ error: 'slug e respostas obrigatórios' }, 400);
    }

    const { data: form, error: fErr } = await sb
      .from('formularios')
      .select('id, status, expira_em, perguntas, preenchido_em')
      .eq('slug', slug)
      .maybeSingle();
    if (fErr) return json({ error: fErr.message }, 500);
    if (!form) return json({ error: 'link inválido' }, 404);
    if (form.preenchido_em) return json({ error: 'formulário já preenchido' }, 409);

    const expirado = form.expira_em ? new Date(form.expira_em).getTime() < Date.now() : false;
    if (expirado) return json({ error: 'link expirou' }, 410);

    // Valida obrigatórias
    const perguntas = (form.perguntas as Array<{ id: string; label: string; obrigatoria?: boolean }>) ?? [];
    for (const p of perguntas) {
      if (p.obrigatoria && !String(respostas[p.id] ?? '').trim()) {
        return json({ error: `Pergunta obrigatória não respondida: ${p.label}` }, 400);
      }
    }

    const { error: uErr } = await sb
      .from('formularios')
      .update({
        respostas,
        status: 'preenchido',
        preenchido_em: new Date().toISOString(),
      })
      .eq('id', form.id);
    if (uErr) return json({ error: uErr.message }, 500);

    // Fire-and-forget: dispara notificação interna (Gmail + grupo equipe)
    try {
      fetch(`${SUPABASE_URL}/functions/v1/formulario-notificar`, {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          authorization: `Bearer ${SERVICE_ROLE}`,
        },
        body: JSON.stringify({ formulario_id: form.id }),
      }).catch(() => { /* ignore */ });
    } catch { /* ignore */ }

    return json({ ok: true });
  }

  return json({ error: 'método não permitido' }, 405);
});
