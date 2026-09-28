-- =============================================================
-- 0042_painel_tv.sql — Painel de saúde da carteira para a TV
-- =============================================================
-- Saúde MANUAL por cliente (o score automático de 0014 fica para depois)
-- + lista manual de demandas urgentes da semana.
-- A TV abre /tv/:slug sem login; a leitura passa pela RPC security
-- definer `painel_tv`, que exige o slug secreto E o PIN da área
-- 'painel-tv' (tabela area_pins, mesmo esquema de 0018).
-- =============================================================

create table if not exists public.painel_saude_cliente (
  cliente_id  uuid primary key references public.clientes(id) on delete cascade,
  status      text not null default 'saudavel'
              check (status in ('saudavel', 'atencao', 'urgente')),
  motivo      text not null default '',
  -- Posição entre os urgentes (1 = mais urgente). Ignorada nos demais status.
  ordem       smallint,
  updated_at  timestamptz not null default now()
);

comment on table public.painel_saude_cliente is
  'Saúde manual do cliente para o painel da TV. Cliente sem linha = saudável.';

create table if not exists public.painel_demandas_urgentes (
  id            uuid primary key default gen_random_uuid(),
  titulo        text not null,
  cliente_id    uuid references public.clientes(id) on delete set null,
  responsavel   text not null default '',
  prazo         date,
  concluida     boolean not null default false,
  concluida_em  timestamptz,
  created_at    timestamptz not null default now()
);

create index if not exists idx_painel_dem_abertas
  on public.painel_demandas_urgentes (concluida, prazo);

create table if not exists public.painel_tv_config (
  id    smallint primary key default 1 check (id = 1),
  slug  text not null unique
);

alter table public.painel_saude_cliente     enable row level security;
alter table public.painel_demandas_urgentes enable row level security;
alter table public.painel_tv_config         enable row level security;

drop policy if exists p_painel_saude_equipe on public.painel_saude_cliente;
create policy p_painel_saude_equipe on public.painel_saude_cliente
  for all to authenticated using (public.is_equipe()) with check (public.is_equipe());

drop policy if exists p_painel_dem_equipe on public.painel_demandas_urgentes;
create policy p_painel_dem_equipe on public.painel_demandas_urgentes
  for all to authenticated using (public.is_equipe()) with check (public.is_equipe());

drop policy if exists p_painel_cfg_equipe_le on public.painel_tv_config;
create policy p_painel_cfg_equipe_le on public.painel_tv_config
  for select to authenticated using (public.is_equipe());

-- ---------- Leitura da TV ----------
-- Slug ou PIN errados devolvem NULL (sem dizer qual dos dois falhou).
create or replace function public.painel_tv(p_slug text, p_pin text)
returns jsonb
language sql
stable
security definer
set search_path = public
as $fn$
  select case
    when not exists (select 1 from public.painel_tv_config where slug = p_slug)
      or not exists (
        select 1 from public.area_pins
        where area_key = 'painel-tv'
          and pin_hash = encode(extensions.digest(coalesce(p_pin, ''), 'sha256'), 'hex')
      )
    then null
    else jsonb_build_object(
      'gerado_em', now(),
      'clientes', coalesce((
        select jsonb_agg(jsonb_build_object(
          'id', c.id,
          'nome', c.nome,
          'logo_url', nullif(c.logo_url, ''),
          'status', coalesce(s.status, 'saudavel'),
          'motivo', coalesce(s.motivo, ''),
          'ordem', s.ordem
        ) order by c.nome)
        from public.clientes c
        left join public.painel_saude_cliente s on s.cliente_id = c.id
        where c.status = 'ativo'
      ), '[]'::jsonb),
      'demandas', coalesce((
        select jsonb_agg(jsonb_build_object(
          'id', d.id,
          'titulo', d.titulo,
          'cliente', c.nome,
          'responsavel', d.responsavel,
          'prazo', d.prazo,
          'created_at', d.created_at
        ) order by d.prazo nulls last, d.created_at)
        from public.painel_demandas_urgentes d
        left join public.clientes c on c.id = d.cliente_id
        where not d.concluida
      ), '[]'::jsonb)
    )
  end;
$fn$;

grant execute on function public.painel_tv(text, text) to anon, authenticated;

-- ---------- Seeds ----------
insert into public.painel_tv_config (id, slug)
values (1, encode(extensions.gen_random_bytes(9), 'hex'))
on conflict (id) do nothing;

insert into public.area_pins (area_key, pin_hash)
values ('painel-tv', encode(extensions.digest('54321', 'sha256'), 'hex'))
on conflict (area_key) do nothing;

insert into public.painel_saude_cliente (cliente_id, status, ordem)
select c.id, 'urgente', u.ordem
from (values
  (1, 'creative eventos'),
  (2, 'netconnect'),
  (3, 'jose chaveiro'),
  (4, '4newtax'),
  (5, 'xm gravataí'),
  (6, 'cell quality')
) as u(ordem, nome)
join public.clientes c on lower(trim(c.nome)) = u.nome
on conflict (cliente_id) do nothing;
