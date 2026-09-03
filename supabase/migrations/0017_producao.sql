-- =============================================================
-- 0017_producao.sql — M4/M5 Produção (Video Maker + Webdesigner)
-- =============================================================
-- Mesma tabela pra vídeo e post (tipo). Fases diferentes:
--   video: planejado → captado → editado → entregue
--   post:  planejado → arte    → revisao → entregue
-- Meta mensal por cliente x tipo alimenta os KPIs (Plan / Cap / Edit / Falta).
-- =============================================================

do $$ begin
  create type public.producao_tipo as enum ('video','post');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.producao_fase as enum ('planejado','captado','editado','arte','revisao','entregue');
exception when duplicate_object then null; end $$;

create table if not exists public.producao_meta_mensal (
  cliente_id       uuid    not null references public.clientes(id) on delete cascade,
  ano              integer not null,
  mes              integer not null check (mes between 1 and 12),
  meta_video       integer not null default 0,
  meta_post        integer not null default 0,
  videomaker_id    uuid references public.profiles(id),
  webdesigner_id   uuid references public.profiles(id),
  primary key (cliente_id, ano, mes)
);
alter table public.producao_meta_mensal enable row level security;
drop policy if exists producao_meta_rw on public.producao_meta_mensal;
create policy producao_meta_rw on public.producao_meta_mensal
  for all using (public.is_equipe()) with check (public.is_equipe());

create table if not exists public.producao_tarefas (
  id                uuid primary key default gen_random_uuid(),
  cliente_id        uuid not null references public.clientes(id) on delete cascade,
  tipo              public.producao_tipo not null,
  fase              public.producao_fase not null default 'planejado',
  titulo            text not null default '',
  data_solicitacao  date,
  data_agendamento  date,
  responsavel_id    uuid references public.profiles(id),
  observacao        text,
  subtarefas        jsonb not null default '[]'::jsonb,
  escondido_ate     date,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now()
);
alter table public.producao_tarefas enable row level security;
create trigger trg_producao_tarefas_updated_at
  before update on public.producao_tarefas
  for each row execute function public.set_updated_at();

create index if not exists idx_prod_tarefas_cliente on public.producao_tarefas (cliente_id);
create index if not exists idx_prod_tarefas_fase    on public.producao_tarefas (fase);
create index if not exists idx_prod_tarefas_tipo    on public.producao_tarefas (tipo);

drop policy if exists producao_tarefas_rw on public.producao_tarefas;
create policy producao_tarefas_rw on public.producao_tarefas
  for all using (public.is_equipe()) with check (public.is_equipe());

-- View de progresso mensal por cliente x tipo.
create or replace view public.producao_progresso_mensal as
with agrup as (
  select cliente_id, tipo,
         count(*) filter (where fase in ('captado','editado','entregue','arte','revisao')) as feitos,
         count(*) filter (where fase = 'entregue') as entregues,
         count(*) as planejados_reais
  from public.producao_tarefas
  group by cliente_id, tipo
)
select
  c.id as cliente_id, c.nome,
  extract(year  from current_date)::int as ano,
  extract(month from current_date)::int as mes,
  coalesce(mm.meta_video, 0) as meta_video,
  coalesce(mm.meta_post,  0) as meta_post,
  coalesce(v.feitos, 0)      as videos_feitos,
  coalesce(v.entregues, 0)   as videos_entregues,
  coalesce(p.feitos, 0)      as posts_feitos,
  coalesce(p.entregues, 0)   as posts_entregues,
  greatest(coalesce(mm.meta_video, 0) - coalesce(v.entregues, 0), 0) as faltam_videos,
  greatest(coalesce(mm.meta_post,  0) - coalesce(p.entregues, 0), 0) as faltam_posts
from public.clientes c
left join public.producao_meta_mensal mm
  on mm.cliente_id = c.id
 and mm.ano = extract(year  from current_date)::int
 and mm.mes = extract(month from current_date)::int
left join agrup v on v.cliente_id = c.id and v.tipo = 'video'
left join agrup p on p.cliente_id = c.id and p.tipo = 'post'
where c.status = 'ativo';

comment on view public.producao_progresso_mensal is
  'Progresso do mês por cliente: meta vs entregue de vídeos e posts.';
