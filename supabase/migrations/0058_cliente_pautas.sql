-- =============================================================
-- 0058_cliente_pautas.sql — Pautas de conteúdo por cliente
-- =============================================================
-- O que deve ser criado para cada cliente (temas, linhas editoriais,
-- assuntos obrigatórios). Consultado pelo social media/designer na hora de
-- buscar e criar ideias. Uso interno da equipe.
-- =============================================================

create table if not exists public.cliente_pautas (
  id          uuid primary key default gen_random_uuid(),
  cliente_id  uuid not null references public.clientes (id) on delete cascade,
  titulo      text not null,
  descricao   text not null default '',
  ordem       int not null default 0,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create index if not exists idx_cliente_pautas_cliente on public.cliente_pautas (cliente_id, ordem);

alter table public.cliente_pautas enable row level security;

drop policy if exists p_cliente_pautas_equipe on public.cliente_pautas;
create policy p_cliente_pautas_equipe on public.cliente_pautas
  for all to authenticated using (public.is_equipe()) with check (public.is_equipe());
