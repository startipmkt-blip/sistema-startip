// =============================================================
// meta-ads-consulta — API viva pro módulo Gestor de Tráfego.
//   POST { conta_id, acao, ...params }
//
//   ações:
//     'kpis'         — retorna insights account-level (spend, impr, clicks, conv, cpm, cpc, ctr, roas) no período
//     'diario'       — serie diária de spend/clicks/conversions
//     'campanhas'    — lista campanhas com insights agregados
//     'anuncios'     — lista ads com preview do criativo
//     'pausar'       — pause/ativa entidade (level=campaign|adset|ad, id, status)
//     'orcamento'    — atualiza daily_budget / lifetime_budget de campanha ou adset
//
//   Preset de datas:  { preset: 'today'|'yesterday'|'last_7d'|'last_14d'|'last_30d'|'last_90d' }
//   OU faixa livre:   { since: 'YYYY-MM-DD', until: 'YYYY-MM-DD' }
// =============================================================

// deno-lint-ignore-file no-explicit-any
import { serve } from 'https://deno.land/std@0.224.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.4';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL') ?? '';
const SERVICE_ROLE = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
const META_API_VER = 'v20.0';

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};
function json(o: unknown, s = 200) {
  return new Response(JSON.stringify(o), { status: s, headers: { ...CORS, 'content-type': 'application/json' } });
}

const CONV_TYPES = new Set([
  'purchase', 'offsite_conversion.fb_pixel_purchase',
  'lead', 'offsite_conversion.fb_pixel_lead',
  'onsite_conversion.messaging_conversation_started_7d',
  'onsite_conversion.lead_grouped',
  'complete_registration',
]);
function sumAction(rows: any[] | undefined): number {
  if (!rows?.length) return 0;
  let t = 0;
  for (const r of rows) if (CONV_TYPES.has(r.action_type)) t += Number(r.value ?? 0);
  return t;
}

function periodoQuery(body: any): Record<string, string> {
  if (body?.since && body?.until) {
    return { time_range: JSON.stringify({ since: body.since, until: body.until }) };
  }
  const preset = body?.preset ?? 'last_7d';
  return { date_preset: preset };
}

async function metaGet(url: URL): Promise<any> {
  const resp = await fetch(url.toString());
  const j = await resp.json().catch(() => ({}));
  if (!resp.ok) throw new Error(`Meta ${resp.status}: ${JSON.stringify(j?.error ?? j).slice(0, 500)}`);
  return j;
}
async function metaPost(url: URL, body: Record<string, string>): Promise<any> {
  const fd = new FormData();
  for (const [k, v] of Object.entries(body)) fd.append(k, v);
  const resp = await fetch(url.toString(), { method: 'POST', body: fd });
  const j = await resp.json().catch(() => ({}));
  if (!resp.ok) throw new Error(`Meta ${resp.status}: ${JSON.stringify(j?.error ?? j).slice(0, 500)}`);
  return j;
}

async function fetchAllPages(baseUrl: URL): Promise<any[]> {
  const out: any[] = [];
  let next: string | null = baseUrl.toString();
  let n = 0;
  while (next && n < 15) {
    const resp = await fetch(next);
    const j = await resp.json().catch(() => ({}));
    if (!resp.ok) throw new Error(`Meta ${resp.status}: ${JSON.stringify(j?.error ?? j).slice(0, 400)}`);
    if (Array.isArray(j?.data)) out.push(...j.data);
    next = j?.paging?.next ?? null;
    n++;
  }
  return out;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS });
  if (req.method !== 'POST') return new Response('Method Not Allowed', { status: 405, headers: CORS });
  if (!SUPABASE_URL || !SERVICE_ROLE) return json({ error: 'secrets ausentes' }, 500);

  const body = await req.json().catch(() => ({}));
  const acao = String(body?.acao ?? '');
  const contaId = String(body?.conta_id ?? '');
  if (!contaId) return json({ error: 'conta_id obrigatório' }, 400);

  const supa = createClient(SUPABASE_URL, SERVICE_ROLE, { auth: { persistSession: false } });
  const { data: conta, error: eConta } = await supa
    .from('contas_anuncio')
    .select('id, cliente_id, id_externo, access_token, moeda')
    .eq('id', contaId)
    .maybeSingle();
  if (eConta || !conta) return json({ error: 'conta não encontrada' }, 404);
  const acct = String((conta as any).id_externo).startsWith('act_')
    ? String((conta as any).id_externo)
    : `act_${(conta as any).id_externo}`;
  const token = (conta as any).access_token as string;
  if (!token) return json({ error: 'access_token ausente para essa conta' }, 400);

  try {
    // ============ KPIs account-level ============
    if (acao === 'kpis') {
      const url = new URL(`https://graph.facebook.com/${META_API_VER}/${acct}/insights`);
      url.searchParams.set('level', 'account');
      url.searchParams.set('fields', 'spend,impressions,reach,clicks,cpm,cpc,ctr,actions,action_values,frequency');
      for (const [k, v] of Object.entries(periodoQuery(body))) url.searchParams.set(k, v);
      url.searchParams.set('access_token', token);
      const j = await metaGet(url);
      const r = j?.data?.[0] ?? {};
      const conv = sumAction(r?.actions);
      const val = sumAction(r?.action_values);
      const spend = Number(r?.spend ?? 0);
      return json({
        ok: true,
        moeda: (conta as any).moeda ?? 'BRL',
        spend, impressions: Number(r?.impressions ?? 0),
        reach: Number(r?.reach ?? 0),
        clicks: Number(r?.clicks ?? 0),
        cpm: Number(r?.cpm ?? 0),
        cpc: Number(r?.cpc ?? 0),
        ctr: Number(r?.ctr ?? 0),
        frequency: Number(r?.frequency ?? 0),
        conversions: conv,
        valor_conversao: val,
        cpa: conv > 0 ? spend / conv : 0,
        roas: spend > 0 ? val / spend : 0,
      });
    }

    // ============ Série diária ============
    if (acao === 'diario') {
      const url = new URL(`https://graph.facebook.com/${META_API_VER}/${acct}/insights`);
      url.searchParams.set('level', 'account');
      url.searchParams.set('time_increment', '1');
      url.searchParams.set('fields', 'spend,clicks,impressions,actions,action_values');
      for (const [k, v] of Object.entries(periodoQuery(body))) url.searchParams.set(k, v);
      url.searchParams.set('access_token', token);
      const j = await metaGet(url);
      const linhas = (j?.data ?? []).map((r: any) => ({
        dia: r.date_start,
        spend: Number(r.spend ?? 0),
        clicks: Number(r.clicks ?? 0),
        impressions: Number(r.impressions ?? 0),
        conversions: sumAction(r.actions),
        valor_conversao: sumAction(r.action_values),
      }));
      return json({ ok: true, linhas });
    }

    // ============ Campanhas com insights ============
    if (acao === 'campanhas') {
      // 1. Campanhas (nome, status, objetivo, budget)
      const urlC = new URL(`https://graph.facebook.com/${META_API_VER}/${acct}/campaigns`);
      urlC.searchParams.set('fields', 'id,name,status,effective_status,objective,daily_budget,lifetime_budget,start_time,stop_time');
      urlC.searchParams.set('limit', '250');
      urlC.searchParams.set('access_token', token);
      const campanhas = await fetchAllPages(urlC);

      // 2. Insights por campanha no período
      const urlI = new URL(`https://graph.facebook.com/${META_API_VER}/${acct}/insights`);
      urlI.searchParams.set('level', 'campaign');
      urlI.searchParams.set('fields', 'campaign_id,spend,impressions,clicks,cpm,cpc,ctr,actions,action_values,frequency,reach');
      urlI.searchParams.set('limit', '250');
      for (const [k, v] of Object.entries(periodoQuery(body))) urlI.searchParams.set(k, v);
      urlI.searchParams.set('access_token', token);
      const insights = await fetchAllPages(urlI);
      const mapa = new Map<string, any>();
      for (const it of insights) mapa.set(String(it.campaign_id), it);

      const linhas = campanhas.map((c: any) => {
        const i = mapa.get(String(c.id)) ?? {};
        const spend = Number(i.spend ?? 0);
        const conv = sumAction(i.actions);
        const val = sumAction(i.action_values);
        return {
          id: c.id,
          nome: c.name,
          status: c.status,
          effective_status: c.effective_status,
          objetivo: c.objective,
          daily_budget: c.daily_budget ? Number(c.daily_budget) / 100 : null,   // Meta retorna em centavos
          lifetime_budget: c.lifetime_budget ? Number(c.lifetime_budget) / 100 : null,
          start_time: c.start_time,
          stop_time: c.stop_time,
          spend,
          impressions: Number(i.impressions ?? 0),
          reach: Number(i.reach ?? 0),
          clicks: Number(i.clicks ?? 0),
          cpm: Number(i.cpm ?? 0),
          cpc: Number(i.cpc ?? 0),
          ctr: Number(i.ctr ?? 0),
          frequency: Number(i.frequency ?? 0),
          conversions: conv,
          valor_conversao: val,
          cpa: conv > 0 ? spend / conv : 0,
          roas: spend > 0 ? val / spend : 0,
        };
      });
      return json({ ok: true, moeda: (conta as any).moeda ?? 'BRL', campanhas: linhas });
    }

    // ============ Ads com criativos ============
    if (acao === 'anuncios') {
      const campaignId: string | undefined = body?.campanha_id;
      const urlA = new URL(`https://graph.facebook.com/${META_API_VER}/${campaignId ? campaignId + '/ads' : acct + '/ads'}`);
      urlA.searchParams.set('fields', 'id,name,status,effective_status,creative{id,thumbnail_url,image_url,body,title,object_story_spec}');
      urlA.searchParams.set('limit', '200');
      urlA.searchParams.set('access_token', token);
      const ads = await fetchAllPages(urlA);

      // insights por ad
      const urlI = new URL(`https://graph.facebook.com/${META_API_VER}/${campaignId ? campaignId + '/insights' : acct + '/insights'}`);
      urlI.searchParams.set('level', 'ad');
      urlI.searchParams.set('fields', 'ad_id,spend,impressions,clicks,ctr,cpc,cpm,actions,action_values');
      urlI.searchParams.set('limit', '200');
      for (const [k, v] of Object.entries(periodoQuery(body))) urlI.searchParams.set(k, v);
      urlI.searchParams.set('access_token', token);
      const insights = await fetchAllPages(urlI);
      const mapa = new Map<string, any>();
      for (const it of insights) mapa.set(String(it.ad_id), it);

      const linhas = ads.map((a: any) => {
        const i = mapa.get(String(a.id)) ?? {};
        const spend = Number(i.spend ?? 0);
        const conv = sumAction(i.actions);
        const val = sumAction(i.action_values);
        return {
          id: a.id,
          nome: a.name,
          status: a.status,
          effective_status: a.effective_status,
          thumbnail: a.creative?.thumbnail_url ?? a.creative?.image_url ?? null,
          titulo_criativo: a.creative?.title ?? null,
          texto_criativo: a.creative?.body ?? null,
          spend,
          impressions: Number(i.impressions ?? 0),
          clicks: Number(i.clicks ?? 0),
          ctr: Number(i.ctr ?? 0),
          cpc: Number(i.cpc ?? 0),
          cpm: Number(i.cpm ?? 0),
          conversions: conv,
          valor_conversao: val,
          cpa: conv > 0 ? spend / conv : 0,
          roas: spend > 0 ? val / spend : 0,
        };
      });
      return json({ ok: true, moeda: (conta as any).moeda ?? 'BRL', anuncios: linhas });
    }

    // ============ Pausar/ativar ============
    if (acao === 'pausar') {
      const objId: string = body?.objeto_id;
      const novoStatus: string = String(body?.status ?? 'PAUSED').toUpperCase();  // PAUSED | ACTIVE
      if (!objId) return json({ error: 'objeto_id obrigatório' }, 400);
      const url = new URL(`https://graph.facebook.com/${META_API_VER}/${objId}`);
      url.searchParams.set('access_token', token);
      const j = await metaPost(url, { status: novoStatus });
      return json({ ok: true, meta: j });
    }

    // ============ Editar orçamento ============
    if (acao === 'orcamento') {
      const objId: string = body?.objeto_id;
      const daily: number | undefined = body?.daily_budget_brl;   // BRL (será convertido pra centavos)
      const life: number | undefined = body?.lifetime_budget_brl;
      if (!objId) return json({ error: 'objeto_id obrigatório' }, 400);
      const url = new URL(`https://graph.facebook.com/${META_API_VER}/${objId}`);
      url.searchParams.set('access_token', token);
      const payload: Record<string, string> = {};
      if (daily != null) payload.daily_budget = String(Math.round(Number(daily) * 100));
      if (life != null)  payload.lifetime_budget = String(Math.round(Number(life) * 100));
      if (!Object.keys(payload).length) return json({ error: 'informe daily_budget_brl ou lifetime_budget_brl' }, 400);
      const j = await metaPost(url, payload);
      return json({ ok: true, meta: j });
    }

    return json({ error: `ação desconhecida: ${acao}` }, 400);
  } catch (e) {
    return json({ error: (e as Error).message }, 500);
  }
});
