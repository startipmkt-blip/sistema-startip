-- 0074_designer_semana_ref.sql
-- Semana escolhida para a demanda do designer (data de inicio da semana).
-- Quando preenchida, define em que semana/mes a demanda aparece, sem depender de prazo.
alter table public.designer_demandas
  add column if not exists semana_ref date;
