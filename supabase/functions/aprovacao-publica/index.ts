// =============================================================
// aprovacao-publica — portal do cliente para aprovar conteúdos
// =============================================================
// GET  /?slug=<central_slug>&mes=YYYY-MM  → cliente + ideias do mês
// POST /  { slug, id, status, justificativa } → registra decisão
// POST /  { slug, mes, acao: 'aprovar_todos' } → aprova todos os pendentes do mês
// IDEIAS (tabela ideias_conteudo) — mesmos verbos com tipo 'ideias':
// GET  /?slug&mes&tipo=ideias
// POST /  { tipo:'ideias', slug, id, status:'aprovada'|'reprovada', justificativa }
// POST /  { tipo:'ideias', slug, mes, acao:'aprovar_todos' }
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

const TIPO_DESIGNER: Record<string, string> = { reels: 'reels', carrossel: 'carrossel', estatico: 'post' };

// Reprovação do cliente → volta para "A fazer" no Designer, já com a justificativa.
// Nunca derruba a decisão do cliente.
async function devolverAoDesigner(sb: any, post: any, justificativa: string): Promise<void> {
  try {
    const motivo = { reprovado_justificativa: justificativa, reprovado_em: new Date().toISOString() };
    if (post.designer_demanda_id) {
      await sb.from('designer_demandas')
        .update({ status: 'a_fazer', concluido_em: null, ...motivo } as any)
        .eq('id', post.designer_demanda_id);
      return;
    }
    // Post criado direto na Gestão (sem demanda): abre uma demanda de ajuste para o designer.
    const { data: nova } = await sb.from('designer_demandas')
      .insert({
        cliente_id: post.cliente_id,
        titulo: `Ajuste: ${post.titulo}`,
        descricao: post.link_drive ? `Material reprovado: ${post.link_drive}` : null,
        tipo: TIPO_DESIGNER[post.formato] ?? 'post',
        status: 'a_fazer',
        origem: 'manual',
        post_id: post.id,
        ...motivo,
      } as any)
      .select('id')
      .maybeSingle();
    if (nova?.id) {
      await sb.from('conteudo_aprovacao').update({ designer_demanda_id: nova.id } as any).eq('id', post.id);
    }
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

    // Ideias de conteúdo (etapa anterior à produção) — página /aprovar-ideias/:slug
    if (url.searchParams.get('tipo') === 'ideias') {
      const { data: enviadas } = await sb
        .from('ideias_conteudo')
        .select('mes_referencia')
        .eq('cliente_id', (cli as any).id)
        .neq('status', 'rascunho');
      const mesesIdeias = [...new Set((enviadas ?? []).map((m: any) => m.mes_referencia))]
        .sort((a: string, b: string) => b.localeCompare(a));
      const mesAlvo = url.searchParams.get('mes') ?? (mesesIdeias[0] as string | undefined) ?? mesAtual();

      const { data: lista } = await sb
        .from('ideias_conteudo')
        .select('id, titulo, descricao, formato, semana, dia_postagem, status, justificativa, mes_referencia')
        .eq('cliente_id', (cli as any).id)
        .eq('mes_referencia', mesAlvo)
        .neq('status', 'rascunho') // rascunhos internos nunca aparecem para o cliente
        .order('semana', { ascending: true })
        .order('dia_postagem', { ascending: true, nullsFirst: false })
        .order('created_at', { ascending: true });

      return json({ cliente: cli, mes: mesAlvo, meses: mesesIdeias, ideias: lista ?? [] });
    }

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
    const { slug, id, status, justificativa, acao, mes, tipo } = body as {
      slug?: string; id?: string; status?: string; justificativa?: string;
      acao?: string; mes?: string; tipo?: string;
    };

    // ---- Ideias de conteúdo: aprovada | reprovada (reprovar exige justificativa) ----
    if (tipo === 'ideias') {
      if (!slug) return json({ error: 'parâmetros faltando' }, 400);
      const { data: cliI } = await sb.from('clientes').select('id, nome').eq('central_slug', slug).maybeSingle();
      if (!cliI) return json({ error: 'link inválido' }, 404);

      if (acao === 'aprovar_todos') {
        if (!mes) return json({ error: 'parâmetros faltando' }, 400);
        const { data: atualizadas, error } = await sb
          .from('ideias_conteudo')
          .update({ status: 'aprovada', justificativa: '' } as any)
          .eq('cliente_id', (cliI as any).id)
          .eq('mes_referencia', mes)
          .eq('status', 'enviada')
          .select('id');
        if (error) return json({ error: error.message }, 500);
        return json({ ok: true, aprovadas: (atualizadas ?? []).length });
      }

      if (!id || !status) return json({ error: 'parâmetros faltando' }, 400);
      if (status !== 'aprovada' && status !== 'reprovada') return json({ error: 'status inválido' }, 400);
      const just = (justificativa ?? '').trim().slice(0, 2000);
      if (status === 'reprovada' && !just) {
        return json({ error: 'justificativa obrigatória para reprovar' }, 400);
      }

      const { data: ideiaI } = await sb
        .from('ideias_conteudo')
        .select('id, cliente_id, status, titulo, mes_referencia')
        .eq('id', id)
        .maybeSingle();
      if (!ideiaI || (ideiaI as any).cliente_id !== (cliI as any).id || (ideiaI as any).status === 'rascunho') {
        return json({ error: 'ideia não pertence a este cliente' }, 403);
      }

      const { error } = await sb
        .from('ideias_conteudo')
        .update({ status, justificativa: status === 'reprovada' ? just : '' } as any)
        .eq('id', id);
      if (error) return json({ error: error.message }, 500);

      if (status === 'reprovada') {
        await avisarEquipe(
          sb,
          `💡❌ ${(cliI as any).nome} não aprovou a ideia "${(ideiaI as any).titulo}" (${(ideiaI as any).mes_referencia}).\n\n` +
          `O que ele pediu: ${just}`,
        );
      }
      return json({ ok: true });
    }

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
      .select('id, cliente_id, visivel_cliente, titulo, mes_referencia, formato, link_drive, designer_demanda_id')
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
      await devolverAoDesigner(sb, ideia, (justificativa ?? '').trim());
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
