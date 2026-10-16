-- =============================================================
-- 0082_cliente_lembretes.sql — Lembretes recorrentes por cliente + renovação de demandas
-- =============================================================
-- cliente_lembretes: checklist que renova sozinho a cada semana (segunda a domingo)
-- ou a cada mês. O item está "feito" se ultima_conclusao cai no período atual;
-- no período seguinte ele volta a ficar pendente sem nenhum job.
-- renovacao (demandas e designer_demandas): ao concluir a demanda, o sistema cria
-- a próxima cópia para a semana/mês seguinte.
-- =============================================================

create table if not exists public.cliente_lembretes (
  id               uuid primary key default gen_random_uuid(),
  cliente_id       uuid not null references public.clientes(id) on delete cascade,
  titulo           text not null,
  frequencia       text not null default 'semanal' check (frequencia in ('semanal', 'mensal')),
  ultima_conclusao date,
  created_at       timestamptz not null default now()
);

create index if not exists cliente_lembretes_cliente_idx on public.cliente_lembretes (cliente_id);

alter table public.cliente_lembretes enable row level security;

drop policy if exists p_cliente_lembretes_equipe on public.cliente_lembretes;
create policy p_cliente_lembretes_equipe on public.cliente_lembretes
  for all to authenticated using (public.is_equipe()) with check (public.is_equipe());

alter table public.demandas
  add column if not exists renovacao text not null default 'nenhuma'
  check (renovacao in ('nenhuma', 'semanal', 'mensal'));

alter table public.designer_demandas
  add column if not exists renovacao text not null default 'nenhuma'
  check (renovacao in ('nenhuma', 'semanal', 'mensal'));
