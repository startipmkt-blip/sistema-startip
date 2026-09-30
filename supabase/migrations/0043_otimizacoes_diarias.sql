-- 0040_otimizacoes_diarias.sql
-- Registro diário de otimizações de campanha por cliente + link público permanente.
-- Cliente identificado por slug fixo (13 contas, definidos no front em src/modules/otimizacoes/clientes.ts).

create table if not exists public.otimizacoes_diarias (
  id            uuid primary key default gen_random_uuid(),
  cliente_slug  text not null,
  data          date not null,
  conteudo      text not null default '',
  updated_by    uuid references public.profiles(id) on delete set null,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),
  unique (cliente_slug, data)
);
create index if not exists idx_otim_slug_data on public.otimizacoes_diarias (cliente_slug, data desc);

create table if not exists public.otimizacoes_links_publicos (
  cliente_slug  text primary key,
  token         text not null unique,
  ativo         boolean not null default true,
  created_at    timestamptz not null default now()
);

alter table public.otimizacoes_diarias        enable row level security;
alter table public.otimizacoes_links_publicos enable row level security;

create policy otim_diarias_auth on public.otimizacoes_diarias
  for all to authenticated using (true) with check (true);
create policy otim_links_auth on public.otimizacoes_links_publicos
  for all to authenticated using (true) with check (true);

-- RPC pública: retorna otimizações do cliente correspondente ao token, sem exigir auth.
create or replace function public.otimizacoes_por_token(p_token text)
returns table (
  cliente_slug text,
  data         date,
  conteudo     text,
  updated_at   timestamptz
)
language sql
security definer
set search_path = public
as $$
  select o.cliente_slug, o.data, o.conteudo, o.updated_at
  from public.otimizacoes_diarias o
  join public.otimizacoes_links_publicos l on l.cliente_slug = o.cliente_slug
  where l.token = p_token and l.ativo = true
  order by o.data desc
$$;

grant execute on function public.otimizacoes_por_token(text) to anon, authenticated;
