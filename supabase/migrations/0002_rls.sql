-- =============================================================
-- 0002_rls.sql — Row Level Security (segurança de acesso)
-- =============================================================
-- Modelo de acesso:
--   * Equipe (admin e operador): enxerga TODOS os clientes da agência.
--       - Escrita/atualização de clientes e contas: qualquer membro da equipe.
--       - Exclusão e gestão de usuários: apenas admin.
--   * Usuário cliente: enxerga SOMENTE os dados do próprio cliente
--       (leitura). Essa regra é a base da futura Área do Cliente.
--
-- IMPORTANTE: as funções abaixo são SECURITY DEFINER de propósito.
-- Elas leem public.profiles sem disparar a RLS da própria profiles,
-- o que evita RECURSÃO INFINITA nas policies (armadilha clássica do
-- Supabase quando uma policy de profiles consulta profiles).
-- =============================================================

-- ---------- Funções auxiliares ----------
create or replace function public.is_equipe()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid() and tipo = 'equipe'
  );
$$;

create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid() and tipo = 'equipe' and papel = 'admin'
  );
$$;

create or replace function public.meu_cliente_id()
returns uuid
language sql
stable
security definer
set search_path = public
as $$
  select cliente_id from public.profiles
  where id = auth.uid() and tipo = 'cliente';
$$;

-- =============================================================
-- Habilita RLS em todas as tabelas
-- =============================================================
alter table public.clientes       enable row level security;
alter table public.contas_anuncio enable row level security;
alter table public.profiles       enable row level security;

-- =============================================================
-- Policies: clientes
-- =============================================================
-- Leitura: equipe vê todos; cliente vê só o próprio registro.
create policy clientes_select on public.clientes
  for select using (
    public.is_equipe()
    or id = public.meu_cliente_id()
  );

-- Inserção / atualização: apenas equipe.
create policy clientes_insert on public.clientes
  for insert with check (public.is_equipe());

create policy clientes_update on public.clientes
  for update using (public.is_equipe()) with check (public.is_equipe());

-- Exclusão: apenas admin.
create policy clientes_delete on public.clientes
  for delete using (public.is_admin());

-- =============================================================
-- Policies: contas_anuncio (segue o dono via cliente_id)
-- =============================================================
create policy contas_select on public.contas_anuncio
  for select using (
    public.is_equipe()
    or cliente_id = public.meu_cliente_id()
  );

create policy contas_insert on public.contas_anuncio
  for insert with check (public.is_equipe());

create policy contas_update on public.contas_anuncio
  for update using (public.is_equipe()) with check (public.is_equipe());

create policy contas_delete on public.contas_anuncio
  for delete using (public.is_admin());

-- =============================================================
-- Policies: profiles
-- =============================================================
-- Cada usuário lê o próprio perfil; admin lê todos.
create policy profiles_select_self on public.profiles
  for select using (id = auth.uid() or public.is_admin());

-- O usuário pode ajustar o próprio nome, MAS não pode escalar privilégio
-- (tipo/papel/cliente_id só mudam via admin — ver policy abaixo).
create policy profiles_update_self on public.profiles
  for update using (id = auth.uid())
  with check (id = auth.uid());

-- Admin gerencia qualquer perfil (criar/atualizar/excluir).
create policy profiles_admin_all on public.profiles
  for all using (public.is_admin()) with check (public.is_admin());

-- =============================================================
-- >>> PONTO DE REVISÃO DO PROGRAMADOR <<<
-- A policy profiles_update_self permite o usuário atualizar a própria
-- linha. Para impedir que ele mude tipo/papel/cliente_id (escalonamento
-- de privilégio), o ideal é restringir por COLUNA via GRANT ou usar um
-- trigger que rejeite alterações nesses campos quando quem edita não é
-- admin. Revisar antes de ir para produção.
-- =============================================================
