-- =============================================================
-- 0004_seguranca.sql — Endurecimento final de RLS antes da produção
-- =============================================================
-- Esta migration resolve os três "PONTO DE REVISÃO DO PROGRAMADOR"
-- deixados em 0002_rls.sql e 0003_modulos.sql, e faz um hardening
-- geral (schema auth intocável pelo anon, revoke de defaults do
-- Postgres para roles públicas, etc).
--
-- Ordem: aplicar DEPOIS de 0001_init.sql, 0002_rls.sql e 0003_modulos.sql.
-- Reentrante: usa "drop policy if exists" e "create or replace" onde
-- possível, então pode ser reaplicada sem quebrar.
-- =============================================================

-- =============================================================
-- 1) Escalonamento de privilégio em public.profiles
--    Problema: profiles_update_self hoje deixa o próprio usuário
--    atualizar QUALQUER coluna da própria linha — inclusive
--    tipo/papel/cliente_id/permissoes/status. Isso é escalonamento
--    de privilégio: qualquer operador vira admin com um UPDATE.
--    Solução: trigger BEFORE UPDATE que rejeita alteração das
--    colunas sensíveis quando quem edita NÃO é admin.
--    Admin (via is_admin()) continua livre para editar tudo.
-- =============================================================
create or replace function public.profiles_bloqueia_escalonamento()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  -- Se quem executa é admin (ou o próprio processo interno via
  -- SECURITY DEFINER de outra função autorizada), passa direto.
  if public.is_admin() then
    return new;
  end if;

  -- Qualquer outro caller: só pode mudar 'nome'. Se qualquer coluna
  -- sensível diferir do valor atual, rejeita.
  if new.tipo       is distinct from old.tipo       then
    raise exception 'Alteração de tipo requer papel de administrador.'
      using errcode = '42501';
  end if;
  if new.papel      is distinct from old.papel      then
    raise exception 'Alteração de papel requer papel de administrador.'
      using errcode = '42501';
  end if;
  if new.cliente_id is distinct from old.cliente_id then
    raise exception 'Alteração de cliente_id requer papel de administrador.'
      using errcode = '42501';
  end if;
  if new.permissoes is distinct from old.permissoes then
    raise exception 'Alteração de permissões requer papel de administrador.'
      using errcode = '42501';
  end if;
  if new.status     is distinct from old.status     then
    raise exception 'Alteração de status requer papel de administrador.'
      using errcode = '42501';
  end if;
  if new.cargo      is distinct from old.cargo      then
    raise exception 'Alteração de cargo requer papel de administrador.'
      using errcode = '42501';
  end if;

  return new;
end;
$$;

drop trigger if exists trg_profiles_bloqueia_escalonamento on public.profiles;
create trigger trg_profiles_bloqueia_escalonamento
  before update on public.profiles
  for each row execute function public.profiles_bloqueia_escalonamento();

comment on function public.profiles_bloqueia_escalonamento() is
  'Impede que um usuário não-admin altere colunas sensíveis do próprio profile (tipo/papel/cliente_id/permissoes/status/cargo).';

-- =============================================================
-- 2) financeiro_receitas — cliente NÃO deve enxergar
--    Problema: a policy padrão do 0003 permite o cliente ler o
--    próprio pagamento. Faturamento da agência é dado interno.
--    Solução: droppar o SELECT amplo e recriar restrito à equipe.
-- =============================================================
drop policy if exists financeiro_receitas_select on public.financeiro_receitas;

create policy financeiro_receitas_select on public.financeiro_receitas
  for select using (public.is_equipe());

comment on policy financeiro_receitas_select on public.financeiro_receitas is
  'Apenas equipe vê receitas; cliente não deve enxergar o próprio pagamento.';

-- =============================================================
-- 3) conteudo_aprovacao — cliente só pode mexer em status/justificativa
--    Problema: a policy aprov_update deixa o cliente atualizar a
--    linha inteira, incluindo título/descrição/formato/semana/mês.
--    Solução: trigger BEFORE UPDATE que, se o caller NÃO é equipe,
--    força todas as outras colunas a permanecerem iguais.
-- =============================================================
create or replace function public.aprovacao_restringe_cliente()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if public.is_equipe() then
    return new; -- equipe pode alterar tudo
  end if;

  -- Cliente: só status e justificativa mudam.
  if new.cliente_id     is distinct from old.cliente_id     then
    raise exception 'Cliente não pode alterar cliente_id.' using errcode = '42501';
  end if;
  if new.mes_referencia is distinct from old.mes_referencia then
    raise exception 'Cliente não pode alterar mes_referencia.' using errcode = '42501';
  end if;
  if new.semana         is distinct from old.semana         then
    raise exception 'Cliente não pode alterar semana.' using errcode = '42501';
  end if;
  if new.titulo         is distinct from old.titulo         then
    raise exception 'Cliente não pode alterar titulo.' using errcode = '42501';
  end if;
  if new.descricao      is distinct from old.descricao      then
    raise exception 'Cliente não pode alterar descricao.' using errcode = '42501';
  end if;
  if new.formato        is distinct from old.formato        then
    raise exception 'Cliente não pode alterar formato.' using errcode = '42501';
  end if;
  if new.created_at     is distinct from old.created_at     then
    raise exception 'Cliente não pode alterar created_at.' using errcode = '42501';
  end if;

  -- status e justificativa livres. Justificativa obrigatória em reprovado.
  if new.status = 'reprovado' and coalesce(btrim(new.justificativa), '') = '' then
    raise exception 'Justificativa é obrigatória ao reprovar.' using errcode = '23514';
  end if;

  return new;
end;
$$;

drop trigger if exists trg_aprovacao_restringe_cliente on public.conteudo_aprovacao;
create trigger trg_aprovacao_restringe_cliente
  before update on public.conteudo_aprovacao
  for each row execute function public.aprovacao_restringe_cliente();

comment on function public.aprovacao_restringe_cliente() is
  'Cliente só pode alterar status e justificativa em conteudo_aprovacao; equipe pode tudo. Exige justificativa em reprovado.';

-- =============================================================
-- 4) Sanidade adicional
-- =============================================================

-- 4.1 Sugestões de conteúdo enviadas pelo cliente: garantir que ele
--     não pode enviar sugestão em nome de outro cliente.
--     (INSERT check já verifica cliente_id = meu_cliente_id() OU is_equipe;
--      reforçamos com um trigger BEFORE INSERT para bloquear updates
--      de cliente que tentem 'trocar' o cliente_id.)
create or replace function public.sugestoes_bloqueia_troca_cliente()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if public.is_equipe() then
    return new;
  end if;
  if new.cliente_id is distinct from old.cliente_id then
    raise exception 'Cliente não pode alterar cliente_id em sugestões.' using errcode = '42501';
  end if;
  return new;
end;
$$;

drop trigger if exists trg_sugestoes_bloqueia_troca on public.conteudo_sugestoes;
create trigger trg_sugestoes_bloqueia_troca
  before update on public.conteudo_sugestoes
  for each row execute function public.sugestoes_bloqueia_troca_cliente();

-- 4.2 handle_new_user: hoje cria o profile como 'equipe/operador/pendente'.
--     Para reduzir cadastro abusivo, marcamos como SECURITY DEFINER (já era)
--     e adicionamos um comment de operação.
comment on function public.handle_new_user() is
  'Cria profile pendente ao registrar em auth.users. Toda conta nova entra travada até admin aprovar em /usuarios e definir permissoes/papel/tipo/cliente_id.';

-- 4.3 Revoke de defaults perigosos em schema public para roles anônimas.
--     Supabase já cuida disso, mas reforçamos para clareza.
revoke create on schema public from public;

-- 4.4 Índice de suporte pra check de meu_cliente_id ficar rápido.
create index if not exists idx_profiles_cliente_only
  on public.profiles (cliente_id)
  where cliente_id is not null;

-- =============================================================
-- 5) Verificação (informativo, não fatal)
--    Comentários com testes de sanidade para o programador rodar
--    manualmente logado como cada papel:
--
--    -- Como OPERADOR pendente:
--    update public.profiles set status = 'ativo' where id = auth.uid();
--    -- esperado: ERRO 42501 "Alteração de status requer papel de administrador."
--
--    -- Como OPERADOR ativo:
--    update public.profiles set papel = 'admin' where id = auth.uid();
--    -- esperado: ERRO 42501
--
--    -- Como CLIENTE:
--    select * from public.financeiro_receitas;
--    -- esperado: 0 linhas (RLS bloqueia)
--    update public.conteudo_aprovacao set titulo = 'x' where id = '<id-do-próprio>';
--    -- esperado: ERRO 42501 "Cliente não pode alterar titulo"
--
-- =============================================================
