-- =============================================================
-- 0011_agente_turbo.sql — Agente Turbo (M16)
-- =============================================================
-- Bot que monitora grupos WhatsApp: se um cliente escreve algo e ninguém
-- da equipe responde dentro de N minutos, cria uma linha em
-- client_requests para virar tarefa.
--
-- Camada 1 (agora): regra de timeout. Toda mensagem recebida em grupo
-- monitorado, sem resposta nossa desde o horário dela até N minutos
-- depois, gera solicitação.
-- Camada 2 (futura): LLM classifica se é "solicitação real" antes de
-- criar linha (evita ruído de "kkk", "ok", figurinhas etc).
-- =============================================================

-- Enum de status.
do $$ begin
  create type public.request_status as enum ('pendente','em_andamento','concluida','descartada');
exception when duplicate_object then null; end $$;

-- Marca o grupo como monitorado + timeout por grupo (default 10min como Turbo).
alter table public.crm_leads
  add column if not exists monitorado         boolean not null default false,
  add column if not exists timeout_minutos    integer not null default 10;

comment on column public.crm_leads.monitorado is
  'Se true, o Agente Turbo cria solicitações automáticas para mensagens sem resposta.';
comment on column public.crm_leads.timeout_minutos is
  'Tempo em minutos sem resposta antes de virar uma solicitação (default 10).';

create index if not exists idx_crm_leads_monitorado on public.crm_leads (monitorado) where monitorado = true;

-- Table client_requests.
create table if not exists public.client_requests (
  id             uuid primary key default gen_random_uuid(),
  lead_id        uuid not null references public.crm_leads(id) on delete cascade,
  mensagem_id    uuid references public.crm_mensagens(id) on delete set null,
  pilar          public.pillar_key,           -- herdado do lead
  texto          text not null,
  origem_em      timestamptz not null,        -- quando a mensagem foi enviada pelo cliente
  status         public.request_status not null default 'pendente',
  criada_em      timestamptz not null default now(),
  concluida_em   timestamptz,
  concluida_por  uuid references public.profiles(id),
  observacoes    text
);

alter table public.client_requests enable row level security;

create index if not exists idx_client_requests_lead    on public.client_requests (lead_id);
create index if not exists idx_client_requests_status  on public.client_requests (status);
create index if not exists idx_client_requests_pilar   on public.client_requests (pilar) where pilar is not null;
create unique index if not exists uq_client_requests_msg
  on public.client_requests (mensagem_id) where mensagem_id is not null;

comment on table public.client_requests is
  'Solicitações criadas automaticamente pelo Agente Turbo (M16). uq_client_requests_msg evita duplicata por mensagem.';

drop policy if exists client_requests_rw on public.client_requests;
create policy client_requests_rw on public.client_requests
  for all using (public.is_equipe()) with check (public.is_equipe());

-- Realtime para a UI notificar novas solicitações.
alter publication supabase_realtime add table public.client_requests;

-- =============================================================
-- Função: gera solicitações a partir de mensagens não respondidas
-- =============================================================
-- Uma mensagem "não respondida" é: recebida (direcao='recebida') num
-- lead monitorado, e desde o timestamp dela + timeout_minutos, não houve
-- nenhuma mensagem enviada (direcao='enviada') no mesmo lead.
-- Extra: filtra fluff (mensagens < 3 caracteres ou tipo != 'texto').
create or replace function public.gerar_solicitacoes_pendentes()
returns integer language plpgsql security definer set search_path = public as $fn$
declare
  n_inseridas integer;
begin
  with novas as (
    insert into public.client_requests (lead_id, mensagem_id, pilar, texto, origem_em)
    select
      m.lead_id,
      m.id,
      l.pilar,
      substr(m.conteudo, 1, 500),
      m.enviada_em
    from public.crm_mensagens m
    join public.crm_leads l on l.id = m.lead_id
    where m.direcao = 'recebida'
      and (m.tipo is null or m.tipo = 'texto')
      and length(coalesce(m.conteudo,'')) >= 3
      and l.monitorado = true
      and now() - m.enviada_em >= (l.timeout_minutos || ' minutes')::interval
      and not exists (
        select 1 from public.crm_mensagens r
        where r.lead_id = m.lead_id
          and r.direcao = 'enviada'
          and r.enviada_em > m.enviada_em
      )
      and not exists (
        select 1 from public.client_requests cr where cr.mensagem_id = m.id
      )
    returning id
  )
  select count(*)::int into n_inseridas from novas;
  return n_inseridas;
end
$fn$;

comment on function public.gerar_solicitacoes_pendentes() is
  'Cria linhas em client_requests para mensagens de grupos monitorados sem resposta.';

-- =============================================================
-- pg_cron: roda a cada minuto
-- =============================================================
do $$ begin
  create extension if not exists pg_cron with schema extensions;
exception when others then null; end $$;

do $$ begin
  perform cron.unschedule('agente-turbo-1min');
exception when others then null; end $$;

select cron.schedule(
  'agente-turbo-1min',
  '* * * * *',
  $$select public.gerar_solicitacoes_pendentes();$$
);
