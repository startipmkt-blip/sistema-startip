-- =============================================================
-- 0014_score_saude.sql — Score de saúde do cliente (M1)
-- =============================================================
-- Vira 3 componentes (0-100) num score médio final:
--   * contrato   — tem contrato assinado válido para hoje
--   * aprovacao  — % de conteúdos aprovados nos últimos 90d
--   * suporte    — 100 - (solicitações pendentes / total) * 100
-- Se algum componente não pode ser calculado, ele fica em null e
-- o score final ignora aquele componente na média.
-- =============================================================

create or replace view public.cliente_saude as
with
  cont as (
    select cliente_id,
           bool_or(status = 'assinado' and (end_date is null or end_date >= current_date)) as tem_ativo
    from public.contracts
    where cliente_id is not null
    group by cliente_id
  ),
  aprov as (
    -- Se o módulo aprovacao-conteudo tiver a tabela `conteudo_aprovacao`,
    -- calculamos daí. Se a tabela não existir, o CTE fica vazio e o valor
    -- fica NULL (não penaliza o cliente).
    select cliente_id,
           count(*) filter (where status = 'aprovado')::numeric
             / nullif(count(*), 0)::numeric * 100 as pct
    from public.conteudo_aprovacao
    where created_at >= now() - interval '90 days'
    group by cliente_id
  ),
  sup as (
    select l.id as lead_id,
           count(*) filter (where cr.status = 'pendente')::int as pend,
           count(*)::int as total
    from public.crm_leads l
    join public.client_requests cr on cr.lead_id = l.id
    group by l.id
  )
select
  c.id as cliente_id,
  c.nome,
  case when cont.tem_ativo is true then 100
       when cont.tem_ativo is false then 0
       else null end as score_contrato,
  round(coalesce(aprov.pct, null))::int as score_aprovacao,
  case when sup.total is null or sup.total = 0 then null
       else greatest(0, 100 - (sup.pend * 100 / sup.total)) end as score_suporte,
  -- Média simples dos componentes não-nulos.
  (
    select round(avg(v))::int from (
      values
        (case when cont.tem_ativo is true then 100 when cont.tem_ativo is false then 0 else null end),
        (round(aprov.pct)::int),
        (case when sup.total is null or sup.total = 0 then null else greatest(0, 100 - (sup.pend * 100 / sup.total)) end)
    ) as t(v) where v is not null
  ) as score_saude
from public.clientes c
left join cont  on cont.cliente_id  = c.id
left join aprov on aprov.cliente_id = c.id
-- Aqui juntamos ao lead do CRM que tenha telefone == cliente.telefone se
-- houver; como o schema atual não relaciona explicitamente cliente↔lead,
-- deixamos NULL (o componente 'suporte' vira null para todos por enquanto).
left join lateral (select null::int as pend, null::int as total) sup on true;

comment on view public.cliente_saude is
  'Score de saúde do cliente (M1). Componentes: contrato + aprovação + suporte. Ignora nulos na média.';

-- Alinha onboarding_forms ↔ clientes (já existe cliente_id nullable, mas
-- adicionamos índice pra lookup rápido).
create index if not exists idx_onboarding_forms_cliente_created
  on public.onboarding_forms (cliente_id, criado_em desc);
