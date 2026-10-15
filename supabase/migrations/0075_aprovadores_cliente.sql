-- 0075_aprovadores_cliente.sql
-- Aprovacao em conjunto: cliente com varios aprovadores (ex.: 4 socios).
--  * cliente_aprovadores: quem aprova pelo cliente. Com 2+ ativos, o conteudo so fica
--    aprovado quando TODOS aprovam; qualquer reprovacao (com justificativa) devolve.
--  * conteudo_aprovacao_votos: voto de cada aprovador por conteudo.
-- Cliente com 0 ou 1 aprovador segue o fluxo antigo (uma decisao basta).

create table if not exists public.cliente_aprovadores (
  id         uuid primary key default gen_random_uuid(),
  cliente_id uuid not null references public.clientes(id) on delete cascade,
  nome       text not null check (btrim(nome) <> ''),
  ordem      integer not null default 0,
  ativo      boolean not null default true,
  created_at timestamptz not null default now()
);
create index if not exists cliente_aprovadores_cliente_idx on public.cliente_aprovadores (cliente_id, ordem);

create table if not exists public.conteudo_aprovacao_votos (
  id           uuid primary key default gen_random_uuid(),
  post_id      uuid not null references public.conteudo_aprovacao(id) on delete cascade,
  aprovador_id uuid not null references public.cliente_aprovadores(id) on delete cascade,
  decisao      text not null check (decisao in ('aprovado', 'reprovado')),
  justificativa text not null default '',
  decidido_em  timestamptz not null default now(),
  unique (post_id, aprovador_id)
);
create index if not exists conteudo_votos_post_idx on public.conteudo_aprovacao_votos (post_id);

alter table public.cliente_aprovadores enable row level security;
alter table public.conteudo_aprovacao_votos enable row level security;

drop policy if exists cliente_aprovadores_equipe on public.cliente_aprovadores;
create policy cliente_aprovadores_equipe on public.cliente_aprovadores
  for all to authenticated using (public.is_equipe()) with check (public.is_equipe());

-- Votos: equipe le; gravacao so pela Edge Function (service role).
drop policy if exists conteudo_votos_ler on public.conteudo_aprovacao_votos;
create policy conteudo_votos_ler on public.conteudo_aprovacao_votos
  for select to authenticated using (public.is_equipe());

-- Nova rodada: quando o conteudo volta a "pendente" (refeito/reenviado), os votos zeram.
create or replace function public.conteudo_votos_zerar()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if new.status = 'pendente' and old.status is distinct from 'pendente' then
    delete from public.conteudo_aprovacao_votos where post_id = new.id;
  end if;
  return new;
end;
$$;
drop trigger if exists trg_conteudo_votos_zerar on public.conteudo_aprovacao;
create trigger trg_conteudo_votos_zerar
  after update of status on public.conteudo_aprovacao
  for each row execute function public.conteudo_votos_zerar();
