-- =============================================================
-- 0001_init.sql — Modelo de dados central do Startip OS
-- =============================================================
-- Este arquivo cria o núcleo compartilhado que TODOS os módulos
-- futuros vão referenciar. Regra de ouro da arquitetura:
--   -> todo módulo futuro cria suas próprias tabelas com uma FK
--      apontando para public.clientes(id). NUNCA replicar os
--      dados do cliente dentro do módulo.
-- =============================================================

-- ---------- Extensões ----------
create extension if not exists "pgcrypto";  -- gen_random_uuid()

-- ---------- Tipos (enums) ----------
-- Enums garantem integridade. Para adicionar um valor novo no futuro:
--   alter type public.cliente_status add value 'novo_valor';
create type public.tipo_negocio      as enum ('local', 'ecommerce');
create type public.cliente_status    as enum ('prospect', 'ativo', 'inativo');
create type public.plataforma_anuncio as enum ('meta', 'google');
create type public.profile_tipo      as enum ('equipe', 'cliente');
create type public.profile_papel     as enum ('admin', 'operador');

-- ---------- Função utilitária: updated_at automático ----------
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- =============================================================
-- Tabela CENTRAL: clientes
-- =============================================================
create table public.clientes (
  id            uuid primary key default gen_random_uuid(),
  nome          text not null,
  logo_url      text,
  tipo_negocio  public.tipo_negocio   not null,
  status        public.cliente_status not null default 'prospect',
  servicos      text[] not null default '{}',  -- social_midia, trafego_pago, google_meu_negocio
  conteudos_por_semana integer not null default 0,
  data_entrada  date not null default current_date,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

create trigger trg_clientes_updated_at
  before update on public.clientes
  for each row execute function public.set_updated_at();

create index idx_clientes_status on public.clientes (status);
create index idx_clientes_nome   on public.clientes (nome);

-- =============================================================
-- contas_anuncio — 1 cliente pode ter N contas de anúncio
-- =============================================================
create table public.contas_anuncio (
  id            uuid primary key default gen_random_uuid(),
  cliente_id    uuid not null references public.clientes (id) on delete cascade,
  plataforma    public.plataforma_anuncio not null,
  id_externo    text not null,
  nome_exibicao text not null,
  created_at    timestamptz not null default now()
);

create index idx_contas_anuncio_cliente on public.contas_anuncio (cliente_id);
-- Evita cadastrar a mesma conta externa duas vezes na mesma plataforma.
create unique index uq_conta_externa
  on public.contas_anuncio (plataforma, id_externo);

-- =============================================================
-- profiles — usuários da EQUIPE e usuários CLIENTE
-- 1:1 com auth.users (padrão Supabase).
--   tipo = 'equipe'  -> papel obrigatório (admin/operador), cliente_id nulo
--   tipo = 'cliente' -> cliente_id obrigatório, papel nulo
-- =============================================================
create type public.profile_status as enum ('ativo', 'pendente');

create table public.profiles (
  id         uuid primary key references auth.users (id) on delete cascade,
  nome       text not null default '',
  tipo       public.profile_tipo not null,
  papel      public.profile_papel,
  cargo      text,                                   -- rótulo do cargo
  permissoes text[] not null default '{}',           -- módulos liberados (operador)
  status     public.profile_status not null default 'ativo',
  cliente_id uuid references public.clientes (id) on delete cascade,
  created_at timestamptz not null default now(),

  -- Coerência entre tipo e os demais campos:
  constraint chk_equipe_tem_papel
    check (tipo <> 'equipe'  or (papel is not null and cliente_id is null)),
  constraint chk_cliente_tem_cliente_id
    check (tipo <> 'cliente' or (cliente_id is not null and papel is null))
);

-- Ao criar um usuário no Auth, gera um profile PENDENTE (equipe/operador),
-- sem permissões. Um admin precisa aprovar e liberar os módulos.
-- >>> REVISAR: se clientes também se cadastram sozinhos, ajustar este padrão.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, nome, tipo, papel, status, permissoes)
  values (new.id, coalesce(new.raw_user_meta_data->>'name', ''), 'equipe', 'operador', 'pendente', '{}');
  return new;
end;
$$;

create trigger trg_on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

create index idx_profiles_cliente on public.profiles (cliente_id);

comment on table public.clientes is
  'Registro central de clientes. Fonte única da verdade — módulos referenciam por FK, nunca copiam.';
comment on table public.profiles is
  'Perfis de usuário 1:1 com auth.users. tipo=equipe (admin/operador) ou tipo=cliente (acesso externo restrito).';
