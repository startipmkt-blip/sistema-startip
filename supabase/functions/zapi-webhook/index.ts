// =============================================================
// zapi-webhook — RECEBE mensagens da Z-API (com mídia + reply + reação).
// =============================================================
// Detecta texto, imagem, áudio, documento, vídeo, sticker e reações.
// Se for mídia, baixa a URL da Z-API (só é válida por 24h) e sobe pro
// bucket crm-media do Supabase para termos posse do arquivo.
// =============================================================

// deno-lint-ignore-file no-explicit-any
import { serve } from 'https://deno.land/std@0.224.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.4';

const TOKEN_ESPERADO = Deno.env.get('ZAPI_WEBHOOK_TOKEN') ?? '';
const SUPABASE_URL   = Deno.env.get('SUPABASE_URL') ?? '';
const SERVICE_ROLE   = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';

function tokenIgual(a: string, b: string): boolean {
  if (!a || !b || a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

function txt(v: unknown): string | null {
  return typeof v === 'string' ? v.trim() : null;
}

// Parser do nome do grupo WhatsApp: "🌐 Empresa | Pilar" → { empresa, pilar }.
// Espelho de src/shared/lib/pillars.ts — mantém em sync se mudar as chaves.
const MAPA_PILAR: Record<string, 'traffic' | 'social' | 'gmb' | 'cs'> = {
  'trafego pago': 'traffic', 'tráfego pago': 'traffic', 'trafego': 'traffic', 'tráfego': 'traffic',
  'social media': 'social', 'social midia': 'social', 'social mídia': 'social', 'social': 'social',
  'google meu negocio': 'gmb', 'google meu negócio': 'gmb', 'gmn': 'gmb', 'gmb': 'gmb',
  'customer success': 'cs', 'cs': 'cs', 'sucesso do cliente': 'cs',
};
function parseNomeGrupo(nome: string | null): { empresa: string | null; pilar: string | null } {
  if (!nome) return { empresa: null, pilar: null };
  const semGlobo = nome.trim().replace(/^🌐\s*/u, '').trim();
  if (!semGlobo) return { empresa: null, pilar: null };
  const partes = semGlobo.split(/\s*[|\-–]\s+/).map((p) => p.trim()).filter(Boolean);
  if (partes.length < 2) return { empresa: semGlobo, pilar: null };
  let pilar: string | null = null;
  const empresaPartes: string[] = [];
  for (const p of partes) {
    const chave = p.toLowerCase();
    if (chave in MAPA_PILAR) {
      if (!pilar) pilar = MAPA_PILAR[chave];
    } else {
      empresaPartes.push(p);
    }
  }
  return { empresa: empresaPartes.join(' - ').trim() || semGlobo, pilar };
}

interface Extracao {
  chatId: string | null;
  chatName: string | null;
  isGroup: boolean;
  senderName: string | null;
  senderPhone: string | null;
  fotoUrl: string | null;
  fromMe: boolean;
  waMessageId: string | null;
  // Conteúdo
  tipo: 'texto' | 'imagem' | 'audio' | 'documento' | 'video' | 'sticker' | 'reacao' | 'sistema';
  texto: string | null;              // texto ou legenda
  midiaUrl: string | null;           // URL temporária da Z-API
  midiaMime: string | null;
  midiaNome: string | null;
  midiaDuracao: number | null;
  // Reply
  quotedWaId: string | null;
  // Reação
  reacaoEmoji: string | null;
  reacaoAlvoWaId: string | null;
}

function extrair(payload: any): Extracao {
  const isGroup = payload?.isGroup === true;
  const chatId = txt(payload?.phone) ?? txt(payload?.chatId) ?? txt(payload?.from);
  const chatName = txt(payload?.chatName) ?? txt(payload?.contact?.name);
  const senderName = txt(payload?.senderName) ?? txt(payload?.participantName);
  const senderPhone =
    txt(payload?.participantPhone) ??
    txt(payload?.senderPhone) ??
    (isGroup ? null : chatId);

  // Em grupos, senderPhoto é a foto de QUEM ENVIOU (muda por mensagem) —
  // pra foto do grupo em si, prioriza chatPicture / photo.
  const fotoUrl = isGroup
    ? (txt(payload?.chatPicture) ?? txt(payload?.photo) ?? txt(payload?.groupPicture) ?? null)
    : (txt(payload?.senderPhoto) ?? txt(payload?.photo) ?? txt(payload?.chatPicture) ?? txt(payload?.profilePic) ?? null);

  const out: Extracao = {
    chatId, chatName, isGroup, senderName, senderPhone, fotoUrl,
    fromMe: payload?.fromMe === true,
    waMessageId: txt(payload?.messageId) ?? txt(payload?.id),
    tipo: 'texto',
    texto: null, midiaUrl: null, midiaMime: null, midiaNome: null, midiaDuracao: null,
    quotedWaId: null, reacaoEmoji: null, reacaoAlvoWaId: null,
  };

  // Detecta tipo. Z-API separa em blocos: text, image, audio, document,
  // video, sticker, reaction, referencedMessage (reply).
  if (payload?.reaction) {
    out.tipo = 'reacao';
    out.reacaoEmoji = txt(payload.reaction.value) ?? txt(payload.reaction);
    out.reacaoAlvoWaId = txt(payload.reaction.referencedMessage?.messageId) ?? txt(payload.reaction.messageId);
  } else if (payload?.image) {
    out.tipo = 'imagem';
    out.midiaUrl = txt(payload.image.imageUrl) ?? txt(payload.image.url);
    out.midiaMime = txt(payload.image.mimeType) ?? 'image/jpeg';
    out.texto = txt(payload.image.caption);
  } else if (payload?.audio) {
    out.tipo = 'audio';
    out.midiaUrl = txt(payload.audio.audioUrl) ?? txt(payload.audio.url);
    out.midiaMime = txt(payload.audio.mimeType) ?? 'audio/ogg';
    out.midiaDuracao = typeof payload.audio.seconds === 'number' ? payload.audio.seconds : null;
  } else if (payload?.document) {
    out.tipo = 'documento';
    out.midiaUrl = txt(payload.document.documentUrl) ?? txt(payload.document.url);
    out.midiaMime = txt(payload.document.mimeType) ?? 'application/octet-stream';
    out.midiaNome = txt(payload.document.fileName) ?? txt(payload.document.title);
  } else if (payload?.video) {
    out.tipo = 'video';
    out.midiaUrl = txt(payload.video.videoUrl) ?? txt(payload.video.url);
    out.midiaMime = txt(payload.video.mimeType) ?? 'video/mp4';
    out.texto = txt(payload.video.caption);
    out.midiaDuracao = typeof payload.video.seconds === 'number' ? payload.video.seconds : null;
  } else if (payload?.sticker) {
    out.tipo = 'sticker';
    out.midiaUrl = txt(payload.sticker.stickerUrl) ?? txt(payload.sticker.url);
    out.midiaMime = txt(payload.sticker.mimeType) ?? 'image/webp';
  } else {
    // Texto simples
    out.tipo = 'texto';
    out.texto =
      txt(payload?.text?.message) ??
      txt(payload?.text) ??
      txt(payload?.body) ??
      txt(payload?.message?.text) ??
      null;
  }

  // Reply (quote) — Z-API às vezes chama de referencedMessage.
  out.quotedWaId =
    txt(payload?.referencedMessage?.messageId) ??
    txt(payload?.contextInfo?.stanzaId) ??
    null;

  return out;
}

// Baixa a mídia da URL da Z-API e sobe pro bucket crm-media.
async function baixarESalvar(
  sb: any,
  dados: Extracao,
  leadId: string,
): Promise<{ path: string | null; nome: string | null }> {
  if (!dados.midiaUrl) return { path: null, nome: null };
  try {
    const resp = await fetch(dados.midiaUrl);
    if (!resp.ok) return { path: null, nome: null };
    const buf = new Uint8Array(await resp.arrayBuffer());
    const ext = extPorMime(dados.midiaMime) || 'bin';
    const nome = dados.midiaNome ?? `whatsapp-${dados.tipo}-${Date.now()}.${ext}`;
    const path = `${leadId}/${crypto.randomUUID()}-${nome}`;
    const { error } = await sb.storage
      .from('crm-media')
      .upload(path, buf, { contentType: dados.midiaMime ?? undefined, upsert: false });
    if (error) return { path: null, nome };
    return { path, nome };
  } catch {
    return { path: null, nome: null };
  }
}

function extPorMime(mime: string | null): string | null {
  if (!mime) return null;
  const m: Record<string, string> = {
    'image/jpeg': 'jpg', 'image/png': 'png', 'image/webp': 'webp', 'image/gif': 'gif',
    'audio/ogg': 'ogg', 'audio/mpeg': 'mp3', 'audio/mp4': 'm4a', 'audio/wav': 'wav',
    'video/mp4': 'mp4', 'video/webm': 'webm',
    'application/pdf': 'pdf', 'application/msword': 'doc',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document': 'docx',
    'application/vnd.ms-excel': 'xls',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': 'xlsx',
  };
  return m[mime] ?? null;
}

serve(async (req) => {
  if (req.method !== 'POST') return new Response('Method Not Allowed', { status: 405 });

  const url = new URL(req.url);
  // Aceita o token em várias formas (Z-API muda entre versões / instâncias).
  const token =
    req.headers.get('X-Zapi-Token') ??
    req.headers.get('x-zapi-token') ??
    req.headers.get('Client-Token') ??
    req.headers.get('client-token') ??
    url.searchParams.get('t') ??
    url.searchParams.get('token') ??
    '';
  if (!tokenIgual(token, TOKEN_ESPERADO)) {
    // Log detalhado pra diagnosticar em Invocations → o request
    console.log('AUTH_FAIL', {
      recebido_len: token.length,
      esperado_len: TOKEN_ESPERADO.length,
      recebido_preview: token.slice(0, 6),
      esperado_preview: TOKEN_ESPERADO.slice(0, 6),
      headers: Object.fromEntries(req.headers.entries()),
      querystring: url.search,
    });
    return new Response('Unauthorized', { status: 401 });
  }

  let payload: any;
  try { payload = await req.json(); }
  catch { return new Response('Bad Request', { status: 400 }); }

  // Antes de extrair, trata callbacks de "status" (entregue/lida/etc). A
  // Z-API manda com type "MessageStatusCallback" ou campo "status".
  const isStatus = payload?.type === 'MessageStatusCallback' || typeof payload?.status === 'string';
  if (isStatus) {
    const sbs = createClient(SUPABASE_URL, SERVICE_ROLE, { auth: { persistSession: false } });
    const waId: string | null = txt(payload?.ids?.[0]) ?? txt(payload?.messageId) ?? txt(payload?.id);
    const bruto = String(payload?.status ?? '').toUpperCase();
    // Mapa Z-API → nosso enum simples.
    const mapa: Record<string, string> = {
      SENT: 'enviada',
      SERVER_ACK: 'enviada',
      DELIVERED: 'entregue',
      DELIVERY_ACK: 'entregue',
      RECEIVED: 'entregue',
      READ: 'lida',
      PLAYED: 'lida',
      FAILED: 'falhou',
      DELETED: 'apagada',
    };
    const status = mapa[bruto];
    if (waId && status) {
      await sbs.from('crm_mensagens').update({ status }).eq('wa_message_id', waId);
    }
    return new Response(JSON.stringify({ ok: true, status }), {
      status: 200, headers: { 'content-type': 'application/json' },
    });
  }

  const dados = extrair(payload);
  if (!dados.chatId) {
    return new Response(JSON.stringify({ ignored: true, reason: 'sem chatId' }), { status: 200 });
  }

  const direcao: 'recebida' | 'enviada' = dados.fromMe ? 'enviada' : 'recebida';

  const sb = createClient(SUPABASE_URL, SERVICE_ROLE, { auth: { persistSession: false } });

  // Reação a mensagem existente — atualiza o campo reacoes da mensagem alvo,
  // não cria linha nova.
  if (dados.tipo === 'reacao') {
    if (!dados.reacaoAlvoWaId) {
      return new Response(JSON.stringify({ ignored: true, reason: 'reação sem alvo' }), { status: 200 });
    }
    const { data: alvo } = await sb
      .from('crm_mensagens')
      .select('id, reacoes')
      .eq('wa_message_id', dados.reacaoAlvoWaId)
      .maybeSingle();
    if (!alvo?.id) {
      return new Response(JSON.stringify({ ignored: true, reason: 'alvo não encontrado' }), { status: 200 });
    }
    const quem = dados.senderPhone ?? 'anon';
    const reacoes = (alvo.reacoes ?? {}) as Record<string, string[]>;
    for (const k of Object.keys(reacoes)) {
      reacoes[k] = (reacoes[k] ?? []).filter((n) => n !== quem);
      if (reacoes[k].length === 0) delete reacoes[k];
    }
    if (dados.reacaoEmoji) {
      reacoes[dados.reacaoEmoji] = [...(reacoes[dados.reacaoEmoji] ?? []), quem];
    }
    await sb.from('crm_mensagens').update({ reacoes }).eq('id', alvo.id);
    return new Response(JSON.stringify({ ok: true, reacao_em: alvo.id }), {
      status: 200, headers: { 'content-type': 'application/json' },
    });
  }

  // Mensagens de conteúdo (texto ou mídia). Precisa de conteúdo mínimo.
  const nadaPraSalvar = dados.tipo === 'texto' && !dados.texto;
  if (nadaPraSalvar) {
    return new Response(JSON.stringify({ ignored: true, reason: 'sem texto' }), { status: 200 });
  }

  // Se já existe uma linha com esse wa_message_id (foi criada pelo zapi-enviar
  // OU esta é uma reentrega do próprio webhook), NÃO cria duplicata — apenas
  // marca a original como "entregue" ao servidor e continua.
  if (dados.waMessageId) {
    const { data: existentePorWa } = await sb
      .from('crm_mensagens')
      .select('id')
      .eq('wa_message_id', dados.waMessageId)
      .maybeSingle();
    if (existentePorWa?.id) {
      return new Response(JSON.stringify({ ok: true, dedup: true, id: existentePorWa.id }), {
        status: 200, headers: { 'content-type': 'application/json' },
      });
    }
  }

  // Acha ou cria o lead.
  const { data: existente } = await sb
    .from('crm_leads')
    .select('id, nome, is_grupo, foto_url')
    .eq('telefone', dados.chatId)
    .maybeSingle();

  let leadId = existente?.id as string | undefined;
  // Parse "🌐 Empresa | Pilar" — se bater, aproveita o nome da empresa.
  const nomeCanal = dados.chatName ?? dados.senderName ?? dados.chatId!;
  const parseado = dados.isGroup ? parseNomeGrupo(nomeCanal) : { empresa: null, pilar: null };
  const nomeFinal = parseado.empresa ?? nomeCanal;
  if (!leadId) {
    const { data: novo, error: e1 } = await sb
      .from('crm_leads')
      .insert({
        nome: nomeFinal, telefone: dados.chatId, origem: 'WhatsApp', etapa: 'novo',
        is_grupo: dados.isGroup,
        ...(dados.fotoUrl ? { foto_url: dados.fotoUrl } : {}),
        ...(parseado.pilar ? { pilar: parseado.pilar } : {}),
      })
      .select('id')
      .single();
    if (e1) return new Response(e1.message, { status: 500 });
    leadId = novo.id as string;
  } else {
    const patch: Record<string, unknown> = {};
    if (dados.chatName && existente?.nome === dados.chatId) patch.nome = nomeFinal;
    if (dados.isGroup && existente && existente.is_grupo !== true) patch.is_grupo = true;
    if (parseado.pilar) patch.pilar = parseado.pilar;
    // Só atualiza foto se não tinha ainda (evita ficar mudando a foto do grupo
    // por cada mensagem de participante diferente).
    if (dados.fotoUrl && !(existente as any)?.foto_url) patch.foto_url = dados.fotoUrl;
    if (Object.keys(patch).length > 0) {
      await sb.from('crm_leads').update(patch).eq('id', leadId);
    }
  }

  // Baixa/salva a mídia (se houver).
  const salvo = await baixarESalvar(sb, dados, leadId);

  // Descobre respondendo_id se o webhook veio com quote.
  let respondendoId: string | null = null;
  if (dados.quotedWaId) {
    const { data: quote } = await sb
      .from('crm_mensagens')
      .select('id')
      .eq('wa_message_id', dados.quotedWaId)
      .maybeSingle();
    respondendoId = (quote?.id as string) ?? null;
  }

  const { error: e2 } = await sb.from('crm_mensagens').insert({
    lead_id: leadId,
    telefone: dados.senderPhone ?? dados.chatId,
    direcao,
    conteudo: dados.texto,
    nome_remetente: dados.senderName,
    tipo: dados.tipo,
    wa_message_id: dados.waMessageId,
    respondendo_id: respondendoId,
    midia_path: salvo.path,
    midia_mime: dados.midiaMime,
    midia_nome: salvo.nome ?? dados.midiaNome,
    midia_duracao: dados.midiaDuracao,
  });
  if (e2) {
    // 23505 = unique_violation. Segunda entrega do mesmo wa_message_id chegou
    // no mesmo instante que a primeira e ambas passaram no SELECT — o UNIQUE
    // INDEX (migration 0029) barrou a segunda. Isso é sucesso, não erro.
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const isDup = (e2 as any).code === '23505' || /duplicate key|unique/i.test(e2.message);
    if (isDup) {
      return new Response(JSON.stringify({ ok: true, dedup: true, race: true }), {
        status: 200, headers: { 'content-type': 'application/json' },
      });
    }
    return new Response(e2.message, { status: 500 });
  }

  return new Response(JSON.stringify({ ok: true, lead_id: leadId, tipo: dados.tipo }), {
    status: 200, headers: { 'content-type': 'application/json' },
  });
});
