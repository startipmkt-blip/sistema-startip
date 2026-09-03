// =============================================================
// meta-ads-sync — Puxa insights da Meta Marketing API e cacheia
//                 em `meta_ads_metricas_diarias`.
//
// POST /meta-ads-sync   { cliente_id?: uuid, dias?: 30 }
//   - Sem cliente_id: sincroniza todas as contas com sincronizacao_ativa
//   - Com cliente_id:  sincroniza só as contas daquele cliente
//
// Requer secrets: SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY.
// O access_token da Meta fica em contas_anuncio.access_token (por conta).
// =============================================================

// deno-lint-ignore-file no-explicit-any
import { serve } from 'https://deno.land/std@0.224.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.4';

const SUPABASE_URL   = Deno.env.get('SUPABASE_URL') ?? '';
const SERVICE_ROLE   = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
const META_API_VER   = 'v20.0';

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};
function json(o: unknown, s = 200) {
  return new Response(JSON.stringify(o), { status: s, headers: { ...CORS, 'content-type': 'application/json' } });
}

interface InsightRow {
  date_start: string;
  date_stop:  string;
  campaign_id?: string;
  campaign_name?: string;
  spend?: string;
  impressions?: string;
  reach?: string;
  clicks?: string;
  cpm?: string;
  cpc?: string;
  ctr?: string;
  actions?: Array<{ action_type: string; value: string }>;
  action_values?: Array<{ action_type: string; value: string }>;
}

// Meta retorna várias "actions" — pegamos as mais relevantes pra conversão/valor.
const CONV_TYPES = new Set([
  'purchase', 'offsite_conversion.fb_pixel_purchase',
  'lead', 'offsite_conversion.fb_pixel_lead',
  'onsite_conversion.messaging_conversation_started_7d',
  'onsite_conversion.lead_grouped',
  'complete_registration',
]);

function sumAction(rows: Array<{ action_type: string; value: string }> | undefined): number {
  if (!rows?.length) return 0;
  let total = 0;
  for (const r of rows) if (CONV_TYPES.has(r.action_type)) total += Number(r.value ?? 0);
  return total;
}

async function fetchInsightsCampanhas(
  contaExterna: string,
  token: string,
  dias: number,
): Promise<InsightRow[]> {
  const acct = contaExterna.startsWith('act_') ? contaExterna : `act_${contaExterna}`;
  const url = new URL(`https://graph.facebook.com/${META_API_VER}/${acct}/insights`);
  url.searchParams.set('level', 'campaign');
  url.searchParams.set('time_increment', '1');       // 1 = por dia
  url.searchParams.set('date_preset', dias <= 7 ? 'last_7d' : dias <= 30 ? 'last_30d' : 'last_90d');
  url.searchParams.set('fields', [
    'campaign_id', 'campaign_name',
    'spend', 'impressions', 'reach', 'clicks',
    'cpm', 'cpc', 'ctr',
    'actions', 'action_values',
  ].join(','));
  url.searchParams.set('limit', '500');
  url.searchParams.set('access_token', token);

  const out: InsightRow[] = [];
  let next: string | null = url.toString();
  let paginas = 0;
  while (next && paginas < 20) {
    const resp = await fetch(next);
    if (!resp.ok) {
      const t = await resp.text();
      throw new Error(`Meta ${resp.status}: ${t.slice(0, 400)}`);
    }
    const j: any = await resp.json();
    if (Array.isArray(j?.data)) out.push(...j.data);
    next = j?.paging?.next ?? null;
    paginas++;
  }
  return out;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS });
  if (req.method !== 'POST' && req.method !== 'GET') {
    return new Response('Method Not Allowed', { status: 405, headers: CORS });
  }

  if (!SUPABASE_URL || !SERVICE_ROLE) return json({ error: 'secrets ausentes' }, 500);

  const body = req.method === 'POST' ? await req.json().catch(() => ({})) : {};
  const clienteId: string | null = body?.cliente_id ?? null;
  const dias: number = Math.min(90, Math.max(1, Number(body?.dias ?? 30)));

  const supa = createClient(SUPABASE_URL, SERVICE_ROLE, { auth: { persistSession: false } });

  // Lista de contas a sincronizar
  const { data: contas, error: eContas } = await supa.rpc('contas_meta_a_sincronizar', {
    p_cliente_id: clienteId,
  });
  if (eContas) return json({ error: `RPC contas: ${eContas.message}` }, 500);
  if (!contas?.length) return json({ ok: true, contas: 0, mensagem: 'Nenhuma conta ativa.' });

  const resultado: Array<{ conta_id: string; linhas: number; erro?: string }> = [];

  for (const conta of contas as any[]) {
    try {
      const insights = await fetchInsightsCampanhas(conta.id_externo, conta.access_token, dias);

      const rows = insights.map((it) => ({
        conta_id:         conta.conta_id,
        cliente_id:       conta.cliente_id,
        dia:              it.date_start,
        nivel:            'campaign',
        objeto_id:        it.campaign_id ?? null,
        objeto_nome:      it.campaign_name ?? null,
        spend:            Number(it.spend ?? 0),
        impressions:      Number(it.impressions ?? 0),
        reach:            Number(it.reach ?? 0),
        clicks:           Number(it.clicks ?? 0),
        conversions:      sumAction(it.actions),
        valor_conversao: sumAction(it.action_values),
        cpm:              Number(it.cpm ?? 0),
        cpc:              Number(it.cpc ?? 0),
        ctr:              Number(it.ctr ?? 0),
        atualizado_em:    new Date().toISOString(),
      }));

      if (rows.length) {
        // upsert por (conta_id, dia, objeto_id)
        const { error: eUp } = await supa
          .from('meta_ads_metricas_diarias')
          .upsert(rows, { onConflict: 'conta_id,dia,objeto_id' });
        if (eUp) throw new Error(`upsert: ${eUp.message}`);
      }

      await supa.from('contas_anuncio')
        .update({ ultima_sync_at: new Date().toISOString(), ultimo_erro_sync: null })
        .eq('id', conta.conta_id);

      resultado.push({ conta_id: conta.conta_id, linhas: rows.length });
    } catch (e) {
      const msg = (e as Error).message ?? String(e);
      await supa.from('contas_anuncio')
        .update({ ultimo_erro_sync: msg.slice(0, 500) })
        .eq('id', conta.conta_id);
      resultado.push({ conta_id: conta.conta_id, linhas: 0, erro: msg });
    }
  }

  return json({ ok: true, contas: contas.length, resultado });
});
