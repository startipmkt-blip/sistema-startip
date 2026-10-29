-- =============================================================
-- 0088_ideias_vip.sql — Aba "Ideias" do grupo VIP de WhatsApp
-- =============================================================
-- A equipe importa lotes de ideias de postagem por cliente (documento mensal).
-- O cliente lê só lotes PUBLICADOS do próprio cliente e marca o que fez com cada ideia.
-- Migração apenas aditiva: não altera nem apaga nada existente.
-- ideas.source: 'startip' (equipe) ou 'ia' (reservado para geração futura).
-- =============================================================

create table if not exists public.idea_batches (
  id              uuid primary key default gen_random_uuid(),
  client_id       uuid not null references public.clientes(id) on delete cascade,
  title           text not null,
  reference_month date,
  status          text not null default 'rascunho' check (status in ('rascunho', 'publicado')),
  created_by      uuid references auth.users(id) on delete set null default auth.uid(),
  created_at      timestamptz not null default now()
);

create table if not exists public.ideas (
  id               uuid primary key default gen_random_uuid(),
  batch_id         uuid not null references public.idea_batches(id) on delete cascade,
  client_id        uuid not null references public.clientes(id) on delete cascade,
  type             text not null default 'outro'
                   check (type in ('bom_dia', 'valor', 'enquete', 'enredo', 'oferta', 'teaser', 'boa_noite', 'outro')),
  title            text,
  body             text not null,
  media_suggestion text,
  theme            text,
  suggested_date   date,
  suggested_time   text,
  channel          text not null default 'grupo_vip_whatsapp',
  position         integer not null default 0,
  source           text not null default 'startip' check (source in ('startip', 'ia')),
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);

create table if not exists public.idea_client_state (
  id           uuid primary key default gen_random_uuid(),
  idea_id      uuid not null references public.ideas(id) on delete cascade,
  client_id    uuid not null references public.clientes(id) on delete cascade,
  status       text not null default 'nova' check (status in ('nova', 'salva', 'usada')),
  copied_count integer not null default 0,
  updated_at   timestamptz not null default now(),
  unique (idea_id, client_id)
);

create index if not exists idx_idea_batches_client on public.idea_batches (client_id);
create index if not exists idx_ideas_client on public.ideas (client_id);
create index if not exists idx_ideas_batch on public.ideas (batch_id, position);
create index if not exists idx_ideas_suggested_date on public.ideas (suggested_date);
create index if not exists idx_idea_state_client on public.idea_client_state (client_id);

alter table public.idea_batches enable row level security;
alter table public.ideas enable row level security;
alter table public.idea_client_state enable row level security;

-- Equipe: lê e escreve tudo.
drop policy if exists p_idea_batches_equipe on public.idea_batches;
create policy p_idea_batches_equipe on public.idea_batches
  for all to authenticated using (public.is_equipe()) with check (public.is_equipe());

drop policy if exists p_ideas_equipe on public.ideas;
create policy p_ideas_equipe on public.ideas
  for all to authenticated using (public.is_equipe()) with check (public.is_equipe());

drop policy if exists p_idea_state_equipe on public.idea_client_state;
create policy p_idea_state_equipe on public.idea_client_state
  for all to authenticated using (public.is_equipe()) with check (public.is_equipe());

-- Cliente: só lotes publicados do próprio cliente (nunca rascunhos).
drop policy if exists p_idea_batches_cliente on public.idea_batches;
create policy p_idea_batches_cliente on public.idea_batches
  for select to authenticated
  using (client_id = public.meu_cliente_id() and status = 'publicado');

drop policy if exists p_ideas_cliente on public.ideas;
create policy p_ideas_cliente on public.ideas
  for select to authenticated
  using (
    client_id = public.meu_cliente_id()
    and exists (
      select 1 from public.idea_batches b
      where b.id = ideas.batch_id and b.client_id = ideas.client_id and b.status = 'publicado'
    )
  );

-- Cliente: cria e atualiza só as próprias linhas de estado, de ideias que ele pode ver.
drop policy if exists p_idea_state_cliente_select on public.idea_client_state;
create policy p_idea_state_cliente_select on public.idea_client_state
  for select to authenticated using (client_id = public.meu_cliente_id());

drop policy if exists p_idea_state_cliente_insert on public.idea_client_state;
create policy p_idea_state_cliente_insert on public.idea_client_state
  for insert to authenticated
  with check (
    client_id = public.meu_cliente_id()
    and exists (select 1 from public.ideas i where i.id = idea_id and i.client_id = idea_client_state.client_id)
  );

drop policy if exists p_idea_state_cliente_update on public.idea_client_state;
create policy p_idea_state_cliente_update on public.idea_client_state
  for update to authenticated
  using (client_id = public.meu_cliente_id())
  with check (client_id = public.meu_cliente_id());
