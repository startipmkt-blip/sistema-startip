// =============================================================
// marketplace-publico — GET /?categoria=base|beneficios
// =============================================================
// Vitrine pública dos clientes que publicaram no Marketplace.
// Retorna perfis publicados + seus produtos ativos.
// =============================================================

// deno-lint-ignore-file no-explicit-any
import { serve } from 'https://deno.land/std@0.224.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.4';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL') ?? '';
const SERVICE_ROLE = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
};

function json(o: unknown, status = 200) {
  return new Response(JSON.stringify(o), {
    status, headers: { ...CORS, 'content-type': 'application/json' },
  });
}

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS });
  if (req.method !== 'GET') return new Response('Method Not Allowed', { status: 405, headers: CORS });

  const url = new URL(req.url);
  const categoria = url.searchParams.get('categoria');

  const sb = createClient(SUPABASE_URL, SERVICE_ROLE, { auth: { persistSession: false } });

  let perfilQuery = sb.from('marketplace_perfis')
    .select('cliente_id, categoria, segmento, logo_url, whatsapp, instagram, clientes(nome)')
    .eq('publicado', true);
  if (categoria === 'base' || categoria === 'beneficios') {
    perfilQuery = perfilQuery.eq('categoria', categoria);
  }
  const { data: perfis, error } = await perfilQuery;
  if (error) return json({ error: error.message }, 500);

  const ids = (perfis ?? []).map((p: any) => p.cliente_id);
  const produtosMap = new Map<string, any[]>();
  if (ids.length > 0) {
    const { data: produtos } = await sb.from('marketplace_produtos')
      .select('id, cliente_id, titulo, descricao, preco_brl, desconto_texto, imagem_url, ordem')
      .in('cliente_id', ids)
      .eq('ativo', true)
      .order('ordem');
    (produtos ?? []).forEach((p: any) => {
      const arr = produtosMap.get(p.cliente_id) ?? [];
      arr.push(p);
      produtosMap.set(p.cliente_id, arr);
    });
  }

  const empresas = (perfis ?? []).map((p: any) => ({
    cliente_id: p.cliente_id,
    nome: p.clientes?.nome ?? '—',
    categoria: p.categoria,
    segmento: p.segmento,
    logo_url: p.logo_url,
    whatsapp: p.whatsapp,
    instagram: p.instagram,
    produtos: produtosMap.get(p.cliente_id) ?? [],
  }));

  return json({ empresas });
});
