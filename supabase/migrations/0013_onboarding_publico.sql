-- =============================================================
-- 0013_onboarding_publico.sql — Self-onboarding público (M15)
-- =============================================================
-- Link público /cadastro/:slug onde o cliente preenche o próprio
-- cadastro sem precisar de login. Ao submeter, a Edge Function
-- `onboarding-submit` valida o slug e insere/atualiza em `clientes`.
-- =============================================================

do $$ begin
  create type public.onboarding_form_status as enum (
    'pendente','preenchido','revisado','arquivado'
  );
exception when duplicate_object then null; end $$;

create table if not exists public.onboarding_forms (
  id           uuid primary key default gen_random_uuid(),
  slug         text unique not null,             -- parte final da URL pública
  cliente_id   uuid references public.clientes(id) on delete set null,  -- se link é para atualizar cliente existente
  criado_por   uuid references public.profiles(id),
  criado_em    timestamptz not null default now(),
  expira_em    timestamptz,                       -- nulo = nunca expira
  preenchido_em timestamptz,
  status       public.onboarding_form_status not null default 'pendente',
  -- Snapshot do que o cliente enviou (não sobrescreve clientes até revisão).
  dados        jsonb not null default '{}'::jsonb,
  observacoes  text
);

alter table public.onboarding_forms enable row level security;

create index if not exists idx_onboarding_forms_status on public.onboarding_forms (status);
create index if not exists idx_onboarding_forms_cliente on public.onboarding_forms (cliente_id) where cliente_id is not null;

-- Equipe interna CRUDa; público lê pelo slug via Edge Function (service role).
drop policy if exists onboarding_forms_rw on public.onboarding_forms;
create policy onboarding_forms_rw on public.onboarding_forms
  for all using (public.is_equipe()) with check (public.is_equipe());

comment on table public.onboarding_forms is
  'Link público de auto-cadastro do cliente (M15). Slug é a chave; expira_em opcional.';
comment on column public.onboarding_forms.dados is
  'Snapshot completo do que o cliente enviou: nome, cnpj, endereço, contatos, redes, credenciais.';
