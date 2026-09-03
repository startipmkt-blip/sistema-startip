-- =============================================================
-- 0028_meta_ads.sql — Integração Meta Ads (Marketing API)
-- + expansão do dashboard de Diretoria (view por cliente / carteira)
-- =============================================================

-- ---------- Extensão de contas_anuncio ----------
alter table if exists public.contas_anuncio
  add column if not exists access_token        text,
  add column if not exists sincronizacao_ativa boolean not null default false,
  add column if not exists ultima_sync_at      timestamptz,
  add column if not exists ultimo_erro_sync    text,
  add column if not exists moeda               text default 'BRL';

comment on column public.contas_anuncio.access_token is
  'System User Token (long-lived) do Business Manager. Só edge functions leem — RLS impede leitura via anon/authenticated.';

-- Restringe leitura do access_token: policy geral fica pra dados públicos,
-- mas o token só é lido no server (service_role). Como RLS já bloqueia
-- select para não-admin, nada muda para clientes. Ainda assim, é bom
-- deixar comentado o modelo: quem edita a conta é admin.
alter table public.contas_anuncio enable row level security;
drop policy if exists contas_anuncio_admin_rw on public.contas_anuncio;
create policy contas_anuncio_admin_rw on public.contas_anuncio
  for all using (public.is_admin()) with check (public.is_admin());

-- ---------- Cache de métricas diárias por campanha ----------
create table if not exists public.meta_ads_metricas_diarias (
  id                bigserial primary key,
  conta_id          uuid not null references public.contas_anuncio(id) on delete cascade,
  cliente_id        uuid not null references public.clientes(id) on delete cascade,
  dia               date not null,
  nivel             text not null default 'campaign', -- 'account' | 'campaign' | 'adset'
  objeto_id         text,                              -- id da campanha/adset
  objeto_nome       text,                              -- nome da campanha/adset
  spend             numeric(12,2) not null default 0,
  impressions       bigint not null default 0,
  reach             bigint not null default 0,
  clicks            bigint not null default 0,
  conversions       numeric(12,2) not null default 0,  -- soma de purchase/lead conforme cliente
  valor_conversao   numeric(12,2) not null default 0,  -- soma de action_values (roas)
  cpm               numeric(12,4) not null default 0,
  cpc               numeric(12,4) not null default 0,
  ctr               numeric(6,4)  not null default 0,
  atualizado_em     timestamptz not null default now()
);

create unique index if not exists uq_meta_ads_dia_objeto
  on public.meta_ads_metricas_diarias (conta_id, dia, coalesce(objeto_id, ''));
create index if not exists idx_meta_ads_cliente_dia
  on public.meta_ads_metricas_diarias (cliente_id, dia desc);

alter table public.meta_ads_metricas_diarias enable row level security;

-- Leitura: qualquer authenticated (equipe) pode ver métricas. Cliente vê só as próprias.
drop policy if exists meta_ads_metricas_ro on public.meta_ads_metricas_diarias;
create policy meta_ads_metricas_ro on public.meta_ads_metricas_diarias
  for select using (
    public.is_admin()
    or exists (
      select 1 from public.profiles p
      where p.id = auth.uid()
        and (p.tipo = 'equipe' or (p.tipo = 'cliente' and p.cliente_id = meta_ads_metricas_diarias.cliente_id))
    )
  );

-- Escrita: só service_role (edge function faz isso ignorando RLS).
drop policy if exists meta_ads_metricas_admin_wr on public.meta_ads_metricas_diarias;
create policy meta_ads_metricas_admin_wr on public.meta_ads_metricas_diarias
  for all using (public.is_admin()) with check (public.is_admin());

-- ---------- View: agregados por cliente (últimos 30d) ----------
create or replace view public.meta_ads_cliente_30d as
select
  cliente_id,
  coalesce(sum(spend), 0)::numeric(12,2)             as spend_30d,
  coalesce(sum(impressions), 0)::bigint              as impressions_30d,
  coalesce(sum(clicks), 0)::bigint                   as clicks_30d,
  coalesce(sum(conversions), 0)::numeric(12,2)       as conversions_30d,
  coalesce(sum(valor_conversao), 0)::numeric(12,2)   as valor_conversao_30d,
  case when coalesce(sum(spend), 0) > 0
       then round(sum(valor_conversao) / sum(spend), 2)
       else 0 end                                    as roas_30d,
  case when coalesce(sum(conversions), 0) > 0
       then round(sum(spend) / sum(conversions), 2)
       else 0 end                                    as cpa_30d,
  case when coalesce(sum(impressions), 0) > 0
       then round((sum(clicks)::numeric / sum(impressions)) * 100, 2)
       else 0 end                                    as ctr_30d,
  max(dia)                                            as ultimo_dia
from public.meta_ads_metricas_diarias
where dia >= current_date - interval '30 days'
group by cliente_id;

comment on view public.meta_ads_cliente_30d is
  'Agregado de tráfego pago por cliente nos últimos 30 dias.';

-- ---------- View: carteira executiva (uma linha por cliente) ----------
create or replace view public.diretoria_carteira as
select
  c.id                                          as cliente_id,
  c.nome                                        as cliente_nome,
  c.status                                      as cliente_status,
  c.tipo_negocio                                as tipo_negocio,
  c.servicos                                    as servicos,
  c.data_entrada                                as entrou_em,
  coalesce(saude.score_saude, 0)                as saude,
  coalesce((
    select sum(monthly_value)
    from public.contracts ct
    where ct.cliente_id = c.id
      and ct.status = 'assinado'
      and (ct.end_date is null or ct.end_date >= current_date)
  ), 0)::numeric(12,2)                          as mrr,
  coalesce(m30.spend_30d, 0)                    as spend_30d,
  coalesce(m30.impressions_30d, 0)              as impressions_30d,
  coalesce(m30.clicks_30d, 0)                   as clicks_30d,
  coalesce(m30.conversions_30d, 0)              as conversions_30d,
  coalesce(m30.roas_30d, 0)                     as roas_30d,
  coalesce(m30.cpa_30d, 0)                      as cpa_30d,
  coalesce(m30.ctr_30d, 0)                      as ctr_30d,
  m30.ultimo_dia                                as ultima_metrica_em,
  (select count(*) from public.contas_anuncio ca
    where ca.cliente_id = c.id and ca.plataforma = 'meta' and ca.sincronizacao_ativa) > 0
                                                as trafego_conectado
from public.clientes c
left join public.cliente_saude saude on saude.cliente_id = c.id
left join public.meta_ads_cliente_30d m30 on m30.cliente_id = c.id;

comment on view public.diretoria_carteira is
  'Uma linha por cliente com MRR, saúde e resumo de tráfego (30d) para o dashboard executivo.';

-- ---------- View: agregado geral de tráfego (30d) para diretoria ----------
create or replace view public.diretoria_trafego_30d as
select
  coalesce(sum(spend_30d), 0)::numeric(14,2)              as spend_total,
  coalesce(sum(impressions_30d), 0)::bigint               as impressions_total,
  coalesce(sum(clicks_30d), 0)::bigint                    as clicks_total,
  coalesce(sum(conversions_30d), 0)::numeric(14,2)        as conversions_total,
  case when sum(spend_30d) > 0
       then round(sum(valor_conversao_30d) / sum(spend_30d), 2)
       else 0 end                                          as roas_medio,
  case when sum(conversions_30d) > 0
       then round(sum(spend_30d) / sum(conversions_30d), 2)
       else 0 end                                          as cpa_medio,
  count(*) filter (where spend_30d > 0)::int              as clientes_ativos_trafego
from public.meta_ads_cliente_30d;

-- ---------- View: spend por dia (últimos 30d) para gráfico ----------
create or replace view public.diretoria_trafego_diario as
select
  dia,
  sum(spend)::numeric(14,2) as spend,
  sum(clicks)::bigint       as clicks,
  sum(conversions)::numeric(14,2) as conversions
from public.meta_ads_metricas_diarias
where dia >= current_date - interval '30 days'
group by dia
order by dia;

-- ---------- RPC helper: forçar sincronização (chamada pelo botão) ----------
-- Recebe o cliente_id e retorna as contas que devem ser sincronizadas.
-- A edge function `meta-ads-sync` faz o trabalho de fato.
create or replace function public.contas_meta_a_sincronizar(p_cliente_id uuid default null)
returns table (
  conta_id     uuid,
  cliente_id   uuid,
  id_externo   text,
  access_token text
)
language sql security definer set search_path = public as $fn$
  select ca.id, ca.cliente_id, ca.id_externo, ca.access_token
    from public.contas_anuncio ca
   where ca.plataforma = 'meta'
     and ca.sincronizacao_ativa
     and ca.access_token is not null
     and (p_cliente_id is null or ca.cliente_id = p_cliente_id);
$fn$;

revoke all on function public.contas_meta_a_sincronizar(uuid) from public;
grant execute on function public.contas_meta_a_sincronizar(uuid) to service_role;
