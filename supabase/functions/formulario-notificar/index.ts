// =============================================================
// formulario-notificar — avisa a equipe que um formulário foi preenchido.
// =============================================================
// Entrada: { formulario_id } com Authorization: Bearer <service_role>.
// Dispara em paralelo:
//   1. E-mail via Gmail SMTP (senha de app) para GMAIL_USER
//   2. Mensagem no grupo interno via função zapi-enviar
// Variáveis de ambiente:
//   GMAIL_USER                 (ex: startipmkt@gmail.com)
//   GMAIL_APP_PASSWORD         (senha de app de 16 caracteres)
//   APP_BASE_URL               (ex: https://app.agenciastartip.com.br)
//   GRUPO_INTERNO_ZAPI_CHAT_ID (ex: 55119...@g.us)
// =============================================================

// deno-lint-ignore-file no-explicit-any
import { serve } from 'https://deno.land/std@0.224.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.4';
import { SMTPClient } from 'https://deno.land/x/denomailer@1.6.0/mod.ts';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL') ?? '';
const SERVICE_ROLE = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
const GMAIL_USER = Deno.env.get('GMAIL_USER') ?? '';
const GMAIL_APP_PASSWORD = Deno.env.get('GMAIL_APP_PASSWORD') ?? '';
const APP_BASE_URL = Deno.env.get('APP_BASE_URL') ?? '';
const GRUPO_INTERNO = Deno.env.get('GRUPO_INTERNO_ZAPI_CHAT_ID') ?? '';

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

function json(obj: unknown, status = 200) {
  return new Response(JSON.stringify(obj), {
    status,
    headers: { ...CORS, 'content-type': 'application/json' },
  });
}

const TIPO_LABEL: Record<string, string> = {
  icp: 'ICP Padrão',
  nicho: 'Adaptado ao Nicho',
  unificado: 'Unificado (ICP + Nicho)',
};

async function enviarEmail(nomeCliente: string, tipo: string, link: string) {
  if (!GMAIL_USER || !GMAIL_APP_PASSWORD) return { ok: false, error: 'Gmail não configurado' };
  const client = new SMTPClient({
    connection: {
      hostname: 'smtp.gmail.com',
      port: 465,
      tls: true,
      auth: { username: GMAIL_USER, password: GMAIL_APP_PASSWORD },
    },
  });
  try {
    await client.send({
      from: GMAIL_USER,
      to: GMAIL_USER,
      subject: `✅ Formulário preenchido - ${nomeCliente}`,
      content: `O cliente ${nomeCliente} acabou de preencher o formulário ${TIPO_LABEL[tipo] ?? tipo}.\n\nAcesse o sistema para visualizar as respostas e gerar o diagnóstico:\n${link}`,
      html: `<p>O cliente <strong>${nomeCliente}</strong> acabou de preencher o formulário <strong>${TIPO_LABEL[tipo] ?? tipo}</strong>.</p><p><a href="${link}">Visualizar respostas no sistema</a></p>`,
    });
    await client.close();
    return { ok: true };
  } catch (e) {
    try { await client.close(); } catch { /* */ }
    return { ok: false, error: (e as Error).message };
  }
}

async function enviarWhatsappEquipe(nomeCliente: string, tipo: string, link: string) {
  if (!GRUPO_INTERNO) return { ok: false, error: 'GRUPO_INTERNO_ZAPI_CHAT_ID não configurado' };
  const texto = `✅ Formulário preenchido - ${nomeCliente}\n` +
    `Tipo: ${TIPO_LABEL[tipo] ?? tipo}\n` +
    `Acesse: ${link}`;
  const r = await fetch(`${SUPABASE_URL}/functions/v1/zapi-enviar`, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      authorization: `Bearer ${SERVICE_ROLE}`,
    },
    body: JSON.stringify({ telefone: GRUPO_INTERNO, acao: 'text', texto }),
  });
  if (!r.ok) return { ok: false, error: `zapi-enviar ${r.status}` };
  return { ok: true };
}

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS });
  if (req.method !== 'POST') return json({ error: 'método não permitido' }, 405);

  // Só aceita chamadas com service role (interna)
  const auth = req.headers.get('authorization') ?? '';
  if (!auth.includes(SERVICE_ROLE) || !SERVICE_ROLE) {
    return json({ error: 'não autorizado' }, 401);
  }

  let body: any;
  try { body = await req.json(); } catch { return json({ error: 'body inválido' }, 400); }
  const formularioId = String(body?.formulario_id ?? '');
  if (!formularioId) return json({ error: 'formulario_id obrigatório' }, 400);

  const sb = createClient(SUPABASE_URL, SERVICE_ROLE, { auth: { persistSession: false } });
  const { data: form, error } = await sb
    .from('formularios')
    .select('id, tipo, cliente_id, clientes!inner(id, nome)')
    .eq('id', formularioId)
    .maybeSingle();
  if (error || !form) return json({ error: error?.message ?? 'formulário não encontrado' }, 404);

  const nomeCliente = (form as any).clientes?.nome ?? 'Cliente';
  const linkInterno = `${APP_BASE_URL}/clientes/${form.cliente_id}#formularios`;

  const [email, wa] = await Promise.all([
    enviarEmail(nomeCliente, form.tipo, linkInterno),
    enviarWhatsappEquipe(nomeCliente, form.tipo, linkInterno),
  ]);
  return json({ ok: true, email, whatsapp: wa });
});
