-- =============================================================
-- 0056_tarefas_recorrentes_mensal.sql — Recorrência mensal (1 dia por mês)
-- =============================================================
-- tipo 'mensal' + dia_mes (1–31). Em meses mais curtos, vale o último dia
-- do mês (ex.: dia 31 → 28/02).
-- =============================================================

alter table public.tarefas_recorrentes
  drop constraint if exists tarefas_recorrentes_tipo_check;

alter table public.tarefas_recorrentes
  add constraint tarefas_recorrentes_tipo_check
  check (tipo in ('diaria', 'semanal', 'mensal'));

alter table public.tarefas_recorrentes
  add column if not exists dia_mes smallint
  check (dia_mes is null or dia_mes between 1 and 31);
