// =============================================================
// alertas-processar — roda a cada minuto (pg_cron). Sem JWT.
// =============================================================
// Resolve a origem de mensagens enviadas via API, enfileira os alertas que
// venceram e envia ao GRUPO INTERNO pela Z-API (send-text), com novas
// tentativas controladas. Idempotente: a unicidade (pendencia, nivel) fica no
// banco, entao rodar varias vezes ou apos reinicio nunca repete um alerta.

// deno-lint-ignore-file no-explicit-any
import { serve } from 'https://deno.land/std@0.224.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.4';

const SUPABASE_URL      = Deno.env.get('SUPABASE_URL') ?? '';
const SERVICE_ROLE      = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
const ZAPI_INSTANCE_ID  = Deno.env.get('ZAPI_INSTANCE_ID') ?? '';
const ZAPI_TOKEN        = Deno.env.get('ZAPI_TOKEN') ?? '';
const ZAPI_CLIENT_TOKEN = Deno.env.get('ZAPI_CLIENT_TOKEN') ?? '';
const CRON_SECRET       = Deno.env.get('ALERTAS_CRON_SECRET') ?? '';   // opcional

const TZ = 'America/Sao_Paulo';
const TIPO_LABEL: Record<string, string> = {
  texto: '', audio: '🎤 Áudio', imagem: '🖼️ Imagem', video: '🎬 Vídeo', documento: '📎 Documento',
};

function hora(iso: string): string {
  return new Intl.DateTimeFormat('pt-BR', { timeZone: TZ, hour: '2-digit', minute: '2-digit' })
    .format(new Date(iso)).replace(':', 'h');
}
function duracao(min: number): string {
  if (min < 60) return `${min} minuto${min === 1 ? '' : 's'}`;
  const h = Math.floor(min / 60), m = min % 60;
  return m ? `${h}h${String(m).padStart(2, '0')}` : `${h} hora${h === 1 ? '' : 's'}`;
}
function ultimaMensagem(texto: string | null, tipo: string | null): string {
  const rotulo = TIPO_LABEL[tipo ?? 'texto'] ?? '';
  const corpo = (texto ?? '').replace(/\s+/g, ' ').trim().slice(0, 160);
  if (rotulo && corpo) return `${rotulo}: "${corpo}"`;
  if (rotulo) return rotulo;
  return corpo ? `"${corpo}"` : '(sem texto)';
}

function montarAlerta(e: any): string {
  return [
    '🚨 STARTIP | ALERTA DE ATENDIMENTO',
    '⚠️ Um cliente está aguardando resposta!',
    `🏢 Cliente: ${e.cliente_nome ?? e.grupo_nome ?? '—'}`,
    `💬 Grupo: ${e.grupo_nome ?? '—'}`,
    `🕐 Mensagem recebida: ${hora(e.iniciada_em)}`,
    `⏱️ Tempo sem resposta: ${duracao(Number(e.minutos) || 0)}`,
    '📌 Status: Aguardando atendimento',
    `💬 Última mensagem: ${ultimaMensagem(e.ultima_msg_texto, e.ultima_msg_tipo)}`,
    '🔴 Ação necessária: Alguém da equipe precisa responder ao cliente.',
  ].join('\n');
}

async function enviarTexto(chatId: string, texto: string): Promise<{ ok: boolean; id: string | null; erro: string | null }> {
  if (!ZAPI_INSTANCE_ID || !ZAPI_TOKEN) return { ok: false, id: null, erro: 'credenciais Z-API ausentes' };
  const url = `https://api.z-api.io/instances/${ZAPI_INSTANCE_ID}/token/${ZAPI_TOKEN}/send-text`;
  const headers: Record<string, string> = { 'content-type': 'application/json' };
  if (ZAPI_CLIENT_TOKEN) headers['Client-Token'] = ZAPI_CLIENT_TOKEN;
  try {
    const r = await fetch(url, { method: 'POST', headers, body: JSON.stringify({ phone: chatId, message: texto }) });
    const corpo = await r.text();
    if (!r.ok) return { ok: false, id: null, erro: `HTTP ${r.status}: ${corpo.slice(0, 200)}` };
    let j: any = {};
    try { j = JSON.parse(corpo); } catch { /* resposta nao-JSON */ }
    return { ok: true, id: j?.messageId ?? j?.id ?? j?.zaapId ?? null, erro: null };
  } catch (err) {
    return { ok: false, id: null, erro: String((err as Error)?.message ?? err).slice(0, 200) };
  }
}

serve(async (req) => {
  if (CRON_SECRET && req.headers.get('x-cron-secret') !== CRON_SECRET) {
    return new Response('Unauthorized', { status: 401 });
  }
  const sb = createClient(SUPABASE_URL, SERVICE_ROLE, { auth: { persistSession: false } });
  const out = { origem_resolvida: 0, enfileirados: 0, enviados: 0, falhas: 0 };

  const r1 = await sb.rpc('alertas_resolver_origem');
  if (!r1.error) out.origem_resolvida = Number(r1.data ?? 0);
  const r2 = await sb.rpc('alertas_enfileirar');
  if (r2.error) return new Response(JSON.stringify({ erro: r2.error.message }), { status: 500 });
  out.enfileirados = Number(r2.data ?? 0);

  const r3 = await sb.rpc('alertas_reivindicar_envios', { p_limite: 20 });
  if (r3.error) return new Response(JSON.stringify({ erro: r3.error.message }), { status: 500 });

  for (const e of (r3.data ?? []) as any[]) {
    if (!e.grupo_interno_id) {
      await sb.rpc('alertas_marcar_envio', {
        p_envio_id: e.envio_id, p_ok: false, p_zapi_message_id: null,
        p_erro: 'grupo interno nao configurado', p_texto: null,
      });
      out.falhas += 1;
      continue;
    }
    const texto = montarAlerta(e);
    const res = await enviarTexto(e.grupo_interno_id, texto);
    await sb.rpc('alertas_marcar_envio', {
      p_envio_id: e.envio_id, p_ok: res.ok, p_zapi_message_id: res.id,
      p_erro: res.erro, p_texto: res.ok ? texto : null,
    });
    if (res.ok) out.enviados += 1; else out.falhas += 1;
  }

  // Limpeza de retenção (LGPD) uma vez por hora, no minuto zero.
  if (new Date().getUTCMinutes() === 0) await sb.rpc('alertas_limpar');

  return new Response(JSON.stringify({ ok: true, ...out }), {
    status: 200, headers: { 'content-type': 'application/json' },
  });
});
