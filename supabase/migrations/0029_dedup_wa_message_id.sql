-- 0029_dedup_wa_message_id.sql
-- Corrige duplicatas em crm_mensagens vindas de reentregas do webhook Z-API.

-- 1) Backup (só executa 1x — se já existe, ignora).
create table if not exists public.crm_mensagens_backup_0029
  as select * from public.crm_mensagens where false;
insert into public.crm_mensagens_backup_0029
  select * from public.crm_mensagens
  where wa_message_id is not null
    and wa_message_id in (
      select wa_message_id
      from public.crm_mensagens
      where wa_message_id is not null
      group by wa_message_id
      having count(*) > 1
    )
  on conflict do nothing;

-- 2) Reapontar reply (respondendo_id) antes de deletar.
with vencedoras as (
  select wa_message_id, min(id) as id_manter
  from public.crm_mensagens
  where wa_message_id is not null
  group by wa_message_id
),
duplicatas as (
  select m.id as id_apagar, v.id_manter
  from public.crm_mensagens m
  join vencedoras v on v.wa_message_id = m.wa_message_id
  where m.id <> v.id_manter
)
update public.crm_mensagens m
   set respondendo_id = d.id_manter
  from duplicatas d
 where m.respondendo_id = d.id_apagar;

-- 3) Merge de reações (jsonb) — vencedora acumula as reações das duplicatas.
with vencedoras as (
  select wa_message_id, min(id) as id_manter
  from public.crm_mensagens
  where wa_message_id is not null
  group by wa_message_id
),
reacoes_merge as (
  select v.id_manter,
         coalesce(jsonb_object_agg(k, arr), '{}'::jsonb) as reacoes_final
  from vencedoras v
  join public.crm_mensagens m on m.wa_message_id = v.wa_message_id
  cross join lateral jsonb_each(coalesce(m.reacoes, '{}'::jsonb)) e(k, val)
  cross join lateral (
    select jsonb_agg(distinct x) as arr
    from jsonb_array_elements_text(e.val) x
  ) a
  where jsonb_typeof(m.reacoes) = 'object'
  group by v.id_manter
)
update public.crm_mensagens m
   set reacoes = r.reacoes_final
  from reacoes_merge r
 where m.id = r.id_manter
   and r.reacoes_final <> '{}'::jsonb;

-- 4) Apagar duplicatas (mantém min(id) por wa_message_id).
delete from public.crm_mensagens m
 using (
   select wa_message_id, min(id) as id_manter
   from public.crm_mensagens
   where wa_message_id is not null
   group by wa_message_id
 ) v
 where m.wa_message_id = v.wa_message_id
   and m.id <> v.id_manter;

-- 5) UNIQUE INDEX — trava novas duplicatas na origem.
drop index if exists public.idx_crm_msg_wa_id;
create unique index if not exists uq_crm_msg_wa_id
  on public.crm_mensagens (wa_message_id)
  where wa_message_id is not null;

comment on index public.uq_crm_msg_wa_id is
  'Trava dura de deduplicação de mensagens vindas do webhook Z-API — o ingest deve tratar unique_violation como reentrega.';
