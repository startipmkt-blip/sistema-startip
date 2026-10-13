-- 0066_conteudo_aprovacao_designer_demanda.sql
-- Liga o post de gestão de conteúdo à demanda do designer que o originou.
-- Serve só para idempotência: quando o Gabriel move uma demanda para
-- "Aguardando aprovação" ou "Concluído" o frontend cria um post espelho
-- em conteudo_aprovacao; esta coluna evita duplicata se ele oscilar.

alter table public.conteudo_aprovacao
  add column if not exists designer_demanda_id uuid
    references public.designer_demandas(id) on delete set null;

create unique index if not exists conteudo_aprovacao_designer_demanda_uq
  on public.conteudo_aprovacao (designer_demanda_id)
  where designer_demanda_id is not null;
