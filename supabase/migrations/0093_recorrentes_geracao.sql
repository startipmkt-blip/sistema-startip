-- =============================================================
-- 0093_recorrentes_geracao.sql — Controle da geração diária de demandas
-- =============================================================
-- No dia da recorrência, o app cria uma demanda no quadro (Aberta / Iuri / Dhomini).
-- ultima_geracao evita duplicar: só quem "reivindicar" o dia (update condicional) cria a demanda.
-- =============================================================

alter table public.tarefas_recorrentes
  add column if not exists ultima_geracao date;
