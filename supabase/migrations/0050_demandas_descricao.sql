-- Adiciona contexto opcional às demandas sem afetar os registros existentes.
alter table public.demandas
  add column if not exists descricao text not null default '';
