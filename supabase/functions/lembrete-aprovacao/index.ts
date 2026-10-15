// =============================================================
// lembrete-aprovacao — lembra o cliente de conteudos parados em aprovacao
// =============================================================
// Chamada por pg_cron (a cada hora, 09h-18h, seg-sex). Sem JWT.
// E idempotente: so envia quando a janela configurada (padrao 24h) venceu desde
// o envio/ultimo lembrete e repete ate o cliente aprovar ou reprovar
// (maximo 0 = sem limite), entao chamadas repetidas nao duplicam mensagens.
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

  const horas  = Number((cfg as any).lembrete_horas ?? 24);
  // 0 = sem limite: continua lembrando a cada janela ate o cliente responder.
  const maximo = Number((cfg as any).lembrete_maximo ?? 0);
  const limite = new Date(Date.now() - horas * 3600_000).toISOString();

  let consulta = sb
    .from('conteudo_aprovacao')
    .select('id, cliente_id, mes_referencia, lembretes_enviados, enviado_em')
    .eq('etapa', 'enviado')
    .eq('status', 'pendente')
    .eq('visivel_cliente', true)
    .lt('enviado_em', limite)
    .or(`lembrete_em.is.null,lembrete_em.lt.${limite}`);
  if (maximo > 0) consulta = consulta.lt('lembretes_enviados', maximo);
  const { data: posts, error } = await consulta;
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
    // Ate 48h de espera: pergunta simples. Depois de 48h sem resposta: cobra a aprovacao.
    const maisAntigo = Math.min(...lista.map((p: any) => new Date(p.enviado_em).getTime()));
    const passou48h = Date.now() - maisAntigo >= 48 * 3600_000;
    const link = `${SITE}/aprovar/${c.central_slug}?mes=${mes}`;
    const texto = passou48h
      ? `Lembrando que os materiais orgânicos ainda não foram aprovados. Segue o link abaixo.\n\n${link}`
      : `Oi, conseguiram olhar os conteúdos orgânicos?\n\n${link}`;

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
