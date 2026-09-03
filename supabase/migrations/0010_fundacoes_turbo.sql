-- =============================================================
-- 0010_fundacoes_turbo.sql — Fundações baseadas no dossiê Turbo
-- =============================================================
-- Três pilares deste bloco:
--   1) Enum canônico dos 4 pilares (traffic/social/gmb/cs) + coluna pilar
--      opcional em crm_leads (herdada de parser do nome do grupo)
--   2) Tabelas de IA (ai_modules + ai_prompt_versions + ai_templates)
--      com seed dos 6 módulos catalogados no Turbo (M6 Turbo AI)
--   3) Índice de suporte pro parser de grupo WhatsApp
-- =============================================================

-- ---------- 1. Pilares ----------

do $$ begin
  create type public.pillar_key as enum ('traffic','social','gmb','cs');
exception when duplicate_object then null; end $$;

comment on type public.pillar_key is
  'Pilares canônicos da agência. Referência em src/shared/lib/pillars.ts.';

-- crm_leads.pilar — atribuído automaticamente pelo parser do nome de grupo
-- WhatsApp (🌐 [Empresa] | [Pilar]) ou manualmente pelo atendente.
alter table public.crm_leads
  add column if not exists pilar public.pillar_key;

comment on column public.crm_leads.pilar is
  'Pilar de negócio da conversa. Auto-preenchido pelo parser do nome do grupo.';

create index if not exists idx_crm_leads_pilar on public.crm_leads (pilar) where pilar is not null;

-- ---------- 2. IA — módulos, versões e templates ----------

do $$ begin
  create type public.ai_module_key as enum (
    'responder_avaliacoes',
    'otimizar_google',
    'relatorio_mensal',
    'mensagens',
    'aviso_feriado',
    'palavras_chave'
  );
exception when duplicate_object then null; end $$;

comment on type public.ai_module_key is
  'Chaves dos módulos de IA operacional (M6 Turbo AI).';

create table if not exists public.ai_modules (
  key         public.ai_module_key primary key,
  nome        text not null,
  descricao   text,
  created_at  timestamptz not null default now()
);
alter table public.ai_modules enable row level security;

-- Prompts versionados: cada key tem N versões, uma marcada is_active.
create table if not exists public.ai_prompt_versions (
  id            uuid primary key default gen_random_uuid(),
  module_key    public.ai_module_key not null references public.ai_modules(key) on delete cascade,
  prompt_body   text not null,
  tag           text,                    -- 'seed', 'manual', 'auto'
  is_active     boolean not null default false,
  created_at    timestamptz not null default now(),
  created_by    uuid references public.profiles(id)
);
alter table public.ai_prompt_versions enable row level security;

create index if not exists idx_ai_prompt_versions_module on public.ai_prompt_versions (module_key);
create unique index if not exists uq_ai_prompt_active on public.ai_prompt_versions (module_key) where is_active;

comment on table public.ai_prompt_versions is
  'Prompts do sistema versionados por módulo. Apenas uma versão is_active por module_key.';

-- Templates reutilizáveis (respostas/textos aprovados) por módulo.
create table if not exists public.ai_templates (
  id          uuid primary key default gen_random_uuid(),
  module_key  public.ai_module_key not null references public.ai_modules(key) on delete cascade,
  nome        text not null,
  body_text   text not null,
  created_at  timestamptz not null default now(),
  created_by  uuid references public.profiles(id)
);
alter table public.ai_templates enable row level security;

create index if not exists idx_ai_templates_module on public.ai_templates (module_key);

-- Policies: apenas equipe interna (RLS). Externo nunca vê prompts/templates.
drop policy if exists ai_modules_rw on public.ai_modules;
create policy ai_modules_rw on public.ai_modules
  for all using (public.is_equipe()) with check (public.is_equipe());

drop policy if exists ai_prompt_versions_rw on public.ai_prompt_versions;
create policy ai_prompt_versions_rw on public.ai_prompt_versions
  for all using (public.is_equipe()) with check (public.is_equipe());

drop policy if exists ai_templates_rw on public.ai_templates;
create policy ai_templates_rw on public.ai_templates
  for all using (public.is_equipe()) with check (public.is_equipe());

-- Seed dos 6 módulos IA (nomes em pt-BR, sem copiar prompts do Turbo).
insert into public.ai_modules (key, nome, descricao) values
  ('responder_avaliacoes', 'Responder avaliações',    'IA responde reviews do Google Meu Negócio.'),
  ('otimizar_google',      'Otimizar para Google',    'Sugestões de otimização do perfil GMN (categorias, descrição, palavras-chave).'),
  ('relatorio_mensal',     'Relatório mensal',         'Gera relatório mensal do cliente em texto/HTML.'),
  ('mensagens',            'Mensagens para clientes',  'Redige mensagens outbound (avisos, follow-ups, etc).'),
  ('aviso_feriado',        'Aviso de feriado/recesso', 'Comunicados de feriado ou recesso da agência.'),
  ('palavras_chave',       'Palavras-chave sugeridas', 'Sugere palavras-chave para SEO local (GMN).')
on conflict (key) do update set nome = excluded.nome, descricao = excluded.descricao;
