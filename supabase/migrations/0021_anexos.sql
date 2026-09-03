-- 0021_anexos.sql — anexos internos (PDF/DOCX/imagens) em processos,
-- ideias de conteúdo e modelos de contrato. Cria bucket "anexos-internos"
-- privado com política "só equipe autenticada".

-- ---------- Bucket ----------
insert into storage.buckets (id, name, public)
values ('anexos-internos', 'anexos-internos', false)
on conflict (id) do update set public = excluded.public;

drop policy if exists anexos_internos_select on storage.objects;
drop policy if exists anexos_internos_insert on storage.objects;
drop policy if exists anexos_internos_update on storage.objects;
drop policy if exists anexos_internos_delete on storage.objects;

create policy anexos_internos_select on storage.objects
  for select using (bucket_id = 'anexos-internos' and public.is_equipe());
create policy anexos_internos_insert on storage.objects
  for insert with check (bucket_id = 'anexos-internos' and public.is_equipe());
create policy anexos_internos_update on storage.objects
  for update using (bucket_id = 'anexos-internos' and public.is_equipe())
             with check (bucket_id = 'anexos-internos' and public.is_equipe());
create policy anexos_internos_delete on storage.objects
  for delete using (bucket_id = 'anexos-internos' and public.is_equipe());

-- ---------- Colunas de anexos ----------
-- Cada item = { path: text, name: text, type: text }
alter table if exists processos
  add column if not exists anexos jsonb not null default '[]'::jsonb;

alter table if exists conteudo_aprovacao
  add column if not exists anexos jsonb not null default '[]'::jsonb;

alter table if exists contract_templates
  add column if not exists arquivo_path text,
  add column if not exists arquivo_nome text,
  add column if not exists arquivo_tipo text;
