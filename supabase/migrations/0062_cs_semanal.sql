-- =============================================================
-- 0062_cs_semanal.sql — CS Clientes: envio de CS com link por cliente
-- =============================================================
-- cs_links     → link público fixo do cliente (/cs/:slug).
-- cs_respostas → o que o cliente respondeu (uma linha por envio do form).
-- cs_envios    → registro de cada disparo feito pela equipe.
-- cs_config    → mensagem padrão e grupo interno que recebe os avisos.
-- O cliente lê/grava só pela Edge Function `cs-publico` (service role).
-- =============================================================

create table if not exists public.cs_links (
  cliente_id  uuid primary key references public.clientes(id) on delete cascade,
  slug        text not null unique,
  created_at  timestamptz not null default now()
);

create table if not exists public.cs_respostas (
  id          uuid primary key default gen_random_uuid(),
  cliente_id  uuid not null references public.clientes(id) on delete cascade,
  tipo        text not null check (tipo in ('semanal', 'nps')),
  -- [{ "pergunta": "...", "resposta": "..." }] — já com o texto da pergunta,
  -- para o histórico não mudar se as perguntas forem editadas depois.
  respostas   jsonb not null,
  nota        smallint check (nota between 0 and 10),
  created_at  timestamptz not null default now()
);
create index if not exists idx_cs_respostas_cliente on public.cs_respostas (cliente_id, created_at desc);

create table if not exists public.cs_envios (
  id           uuid primary key default gen_random_uuid(),
  cliente_id   uuid not null references public.clientes(id) on delete cascade,
  tipo         text not null check (tipo in ('semanal', 'nps')),
  enviado_em   timestamptz not null default now(),
  enviado_por  uuid references public.profiles(id) on delete set null default auth.uid()
);
create index if not exists idx_cs_envios_cliente on public.cs_envios (cliente_id, enviado_em desc);

create table if not exists public.cs_config (
  id                     smallint primary key default 1 check (id = 1),
  grupo_avisos_chat_id   text,
  msg_semanal            text not null,
  updated_at             timestamptz not null default now()
);

alter table public.cs_links     enable row level security;
alter table public.cs_respostas enable row level security;
alter table public.cs_envios    enable row level security;
alter table public.cs_config    enable row level security;

drop policy if exists p_cs_links_equipe on public.cs_links;
create policy p_cs_links_equipe on public.cs_links
  for select to authenticated using (public.is_equipe());

drop policy if exists p_cs_respostas_equipe on public.cs_respostas;
create policy p_cs_respostas_equipe on public.cs_respostas
  for select to authenticated using (public.is_equipe());

drop policy if exists p_cs_envios_equipe on public.cs_envios;
create policy p_cs_envios_equipe on public.cs_envios
  for all to authenticated using (public.is_equipe()) with check (public.is_equipe());

drop policy if exists p_cs_config_equipe on public.cs_config;
create policy p_cs_config_equipe on public.cs_config
  for all to authenticated using (public.is_equipe()) with check (public.is_equipe());

-- Cria o link de quem ainda não tem. O sufixo aleatório impede que
-- alguém adivinhe o endereço de outro cliente a partir do nome.
create or replace function public.cs_garantir_links()
returns void
language plpgsql
security definer
set search_path = public
as $fn$
begin
  if not public.is_equipe() then
    raise exception 'apenas equipe';
  end if;
  insert into public.cs_links (cliente_id, slug)
  select c.id,
    trim(both '-' from regexp_replace(lower(translate(c.nome,
      'áàâãäéèêëíìîïóòôõöúùûüçÁÀÂÃÄÉÈÊËÍÌÎÏÓÒÔÕÖÚÙÛÜÇ',
      'aaaaaeeeeiiiiooooouuuucaaaaaeeeeiiiiooooouuuuc')), '[^a-z0-9]+', '-', 'g'))
    || '-' || substr(encode(extensions.gen_random_bytes(4), 'hex'), 1, 6)
  from public.clientes c
  where c.status = 'ativo'
    and not exists (select 1 from public.cs_links l where l.cliente_id = c.id);
end
$fn$;

grant execute on function public.cs_garantir_links() to authenticated;

insert into public.cs_config (id, grupo_avisos_chat_id, msg_semanal)
values (
  1,
  (select telefone from public.crm_leads where is_grupo and lower(trim(nome)) = 'avisos sistema' limit 1),
  E'Olá pessoal, tudo bem?\n\nPassando para desejar uma ótima sexta-feira. Queremos um feedback da semana: quais foram as maiores dificuldades e o que vocês notaram em relação aos anúncios e ao negócio de vocês, para a gente oferecer uma solução.\n\nÉ só responder por este link:\n{link}'
)
on conflict (id) do nothing;
