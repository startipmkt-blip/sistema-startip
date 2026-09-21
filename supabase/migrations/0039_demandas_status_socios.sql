-- Adiciona 'iuri' e 'domini' ao enum demanda_status
-- para o kanban de sócios ter colunas dedicadas por parceiro.

alter type public.demanda_status add value if not exists 'iuri' after 'aberta';
alter type public.demanda_status add value if not exists 'domini' after 'iuri';
