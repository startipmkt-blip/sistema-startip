-- =============================================================
-- 0019_marketplace.sql — Turbo Marketplace (M13)
-- =============================================================
-- Vitrine B2B: os clientes da agência aparecem numa página pública
-- com produtos/serviços em desconto para os outros clientes da base.
-- Equipe cadastra e edita produtos. Leitura pública passa pela Edge
-- Function (service role) — nada de RLS no browser.
-- =============================================================

do $$ begin
  create type public.marketplace_categoria as enum ('base','beneficios');
exception when duplicate_object then null; end $$;

-- Perfil de marketplace por cliente. 1:1 opcional com cliente.
create table if not exists public.marketplace_perfis (
  cliente_id       uuid primary key references public.clientes(id) on delete cascade,
  categoria        public.marketplace_categoria not null default 'base',
  segmento         text,
  logo_url         text,
  whatsapp         text,
  instagram        text,
  publicado        boolean not null default false,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);
alter table public.marketplace_perfis enable row level security;
create trigger trg_marketplace_perfis_updated_at
  before update on public.marketplace_perfis
  for each row execute function public.set_updated_at();

drop policy if exists marketplace_perfis_rw on public.marketplace_perfis;
create policy marketplace_perfis_rw on public.marketplace_perfis
  for all using (public.is_equipe()) with check (public.is_equipe());

create index if not exists idx_mp_perfis_publicado on public.marketplace_perfis (publicado) where publicado = true;
create index if not exists idx_mp_perfis_categoria on public.marketplace_perfis (categoria);

-- Produtos/ofertas de cada empresa.
create table if not exists public.marketplace_produtos (
  id               uuid primary key default gen_random_uuid(),
  cliente_id       uuid not null references public.clientes(id) on delete cascade,
  titulo           text not null,
  descricao        text,
  preco_brl        numeric(12,2),
  desconto_texto   text,
  imagem_url       text,
  ativo            boolean not null default true,
  ordem            integer not null default 0,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);
alter table public.marketplace_produtos enable row level security;
create trigger trg_marketplace_produtos_updated_at
  before update on public.marketplace_produtos
  for each row execute function public.set_updated_at();

drop policy if exists marketplace_produtos_rw on public.marketplace_produtos;
create policy marketplace_produtos_rw on public.marketplace_produtos
  for all using (public.is_equipe()) with check (public.is_equipe());

create index if not exists idx_mp_produtos_cliente on public.marketplace_produtos (cliente_id);
create index if not exists idx_mp_produtos_ativo   on public.marketplace_produtos (ativo) where ativo = true;
