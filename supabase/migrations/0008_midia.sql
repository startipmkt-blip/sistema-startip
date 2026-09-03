-- =============================================================
-- 0008_midia.sql — Mensagens de mídia + reply + reações no CRM
-- =============================================================
-- O que muda:
--   * crm_mensagens ganha "tipo" (texto/imagem/audio/documento/video/sticker/sistema),
--     campos de anexo (path no Storage + mime type + nome original),
--     wa_message_id (id da mensagem no WhatsApp — usado pra reply/react/forward),
--     respondendo_id (FK à outra mensagem — quote/reply),
--     reacoes (jsonb com emoji → array de números que reagiram).
--   * View crm_conversas é recriada mostrando o "preview" da última mensagem
--     de forma amigável (📷 Foto, 🎵 Áudio, 📎 Documento etc.).
--   * Novo bucket "crm-media" (privado) — mídia enviada/recebida via WhatsApp.
-- =============================================================

-- ---------- crm_mensagens: novos campos ----------
alter table public.crm_mensagens
  add column if not exists tipo              text not null default 'texto',
  add column if not exists midia_path        text,
  add column if not exists midia_mime        text,
  add column if not exists midia_nome        text,
  add column if not exists midia_duracao     integer,       -- em segundos, para áudio/vídeo
  add column if not exists wa_message_id     text,          -- id no WhatsApp (para reply/react/forward)
  add column if not exists respondendo_id    uuid references public.crm_mensagens (id) on delete set null,
  add column if not exists reacoes           jsonb not null default '{}'::jsonb;

comment on column public.crm_mensagens.tipo is
  'Tipo do conteúdo: texto | imagem | audio | documento | video | sticker | sistema.';
comment on column public.crm_mensagens.midia_path is
  'Path do arquivo no bucket crm-media (mensagens de mídia).';
comment on column public.crm_mensagens.wa_message_id is
  'ID da mensagem no WhatsApp (Z-API) — usado como referência para responder / encaminhar / reagir.';
comment on column public.crm_mensagens.respondendo_id is
  'Se essa mensagem responde outra, aponta pra ela (reply/quote do WhatsApp).';
comment on column public.crm_mensagens.reacoes is
  'Objeto emoji→[participantPhone]. Ex.: {"👍":["5511..."], "❤️":["5511..."]}.';

-- Índices auxiliares.
create index if not exists idx_crm_msg_wa_id      on public.crm_mensagens (wa_message_id) where wa_message_id is not null;
create index if not exists idx_crm_msg_respondendo on public.crm_mensagens (respondendo_id) where respondendo_id is not null;

-- ---------- Bucket crm-media (privado) ----------
insert into storage.buckets (id, name, public)
values ('crm-media', 'crm-media', false)
on conflict (id) do update set public = excluded.public;

-- Policies: apenas equipe (RLS de storage.objects já está habilitado no 0005).
drop policy if exists crm_media_select on storage.objects;
drop policy if exists crm_media_insert on storage.objects;
drop policy if exists crm_media_update on storage.objects;
drop policy if exists crm_media_delete on storage.objects;

create policy crm_media_select on storage.objects
  for select using (bucket_id = 'crm-media' and public.is_equipe());
create policy crm_media_insert on storage.objects
  for insert with check (bucket_id = 'crm-media' and public.is_equipe());
create policy crm_media_update on storage.objects
  for update using (bucket_id = 'crm-media' and public.is_equipe())
  with check (bucket_id = 'crm-media' and public.is_equipe());
create policy crm_media_delete on storage.objects
  for delete using (bucket_id = 'crm-media' and public.is_equipe());

-- ---------- View crm_conversas — preview amigável da última mensagem ----------
-- Drop + create pra permitir mudar a lista de colunas (added ultima_tipo).
drop view if exists public.crm_conversas;
create view public.crm_conversas as
select
  l.id,
  l.nome,
  l.empresa,
  l.telefone,
  l.origem,
  l.etapa,
  l.etiquetas,
  l.valor,
  l.atendente_id,
  p.nome as atendente_nome,
  l.fixado,
  l.arquivado,
  l.is_grupo,
  l.created_at,
  case m_ult.tipo
    when 'imagem'    then coalesce(nullif(m_ult.conteudo,''), '📷 Foto')
    when 'audio'     then '🎵 Áudio'
    when 'video'     then coalesce(nullif(m_ult.conteudo,''), '🎬 Vídeo')
    when 'documento' then '📎 ' || coalesce(m_ult.midia_nome, 'Documento')
    when 'sticker'   then '🌟 Figurinha'
    when 'sistema'   then m_ult.conteudo
    else m_ult.conteudo
  end as ultima_mensagem,
  m_ult.direcao     as ultima_direcao,
  m_ult.enviada_em  as ultima_em,
  m_ult.tipo        as ultima_tipo,
  coalesce(nl.n, 0) as nao_lidas,
  m_saida.enviada_em as ultima_saida_em
from public.crm_leads l
left join public.profiles p on p.id = l.atendente_id
left join lateral (
  select conteudo, direcao, enviada_em, tipo, midia_nome
  from public.crm_mensagens
  where lead_id = l.id
  order by enviada_em desc
  limit 1
) m_ult on true
left join lateral (
  select enviada_em
  from public.crm_mensagens
  where lead_id = l.id and direcao = 'enviada'
  order by enviada_em desc
  limit 1
) m_saida on true
left join lateral (
  select count(*)::int as n
  from public.crm_mensagens
  where lead_id = l.id and direcao = 'recebida' and lida = false
) nl on true;

comment on view public.crm_conversas is
  'Linha por lead com o que a inbox precisa: preview da última mensagem (com ícone por tipo), contadores, atribuição.';
