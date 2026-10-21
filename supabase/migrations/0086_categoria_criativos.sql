-- =============================================================
-- 0086_categoria_criativos.sql — Criativos de tráfego pago
-- =============================================================
-- A aba "Criativos" da Gestão de Conteúdo e a demanda do Designer usam as mesmas
-- tabelas do orgânico, separadas por `categoria`:
--   organico (padrão) → fluxo de conteúdo que já existia
--   criativo          → criativo de tráfego pago: sem meta semanal/mensal e com link
--                       de aprovação próprio (/aprovar-criativos/:slug)
-- =============================================================

alter table public.designer_demandas
  add column if not exists categoria text not null default 'organico'
    check (categoria in ('organico', 'criativo'));

alter table public.conteudo_aprovacao
  add column if not exists categoria text not null default 'organico'
    check (categoria in ('organico', 'criativo'));

create index if not exists conteudo_aprovacao_categoria_idx
  on public.conteudo_aprovacao (cliente_id, categoria, mes_referencia);
