// =============================================================
// link-preview — Extrai metadados Open Graph de uma URL para renderizar
// no CRM como cartão de prévia (parecido com o do WhatsApp Web).
//
// POST { url: string, mensagem_id?: string }
//   - Faz GET com timeout, parseia <meta property="og:*"> e <title>.
//   - Se mensagem_id vier, salva o resultado em crm_mensagens.link_preview.
//   - Retorna sempre { ok: true, preview } (ou preview: null se falhar).
// =============================================================

// deno-lint-ignore-file no-explicit-any
import { serve } from 'https://deno.land/std@0.224.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.4';

const SUPABASE_URL   = Deno.env.get('SUPABASE_URL') ?? '';
const SERVICE_ROLE   = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
const ANON_KEY       = Deno.env.get('SUPABASE_ANON_KEY') ?? '';

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};
function json(o: unknown, s = 200) {
  return new Response(JSON.stringify(o), { status: s, headers: { ...CORS, 'content-type': 'application/json' } });
}

function extraiMeta(html: string, chave: string): string | null {
  // Aceita <meta property="og:xxx" content="..."> em qualquer ordem.
  const rx = new RegExp(`<meta[^>]+(?:property|name)=["']${chave}["'][^>]*content=["']([^"']+)["']`, 'i');
  const rx2 = new RegExp(`<meta[^>]+content=["']([^"']+)["'][^>]*(?:property|name)=["']${chave}["']`, 'i');
  return html.match(rx)?.[1] ?? html.match(rx2)?.[1] ?? null;
}
function extraiTitulo(html: string): string | null {
  return html.match(/<title[^>]*>([^<]+)<\/title>/i)?.[1]?.trim() ?? null;
}

async function fetchComTimeout(url: string, ms: number): Promise<string | null> {
  try {
    const ctrl = new AbortController();
    const t = setTimeout(() => ctrl.abort(), ms);
    const resp = await fetch(url, {
      redirect: 'follow',
      headers: { 'user-agent': 'StartipOS-LinkPreview/1.0 (+https://cerebro.agenciastartip.com.br)' },
      signal: ctrl.signal,
    });
    clearTimeout(t);
    if (!resp.ok) return null;
    // Só HTML — evita baixar mp4/jpeg gigantes.
    const ct = resp.headers.get('content-type') ?? '';
    if (!ct.includes('text/html') && !ct.includes('application/xhtml')) return null;
    // Lê no máximo 256 KB — mais que suficiente para <head>.
    const buf = new Uint8Array(await resp.arrayBuffer());
    return new TextDecoder().decode(buf.slice(0, 256 * 1024));
  } catch { return null; }
}

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS });
  if (req.method !== 'POST') return new Response('Method Not Allowed', { status: 405, headers: CORS });

  const auth = req.headers.get('Authorization');
  if (!auth) return new Response('Unauthorized', { status: 401, headers: CORS });
  const sbUser = createClient(SUPABASE_URL, ANON_KEY, { global: { headers: { Authorization: auth } } });
  const { data: userData } = await sbUser.auth.getUser();
  if (!userData?.user) return new Response('Unauthorized', { status: 401, headers: CORS });

  const body = await req.json().catch(() => ({}));
  const url: string = String(body?.url ?? '').trim();
  const mensagemId: string | null = body?.mensagem_id ?? null;
  if (!url || !/^https?:\/\//i.test(url)) return json({ ok: true, preview: null });

  const html = await fetchComTimeout(url, 6000);
  if (!html) return json({ ok: true, preview: null });

  const preview = {
    url,
    title: extraiMeta(html, 'og:title') ?? extraiTitulo(html),
    description: extraiMeta(html, 'og:description') ?? extraiMeta(html, 'description'),
    image: extraiMeta(html, 'og:image'),
    site_name: extraiMeta(html, 'og:site_name'),
  };

  if (mensagemId) {
    const sb = createClient(SUPABASE_URL, SERVICE_ROLE, { auth: { persistSession: false } });
    await sb.from('crm_mensagens').update({ link_preview: preview }).eq('id', mensagemId);
  }

  return json({ ok: true, preview });
});
