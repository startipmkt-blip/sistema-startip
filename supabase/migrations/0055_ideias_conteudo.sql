-- =============================================================
-- 0055_ideias_conteudo.sql — Aprovação de IDEIAS de conteúdo pelo cliente
-- =============================================================
-- Etapa anterior à produção: a equipe planeja as ideias do mês, envia ao
-- cliente e ele aprova ou reprova (reprovar exige justificativa).
-- Só depois de aprovada a ideia vira conteúdo em public.conteudo_aprovacao
-- (fluxo de arquivo editado + prévia do Drive, que já existe).
--
-- status: rascunho (interno) → enviada (cliente vê) → aprovada | reprovada
-- A escrita do cliente passa pela edge function aprovacao-publica (service
-- role); a equipe acessa direto por RLS.
-- =============================================================

create table if not exists public.ideias_conteudo (
  id                 uuid primary key default gen_random_uuid(),
  cliente_id         uuid not null references public.clientes(id) on delete cascade,
  mes_referencia     text not null check (mes_referencia ~ '^\d{4}-(0[1-9]|1[0-2])$'),
  semana             smallint not null default 1 check (semana between 1 and 6),
  titulo             text not null,
  descricao          text not null default '',
  formato            text not null default 'reels',
  dia_postagem       date,
  status             text not null default 'rascunho'
                     check (status in ('rascunho', 'enviada', 'aprovada', 'reprovada')),
  justificativa      text not null default '',
  enviado_em         timestamptz,
  decidido_em        timestamptz,
  lembrete_em        timestamptz,
  lembretes_enviados integer not null default 0,
  created_at         timestamptz not null default now(),
  updated_at         timestamptz not null default now()
);

comment on table public.ideias_conteudo is
  'Ideias de conteúdo do mês enviadas ao cliente para aprovação antes da produção.';

create index if not exists idx_ideias_conteudo_cliente_mes
  on public.ideias_conteudo (cliente_id, mes_referencia, semana);

create or replace function public.ideias_conteudo_before_write()
returns trigger language plpgsql as $$
begin
  new.updated_at := now();
  if tg_op = 'INSERT' or new.status is distinct from old.status then
    if new.status in ('aprovada', 'reprovada') then
      new.decidido_em := now();
    else
      new.decidido_em := null;
    end if;
    if new.status = 'enviada' and (tg_op = 'INSERT' or old.status is distinct from 'enviada') then
      new.enviado_em := now();
      new.lembrete_em := null;
      new.lembretes_enviados := 0;
    end if;
  end if;
  return new;
end $$;

drop trigger if exists trg_ideias_conteudo_before_write on public.ideias_conteudo;
create trigger trg_ideias_conteudo_before_write
  before insert or update on public.ideias_conteudo
  for each row execute function public.ideias_conteudo_before_write();

alter table public.ideias_conteudo enable row level security;

drop policy if exists p_ideias_conteudo_equipe on public.ideias_conteudo;
create policy p_ideias_conteudo_equipe on public.ideias_conteudo
  for all to authenticated using (public.is_equipe()) with check (public.is_equipe());
