// =============================================================
// central-cliente — GET /?slug=<central_slug>
// =============================================================
// Endpoint público. Devolve TUDO que a Central do Cliente exibe:
//   cliente, saude, contratos, entregas da semana, otimizações,
//   investimento semanal, avisos, persona, e as ideias aprovadas
//   e VISÍVEIS ao cliente do mês corrente.
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
  return new Response(JSON.stringify(o), { status, headers: { ...CORS, 'content-type': 'application/json' } });
}

function segundaDaSemana(d = new Date()): string {
  const x = new Date(d);
  const dia = x.getDay();
  const off = dia === 0 ? -6 : 1 - dia;
  x.setDate(x.getDate() + off);
  return x.toISOString().slice(0, 10);
}
function mesAtual(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS });
  if (req.method !== 'GET') return new Response('Method Not Allowed', { status: 405, headers: CORS });

  const url = new URL(req.url);
  const slug = url.searchParams.get('slug') ?? '';
  if (!slug) return json({ error: 'slug obrigatório' }, 400);

  const sb = createClient(SUPABASE_URL, SERVICE_ROLE, { auth: { persistSession: false } });

  const { data: cli } = await sb
    .from('clientes')
    .select('id, nome, logo_url, tipo_negocio, status, servicos, data_entrada')
    .eq('central_slug', slug)
    .maybeSingle();
  if (!cli) return json({ error: 'link inválido' }, 404);

  const clienteId = (cli as any).id as string;
  const semana = segundaDaSemana();
  const mes = mesAtual();

  const [
    saudeR, contratosR, entregasR, otimR, invR, avisosR, personaR, ideiasR,
  ] = await Promise.all([
    sb.from('cliente_saude').select('score_saude, score_contrato, score_aprovacao, score_suporte')
      .eq('cliente_id', clienteId).maybeSingle(),
    sb.from('contracts').select('id, titulo, status, start_date, end_date, monthly_value')
      .eq('cliente_id', clienteId).order('created_at', { ascending: false }).limit(10),
    sb.from('conteudos_entregues').select('id, tipo, titulo, descricao, url, thumb_url, entregue_em')
      .eq('cliente_id', clienteId).gte('entregue_em', semana).order('entregue_em', { ascending: false }),
    sb.from('otimizacoes_trafego').select('id, titulo, descricao, plataforma, criada_em')
      .eq('cliente_id', clienteId).order('criada_em', { ascending: false }).limit(30),
    sb.from('investimento_semanal').select('id, semana_inicio, investimento_total, media_diaria, observacoes')
      .eq('cliente_id', clienteId).order('semana_inicio', { ascending: false }).limit(8),
    sb.from('avisos_cliente').select('id, titulo, conteudo, criado_em')
      .eq('cliente_id', clienteId).order('criado_em', { ascending: false }).limit(20),
    sb.from('cliente_persona').select('persona, planejamento_estrategico, tom_de_voz, produtos_servicos, atualizado_em')
      .eq('cliente_id', clienteId).maybeSingle(),
    sb.from('conteudo_aprovacao')
      .select('id, titulo, descricao, formato, semana, dia_postagem, status, justificativa, mes_referencia')
      .eq('cliente_id', clienteId).eq('mes_referencia', mes).eq('visivel_cliente', true)
      .order('semana').order('created_at'),
  ]);

  return json({
    cliente: cli,
    saude: saudeR.data ?? null,
    contratos: contratosR.data ?? [],
    entregas_semana: entregasR.data ?? [],
    otimizacoes: otimR.data ?? [],
    investimento: invR.data ?? [],
    avisos: avisosR.data ?? [],
    persona: personaR.data ?? null,
    ideias_mes: ideiasR.data ?? [],
    mes_ref: mes,
    semana_inicio: semana,
  });
});
