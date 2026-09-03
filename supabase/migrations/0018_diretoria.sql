-- =============================================================
-- 0018_diretoria.sql — Diretoria (M11) com PIN + view executiva
-- =============================================================

-- PIN por área (empresas/diretoria etc). SHA-256 hex do PIN em `pin_hash`.
create table if not exists public.area_pins (
  area_key    text primary key,
  pin_hash    text not null,
  updated_at  timestamptz not null default now()
);
alter table public.area_pins enable row level security;

-- Só admin pode ler/gravar PIN. is_admin() já existe.
drop policy if exists area_pins_rw on public.area_pins;
create policy area_pins_rw on public.area_pins
  for all using (public.is_admin()) with check (public.is_admin());

-- RPC para checar PIN (não expõe o hash).
create or replace function public.verificar_pin(area text, pin_plain text)
returns boolean language sql security definer set search_path = public as $fn$
  select exists (
    select 1 from public.area_pins
    where area_key = area
      and pin_hash = encode(extensions.digest(pin_plain, 'sha256'), 'hex')
  );
$fn$;

grant execute on function public.verificar_pin(text, text) to authenticated;

-- RPC para o admin definir/mudar PIN de uma área.
create or replace function public.definir_pin(area text, pin_plain text)
returns void language plpgsql security definer set search_path = public as $fn$
begin
  if not public.is_admin() then
    raise exception 'apenas admin';
  end if;
  insert into public.area_pins (area_key, pin_hash)
  values (area, encode(extensions.digest(pin_plain, 'sha256'), 'hex'))
  on conflict (area_key) do update
     set pin_hash = excluded.pin_hash, updated_at = now();
end
$fn$;
grant execute on function public.definir_pin(text, text) to authenticated;

-- View executiva (M11).
create or replace view public.diretoria_executivo as
with
  cli as (
    select
      count(*) filter (where status = 'ativo')::int    as clientes_ativos,
      count(*)::int                                    as clientes_total
    from public.clientes
  ),
  ct as (
    select
      count(*) filter (where status = 'assinado' and (end_date is null or end_date >= current_date))::int as contratos_ativos,
      count(*) filter (where status = 'assinado' and (end_date is null or end_date >= current_date))::int as _dummy,
      coalesce(sum(monthly_value) filter (where status = 'assinado' and (end_date is null or end_date >= current_date)), 0)::numeric as mrr,
      coalesce(sum(onboarding_value) filter (where status = 'assinado' and created_at >= now() - interval '30 days'), 0)::numeric as onboarding_30d
    from public.contracts
  ),
  saude as (
    select round(avg(score_saude))::int as saude_media_score
    from public.cliente_saude
    where score_saude is not null
  ),
  req as (
    select
      count(*) filter (where status = 'pendente')::int as solicitacoes_pendentes,
      count(*) filter (where status = 'concluida' and concluida_em >= now() - interval '30 days')::int as solicitacoes_concluidas_30d
    from public.client_requests
  )
select cli.*, ct.contratos_ativos, ct.mrr, ct.onboarding_30d,
       saude.saude_media_score,
       req.solicitacoes_pendentes, req.solicitacoes_concluidas_30d
from cli, ct, saude, req;

comment on view public.diretoria_executivo is
  'Dashboard executivo (M11). Só equipe visualiza; PIN é UX no front.';
