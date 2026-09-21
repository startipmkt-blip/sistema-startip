-- 0036_designer.sql
-- Módulo Designer: unifica demandas de artes/vídeos que hoje ficam espalhadas
-- entre conteudo_aprovacao (ideias) e o time.
-- 4 colunas: a_fazer / em_andamento / aprovacao / concluido.
-- Origens: manual, ideia_aprovada (via trigger), calendario (opcional futuro).

do $$ begin
  create type public.designer_status as enum
    ('a_fazer', 'em_andamento', 'aprovacao', 'concluido');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.designer_origem as enum
    ('manual', 'ideia_aprovada', 'calendario');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.designer_tipo as enum
    ('post', 'carrossel', 'reels', 'story', 'web', 'extra');
exception when duplicate_object then null; end $$;

create table if not exists public.designer_demandas (
  id                uuid primary key default gen_random_uuid(),
  cliente_id        uuid references public.clientes(id) on delete set null,
  titulo            text not null,
  descricao         text,
  tipo              public.designer_tipo not null default 'post',
  status            public.designer_status not null default 'a_fazer',
  responsavel_id    uuid references public.profiles(id) on delete set null,
  prazo             date,
  origem            public.designer_origem not null default 'manual',
  ideia_id          uuid,
  post_id           uuid,
  anexos            jsonb not null default '[]'::jsonb,
  ordem             int not null default 0,
  criado_por        uuid references public.profiles(id) on delete set null,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now()
);

create index if not exists idx_designer_dem_status on public.designer_demandas (status);
create index if not exists idx_designer_dem_cliente on public.designer_demandas (cliente_id);
create index if not exists idx_designer_dem_resp on public.designer_demandas (responsavel_id);

create table if not exists public.designer_demandas_comentarios (
  id           uuid primary key default gen_random_uuid(),
  demanda_id   uuid not null references public.designer_demandas(id) on delete cascade,
  autor_id     uuid references public.profiles(id) on delete set null,
  autor_nome   text,
  texto        text not null,
  created_at   timestamptz not null default now()
);

alter table public.designer_demandas enable row level security;
alter table public.designer_demandas_comentarios enable row level security;

drop policy if exists p_designer_rw on public.designer_demandas;
create policy p_designer_rw on public.designer_demandas
  for all to authenticated using (true) with check (true);

drop policy if exists p_designer_com_rw on public.designer_demandas_comentarios;
create policy p_designer_com_rw on public.designer_demandas_comentarios
  for all to authenticated using (true) with check (true);

-- Trigger: quando uma ideia em conteudo_aprovacao passa a status 'aprovado',
-- cria demanda automaticamente na coluna a_fazer.
create or replace function public.fn_ideia_aprovada_vira_demanda()
returns trigger language plpgsql as $fn$
declare
  v_tipo public.designer_tipo;
begin
  if (new.status = 'aprovado' and (old.status is distinct from new.status)) then
    -- Mapeia formato -> designer_tipo
    v_tipo := case
      when new.formato::text in ('post','feed','carrossel','carousel')
        then (case when new.formato::text = 'carrossel' or new.formato::text = 'carousel' then 'carrossel'::public.designer_tipo else 'post'::public.designer_tipo end)
      when new.formato::text = 'reels' then 'reels'::public.designer_tipo
      when new.formato::text = 'story' or new.formato::text = 'stories' then 'story'::public.designer_tipo
      else 'post'::public.designer_tipo
    end;

    insert into public.designer_demandas
      (cliente_id, titulo, descricao, tipo, status, origem, ideia_id)
    values
      (new.cliente_id,
       coalesce(new.titulo, 'Ideia aprovada'),
       new.descricao,
       v_tipo,
       'a_fazer',
       'ideia_aprovada',
       new.id)
    on conflict do nothing;
  end if;
  return new;
end;
$fn$;

drop trigger if exists tg_ideia_aprovada on public.conteudo_aprovacao;
create trigger tg_ideia_aprovada
  after update on public.conteudo_aprovacao
  for each row execute function public.fn_ideia_aprovada_vira_demanda();
