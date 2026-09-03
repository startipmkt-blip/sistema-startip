-- 0020_polish_v1.sql
-- Ajustes solicitados na rodada de polish: ideias de conteúdo ganham dia
-- programado de publicação; despesas ganham suporte a categoria
-- "investimento" e a controle de parcelamento (X de Y).

-- ------- conteudo_aprovacao: dia programado de publicação ---------
alter table if exists conteudo_aprovacao
  add column if not exists dia_postagem date;

-- ------- financeiro_despesas: parcelamento e nova categoria -------
alter table if exists financeiro_despesas
  add column if not exists parcela_atual integer,
  add column if not exists parcelas_total integer;

-- Categoria era enum? Se sim, adicionar "investimento".
do $$
begin
  if exists (select 1 from pg_type where typname = 'despesa_categoria') then
    -- adiciona valor se ainda não existir
    begin
      alter type despesa_categoria add value if not exists 'investimento';
    exception when duplicate_object then null;
    end;
  end if;
end $$;
