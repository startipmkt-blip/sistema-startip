-- =============================================================
-- 0016_agenda.sql — M10 Agenda (Gestor de Projetos → agenda)
-- =============================================================
-- Modelo Turbo: um agendamento pode ter várias empresas, vários
-- responsáveis e vários pilares (arrays). Templates guardam títulos
-- padrão (Captação de Vídeos, Reunião de Métricas etc).
-- =============================================================

do $$ begin
  create type public.agenda_status as enum ('agendado','concluido','reagendado','desistencia');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.agenda_recorrencia as enum ('none','daily','weekly','biweekly','monthly');
exception when duplicate_object then null; end $$;

-- Templates de agendamento (biblioteca de títulos).
create table if not exists public.agenda_templates (
  id                     uuid primary key default gen_random_uuid(),
  titulo                 text not null,
  pilares_padrao         public.pillar_key[] not null default '{}',
  duracao_min_padrao     integer not null default 60,
  created_at             timestamptz not null default now()
);
alter table public.agenda_templates enable row level security;
drop policy if exists agenda_templates_rw on public.agenda_templates;
create policy agenda_templates_rw on public.agenda_templates
  for all using (public.is_equipe()) with check (public.is_equipe());

-- Eventos da agenda (multi-select em tudo que faz sentido).
create table if not exists public.agenda_events (
  id                uuid primary key default gen_random_uuid(),
  titulo            text not null,
  descricao         text,
  data              date not null,
  hora              time not null default '09:00',
  duracao_min       integer not null default 60,
  clientes          uuid[]              not null default '{}',
  responsaveis      uuid[]              not null default '{}',
  pilares           public.pillar_key[] not null default '{}',
  status            public.agenda_status not null default 'agendado',
  lembrete_min      integer,                       -- 5/15/30/60/120/1440
  recorrencia       public.agenda_recorrencia not null default 'none',
  criador_id        uuid references public.profiles(id),
  virou_tarefa_id   uuid,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now()
);
alter table public.agenda_events enable row level security;
create trigger trg_agenda_events_updated_at
  before update on public.agenda_events
  for each row execute function public.set_updated_at();

create index if not exists idx_agenda_events_data     on public.agenda_events (data);
create index if not exists idx_agenda_events_status   on public.agenda_events (status);
create index if not exists idx_agenda_events_clientes on public.agenda_events using gin (clientes);
create index if not exists idx_agenda_events_resps    on public.agenda_events using gin (responsaveis);

drop policy if exists agenda_events_rw on public.agenda_events;
create policy agenda_events_rw on public.agenda_events
  for all using (public.is_equipe()) with check (public.is_equipe());

-- Bloqueios (dia todo ou intervalo) por responsável.
create table if not exists public.agenda_bloqueios (
  id             uuid primary key default gen_random_uuid(),
  responsavel_id uuid not null references public.profiles(id) on delete cascade,
  de             timestamptz not null,
  ate            timestamptz not null,
  motivo         text,
  created_at     timestamptz not null default now()
);
alter table public.agenda_bloqueios enable row level security;
create index if not exists idx_agenda_bloqueios_resp on public.agenda_bloqueios (responsavel_id, de);

drop policy if exists agenda_bloqueios_rw on public.agenda_bloqueios;
create policy agenda_bloqueios_rw on public.agenda_bloqueios
  for all using (public.is_equipe()) with check (public.is_equipe());

-- Seed de templates comuns.
insert into public.agenda_templates (titulo, pilares_padrao, duracao_min_padrao) values
  ('Reunião de Alinhamento',        '{"cs"}',        60),
  ('Reunião de Métricas (online)',  '{"traffic"}',   60),
  ('Reunião de Métricas (presencial)','{"traffic"}',   90),
  ('Captação de Vídeos',            '{"social"}',    120),
  ('Onboarding do cliente',         '{"cs"}',        90),
  ('Otimização GMN',                '{"gmb"}',       30)
on conflict do nothing;
