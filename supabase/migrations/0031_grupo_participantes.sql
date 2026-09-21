-- 0031_grupo_participantes.sql
-- Cache local dos participantes de grupos WhatsApp (via Z-API group-metadata).

create table if not exists public.crm_grupo_participantes (
  id            uuid primary key default gen_random_uuid(),
  lead_id       uuid not null references public.crm_leads(id) on delete cascade,
  telefone      text not null,
  nome          text,
  is_admin      boolean not null default false,
  is_super_admin boolean not null default false,
  atualizado_em timestamptz not null default now(),
  unique (lead_id, telefone)
);

create index if not exists idx_grupo_participantes_lead
  on public.crm_grupo_participantes (lead_id);

alter table public.crm_grupo_participantes enable row level security;

drop policy if exists p_grupo_part_read on public.crm_grupo_participantes;
create policy p_grupo_part_read
  on public.crm_grupo_participantes
  for select
  to authenticated
  using (true);

drop policy if exists p_grupo_part_write on public.crm_grupo_participantes;
create policy p_grupo_part_write
  on public.crm_grupo_participantes
  for all
  to authenticated
  using (true)
  with check (true);

alter table if exists public.crm_leads
  add column if not exists grupo_owner_telefone text,
  add column if not exists grupo_assunto text,
  add column if not exists grupo_metadata_em timestamptz;
