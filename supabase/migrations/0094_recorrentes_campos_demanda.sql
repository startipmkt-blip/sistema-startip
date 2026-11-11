-- =============================================================
-- 0094_recorrentes_campos_demanda.sql — Recorrentes com as mesmas opções de uma demanda
-- =============================================================
-- Os campos abaixo são copiados para o card criado no quadro no dia da recorrência.
-- status_destino: 'auto' = coluna escolhida pelo responsável (Iuri / Dhomini / Aberta).
-- =============================================================

alter table public.tarefas_recorrentes
  add column if not exists quem_responsavel   text not null default 'agencia',
  add column if not exists cliente_id         uuid references public.clientes (id) on delete set null,
  add column if not exists setor              public.demanda_setor not null default 'geral',
  add column if not exists privada            boolean not null default false,
  add column if not exists prioridade         text not null default 'media',
  add column if not exists tempo_estimado_min integer,
  add column if not exists status_destino     text not null default 'auto',
  add column if not exists links              text[] not null default '{}',
  add column if not exists anexos             jsonb not null default '[]'::jsonb,
  add column if not exists subtarefas         jsonb not null default '[]'::jsonb;
