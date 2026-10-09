// =============================================================
// lembrete-aprovacao — lembra o cliente de conteudos parados em aprovacao
// =============================================================
// Chamada por pg_cron (a cada hora, 09h-18h, seg-sex). Sem JWT.
// E idempotente: so envia quando o prazo configurado venceu e respeita
// o maximo de lembretes, entao chamadas repetidas nao duplicam mensagens.
// =============================================================

// deno-lint-ignore-file no-explicit-any
import { serve } from 'https://deno.land/std@0.224.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.4';

const SUPABASE_URL      = Deno.env.get('SUPABASE_URL') ?? '';
const SERVICE_ROLE      = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
const ZAPI_INSTANCE_ID  = Deno.env.get('ZAPI_INSTANCE_ID') ?? '';
const ZAPI_TOKEN        = Deno.env.get('ZAPI_TOKEN') ?? '';
const ZAPI_CLIENT_TOKEN = Deno.env.get('ZAPI_CLIENT_TOKEN') ?? '';
const SITE              = 'https://cerebro.agenciastartip.com.br';

function json(o: unknown, status = 200) {
  return new Response(JSON.stringify(o), {
    status, headers: { 'content-type': 'application/json' },
  });
}

async function enviarWhatsapp(chatId: string, texto: string): Promise<boolean> {
  const url = `https://api.z-api.io/instances/${ZAPI_INSTANCE_ID}/token/${ZAPI_TOKEN}/send-text`;
  const r = await fetch(url, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      ...(ZAPI_CLIENT_TOKEN ? { 'Client-Token': ZAPI_CLIENT_TOKEN } : {}),
    },
    body: JSON.stringify({ phone: chatId, message: texto }),
  });
  return r.ok;
}

serve(async () => {
  const sb = createClient(SUPABASE_URL, SERVICE_ROLE, { auth: { persistSession: false } });

  const { data: cfg } = await sb.from('gestao_conteudo_config').select('*').limit(1).maybeSingle();
  if (!cfg || !(cfg as any).lembrete_ativo) return json({ ok: true, enviados: 0, motivo: 'desativado' });

  const horas  = Number((cfg as any).lembrete_horas ?? 48);
  const maximo = Number((cfg as any).lembrete_maximo ?? 3);
  const limite = new Date(Date.now() - horas * 3600_000).toISOString();

  const { data: posts, error } = await sb
    .from('conteudo_aprovacao')
    .select('id, cliente_id, mes_referencia, lembretes_enviados')
    .eq('etapa', 'enviado')
    .eq('status', 'pendente')
    .eq('visivel_cliente', true)
    .lt('enviado_em', limite)
    .lt('lembretes_enviados', maximo)
    .or(`lembrete_em.is.null,lembrete_em.lt.${limite}`);
  if (error) return json({ ok: false, erro: error.message }, 500);

  const porCliente = new Map<string, any[]>();
  for (const p of posts ?? []) {
    const lista = porCliente.get((p as any).cliente_id) ?? [];
    lista.push(p);
    porCliente.set((p as any).cliente_id, lista);
  }

  let enviados = 0;
  const semContato: string[] = [];
  const falhas: string[] = [];

  for (const [clienteId, lista] of porCliente) {
    const { data: cli } = await sb
      .from('clientes').select('nome, whatsapp_chat_id, central_slug').eq('id', clienteId).maybeSingle();
    const c = cli as any;
    if (!c?.whatsapp_chat_id || !c?.central_slug) { semContato.push(c?.nome ?? clienteId); continue; }

    const mes = lista.map((p: any) => p.mes_referencia).sort()[0];
    const n = lista.length;
    const texto =
      `Olá, ${c.nome}! 👋\n\n` +
      `Passando para lembrar que ${n === 1 ? 'há 1 conteúdo aguardando' : `há ${n} conteúdos aguardando`} ` +
      `a sua aprovação.\n\nÉ rapidinho — veja a prévia e aprove por aqui:\n` +
      `${SITE}/aprovar/${c.central_slug}?mes=${mes}\n\nObrigado!`;

    const ok = await enviarWhatsapp(c.whatsapp_chat_id, texto);
    if (!ok) { falhas.push(c.nome); continue; }

    for (const p of lista) {
      await sb.from('conteudo_aprovacao')
        .update({ lembrete_em: new Date().toISOString(), lembretes_enviados: (p.lembretes_enviados ?? 0) + 1 })
        .eq('id', p.id);
    }
    enviados += 1;
  }

  return json({ ok: true, enviados, clientes_pendentes: porCliente.size, sem_contato: semContato, falhas });
});
