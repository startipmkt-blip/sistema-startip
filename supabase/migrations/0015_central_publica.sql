-- =============================================================
-- 0015_central_publica.sql — Central do Cliente (link exclusivo)
-- =============================================================
-- Adiciona um slug único e opaco em cada cliente para expor uma
-- URL pública em /central/:slug com o estado do cliente. A leitura
-- passa pela Edge Function `central-cliente` (service role), nunca
-- direto pelo supabase-js do browser público.
-- =============================================================

alter table public.clientes
  add column if not exists central_slug text unique;

comment on column public.clientes.central_slug is
  'Slug opaco (ex: 8jL2m9Xp) que identifica a Central pública do cliente. NULL = link não gerado.';

-- Função util: gera slug curto e único.
create or replace function public._gerar_central_slug()
returns text language plpgsql as $fn$
declare
  slug text;
  ok boolean := false;
begin
  while not ok loop
    slug := lower(substr(encode(gen_random_bytes(6), 'base64'), 1, 8));
    slug := regexp_replace(slug, '[^a-z0-9]', '', 'g');
    if length(slug) < 6 then continue; end if;
    perform 1 from public.clientes where central_slug = slug;
    if not found then ok := true; end if;
  end loop;
  return slug;
end
$fn$;
