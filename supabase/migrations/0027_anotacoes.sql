-- 0027_anotacoes.sql — bloco de anotações rápidas da equipe.
-- Pode (ou não) estar ligada a um cliente. Vira demanda com um clique.

do $$
begin
  if not exists (select 1 from pg_type where typname = 'anotacao_prioridade') then
    create type anotacao_prioridade as enum ('normal', 'importante', 'urgente');
  end if;
  if not exists (select 1 from pg_type where typname = 'anotacao_status') then
    create type anotacao_status as enum ('pendente', 'feita');
  end if;
end $$;

create table if not exists anotacoes (
  id             uuid primary key default gen_random_uuid(),
  texto          text not null,
  cliente_id     uuid references clientes(id) on delete set null,
  autor_id       uuid references profiles(id) on delete set null,
  prazo          date,
  prioridade     anotacao_prioridade not null default 'normal',
  status         anotacao_status not null default 'pendente',
  demanda_id     uuid references demandas(id) on delete set null,
  anexos         jsonb not null default '[]'::jsonb,
  criada_em      timestamptz not null default now(),
  concluida_em   timestamptz,
  concluida_por  uuid references profiles(id) on delete set null
);

create index if not exists idx_anotacoes_cliente on anotacoes (cliente_id);
create index if not exists idx_anotacoes_status  on anotacoes (status);
create index if not exists idx_anotacoes_prazo   on anotacoes (prazo);
create index if not exists idx_anotacoes_criada  on anotacoes (criada_em desc);

alter table anotacoes enable row level security;
drop policy if exists anotacoes_equipe_all on anotacoes;
create policy anotacoes_equipe_all on anotacoes
  for all using (public.is_equipe()) with check (public.is_equipe());
