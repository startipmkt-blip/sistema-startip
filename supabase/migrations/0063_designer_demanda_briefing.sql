-- Demanda do designer: briefing separado da descrição.
-- `descricao` continua sendo o resumo da demanda; `briefing` leva as instruções de criação.
alter table public.designer_demandas add column if not exists briefing text;
