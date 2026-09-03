// =============================================================
// zapi-enviar — Edge Function que ENVIA mensagens pela Z-API.
// =============================================================
// Suporta os seguintes tipos (parametro "acao" no body):
//   text        → texto simples (respondendoWaId opcional)
//   image       → foto ({imagemUrl | imagemBase64, legenda?})
//   audio       → áudio ({audioUrl | audioBase64})
//   document    → documento ({docUrl | docBase64, docNome, docMime})
//   reaction    → reagir com emoji ({waMessageId, emoji}) — '' remove
//   forward     → encaminhar mensagem ({waMessageId, paraTelefone[]})
//
// Todas as respostas gravam uma linha em crm_mensagens (direcao=enviada) com
// o tipo correto, para que a inbox espelhe o histórico.
//
// Payload comum:
//   leadId    (uuid)  – lead do CRM em que estamos conversando
//   telefone  (str)   – opcional; se ausente, buscamos do lead
//   acao      (str)   – veja acima
//
// Deploy:
//   supabase functions deploy zapi-enviar
// =============================================================

// deno-lint-ignore-file no-explicit-any
import { serve } from 'https://deno.land/std@0.224.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.4';

const ZAPI_INSTANCE_ID = Deno.env.get('ZAPI_INSTANCE_ID') ?? '';
const ZAPI_TOKEN       = Deno.env.get('ZAPI_TOKEN') ?? '';
const ZAPI_CLIENT_TOKEN = Deno.env.get('ZAPI_CLIENT_TOKEN') ?? '';
const SUPABASE_URL     = Deno.env.get('SUPABASE_URL') ?? '';
const ANON_KEY         = Deno.env.get('SUPABASE_ANON_KEY') ?? '';

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

function baseUrl(): string {
  return `https://api.z-api.io/instances/${ZAPI_INSTANCE_ID}/token/${ZAPI_TOKEN}`;
}

function jsonHeaders(): Record<string, string> {
  return {
    'content-type': 'application/json',
    ...(ZAPI_CLIENT_TOKEN ? { 'Client-Token': ZAPI_CLIENT_TOKEN } : {}),
  };
}

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS });
  if (req.method !== 'POST')    return new Response('Method Not Allowed', { status: 405, headers: CORS });

  // Autentica o chamador usando o JWT do header.
  const auth = req.headers.get('Authorization');
  if (!auth) return new Response('Unauthorized', { status: 401, headers: CORS });

  const sbUser = createClient(SUPABASE_URL, ANON_KEY, {
    global: { headers: { Authorization: auth } },
    auth: { persistSession: false },
  });

  const { data: user } = await sbUser.auth.getUser();
  if (!user?.user) return new Response('Unauthorized', { status: 401, headers: CORS });

  const { data: eq } = await sbUser.rpc('is_equipe');
  if (!eq) return new Response('Forbidden', { status: 403, headers: CORS });

  let body: any;
  try { body = await req.json(); }
  catch { return new Response('Bad Request', { status: 400, headers: CORS }); }

  const leadId: string | undefined = body?.leadId;
  const acao: string  = String(body?.acao ?? 'text');
  if (!leadId) return new Response('leadId é obrigatório', { status: 400, headers: CORS });

  // Descobre o telefone do chat pelo lead se não veio no body.
  let telefone: string = String(body?.telefone ?? '');
  if (!telefone) {
    const { data: lead } = await sbUser.from('crm_leads').select('telefone').eq('id', leadId).maybeSingle();
    telefone = String(lead?.telefone ?? '');
  }
  if (!telefone) return new Response('Lead sem telefone', { status: 400, headers: CORS });

  // Executor por ação — retorna { url, payload, tipo, previewConteudo, midia? }.
  let endpoint = 'send-text';
  let payload: Record<string, unknown> = {};
  let tipoMensagem: 'texto' | 'imagem' | 'audio' | 'documento' | 'reacao' | 'encaminhada' = 'texto';
  let previewConteudo: string | null = null;
  let midiaCampos: Record<string, unknown> = {};

  switch (acao) {
    case 'text': {
      const texto = String(body?.texto ?? '').trim();
      if (!texto) return new Response('texto obrigatório', { status: 400, headers: CORS });
      endpoint = 'send-text';
      payload = { phone: telefone, message: texto };
      if (body?.respondendoWaId) payload.messageId = String(body.respondendoWaId);
      tipoMensagem = 'texto';
      previewConteudo = texto;
      break;
    }
    case 'image': {
      const url = body?.imagemUrl ?? body?.imagemBase64;
      if (!url) return new Response('imagemUrl ou imagemBase64 obrigatório', { status: 400, headers: CORS });
      endpoint = 'send-image';
      payload = {
        phone: telefone,
        image: url,
        ...(body?.legenda ? { caption: String(body.legenda) } : {}),
      };
      tipoMensagem = 'imagem';
      previewConteudo = body?.legenda ? String(body.legenda) : null;
      midiaCampos = {
        midia_path: body?.midiaPath ?? null,
        midia_mime: body?.midiaMime ?? 'image/jpeg',
        midia_nome: body?.midiaNome ?? null,
      };
      break;
    }
    case 'audio': {
      const url = body?.audioUrl ?? body?.audioBase64;
      if (!url) return new Response('audioUrl ou audioBase64 obrigatório', { status: 400, headers: CORS });
      endpoint = 'send-audio';
      payload = { phone: telefone, audio: url, viewOnce: false, waveform: true };
      tipoMensagem = 'audio';
      midiaCampos = {
        midia_path: body?.midiaPath ?? null,
        midia_mime: body?.midiaMime ?? 'audio/ogg',
        midia_duracao: body?.duracao ?? null,
      };
      break;
    }
    case 'document': {
      const url = body?.docUrl ?? body?.docBase64;
      if (!url) return new Response('docUrl ou docBase64 obrigatório', { status: 400, headers: CORS });
      const nome = String(body?.docNome ?? 'documento.pdf');
      // Extensão pela URL/nome para o endpoint Z-API certo.
      const ext = nome.split('.').pop()?.toLowerCase() || 'pdf';
      endpoint = `send-document/${ext}`;
      payload = { phone: telefone, document: url, fileName: nome };
      tipoMensagem = 'documento';
      previewConteudo = null;
      midiaCampos = {
        midia_path: body?.midiaPath ?? null,
        midia_mime: body?.docMime ?? 'application/octet-stream',
        midia_nome: nome,
      };
      break;
    }
    case 'poll': {
      // Enquete no WhatsApp — send-poll da Z-API.
      const pergunta = String(body?.pergunta ?? '').trim();
      const opcoes: string[] = Array.isArray(body?.opcoes) ? body.opcoes.map((o: unknown) => String(o).trim()).filter(Boolean) : [];
      const multi = Boolean(body?.multi);
      if (!pergunta || opcoes.length < 2) {
        return new Response('pergunta e ao menos 2 opções obrigatórias', { status: 400, headers: CORS });
      }
      const rp = await fetch(`${baseUrl()}/send-poll`, {
        method: 'POST', headers: jsonHeaders(),
        body: JSON.stringify({
          phone: telefone,
          message: pergunta,
          poll: opcoes,
          multipleAnswers: multi,
        }),
      });
      if (!rp.ok) {
        const msg = await rp.text();
        return new Response(`Z-API: ${msg}`, { status: 502, headers: CORS });
      }
      const respZapi = await rp.json().catch(() => ({} as any));
      const waId: string | null = respZapi?.messageId ?? respZapi?.id ?? null;
      const preview = `📊 ${pergunta}\n${opcoes.map((o, i) => `${i + 1}. ${o}`).join('\n')}`;
      await sbUser.from('crm_mensagens').insert({
        lead_id: leadId, telefone, direcao: 'enviada',
        conteudo: preview, tipo: 'texto', wa_message_id: waId,
      });
      return new Response(JSON.stringify({ ok: true, acao: 'poll', wa_message_id: waId }), {
        status: 200, headers: { ...CORS, 'content-type': 'application/json' },
      });
    }
    case 'event': {
      // Evento (calendar-like) — send-event da Z-API.
      const titulo = String(body?.titulo ?? '').trim();
      const inicio = String(body?.inicio ?? '').trim();      // ISO
      const fim = String(body?.fim ?? '').trim() || null;    // ISO ou vazio
      const local = String(body?.local ?? '').trim() || null;
      const descricao = String(body?.descricao ?? '').trim() || null;
      if (!titulo || !inicio) {
        return new Response('titulo e inicio obrigatórios', { status: 400, headers: CORS });
      }
      const rev = await fetch(`${baseUrl()}/send-event`, {
        method: 'POST', headers: jsonHeaders(),
        body: JSON.stringify({
          phone: telefone,
          name: titulo,
          description: descricao,
          startTime: Math.floor(new Date(inicio).getTime() / 1000),
          ...(fim ? { endTime: Math.floor(new Date(fim).getTime() / 1000) } : {}),
          ...(local ? { location: { name: local } } : {}),
        }),
      });
      if (!rev.ok) {
        const msg = await rev.text();
        return new Response(`Z-API: ${msg}`, { status: 502, headers: CORS });
      }
      const respZapi = await rev.json().catch(() => ({} as any));
      const waId: string | null = respZapi?.messageId ?? respZapi?.id ?? null;
      const dataFmt = new Date(inicio).toLocaleString('pt-BR');
      const preview = `📅 ${titulo}\n${dataFmt}${local ? ` · ${local}` : ''}`;
      await sbUser.from('crm_mensagens').insert({
        lead_id: leadId, telefone, direcao: 'enviada',
        conteudo: preview, tipo: 'texto', wa_message_id: waId,
      });
      return new Response(JSON.stringify({ ok: true, acao: 'event', wa_message_id: waId }), {
        status: 200, headers: { ...CORS, 'content-type': 'application/json' },
      });
    }
    case 'sticker': {
      // Figurinha — send-sticker. Front deve mandar já em webp (512x512).
      const url = String(body?.stickerUrl ?? '').trim();
      if (!url) return new Response('stickerUrl obrigatório', { status: 400, headers: CORS });
      const rs = await fetch(`${baseUrl()}/send-sticker`, {
        method: 'POST', headers: jsonHeaders(),
        body: JSON.stringify({ phone: telefone, sticker: url }),
      });
      if (!rs.ok) {
        const msg = await rs.text();
        return new Response(`Z-API: ${msg}`, { status: 502, headers: CORS });
      }
      const respZapi = await rs.json().catch(() => ({} as any));
      const waId: string | null = respZapi?.messageId ?? respZapi?.id ?? null;
      await sbUser.from('crm_mensagens').insert({
        lead_id: leadId, telefone, direcao: 'enviada',
        conteudo: null, tipo: 'sticker', wa_message_id: waId,
        midia_path: body?.midiaPath ?? null, midia_mime: 'image/webp',
      });
      return new Response(JSON.stringify({ ok: true, acao: 'sticker', wa_message_id: waId }), {
        status: 200, headers: { ...CORS, 'content-type': 'application/json' },
      });
    }
    case 'contact': {
      // Envia um cartão de contato pelo WhatsApp.
      const contatoNome = String(body?.contatoNome ?? '').trim();
      const contatoTelefone = String(body?.contatoTelefone ?? '').trim();
      if (!contatoNome || !contatoTelefone) {
        return new Response('contatoNome e contatoTelefone obrigatórios', { status: 400, headers: CORS });
      }
      endpoint = 'send-contact';
      payload = { phone: telefone, contactName: contatoNome, contactPhone: contatoTelefone };
      const rc = await fetch(`${baseUrl()}/${endpoint}`, {
        method: 'POST', headers: jsonHeaders(), body: JSON.stringify(payload),
      });
      if (!rc.ok) {
        const msg = await rc.text();
        return new Response(`Z-API: ${msg}`, { status: 502, headers: CORS });
      }
      const respZapi = await rc.json().catch(() => ({} as any));
      const waId: string | null = respZapi?.messageId ?? respZapi?.id ?? null;
      await sbUser.from('crm_mensagens').insert({
        lead_id: leadId, telefone, direcao: 'enviada',
        conteudo: `👤 ${contatoNome} · ${contatoTelefone}`,
        tipo: 'texto', wa_message_id: waId,
      });
      return new Response(JSON.stringify({ ok: true, acao: 'contact', wa_message_id: waId }), {
        status: 200, headers: { ...CORS, 'content-type': 'application/json' },
      });
    }
    case 'reaction': {
      const wa = String(body?.waMessageId ?? '');
      if (!wa) return new Response('waMessageId obrigatório', { status: 400, headers: CORS });
      endpoint = 'send-reaction';
      payload = { phone: telefone, messageId: wa, reaction: String(body?.emoji ?? '') };
      // Atualiza a linha original em crm_mensagens (adiciona reação minha):
      const meuNumero = 'agencia';
      const { data: msg } = await sbUser
        .from('crm_mensagens')
        .select('id, reacoes')
        .eq('wa_message_id', wa)
        .maybeSingle();
      if (msg?.id) {
        const emoji = String(body?.emoji ?? '');
        const reacoesAtuais = (msg.reacoes ?? {}) as Record<string, string[]>;
        // Remove minha reação antiga (só posso ter uma).
        for (const k of Object.keys(reacoesAtuais)) {
          reacoesAtuais[k] = (reacoesAtuais[k] ?? []).filter((n) => n !== meuNumero);
          if (reacoesAtuais[k].length === 0) delete reacoesAtuais[k];
        }
        if (emoji) {
          reacoesAtuais[emoji] = [...(reacoesAtuais[emoji] ?? []), meuNumero];
        }
        await sbUser.from('crm_mensagens').update({ reacoes: reacoesAtuais }).eq('id', msg.id);
      }
      // Chama Z-API mas não grava nova linha de mensagem.
      {
        const r = await fetch(`${baseUrl()}/${endpoint}`, {
          method: 'POST', headers: jsonHeaders(), body: JSON.stringify(payload),
        });
        if (!r.ok) {
          const msg = await r.text();
          return new Response(`Z-API: ${msg}`, { status: 502, headers: CORS });
        }
      }
      return new Response(JSON.stringify({ ok: true, acao: 'reaction' }), {
        status: 200,
        headers: { ...CORS, 'content-type': 'application/json' },
      });
    }
    case 'delete': {
      // Apaga uma mensagem no WhatsApp e marca localmente como apagada.
      // paraTodos:true tenta o "delete for everyone" da Z-API (só se enviamos e < 7 min).
      const wa = String(body?.waMessageId ?? '');
      const paraTodos: boolean = Boolean(body?.paraTodos);
      if (!wa) return new Response('waMessageId obrigatório', { status: 400, headers: CORS });
      if (paraTodos) {
        const r = await fetch(
          `${baseUrl()}/messages?phone=${encodeURIComponent(telefone)}&messageId=${encodeURIComponent(wa)}&owner=true`,
          { method: 'DELETE', headers: jsonHeaders() },
        );
        if (!r.ok) {
          const msg = await r.text();
          return new Response(`Z-API: ${msg}`, { status: 502, headers: CORS });
        }
      }
      await sbUser
        .from('crm_mensagens')
        .update({ apagada_em: new Date().toISOString(), apagada_para_todos: paraTodos })
        .eq('wa_message_id', wa);
      return new Response(JSON.stringify({ ok: true, acao: 'delete', paraTodos }), {
        status: 200,
        headers: { ...CORS, 'content-type': 'application/json' },
      });
    }
    case 'edit': {
      // Edita o texto de uma mensagem já enviada.
      const wa = String(body?.waMessageId ?? '');
      const novoTexto = String(body?.texto ?? '').trim();
      if (!wa || !novoTexto) {
        return new Response('waMessageId e texto obrigatórios', { status: 400, headers: CORS });
      }
      const r = await fetch(`${baseUrl()}/send-message-edit`, {
        method: 'POST', headers: jsonHeaders(),
        body: JSON.stringify({ phone: telefone, messageId: wa, text: novoTexto }),
      });
      if (!r.ok) {
        const msg = await r.text();
        return new Response(`Z-API: ${msg}`, { status: 502, headers: CORS });
      }
      await sbUser
        .from('crm_mensagens')
        .update({ conteudo: novoTexto, editada_em: new Date().toISOString() })
        .eq('wa_message_id', wa);
      return new Response(JSON.stringify({ ok: true, acao: 'edit' }), {
        status: 200,
        headers: { ...CORS, 'content-type': 'application/json' },
      });
    }
    case 'forward': {
      const wa = String(body?.waMessageId ?? '');
      const alvos: string[] = Array.isArray(body?.paraTelefone) ? body.paraTelefone : [String(body?.paraTelefone ?? '')];
      if (!wa || alvos.length === 0) {
        return new Response('waMessageId e paraTelefone obrigatórios', { status: 400, headers: CORS });
      }
      // Z-API tem endpoint separado por conversa; iteramos.
      for (const dest of alvos.filter(Boolean)) {
        const r = await fetch(`${baseUrl()}/forward-message`, {
          method: 'POST', headers: jsonHeaders(),
          body: JSON.stringify({ phone: telefone, messageId: wa, phoneTarget: dest }),
        });
        if (!r.ok) {
          const msg = await r.text();
          return new Response(`Z-API: ${msg}`, { status: 502, headers: CORS });
        }
      }
      return new Response(JSON.stringify({ ok: true, acao: 'forward', encaminhado: alvos.length }), {
        status: 200,
        headers: { ...CORS, 'content-type': 'application/json' },
      });
    }
    default:
      return new Response(`ação desconhecida: ${acao}`, { status: 400, headers: CORS });
  }

  // Chama a Z-API.
  const r = await fetch(`${baseUrl()}/${endpoint}`, {
    method: 'POST', headers: jsonHeaders(), body: JSON.stringify(payload),
  });
  if (!r.ok) {
    const msg = await r.text();
    return new Response(`Z-API: ${msg}`, { status: 502, headers: CORS });
  }
  const respZapi = await r.json().catch(() => ({} as any));
  const waMessageId: string | null = respZapi?.messageId ?? respZapi?.id ?? null;

  // Grava no histórico interno.
  await sbUser.from('crm_mensagens').insert({
    lead_id: leadId,
    telefone,
    direcao: 'enviada',
    conteudo: previewConteudo,
    tipo: tipoMensagem,
    wa_message_id: waMessageId,
    ...(body?.respondendoId ? { respondendo_id: body.respondendoId } : {}),
    ...midiaCampos,
  });

  return new Response(JSON.stringify({ ok: true, acao, wa_message_id: waMessageId }), {
    status: 200,
    headers: { ...CORS, 'content-type': 'application/json' },
  });
});
