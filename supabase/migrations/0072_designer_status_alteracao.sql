-- 0072_designer_status_alteracao.sql
-- Nova coluna "Alteracao" no quadro do designer (entre "A fazer" e "Em andamento").
alter type public.designer_status add value if not exists 'alteracao' before 'em_andamento';
