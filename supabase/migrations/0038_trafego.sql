-- 0038_trafego.sql
-- Módulo Gestor de Tráfego (FASE 3 do plano):
--   trafego_checklist        — 6 itens fixos por cliente/dia
--   trafego_otimizacoes_log  — resumo semanal de otimizações (manual ou via activity log)
--   trafego_saldo_config     — 1 linha global de config do envio diário
--   trafego_saldo_contatos   — grupos/números que recebem o aviso
--   trafego_saldo_snapshot   — histórico do saldo por dia/empresa

create table if not exists public.trafego_checklist (
  id            uuid primary key default gen_random_uuid(),
  cliente_id    uuid not null references public.clientes(id) on delete cascade,
  gestor_id     uuid references public.profiles(id) on delete set null,
  data          date not null,
  item_1        boolean not null default false,
  item_2        boolean not null default false,
  item_3        boolean not null default false,
  item_4        boolean not null default false,
  item_5        boolean not null default false,
  item_6        boolean not null default false,
  observacoes   text,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),
  unique (cliente_id, data)
);
create index if not exists idx_traf_check_data on public.trafego_checklist (data desc);

create table if not exists public.trafego_otimizacoes_log (
  id                uuid primary key default gen_random_uuid(),
  cliente_id        uuid not null references public.clientes(id) on delete cascade,
  semana_inicio     date not null,
  semana_fim        date not null,
  resumo            text,
  detalhes          jsonb,
  tem_otimizacao    boolean not null default false,
  justificativa     text,
  oculto            boolean not null default false,
  atualizado_em     timestamptz not null default now(),
  unique (cliente_id, semana_inicio)
);

-- Config global (uma linha)
create table if not exists public.trafego_saldo_config (
  id                uuid primary key default gen_random_uuid(),
  ativo             boolean not null default true,
  horario           time not null default '08:00',
  piso_alerta       numeric not null default 60,
  dias_uteis_only   boolean not null default true,
  so_alertas        boolean not null default false,
  mensagem_topo     text,
  updated_at        timestamptz not null default now()
);
-- Semente inicial se estiver vazia
insert into public.trafego_saldo_config (id) select gen_random_uuid()
  where not exists (select 1 from public.trafego_saldo_config);

create table if not exists public.trafego_saldo_contatos (
  id                uuid primary key default gen_random_uuid(),
  cliente_id        uuid references public.clientes(id) on delete cascade,
  nome_grupo        text not null,
  zapi_chat_id      text not null,
  ativo             boolean not null default true,
  created_at        timestamptz not null default now()
);

create table if not exists public.trafego_saldo_snapshot (
  id                uuid primary key default gen_random_uuid(),
  data              date not null,
  cliente_id        uuid not null references public.clientes(id) on delete cascade,
  disponivel        numeric,
  gasto_ontem       numeric,
  gasto_total       numeric,
  limite            numeric,
  situacao          text,
  enviado           boolean not null default false,
  resposta_zapi     jsonb,
  created_at        timestamptz not null default now(),
  unique (data, cliente_id)
);

-- RLS: qualquer authenticated pode ler/escrever (equipe interna).
alter table public.trafego_checklist          enable row level security;
alter table public.trafego_otimizacoes_log    enable row level security;
alter table public.trafego_saldo_config       enable row level security;
alter table public.trafego_saldo_contatos     enable row level security;
alter table public.trafego_saldo_snapshot     enable row level security;

do $$ begin
  create policy p_traf_check_rw on public.trafego_checklist
    for all to authenticated using (true) with check (true);
exception when duplicate_object then null; end $$;

do $$ begin
  create policy p_traf_otim_rw on public.trafego_otimizacoes_log
    for all to authenticated using (true) with check (true);
exception when duplicate_object then null; end $$;

do $$ begin
  create policy p_traf_saldo_cfg on public.trafego_saldo_config
    for all to authenticated using (true) with check (true);
exception when duplicate_object then null; end $$;

do $$ begin
  create policy p_traf_saldo_cont on public.trafego_saldo_contatos
    for all to authenticated using (true) with check (true);
exception when duplicate_object then null; end $$;

do $$ begin
  create policy p_traf_saldo_snap on public.trafego_saldo_snapshot
    for all to authenticated using (true) with check (true);
exception when duplicate_object then null; end $$;
