-- 0034_multi_atendente.sql
-- 1 número WhatsApp, N atendentes. Fila híbrida:
--   livre → atendente puxa → em_atendimento → resolvido.

do $$ begin
  create type public.atendimento_status as enum
    ('livre','em_atendimento','aguardando_cliente','resolvido');
exception when duplicate_object then null; end $$;

alter table public.crm_leads
  add column if not exists status_atendimento public.atendimento_status not null default 'livre',
  add column if not exists atendente_desde timestamptz,
  add column if not exists prioridade text default 'normal';

create table if not exists public.crm_transferencias (
  id           uuid primary key default gen_random_uuid(),
  lead_id      uuid not null references public.crm_leads(id) on delete cascade,
  de_id        uuid references public.profiles(id),
  para_id      uuid references public.profiles(id),
  motivo       text,
  at           timestamptz not null default now()
);

create table if not exists public.crm_notas_internas (
  id           uuid primary key default gen_random_uuid(),
  lead_id      uuid not null references public.crm_leads(id) on delete cascade,
  autor_id     uuid references public.profiles(id) on delete set null,
  autor_nome   text,
  texto        text not null,
  created_at   timestamptz not null default now()
);

create index if not exists idx_notas_internas_lead
  on public.crm_notas_internas (lead_id, created_at);

create table if not exists public.crm_visualizando (
  lead_id      uuid not null references public.crm_leads(id) on delete cascade,
  user_id      uuid not null references public.profiles(id) on delete cascade,
  user_nome    text,
  ultimo_ping  timestamptz not null default now(),
  primary key (lead_id, user_id)
);

alter table public.crm_transferencias   enable row level security;
alter table public.crm_notas_internas   enable row level security;
alter table public.crm_visualizando     enable row level security;

drop policy if exists p_transf_rw on public.crm_transferencias;
create policy p_transf_rw on public.crm_transferencias
  for all to authenticated using (true) with check (true);

drop policy if exists p_notas_rw on public.crm_notas_internas;
create policy p_notas_rw on public.crm_notas_internas
  for all to authenticated using (true) with check (true);

drop policy if exists p_vis_rw on public.crm_visualizando;
create policy p_vis_rw on public.crm_visualizando
  for all to authenticated using (true) with check (true);

-- Realtime: publicações opcionais (Supabase já cobre com Realtime v2 default).
