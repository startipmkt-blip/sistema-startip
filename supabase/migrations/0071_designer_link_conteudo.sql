-- 0071_designer_link_conteudo.sql
-- Link do conteudo pronto (ex.: arquivo no Drive) informado na demanda do designer.
-- Ao espelhar a demanda em gestao-conteudo, o link segue como link_drive do post.

alter table public.designer_demandas
  add column if not exists link_conteudo text;
