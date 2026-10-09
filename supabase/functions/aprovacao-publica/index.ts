// =============================================================
// aprovacao-publica — portal do cliente para aprovar conteúdos
// =============================================================
// GET  /?slug=<central_slug>&mes=YYYY-MM  → cliente + ideias do mês
// POST /  { slug, id, status, justificativa } → registra decisão
// POST /  { slug, mes, acao: 'aprovar_todos' } → aprova todos os pendentes do mês
// Sem JWT. A validação é o slug do cliente + o vínculo id→cliente.
// =============================================================

// deno-lint-ignore-file no-explicit-any
import { serve } from 'https://deno.land/std@0.224.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.4';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL') ?? '';
const SERVICE_ROLE = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
const ZAPI_INSTANCE_ID  = Deno.env.get('ZAPI_INSTANCE_ID') ?? '';
const ZAPI_TOKEN        = Deno.env.get('ZAPI_TOKEN') ?? '';
const ZAPI_CLIENT_TOKEN = Deno.env.get('ZAPI_CLIENT_TOKEN') ?? '';

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

// Aviso interno de reprovação: nunca pode derrubar a decisão do cliente.
async function avisarEquipe(sb: any, texto: string): Promise<void> {
  try {
    const { data: cfg } = await sb.from('gestao_conteudo_config').select('*').limit(1).maybeSingle();
    const chat = cfg?.whatsapp_equipe?.trim();
    if (!cfg?.avisar_reprovacao || !chat) return;
    await fetch(`https://api.z-api.io/instances/${ZAPI_INSTANCE_ID}/token/${ZAPI_TOKEN}/send-text`, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        ...(ZAPI_CLIENT_TOKEN ? { 'Client-Token': ZAPI_CLIENT_TOKEN } : {}),
      },
      body: JSON.stringify({ phone: chat, message: texto }),
    });
  } catch (_e) { /* best effort */ }
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
      .select('id, titulo, descricao, formato, semana, dia_postagem, status, justificativa, mes_referencia, link_drive, etapa')
      .eq('cliente_id', (cli as any).id)
      .eq('mes_referencia', mes)
      .neq('visivel_cliente', false) // rascunhos internos nunca aparecem para o cliente
      .order('semana', { ascending: true })
      .order('created_at', { ascending: true });

    // meses disponíveis (para o cliente navegar)
    const { data: meses } = await sb
      .from('conteudo_aprovacao')
      .select('mes_referencia')
      .eq('cliente_id', (cli as any).id)
      .neq('visivel_cliente', false);
    const mesesUnicos = [...new Set((meses ?? []).map((m: any) => m.mes_referencia))]
      .sort((a: string, b: string) => b.localeCompare(a));

    return json({ cliente: cli, mes, meses: mesesUnicos, ideias: ideias ?? [] });
  }

  if (req.method === 'POST') {
    const body = await req.json().catch(() => ({}));
    const { slug, id, status, justificativa, acao, mes } = body as {
      slug?: string; id?: string; status?: string; justificativa?: string;
      acao?: string; mes?: string;
    };

    // Aprovar todos os pendentes de um mês de uma vez
    if (acao === 'aprovar_todos') {
      if (!slug || !mes) return json({ error: 'parâmetros faltando' }, 400);
      const { data: cli } = await sb.from('clientes').select('id, nome').eq('central_slug', slug).maybeSingle();
      if (!cli) return json({ error: 'link inválido' }, 404);
      const { data: atualizados, error } = await sb
        .from('conteudo_aprovacao')
        .update({ status: 'aprovado', justificativa: '' } as any)
        .eq('cliente_id', (cli as any).id)
        .eq('mes_referencia', mes)
        .eq('status', 'pendente')
        .neq('visivel_cliente', false)
        .select('id');
      if (error) return json({ error: error.message }, 500);
      return json({ ok: true, aprovados: (atualizados ?? []).length });
    }

    if (!slug || !id || !status) return json({ error: 'parâmetros faltando' }, 400);
    if (status !== 'aprovado' && status !== 'reprovado') return json({ error: 'status inválido' }, 400);
    if (status === 'reprovado' && !justificativa?.trim()) {
      return json({ error: 'justificativa obrigatória para reprovar' }, 400);
    }

    const { data: cli } = await sb.from('clientes').select('id, nome').eq('central_slug', slug).maybeSingle();
    if (!cli) return json({ error: 'link inválido' }, 404);

    // valida que a ideia pertence ao cliente do slug
    const { data: ideia } = await sb
      .from('conteudo_aprovacao')
      .select('id, cliente_id, visivel_cliente, titulo, mes_referencia')
      .eq('id', id)
      .maybeSingle();
    if (!ideia || (ideia as any).cliente_id !== (cli as any).id || (ideia as any).visivel_cliente === false) {
      return json({ error: 'ideia não pertence a este cliente' }, 403);
    }

    const { error } = await sb
      .from('conteudo_aprovacao')
      .update({ status, justificativa: justificativa ?? '' } as any)
      .eq('id', id);
    if (error) return json({ error: error.message }, 500);

    if (status === 'reprovado') {
      await avisarEquipe(
        sb,
        `❌ ${(cli as any).nome} não aprovou "${(ideia as any).titulo}" (${(ideia as any).mes_referencia}).\n\n` +
        `Alteração pedida: ${justificativa}`,
      );
    }

    return json({ ok: true });
  }

  return new Response('Method Not Allowed', { status: 405, headers: CORS });
});
