-- =============================================================
-- 0057_designer_funcoes.sql — Funções (responsabilidades) do Designer
-- =============================================================
-- Lista editável do que o designer faz e para quais clientes
-- (ex.: "Buscar ideias de conteúdo", clientes X, Y, Z).
-- todos_clientes = vale para toda a carteira; senão usa cliente_ids.
-- =============================================================

create table if not exists public.designer_funcoes (
  id              uuid primary key default gen_random_uuid(),
  titulo          text not null,
  descricao       text not null default '',
  frequencia      text not null default 'avulsa'
                  check (frequencia in ('diaria', 'semanal', 'quinzenal', 'mensal', 'avulsa')),
  todos_clientes  boolean not null default false,
  cliente_ids     uuid[] not null default '{}',
  ordem           int not null default 0,
  ativo           boolean not null default true,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

alter table public.designer_funcoes enable row level security;

drop policy if exists p_designer_funcoes_equipe on public.designer_funcoes;
create policy p_designer_funcoes_equipe on public.designer_funcoes
  for all to authenticated using (public.is_equipe()) with check (public.is_equipe());
