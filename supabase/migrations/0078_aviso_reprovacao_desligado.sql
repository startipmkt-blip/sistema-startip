-- 0078_aviso_reprovacao_desligado.sql
-- A reprovacao do cliente ja vai direto para o designer (coluna Alteracao); o grupo da
-- equipe passa a receber so o aviso de aprovacao por padrao.
alter table public.gestao_conteudo_config alter column avisar_reprovacao set default false;
update public.gestao_conteudo_config set avisar_reprovacao = false where id;
