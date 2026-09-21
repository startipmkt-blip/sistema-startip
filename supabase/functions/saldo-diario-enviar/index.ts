// =============================================================
// saldo-diario-enviar — Job diário que consulta spend_cap - amount_spent
// nas contas Meta ativas, monta o aviso e dispara via Z-API pros grupos.
//
// POST { forcado?: boolean, cliente_id?: uuid }
//   - forcado: ignora dias úteis e envia todos
//   - cliente_id: envia só pra 1 cliente (teste)
// =============================================================

// deno-lint-ignore-file no-explicit-any
import { serve } from 'https://deno.land/std@0.224.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.4';

const SUPABASE_URL      = Deno.env.get('SUPABASE_URL') ?? '';
const SERVICE_ROLE      = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
const ZAPI_INSTANCE_ID  = Deno.env.get('ZAPI_INSTANCE_ID') ?? '';
const ZAPI_TOKEN        = Deno.env.get('ZAPI_TOKEN') ?? '';
const ZAPI_CLIENT_TOKEN = Deno.env.get('ZAPI_CLIENT_TOKEN') ?? '';
const META_API_VER      = 'v20.0';

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};
const json = (o: unknown, s = 200) =>
  new Response(JSON.stringify(o), { status: s, headers: { ...CORS, 'content-type': 'application/json' } });

function isDiaUtil(d = new Date()): boolean {
  const w = d.getDay(); // 0=dom, 6=sab
  return w >= 1 && w <= 5;
}
function fmtBrl(v: number): string {
  return v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

async function fetchSpendCap(actId: string, token: string): Promise<{ disponivel: number; gasto_total: number; limite: number } | null> {
  const acct = actId.startsWith('act_') ? actId : `act_${actId}`;
  const url = new URL(`https://graph.facebook.com/${META_API_VER}/${acct}`);
  url.searchParams.set('fields', 'spend_cap,amount_spent,balance');
  url.searchParams.set('access_token', token);
  try {
    const r = await fetch(url.toString());
    if (!r.ok) return null;
    const j: any = await r.json();
    // Meta retorna em cents da moeda da conta.
    const spendCap = Number(j.spend_cap ?? 0) / 100;
    const amountSpent = Number(j.amount_spent ?? 0) / 100;
    const balance = Number(j.balance ?? 0) / 100;
    const disponivel = spendCap > 0 ? spendCap - amountSpent : balance;
    return { disponivel, gasto_total: amountSpent, limite: spendCap };
  } catch { return null; }
}

async function fetchGastoOntem(actId: string, token: string): Promise<number> {
  const acct = actId.startsWith('act_') ? actId : `act_${actId}`;
  const url = new URL(`https://graph.facebook.com/${META_API_VER}/${acct}/insights`);
  url.searchParams.set('date_preset', 'yesterday');
  url.searchParams.set('fields', 'spend');
  url.searchParams.set('access_token', token);
  try {
    const r = await fetch(url.toString());
    if (!r.ok) return 0;
    const j: any = await r.json();
    return Number(j?.data?.[0]?.spend ?? 0);
  } catch { return 0; }
}

async function enviarZapi(chatId: string, texto: string): Promise<any> {
  const url = `https://api.z-api.io/instances/${ZAPI_INSTANCE_ID}/token/${ZAPI_TOKEN}/send-text`;
  const headers: Record<string, string> = { 'content-type': 'application/json' };
  if (ZAPI_CLIENT_TOKEN) headers['Client-Token'] = ZAPI_CLIENT_TOKEN;
  const r = await fetch(url, {
    method: 'POST', headers,
    body: JSON.stringify({ phone: chatId, message: texto }),
  });
  return { ok: r.ok, status: r.status, body: await r.text().catch(() => '') };
}

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS });
  if (req.method !== 'POST') return json({ error: 'POST only' }, 405);
  if (!SUPABASE_URL || !SERVICE_ROLE) return json({ error: 'secrets ausentes' }, 500);

  const body = await req.json().catch(() => ({}));
  const forcado: boolean = body?.forcado === true;
  const clienteFiltro: string | null = body?.cliente_id ?? null;

  const sb = createClient(SUPABASE_URL, SERVICE_ROLE, { auth: { persistSession: false } });

  // Config
  const { data: cfg } = await sb.from('trafego_saldo_config').select('*').limit(1).maybeSingle();
  if (!cfg) return json({ error: 'config não encontrada' }, 500);
  if (!cfg.ativo && !forcado) return json({ ok: true, skipped: 'desativado' });
  if (cfg.dias_uteis_only && !isDiaUtil() && !forcado) return json({ ok: true, skipped: 'fim de semana' });

  // Contas ativas
  const { data: contas, error: eContas } = await sb
    .from('contas_anuncio')
    .select('id, cliente_id, id_externo, access_token, sincronizacao_ativa')
    .eq('plataforma', 'meta')
    .eq('sincronizacao_ativa', true)
    .not('access_token', 'is', null);
  if (eContas) return json({ error: eContas.message }, 500);

  const contasFiltradas = clienteFiltro
    ? (contas ?? []).filter((c: any) => c.cliente_id === clienteFiltro)
    : (contas ?? []);

  const hoje = new Date().toISOString().slice(0, 10);
  const resultado: any[] = [];

  for (const c of contasFiltradas as any[]) {
    const spend = await fetchSpendCap(c.id_externo, c.access_token);
    const gastoOntem = await fetchGastoOntem(c.id_externo, c.access_token);
    const disponivel = spend?.disponivel ?? 0;
    const situacao = disponivel <= 0 ? 'sem_saldo' : disponivel < cfg.piso_alerta ? 'alerta' : 'ok';

    // Snapshot
    await sb.from('trafego_saldo_snapshot').upsert({
      data: hoje,
      cliente_id: c.cliente_id,
      disponivel, gasto_ontem: gastoOntem,
      gasto_total: spend?.gasto_total ?? null,
      limite: spend?.limite ?? null,
      situacao,
      enviado: false,
    }, { onConflict: 'data,cliente_id' });

    // Se cfg.so_alertas e situação = ok → não envia.
    if (cfg.so_alertas && situacao === 'ok') {
      resultado.push({ cliente_id: c.cliente_id, situacao, enviado: false, motivo: 'ok+so_alertas' });
      continue;
    }

    // Puxa nome do cliente
    const { data: cliente } = await sb.from('clientes').select('nome').eq('id', c.cliente_id).single();
    const nomeCli = (cliente as any)?.nome ?? 'Cliente';

    // Puxa contatos ativos (por cliente ou globais sem cliente_id)
    const { data: contatos } = await sb
      .from('trafego_saldo_contatos')
      .select('zapi_chat_id, nome_grupo')
      .eq('ativo', true)
      .or(`cliente_id.eq.${c.cliente_id},cliente_id.is.null`);

    if (!contatos?.length) {
      resultado.push({ cliente_id: c.cliente_id, situacao, enviado: false, motivo: 'sem contatos' });
      continue;
    }

    const emoji = situacao === 'ok' ? '✅' : situacao === 'alerta' ? '⚠️' : '🚨';
    const texto = [
      cfg.mensagem_topo ? `${cfg.mensagem_topo}\n` : '',
      `${emoji} *Saldo Meta Ads — ${nomeCli}*`,
      `Disponível: *${fmtBrl(disponivel)}*`,
      `Gasto ontem: ${fmtBrl(gastoOntem)}`,
      spend?.limite ? `Limite: ${fmtBrl(spend.limite)}` : '',
      situacao === 'sem_saldo' ? '\n_Sem saldo — recarregar!_' : situacao === 'alerta' ? `\n_Abaixo do piso (${fmtBrl(cfg.piso_alerta)})_` : '',
    ].filter(Boolean).join('\n');

    for (const contato of contatos as any[]) {
      const r = await enviarZapi(contato.zapi_chat_id, texto);
      resultado.push({ cliente_id: c.cliente_id, grupo: contato.nome_grupo, situacao, enviado: r.ok, meta: r });
    }

    await sb.from('trafego_saldo_snapshot')
      .update({ enviado: true })
      .eq('data', hoje).eq('cliente_id', c.cliente_id);
  }

  return json({ ok: true, hoje, contas: contasFiltradas.length, resultado });
});
