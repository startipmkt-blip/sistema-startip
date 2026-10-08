-- 0047_ideias_criativos.sql
-- Sub-aba "Ideias de Criativos" dentro de /ideias.
-- Tabelas proprias, separadas do Banco de Ideias (public.ideias).
-- Anexos: jsonb [{ path, name, type, size }] no bucket privado "anexos-internos".

create table if not exists public.ideias_criativos (
  id          uuid primary key default gen_random_uuid(),
  titulo      text not null,
  descricao   text not null default '',
  formato     text check (formato in ('imagem','carrossel','video','ugc','depoimento','outro')),
  objetivo    text check (objetivo in ('leads','vendas','reconhecimento','remarketing','datas','outro')),
  link_referencia text,
  autor       text not null default 'iuri' check (autor in ('iuri','dhomini')),
  data_ideia  date not null default current_date,
  importancia text not null default 'simples' check (importancia in ('simples','importante','muito_importante')),
  status      text not null default 'nova' check (status in ('nova','aprovada','em_producao','publicada','descartada')),
  geral       boolean not null default false,
  anexos      jsonb not null default '[]'::jsonb,
  criado_por  uuid references auth.users(id) on delete set null default auth.uid(),
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create table if not exists public.ideias_criativos_clientes (
  ideia_id   uuid not null references public.ideias_criativos(id) on delete cascade,
  cliente_id uuid not null references public.clientes(id) on delete cascade,
  primary key (ideia_id, cliente_id)
);

create index if not exists idx_criativos_data     on public.ideias_criativos (data_ideia desc, created_at desc);
create index if not exists idx_criativos_status   on public.ideias_criativos (status);
create index if not exists idx_criativos_cli_cli  on public.ideias_criativos_clientes (cliente_id);

alter table public.ideias_criativos          enable row level security;
alter table public.ideias_criativos_clientes enable row level security;

drop policy if exists criativos_equipe on public.ideias_criativos;
create policy criativos_equipe on public.ideias_criativos
  for all to authenticated
  using (public.is_equipe()) with check (public.is_equipe());

drop policy if exists criativos_cli_equipe on public.ideias_criativos_clientes;
create policy criativos_cli_equipe on public.ideias_criativos_clientes
  for all to authenticated
  using (public.is_equipe()) with check (public.is_equipe());
