-- =============================================================
-- 0051_formularios.sql — Aba Formulários (ICP / Nicho / Unificado)
-- =============================================================
-- Substitui o uso de Google Forms/Vercel: cria formulários ligados
-- a um cliente, com link público /formulario/:slug.
-- Padrão espelhado em `onboarding_forms` + `contract_templates`.
-- =============================================================

do $$ begin
  create type public.formulario_tipo as enum ('icp','nicho','unificado');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.formulario_status as enum ('pendente','preenchido','arquivado');
exception when duplicate_object then null; end $$;

-- ---------- Modelos reutilizáveis (admin edita) ----------
create table if not exists public.formularios_modelos (
  id          uuid primary key default gen_random_uuid(),
  chave       text unique not null,
  titulo      text not null,
  descricao   text,
  -- perguntas = [{ id, tipo:'texto'|'longo'|'escolha'|'multipla', label, obrigatoria, opcoes? }]
  perguntas   jsonb not null default '[]'::jsonb,
  ativo       boolean not null default true,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);
alter table public.formularios_modelos enable row level security;
create trigger trg_formularios_modelos_updated_at
  before update on public.formularios_modelos
  for each row execute function public.set_updated_at();
drop policy if exists formularios_modelos_rw on public.formularios_modelos;
create policy formularios_modelos_rw on public.formularios_modelos
  for all using (public.is_equipe()) with check (public.is_equipe());

-- ---------- Instâncias por cliente ----------
create table if not exists public.formularios (
  id            uuid primary key default gen_random_uuid(),
  cliente_id    uuid not null references public.clientes(id) on delete cascade,
  tipo          public.formulario_tipo not null,
  modelo_id     uuid references public.formularios_modelos(id) on delete set null,
  slug          text unique not null,
  titulo        text not null,
  -- snapshot imutável das perguntas no momento da criação
  perguntas     jsonb not null,
  respostas     jsonb,
  status        public.formulario_status not null default 'pendente',
  criado_por    uuid references public.profiles(id),
  criado_em     timestamptz not null default now(),
  preenchido_em timestamptz,
  expira_em     timestamptz
);
alter table public.formularios enable row level security;

create index if not exists idx_formularios_cliente on public.formularios (cliente_id);
create index if not exists idx_formularios_status  on public.formularios (status);

drop policy if exists formularios_rw on public.formularios;
create policy formularios_rw on public.formularios
  for all using (public.is_equipe()) with check (public.is_equipe());

-- ---------- Seed do modelo ICP padrão ----------
insert into public.formularios_modelos (chave, titulo, descricao, perguntas) values (
  'icp_padrao',
  'Formulário ICP Padrão',
  'Perguntas padrão de ICP enviadas a todos os clientes. Edite as perguntas aqui para alterar o padrão.',
  '[
    {"id":"p1","tipo":"texto","label":"Nome do seu negócio","obrigatoria":true},
    {"id":"p2","tipo":"longo","label":"O que seu negócio faz, em uma frase?","obrigatoria":true},
    {"id":"p3","tipo":"longo","label":"Quem é o seu cliente ideal? (idade, perfil, dor principal)","obrigatoria":true},
    {"id":"p4","tipo":"longo","label":"Qual a principal dor que seu produto/serviço resolve?","obrigatoria":true},
    {"id":"p5","tipo":"longo","label":"Quais são seus 3 maiores diferenciais frente aos concorrentes?","obrigatoria":true},
    {"id":"p6","tipo":"texto","label":"Qual sua faixa de ticket médio?","obrigatoria":false},
    {"id":"p7","tipo":"longo","label":"Onde você quer chegar nos próximos 6 meses?","obrigatoria":false}
  ]'::jsonb
) on conflict (chave) do nothing;

comment on table public.formularios is
  'Formulários enviados a clientes (ICP padrão, adaptado ao nicho ou unificado). Slug é a chave pública.';
comment on column public.formularios.perguntas is
  'Snapshot imutável das perguntas no momento da criação (não é afetado por edição do modelo).';
comment on column public.formularios.respostas is
  'Objeto { pergunta_id: resposta_texto } preenchido pelo cliente via Edge Function pública.';
