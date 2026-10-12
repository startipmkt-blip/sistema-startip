-- =============================================================
-- 0059_cliente_regras.sql — Regras / briefing de cada cliente
-- =============================================================
-- Itens curtos por tipo: o que o cliente gosta, o que não aprova,
-- o que é obrigatório e como prefere ser atendido. Uso interno.
-- critica = regra que não pode ser quebrada (aparece em destaque).
-- =============================================================

create table if not exists public.cliente_regras (
  id          uuid primary key default gen_random_uuid(),
  cliente_id  uuid not null references public.clientes (id) on delete cascade,
  tipo        text not null check (tipo in ('gosta', 'nao_aprova', 'obrigatorio', 'prefere')),
  texto       text not null,
  critica     boolean not null default false,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create index if not exists idx_cliente_regras_cliente on public.cliente_regras (cliente_id, tipo);

alter table public.cliente_regras enable row level security;

drop policy if exists p_cliente_regras_equipe on public.cliente_regras;
create policy p_cliente_regras_equipe on public.cliente_regras
  for all to authenticated using (public.is_equipe()) with check (public.is_equipe());
