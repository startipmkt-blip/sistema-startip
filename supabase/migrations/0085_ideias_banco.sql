-- 0085_ideias_banco.sql
-- Banco de ideias gerais por cliente: ideias guardadas sem semana definida.
-- Depois a equipe aplica a ideia em uma semana (de qualquer mês) e ela sobe como
-- demanda "A fazer" para o Designer. Anexos no formato [{ path, name, type, size }].
create table if not exists public.ideias_banco (
  id          uuid primary key default gen_random_uuid(),
  cliente_id  uuid not null references public.clientes(id) on delete cascade,
  titulo      text not null,
  descricao   text not null default '',
  formato     text not null default 'estatico',
  anexos      jsonb not null default '[]'::jsonb,
  usada_em    timestamptz,
  usada_semana date,
  created_at  timestamptz not null default now()
);

create index if not exists idx_ideias_banco_cliente on public.ideias_banco (cliente_id, created_at desc);

alter table public.ideias_banco enable row level security;

drop policy if exists p_ideias_banco_equipe on public.ideias_banco;
create policy p_ideias_banco_equipe on public.ideias_banco
  for all to authenticated using (public.is_equipe()) with check (public.is_equipe());
