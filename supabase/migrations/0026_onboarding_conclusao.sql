-- 0026_onboarding_conclusao.sql — marca de conclusão do onboarding por cliente.
-- Cliente com linha aqui fica na aba "Concluídos".

create table if not exists onboarding_conclusao (
  cliente_id   uuid primary key references clientes(id) on delete cascade,
  concluido_em timestamptz not null default now(),
  observacoes  text
);

alter table onboarding_conclusao enable row level security;

drop policy if exists onb_conc_equipe_all on onboarding_conclusao;
create policy onb_conc_equipe_all on onboarding_conclusao
  for all using (public.is_equipe()) with check (public.is_equipe());
