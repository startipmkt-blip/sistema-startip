// =============================================================
// cs-publico — página pública de CS do cliente (/cs/:slug)
// =============================================================
// GET  /?slug=...                      → cliente + perguntas
// POST / { slug, tipo, respostas }     → grava e avisa o grupo interno
// Sem JWT: a validação é o slug (cs_links), que tem sufixo aleatório.
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
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
};
function json(o: unknown, status = 200) {
  return new Response(JSON.stringify(o), { status, headers: { ...CORS, 'content-type': 'application/json' } });
}

interface Pergunta { id: string; label: string; ajuda?: string }

const PERGUNTAS: Record<string, { titulo: string; perguntas: Pergunta[] }> = {
  semanal: {
    titulo: 'Feedback da semana',
    perguntas: [
      { id: 'dificuldades', label: 'Quais foram as maiores dificuldades da semana?' },
      { id: 'percepcao', label: 'O que você notou essa semana nos anúncios e no seu negócio?' },
      {
        id: 'necessidade',
        label: 'Tem alguma necessidade para os próximos dias?',
        ajuda: 'Ex.: um evento chegando, um material novo, uma promoção.',
      },
    ],
  },
};

const MAX_RESPOSTA = 2000;
// O POST dispara mensagem no grupo interno; o teto evita que alguém com o
// link use o formulário para inundar o grupo.
const MAX_POR_DIA = 5;

async function avisarGrupo(chatId: string, texto: string): Promise<void> {
  if (!chatId || !ZAPI_INSTANCE_ID || !ZAPI_TOKEN) return;
  try {
    await fetch(`https://api.z-api.io/instances/${ZAPI_INSTANCE_ID}/token/${ZAPI_TOKEN}/send-text`, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        ...(ZAPI_CLIENT_TOKEN ? { 'Client-Token': ZAPI_CLIENT_TOKEN } : {}),
      },
      body: JSON.stringify({ phone: chatId, message: texto }),
    });
  } catch {
    // A resposta do cliente já está gravada; falha no aviso não deve virar erro para ele.
  }
}

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS });
  const sb = createClient(SUPABASE_URL, SERVICE_ROLE, { auth: { persistSession: false } });

  async function clienteDoSlug(slug: string): Promise<{ id: string; nome: string; logo_url: string | null } | null> {
    if (!slug) return null;
    const { data } = await sb
      .from('cs_links')
      .select('clientes(id, nome, logo_url)')
      .eq('slug', slug.toLowerCase())
      .maybeSingle();
    return ((data as any)?.clientes as any) ?? null;
  }

  if (req.method === 'GET') {
    const url = new URL(req.url);
    const tipo = url.searchParams.get('tipo') ?? 'semanal';
    const form = PERGUNTAS[tipo];
    const cli = await clienteDoSlug(url.searchParams.get('slug') ?? '');
    if (!cli || !form) return json({ error: 'link inválido' }, 404);
    return json({
      cliente: { nome: cli.nome, logo_url: cli.logo_url || null },
      tipo, titulo: form.titulo, perguntas: form.perguntas,
    });
  }

  if (req.method === 'POST') {
    const body = await req.json().catch(() => ({}));
    const { slug, tipo = 'semanal', respostas } = body as {
      slug?: string; tipo?: string; respostas?: Record<string, unknown>;
    };
    const form = PERGUNTAS[tipo];
    const cli = await clienteDoSlug(slug ?? '');
    if (!cli || !form) return json({ error: 'link inválido' }, 404);

    const itens = form.perguntas
      .map((p) => ({
        pergunta: p.label,
        resposta: String(respostas?.[p.id] ?? '').trim().slice(0, MAX_RESPOSTA),
      }))
      .filter((i) => i.resposta);
    if (itens.length === 0) return json({ error: 'Preencha ao menos uma resposta.' }, 400);

    const desde = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
    const { count } = await sb
      .from('cs_respostas')
      .select('id', { count: 'exact', head: true })
      .eq('cliente_id', cli.id)
      .gte('created_at', desde);
    if ((count ?? 0) >= MAX_POR_DIA) {
      return json({ error: 'Já recebemos suas respostas de hoje. Obrigado!' }, 429);
    }

    const { error } = await sb.from('cs_respostas').insert({ cliente_id: cli.id, tipo, respostas: itens });
    if (error) return json({ error: 'Não foi possível salvar. Tente novamente.' }, 500);

    const { data: cfg } = await sb.from('cs_config').select('grupo_avisos_chat_id').eq('id', 1).maybeSingle();
    const linhas = itens.map((i) => `*${i.pergunta}*\n${i.resposta.slice(0, 600)}`).join('\n\n');
    await avisarGrupo(
      (cfg as any)?.grupo_avisos_chat_id ?? '',
      `*${cli.nome}* respondeu o ${form.titulo.toLowerCase()}.\n\n${linhas}`,
    );

    return json({ ok: true });
  }

  return new Response('Method Not Allowed', { status: 405, headers: CORS });
});
