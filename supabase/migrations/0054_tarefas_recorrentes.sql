-- =============================================================
-- 0054_tarefas_recorrentes.sql — Tarefas recorrentes persistidas
-- =============================================================
-- Antes viviam só em memória do navegador (sumiam/voltavam ao recarregar).
-- dias_semana: 0=Dom … 6=Sáb (vários dias por tarefa; vazio quando 'diaria').
-- responsaveis: vários por tarefa.
-- ultima_conclusao: dia (YYYY-MM-DD) em que a tarefa foi marcada como feita.
-- =============================================================

create table if not exists public.tarefas_recorrentes (
  id               uuid primary key default gen_random_uuid(),
  titulo           text not null,
  descricao        text not null default '',
  responsaveis     text[] not null default '{}',
  tipo             text not null default 'semanal' check (tipo in ('diaria', 'semanal')),
  dias_semana      smallint[] not null default '{}'
                   check (dias_semana <@ array[0,1,2,3,4,5,6]::smallint[]),
  horario          text not null default '',
  ultima_conclusao date,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);

alter table public.tarefas_recorrentes enable row level security;

drop policy if exists p_tarefas_recorrentes_equipe on public.tarefas_recorrentes;
create policy p_tarefas_recorrentes_equipe on public.tarefas_recorrentes
  for all to authenticated using (public.is_equipe()) with check (public.is_equipe());
