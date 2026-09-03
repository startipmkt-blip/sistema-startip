-- =============================================================
-- 0006_ajustes.sql — Ajustes finais descobertos na blindagem
-- =============================================================
-- 1) UNIQUE parcial em crm_leads.telefone
--    O webhook Z-API cria um lead se o telefone não existe. Sem
--    unique, duas mensagens do mesmo número chegando ao mesmo
--    tempo criam dois leads. Adicionamos unique parcial (só quando
--    telefone não é null, pra não travar leads criados manualmente
--    sem telefone).
--
-- 2) handle_new_user melhorado
--    Login por Google traz o nome em raw_user_meta_data->>'full_name'
--    (às vezes 'name'). Nosso trigger antigo só olhava 'name' —
--    resultado: usuário Google entrava com nome vazio. Corrigimos
--    pra tentar full_name → name → email.
--
-- Reentrante: idempotente com "if not exists"/"create or replace".
-- =============================================================

-- ---------- 1) UNIQUE parcial em crm_leads.telefone ----------
create unique index if not exists uq_crm_leads_telefone
  on public.crm_leads (telefone)
  where telefone is not null and telefone <> '';

-- ---------- 2) handle_new_user pega nome do Google ----------
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  nome_extraido text;
begin
  nome_extraido := coalesce(
    new.raw_user_meta_data->>'full_name',   -- Google costuma usar este
    new.raw_user_meta_data->>'name',        -- outros provedores/email
    split_part(new.email, '@', 1),          -- fallback: parte local do email
    ''
  );

  insert into public.profiles (id, nome, tipo, papel, status, permissoes)
  values (new.id, nome_extraido, 'equipe', 'operador', 'pendente', '{}');
  return new;
end;
$$;

comment on function public.handle_new_user() is
  'Cria profile pendente ao registrar em auth.users. Pega o nome do metadata (full_name > name > parte local do email). Toda conta nova entra pendente até admin aprovar em /usuarios.';
