-- Demandas de roteiros: um "documento" que agrupa vários roteiros (sub-abas).
-- Roteiros com demanda_id aparecem só dentro da demanda; sem demanda_id seguem avulsos.
create table if not exists public.roteiro_demandas (
  id             uuid primary key default gen_random_uuid(),
  cliente_id     uuid not null references public.clientes(id) on delete cascade,
  mes_referencia text not null check (mes_referencia ~ '^\d{4}-(0[1-9]|1[0-2])$'),
  tipo           text not null default 'organico' check (tipo in ('organico', 'trafego')),
  titulo         text not null,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now()
);
create index if not exists idx_roteiro_demandas_cliente_mes on public.roteiro_demandas (cliente_id, mes_referencia);

alter table public.roteiros
  add column if not exists demanda_id uuid references public.roteiro_demandas(id) on delete cascade,
  add column if not exists ordem      integer not null default 0;
create index if not exists idx_roteiros_demanda on public.roteiros (demanda_id) where demanda_id is not null;

alter table public.roteiro_demandas enable row level security;
drop policy if exists p_roteiro_demandas_equipe on public.roteiro_demandas;
create policy p_roteiro_demandas_equipe on public.roteiro_demandas for all to authenticated
  using (public.is_equipe()) with check (public.is_equipe());
