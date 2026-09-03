-- =============================================================
-- 0005_storage.sql — Buckets do Supabase Storage + policies
-- =============================================================
-- Convenção de PATH em todos os buckets escopados a cliente:
--   <cliente_id>/<qualquer/coisa>.<ext>
-- A primeira "pasta" do path é o UUID do cliente. Isso permite RLS
-- eficiente: comparar split_part(name, '/', 1)::uuid com o
-- meu_cliente_id() do usuário logado.
--
-- Buckets criados:
--   logos-clientes    — público (logos aparecem nas telas de qualquer role)
--   relatorios        — PDF dos relatórios mensais (cliente lê os seus)
--   materiais-cliente — anexos dos documentos do workspace (cliente lê os seus)
--   reunioes          — atas em PDF (cliente lê as suas)
--
-- Reentrante: on conflict do nothing em cada bucket, e drop policy
-- if exists antes de recriar.
-- =============================================================

-- ---------- Criação dos buckets ----------
insert into storage.buckets (id, name, public)
values ('logos-clientes',    'logos-clientes',    true)
on conflict (id) do update set public = excluded.public;

insert into storage.buckets (id, name, public)
values ('relatorios',        'relatorios',        false)
on conflict (id) do update set public = excluded.public;

insert into storage.buckets (id, name, public)
values ('materiais-cliente', 'materiais-cliente', false)
on conflict (id) do update set public = excluded.public;

insert into storage.buckets (id, name, public)
values ('reunioes',          'reunioes',          false)
on conflict (id) do update set public = excluded.public;

-- ---------- Helper: extrai o cliente_id do path (primeira pasta) ----------
create or replace function public.storage_cliente_id(name text)
returns uuid
language sql
immutable
as $$
  select case
           when name ~ '^[0-9a-fA-F-]{36}/' then substring(name from 1 for 36)::uuid
           else null
         end;
$$;

-- =============================================================
-- Bucket: logos-clientes (público)
--   Leitura: aberta (o bucket é public=true; qualquer um com URL vê).
--   Escrita/delete: apenas equipe.
-- =============================================================
drop policy if exists logos_clientes_insert on storage.objects;
drop policy if exists logos_clientes_update on storage.objects;
drop policy if exists logos_clientes_delete on storage.objects;

create policy logos_clientes_insert on storage.objects
  for insert with check (
    bucket_id = 'logos-clientes' and public.is_equipe()
  );

create policy logos_clientes_update on storage.objects
  for update using (
    bucket_id = 'logos-clientes' and public.is_equipe()
  ) with check (
    bucket_id = 'logos-clientes' and public.is_equipe()
  );

create policy logos_clientes_delete on storage.objects
  for delete using (
    bucket_id = 'logos-clientes' and public.is_equipe()
  );

-- =============================================================
-- Bucket: relatorios (privado)
--   Leitura: equipe OU dono (cliente_id no path).
--   Escrita/delete: apenas equipe.
-- =============================================================
drop policy if exists relatorios_select on storage.objects;
drop policy if exists relatorios_insert on storage.objects;
drop policy if exists relatorios_update on storage.objects;
drop policy if exists relatorios_delete on storage.objects;

create policy relatorios_select on storage.objects
  for select using (
    bucket_id = 'relatorios' and (
      public.is_equipe()
      or public.storage_cliente_id(name) = public.meu_cliente_id()
    )
  );

create policy relatorios_insert on storage.objects
  for insert with check (
    bucket_id = 'relatorios' and public.is_equipe()
  );

create policy relatorios_update on storage.objects
  for update using (
    bucket_id = 'relatorios' and public.is_equipe()
  ) with check (
    bucket_id = 'relatorios' and public.is_equipe()
  );

create policy relatorios_delete on storage.objects
  for delete using (
    bucket_id = 'relatorios' and public.is_equipe()
  );

-- =============================================================
-- Bucket: materiais-cliente (privado)
--   Mesma regra de relatorios.
-- =============================================================
drop policy if exists materiais_select on storage.objects;
drop policy if exists materiais_insert on storage.objects;
drop policy if exists materiais_update on storage.objects;
drop policy if exists materiais_delete on storage.objects;

create policy materiais_select on storage.objects
  for select using (
    bucket_id = 'materiais-cliente' and (
      public.is_equipe()
      or public.storage_cliente_id(name) = public.meu_cliente_id()
    )
  );

create policy materiais_insert on storage.objects
  for insert with check (
    bucket_id = 'materiais-cliente' and public.is_equipe()
  );

create policy materiais_update on storage.objects
  for update using (
    bucket_id = 'materiais-cliente' and public.is_equipe()
  ) with check (
    bucket_id = 'materiais-cliente' and public.is_equipe()
  );

create policy materiais_delete on storage.objects
  for delete using (
    bucket_id = 'materiais-cliente' and public.is_equipe()
  );

-- =============================================================
-- Bucket: reunioes (privado)
--   Mesma regra de relatorios.
-- =============================================================
drop policy if exists reunioes_select on storage.objects;
drop policy if exists reunioes_insert on storage.objects;
drop policy if exists reunioes_update on storage.objects;
drop policy if exists reunioes_delete on storage.objects;

create policy reunioes_select on storage.objects
  for select using (
    bucket_id = 'reunioes' and (
      public.is_equipe()
      or public.storage_cliente_id(name) = public.meu_cliente_id()
    )
  );

create policy reunioes_insert on storage.objects
  for insert with check (
    bucket_id = 'reunioes' and public.is_equipe()
  );

create policy reunioes_update on storage.objects
  for update using (
    bucket_id = 'reunioes' and public.is_equipe()
  ) with check (
    bucket_id = 'reunioes' and public.is_equipe()
  );

create policy reunioes_delete on storage.objects
  for delete using (
    bucket_id = 'reunioes' and public.is_equipe()
  );

comment on function public.storage_cliente_id(text) is
  'Extrai o cliente_id (UUID) da primeira pasta do path de storage.objects.name.';
