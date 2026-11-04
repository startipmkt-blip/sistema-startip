-- Roteiros: marcar como "usado" (sai da lista principal e vai para a sub-aba Usados).
alter table public.roteiros
  add column if not exists usado_em timestamptz;

create index if not exists idx_roteiros_usado on public.roteiros (usado_em) where usado_em is not null;
