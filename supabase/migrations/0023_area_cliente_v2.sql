-- 0023_area_cliente_v2.sql — Expansão da Central do Cliente.
-- Adiciona:
--   * conteudos_entregues     — o que foi publicado/produzido pro cliente
--   * otimizacoes_trafego     — log de otimizações do gestor de tráfego
--   * investimento_semanal    — quanto foi investido em anúncios (por semana)
--   * avisos_cliente          — quadro de avisos / manual do cliente
--   * cliente_persona         — persona + planejamento estratégico
--   * coluna visivel_cliente  — em conteudo_aprovacao (default true = mantém
--                                comportamento atual; futuro fluxo IA cria false)

-- ---------- Rascunho vs Publicado nas ideias ----------
alter table if exists conteudo_aprovacao
  add column if not exists visivel_cliente boolean not null default true;

-- ---------- Conteúdos entregues ----------
create table if not exists conteudos_entregues (
  id           uuid primary key default gen_random_uuid(),
  cliente_id   uuid not null references clientes(id) on delete cascade,
  tipo         text not null default 'post',   -- post | reels | story | video | outro
  titulo       text not null,
  descricao    text,
  url          text,                          -- link do post publicado
  thumb_url    text,                          -- opcional
  entregue_em  date not null default current_date,
  autor_id     uuid references profiles(id) on delete set null,
  created_at   timestamptz not null default now()
);
create index if not exists idx_entregues_cliente on conteudos_entregues (cliente_id, entregue_em desc);
alter table conteudos_entregues enable row level security;
drop policy if exists ent_equipe_all on conteudos_entregues;
create policy ent_equipe_all on conteudos_entregues
  for all using (public.is_equipe()) with check (public.is_equipe());

-- ---------- Otimizações do gestor de tráfego ----------
create table if not exists otimizacoes_trafego (
  id           uuid primary key default gen_random_uuid(),
  cliente_id   uuid not null references clientes(id) on delete cascade,
  titulo       text not null,
  descricao    text,
  plataforma   text default 'meta',           -- meta | google | outro
  autor_id     uuid references profiles(id) on delete set null,
  criada_em    timestamptz not null default now()
);
create index if not exists idx_otim_cliente on otimizacoes_trafego (cliente_id, criada_em desc);
alter table otimizacoes_trafego enable row level security;
drop policy if exists otim_equipe_all on otimizacoes_trafego;
create policy otim_equipe_all on otimizacoes_trafego
  for all using (public.is_equipe()) with check (public.is_equipe());

-- ---------- Investimento semanal (relatório do dia a dia) ----------
create table if not exists investimento_semanal (
  id                 uuid primary key default gen_random_uuid(),
  cliente_id         uuid not null references clientes(id) on delete cascade,
  semana_inicio      date not null,          -- segunda-feira
  investimento_total numeric(12,2) not null default 0,
  media_diaria       numeric(12,2) not null default 0,
  observacoes        text,
  created_at         timestamptz not null default now(),
  unique (cliente_id, semana_inicio)
);
create index if not exists idx_inv_cliente on investimento_semanal (cliente_id, semana_inicio desc);
alter table investimento_semanal enable row level security;
drop policy if exists inv_equipe_all on investimento_semanal;
create policy inv_equipe_all on investimento_semanal
  for all using (public.is_equipe()) with check (public.is_equipe());

-- ---------- Avisos / manual do cliente ----------
create table if not exists avisos_cliente (
  id          uuid primary key default gen_random_uuid(),
  cliente_id  uuid not null references clientes(id) on delete cascade,
  titulo      text not null,
  conteudo    text not null,
  criado_em   timestamptz not null default now()
);
create index if not exists idx_avisos_cliente on avisos_cliente (cliente_id, criado_em desc);
alter table avisos_cliente enable row level security;
drop policy if exists avisos_equipe_all on avisos_cliente;
create policy avisos_equipe_all on avisos_cliente
  for all using (public.is_equipe()) with check (public.is_equipe());

-- ---------- Persona + planejamento estratégico ----------
create table if not exists cliente_persona (
  cliente_id                 uuid primary key references clientes(id) on delete cascade,
  persona                    text,          -- descrição do avatar ideal
  planejamento_estrategico   text,          -- objetivos / posicionamento
  tom_de_voz                 text,
  produtos_servicos          text,
  atualizado_em              timestamptz not null default now()
);
alter table cliente_persona enable row level security;
drop policy if exists persona_equipe_all on cliente_persona;
create policy persona_equipe_all on cliente_persona
  for all using (public.is_equipe()) with check (public.is_equipe());
