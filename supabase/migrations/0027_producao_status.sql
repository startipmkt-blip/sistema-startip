-- 0027_producao_status.sql — Kanban de produção nas ideias aprovadas.
-- Só aparece no módulo Conteúdo quando o cliente aprovou (status='aprovado').
-- O designer move entre: ideia → producao → aprovacao_interna → publicado.

alter table if exists conteudo_aprovacao
  add column if not exists producao_status text not null default 'ideia';

comment on column conteudo_aprovacao.producao_status is
  'Etapa da produção: ideia | producao | aprovacao_interna | publicado. Só relevante quando status=aprovado.';
