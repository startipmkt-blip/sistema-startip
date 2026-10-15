-- 0067_designer_reprovado_cliente.sql
-- Quando o cliente reprova um conteúdo na página de aprovação, a demanda volta para
-- "A fazer" no Designer com a justificativa dele. Estas colunas guardam o motivo e a data;
-- o aviso some do card quando a demanda volta para aprovação/concluído.

alter table public.designer_demandas
  add column if not exists reprovado_justificativa text,
  add column if not exists reprovado_em timestamptz;
