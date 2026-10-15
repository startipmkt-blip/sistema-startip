-- 0076_designer_alteracao_obs.sql
-- Observacao de alteracao escrita pela equipe (Gestor/Yuri) ao mandar a demanda
-- para "Alteracao" manualmente, igual ao motivo que vem da reprovacao do cliente.
alter table public.designer_demandas
  add column if not exists alteracao_obs text;
