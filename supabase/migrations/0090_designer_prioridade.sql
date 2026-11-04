-- Prioridade das demandas do Designer: as mais importantes sobem na coluna.
alter table public.designer_demandas
  add column if not exists prioridade text not null default 'normal'
  check (prioridade in ('urgente', 'alta', 'normal', 'baixa'));
