// =============================================================
// aprovacao-publica — portal do cliente para aprovar conteúdos
// =============================================================
// GET  /?slug=<central_slug>&mes=YYYY-MM  → cliente + ideias do mês
// POST /  { slug, id, status, justificativa } → registra decisão
// Sem JWT. A validação é o slug do cliente + o vínculo id→cliente.
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

function json(o: unknown, status = 200) {
  return new Response(JSON.stringify(o), {
    status, headers: { ...CORS, 'content-type': 'application/json' },
  });
}

function mesAtual(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS });
  const sb = createClient(SUPABASE_URL, SERVICE_ROLE, { auth: { persistSession: false } });

  if (req.method === 'GET') {
    const url = new URL(req.url);
    const slug = url.searchParams.get('slug') ?? '';
    const mes = url.searchParams.get('mes') ?? mesAtual();
    if (!slug) return json({ error: 'slug obrigatório' }, 400);

    const { data: cli } = await sb
      .from('clientes')
      .select('id, nome, logo_url')
      .eq('central_slug', slug)
      .maybeSingle();
    if (!cli) return json({ error: 'link inválido' }, 404);

    const { data: ideias } = await sb
      .from('conteudo_aprovacao')
      .select('id, titulo, descricao, formato, semana, dia_postagem, status, justificativa, mes_referencia')
      .eq('cliente_id', (cli as any).id)
      .eq('mes_referencia', mes)
      .order('semana', { ascending: true })
      .order('created_at', { ascending: true });

    // meses disponíveis (para o cliente navegar)
    const { data: meses } = await sb
      .from('conteudo_aprovacao')
      .select('mes_referencia')
      .eq('cliente_id', (cli as any).id);
    const mesesUnicos = [...new Set((meses ?? []).map((m: any) => m.mes_referencia))]
      .sort((a: string, b: string) => b.localeCompare(a));

    return json({ cliente: cli, mes, meses: mesesUnicos, ideias: ideias ?? [] });
  }

  if (req.method === 'POST') {
    const body = await req.json().catch(() => ({}));
    const { slug, id, status, justificativa } = body as {
      slug?: string; id?: string; status?: string; justificativa?: string;
    };
    if (!slug || !id || !status) return json({ error: 'parâmetros faltando' }, 400);
    if (status !== 'aprovado' && status !== 'reprovado') return json({ error: 'status inválido' }, 400);
    if (status === 'reprovado' && !justificativa?.trim()) {
      return json({ error: 'justificativa obrigatória para reprovar' }, 400);
    }

    const { data: cli } = await sb.from('clientes').select('id').eq('central_slug', slug).maybeSingle();
    if (!cli) return json({ error: 'link inválido' }, 404);

    // valida que a ideia pertence ao cliente do slug
    const { data: ideia } = await sb
      .from('conteudo_aprovacao')
      .select('id, cliente_id')
      .eq('id', id)
      .maybeSingle();
    if (!ideia || (ideia as any).cliente_id !== (cli as any).id) {
      return json({ error: 'ideia não pertence a este cliente' }, 403);
    }

    const { error } = await sb
      .from('conteudo_aprovacao')
      .update({ status, justificativa: justificativa ?? '' } as any)
      .eq('id', id);
    if (error) return json({ error: error.message }, 500);

    return json({ ok: true });
  }

  return new Response('Method Not Allowed', { status: 405, headers: CORS });
});
