-- 0041_otimizacoes_anexos.sql
-- Suporte a anexos (prints) nas otimizações + bucket público dedicado.

-- 1) Coluna de anexos na tabela existente.
alter table public.otimizacoes_diarias
  add column if not exists anexos jsonb not null default '[]'::jsonb;

-- 2) Atualiza a RPC pública para devolver os anexos junto.
--    Postgres não deixa alterar o tipo de retorno de uma função existente:
--    dropar antes é obrigatório.
drop function if exists public.otimizacoes_por_token(text);

create or replace function public.otimizacoes_por_token(p_token text)
returns table (
  cliente_slug text,
  data         date,
  conteudo     text,
  anexos       jsonb,
  updated_at   timestamptz
)
language sql
security definer
set search_path = public
as $$
  select o.cliente_slug, o.data, o.conteudo, o.anexos, o.updated_at
  from public.otimizacoes_diarias o
  join public.otimizacoes_links_publicos l on l.cliente_slug = o.cliente_slug
  where l.token = p_token and l.ativo = true
  order by o.data desc
$$;
grant execute on function public.otimizacoes_por_token(text) to anon, authenticated;

-- 3) Bucket público para prints das otimizações.
insert into storage.buckets (id, name, public)
values ('otimizacoes-prints', 'otimizacoes-prints', true)
on conflict (id) do nothing;

-- Policies: equipe autenticada faz upload/delete; leitura é pública (bucket public).
create policy otim_prints_insert on storage.objects
  for insert to authenticated
  with check (bucket_id = 'otimizacoes-prints');

create policy otim_prints_update on storage.objects
  for update to authenticated
  using (bucket_id = 'otimizacoes-prints')
  with check (bucket_id = 'otimizacoes-prints');

create policy otim_prints_delete on storage.objects
  for delete to authenticated
  using (bucket_id = 'otimizacoes-prints');
