-- =============================================================
-- 0091_referencia_app_level.sql
-- Formulários e abas novas inspiradas no App Level:
--   1. Demandas: responsável agência/cliente, secundários, categoria,
--      tempo estimado, links, subtarefas, prioridade "urgente" e modelos.
--   2. Inspirações (sub-aba de Gestão de Conteúdo).
--   3. Pilares editoriais + campos novos da linha editorial (ideias_conteudo).
--   4. Roteiros de produção (orgânico ou tráfego pago).
--   5. Mapas mentais.
--   6. Processos viram POPs (categorias próprias + campos novos).
-- Só adiciona: nenhuma coluna ou dado existente é apagado.
-- =============================================================

-- ---------- 1. Demandas ----------
alter type public.demanda_prioridade add value if not exists 'urgente';

alter table public.demandas
  add column if not exists quem_responsavel text not null default 'agencia'
    check (quem_responsavel in ('agencia', 'cliente')),
  add column if not exists responsaveis_secundarios text[] not null default '{}',
  add column if not exists categoria text,
  add column if not exists tempo_estimado_min integer check (tempo_estimado_min is null or tempo_estimado_min >= 0),
  add column if not exists links text[] not null default '{}',
  add column if not exists subtarefas jsonb not null default '[]'::jsonb;

create table if not exists public.demanda_modelos (
  id         uuid primary key default gen_random_uuid(),
  nome       text not null,
  dados      jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ---------- 2. Inspirações ----------
create table if not exists public.inspiracoes (
  id         uuid primary key default gen_random_uuid(),
  cliente_id uuid references public.clientes(id) on delete cascade,
  titulo     text not null,
  formato    text not null default 'video',
  origem     text not null default 'tendencia',
  link       text,
  capa       jsonb,
  descricao  text not null default '',
  insights   text not null default '',
  tags       text[] not null default '{}',
  arquivada  boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists idx_inspiracoes_cliente on public.inspiracoes (cliente_id, arquivada);

-- ---------- 3. Pilares editoriais + linha editorial ----------
create table if not exists public.pilares_editoriais (
  id         uuid primary key default gen_random_uuid(),
  cliente_id uuid references public.clientes(id) on delete cascade,
  nome       text not null,
  cor        text not null default '#1e9be0',
  ordem      integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

insert into public.pilares_editoriais (nome, cor, ordem)
select v.nome, v.cor, v.ordem
from (values
  ('Autoridade', '#3b82f6', 1), ('Educação', '#10b981', 2), ('Inspiração', '#f59e0b', 3),
  ('Vendas', '#ef4444', 4), ('Engajamento', '#8b5cf6', 5), ('Conexão', '#ec4899', 6)
) as v(nome, cor, ordem)
where not exists (select 1 from public.pilares_editoriais);

alter table public.ideias_conteudo
  add column if not exists pilar_id      uuid references public.pilares_editoriais(id) on delete set null,
  add column if not exists plataformas   text[] not null default '{}',
  add column if not exists funil         text,
  add column if not exists como_aplicar  text not null default '',
  add column if not exists cenas         jsonb not null default '[]'::jsonb,
  add column if not exists inspiracao_id uuid references public.inspiracoes(id) on delete set null;

-- ---------- 4. Roteiros ----------
create table if not exists public.roteiros (
  id              uuid primary key default gen_random_uuid(),
  cliente_id      uuid not null references public.clientes(id) on delete cascade,
  mes_referencia  text not null check (mes_referencia ~ '^\d{4}-(0[1-9]|1[0-2])$'),
  tipo            text not null default 'organico' check (tipo in ('organico', 'trafego')),
  titulo          text not null,
  pilar_id        uuid references public.pilares_editoriais(id) on delete set null,
  semana          smallint not null default 1 check (semana between 1 and 6),
  formato         text not null default 'reels',
  plataformas     text[] not null default '{}',
  funil           text,
  gatilhos        text[] not null default '{}',
  descricao       text not null default '',
  como_aplicar    text not null default '',
  observacao      text not null default '',
  link_inspiracao text,
  anexos          jsonb not null default '[]'::jsonb,
  cenas           jsonb not null default '[]'::jsonb,
  legenda         text not null default '',
  data_publicacao date,
  status          text not null default 'pendente' check (status in ('pendente', 'concluido')),
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);
create index if not exists idx_roteiros_cliente_mes on public.roteiros (cliente_id, mes_referencia);

-- ---------- 5. Mapas mentais ----------
create table if not exists public.mapas_mentais (
  id         uuid primary key default gen_random_uuid(),
  titulo     text not null default 'Novo Mapa Mental',
  cliente_id uuid references public.clientes(id) on delete set null,
  dados      jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ---------- 6. Processos → POPs ----------
create table if not exists public.processo_categorias (
  id         uuid primary key default gen_random_uuid(),
  nome       text not null,
  cor        text not null default '#1e9be0',
  ordem      integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.processos
  add column if not exists categoria_id    uuid references public.processo_categorias(id) on delete set null,
  add column if not exists capa            jsonb,
  add column if not exists versao          text not null default '1.0',
  add column if not exists status          text not null default 'ativo'
    check (status in ('ativo', 'rascunho', 'inativo', 'arquivado')),
  add column if not exists responsavel     text not null default '',
  add column if not exists objetivo        text not null default '',
  add column if not exists quem_executa    text not null default '',
  add column if not exists quem_aprova     text not null default '',
  add column if not exists quem_impactado  text not null default '',
  add column if not exists quando_utilizar text not null default '',
  add column if not exists materiais       text not null default '',
  add column if not exists video_url       text,
  add column if not exists passos          jsonb not null default '[]'::jsonb,
  add column if not exists restricoes      text[] not null default '{}';

-- Categorias antigas (enum) viram categorias editáveis, e cada POP é ligado à sua.
insert into public.processo_categorias (nome, ordem)
select distinct
  case p.categoria
    when 'trafego' then 'Tráfego' when 'atendimento' then 'Atendimento' when 'design' then 'Design'
    when 'financeiro' then 'Financeiro' when 'onboarding' then 'Onboarding' else 'Geral' end,
  0
from public.processos p
where not exists (select 1 from public.processo_categorias);

update public.processos p
set categoria_id = c.id
from public.processo_categorias c
where p.categoria_id is null
  and c.nome = case p.categoria
    when 'trafego' then 'Tráfego' when 'atendimento' then 'Atendimento' when 'design' then 'Design'
    when 'financeiro' then 'Financeiro' when 'onboarding' then 'Onboarding' else 'Geral' end;

-- ---------- RLS: tabelas novas são internas da equipe ----------
do $$
declare t text;
begin
  foreach t in array array['demanda_modelos', 'inspiracoes', 'pilares_editoriais', 'roteiros', 'mapas_mentais', 'processo_categorias']
  loop
    execute format('alter table public.%I enable row level security', t);
    execute format('drop policy if exists p_%s_equipe on public.%I', t, t);
    execute format(
      'create policy p_%s_equipe on public.%I for all to authenticated using (public.is_equipe()) with check (public.is_equipe())',
      t, t);
  end loop;
end $$;
