-- Liga o cronômetro às demandas: ao colocar uma demanda "Em andamento" o sistema
-- abre um registro em registros_tempo e o fecha quando ela sai desse status.
alter table public.registros_tempo
  add column if not exists demanda_id uuid references public.demandas (id) on delete set null;

create index if not exists idx_registros_demanda_aberta
  on public.registros_tempo (demanda_id) where fim is null;
