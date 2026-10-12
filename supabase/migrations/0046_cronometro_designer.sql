-- Liga o cronômetro ao kanban do Designer (designer_demandas).
-- registros_tempo.demanda_id aponta para `demandas`; o Designer tem tabela própria,
-- então ganha coluna própria. Cada registro pertence a uma das duas (ou a nenhuma).
alter table public.registros_tempo
  add column if not exists designer_demanda_id uuid references public.designer_demandas (id) on delete set null;

create index if not exists idx_registros_designer_demanda
  on public.registros_tempo (designer_demanda_id);

create index if not exists idx_registros_designer_aberto
  on public.registros_tempo (designer_demanda_id) where fim is null;

-- Histórico "o que ele fez": quando a demanda foi entregue/concluída.
alter table public.designer_demandas
  add column if not exists iniciado_em timestamptz,
  add column if not exists concluido_em timestamptz;
