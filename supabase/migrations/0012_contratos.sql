-- =============================================================
-- 0012_contratos.sql — M14 Contratos (base local + hooks Autentique)
-- =============================================================
-- Templates de contrato + contratos por cliente. Assinatura eletrônica
-- (Autentique) fica opcional: colunas autentique_* ficam NULL até que
-- o token seja configurado e o contrato seja "enviado pra assinar".
-- =============================================================

do $$ begin
  create type public.contract_status as enum ('rascunho','aguardando','assinado','expirado','cancelado');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.contractor_type as enum ('pj','pf');
exception when duplicate_object then null; end $$;

-- ---------- Templates ----------
create table if not exists public.contract_templates (
  id           uuid primary key default gen_random_uuid(),
  nome         text not null,
  body_text    text not null,
  ativo        boolean not null default true,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);
alter table public.contract_templates enable row level security;
create trigger trg_contract_templates_updated_at
  before update on public.contract_templates
  for each row execute function public.set_updated_at();

drop policy if exists contract_templates_rw on public.contract_templates;
create policy contract_templates_rw on public.contract_templates
  for all using (public.is_equipe()) with check (public.is_equipe());

-- ---------- Contratos ----------
create table if not exists public.contracts (
  id                    uuid primary key default gen_random_uuid(),
  template_id           uuid references public.contract_templates(id) on delete set null,
  cliente_id            uuid references public.clientes(id) on delete set null,
  titulo                text not null default 'Contrato de Prestação de Serviços',
  contractor_type       public.contractor_type not null default 'pj',
  razao_social          text,
  cnpj_cpf              text,
  endereco              text,
  signer_name           text,
  signer_email          text,
  signer_phone          text,
  onboarding_value      numeric(12,2) not null default 0,
  monthly_value         numeric(12,2) not null default 0,
  duration_months       integer not null default 12,
  start_date            date not null default current_date,
  end_date              date,
  body_text             text,
  status                public.contract_status not null default 'rascunho',
  autentique_document_id text,
  autentique_url        text,
  created_at            timestamptz not null default now(),
  updated_at            timestamptz not null default now()
);
alter table public.contracts enable row level security;
create trigger trg_contracts_updated_at
  before update on public.contracts
  for each row execute function public.set_updated_at();

create index if not exists idx_contracts_cliente on public.contracts (cliente_id);
create index if not exists idx_contracts_status  on public.contracts (status);

drop policy if exists contracts_rw on public.contracts;
create policy contracts_rw on public.contracts
  for all using (public.is_equipe()) with check (public.is_equipe());

-- Signatários (multi-signer futuro; hoje 1 por contrato).
create table if not exists public.contract_signers (
  id            uuid primary key default gen_random_uuid(),
  contract_id   uuid not null references public.contracts(id) on delete cascade,
  nome          text not null,
  email         text not null,
  telefone      text,
  status        text not null default 'pendente',   -- pendente/assinado/recusado
  assinado_em   timestamptz,
  created_at    timestamptz not null default now()
);
alter table public.contract_signers enable row level security;
create index if not exists idx_contract_signers_contract on public.contract_signers (contract_id);

drop policy if exists contract_signers_rw on public.contract_signers;
create policy contract_signers_rw on public.contract_signers
  for all using (public.is_equipe()) with check (public.is_equipe());

-- ---------- Seed: um template padrão ----------
-- Corpo genérico com placeholders. Substituídos no momento do PDF.
insert into public.contract_templates (nome, body_text) values (
  'Prestação de serviços — padrão',
  E'CONTRATO DE PRESTAÇÃO DE SERVIÇOS DE MARKETING DIGITAL\n\n' ||
  E'CONTRATANTE: {{razao_social}}, {{contractor_type}} inscrita no {{cnpj_cpf}}, com endereço em {{endereco}}, neste ato representada por {{signer_name}} ({{signer_email}}).\n\n' ||
  E'CONTRATADA: Startip Marketing Digital.\n\n' ||
  E'CLÁUSULA 1 — OBJETO\nPrestação de serviços de marketing digital contratados por {{duration_months}} meses.\n\n' ||
  E'CLÁUSULA 2 — VALORES\nOnboarding único: R$ {{onboarding_value}}\nMensalidade: R$ {{monthly_value}}\n\n' ||
  E'CLÁUSULA 3 — VIGÊNCIA\nInício: {{start_date}}  ·  Término: {{end_date}}\n\n' ||
  E'CLÁUSULA 4 — RESCISÃO\nQualquer parte pode rescindir com aviso prévio de 30 dias.\n\n' ||
  E'{{data_geracao}}'
) on conflict do nothing;
