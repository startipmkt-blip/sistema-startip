-- =============================================================
-- 0009_mensagens_extras.sql — Editar/apagar/favoritar mensagens
-- =============================================================
-- Novos campos em crm_mensagens:
--   editada_em            — quando a mensagem foi editada (WhatsApp reply-edit)
--   apagada_em            — timestamp do apagar
--   apagada_para_todos    — se apagou para todos (send-delete owner=true)
--   favorita_ids          — array de UUIDs de atendentes que favoritaram
-- =============================================================

alter table public.crm_mensagens
  add column if not exists editada_em         timestamptz,
  add column if not exists apagada_em         timestamptz,
  add column if not exists apagada_para_todos boolean not null default false,
  add column if not exists favorita_ids       uuid[] not null default '{}'::uuid[];

comment on column public.crm_mensagens.editada_em is 'Quando o texto foi editado via send-message-edit (Z-API).';
comment on column public.crm_mensagens.apagada_em is 'Quando a mensagem foi marcada como apagada.';
comment on column public.crm_mensagens.apagada_para_todos is 'true = delete-for-everyone; false = só oculta pra equipe.';
comment on column public.crm_mensagens.favorita_ids is 'IDs de atendentes que marcaram como favorita.';

create index if not exists idx_crm_msg_favorita on public.crm_mensagens using gin (favorita_ids);
