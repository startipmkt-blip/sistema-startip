-- 0077_aviso_aprovacao_equipe.sql
-- Avisa o grupo interno quando o cliente APROVA (ja existia o aviso de reprovacao).
alter table public.gestao_conteudo_config
  add column if not exists avisar_aprovacao boolean not null default true;
