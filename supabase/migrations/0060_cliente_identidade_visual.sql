-- =============================================================
-- 0060_cliente_identidade_visual.sql — Pasta de identidade visual do cliente
-- =============================================================
-- Arquivos (logos, manual da marca, fontes, paleta…) anexados por cliente.
-- Os arquivos ficam no bucket privado "anexos-internos"; aqui só o índice.
-- =============================================================

create table if not exists public.cliente_identidade_arquivos (
  id          uuid primary key default gen_random_uuid(),
  cliente_id  uuid not null references public.clientes (id) on delete cascade,
  path        text not null,
  name        text not null,
  type        text not null default 'application/octet-stream',
  size        bigint not null default 0,
  created_at  timestamptz not null default now()
);

create index if not exists idx_cliente_identidade_cliente
  on public.cliente_identidade_arquivos (cliente_id, created_at);

alter table public.cliente_identidade_arquivos enable row level security;

drop policy if exists p_cliente_identidade_equipe on public.cliente_identidade_arquivos;
create policy p_cliente_identidade_equipe on public.cliente_identidade_arquivos
  for all to authenticated using (public.is_equipe()) with check (public.is_equipe());
