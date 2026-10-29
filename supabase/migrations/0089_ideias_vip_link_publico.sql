-- =============================================================
-- 0089_ideias_vip_link_publico.sql — Link para o cliente abrir as Ideias sem login
-- =============================================================
-- A equipe gera um link opaco (clientes.ideias_slug) e manda ao cliente.
-- A página pública /ideias/:slug lê e marca ideias só por estas duas funções,
-- que enxergam apenas lotes PUBLICADOS do cliente dono do link.
-- Aditiva. Revogar o link = limpar ideias_slug.
-- =============================================================

alter table public.clientes add column if not exists ideias_slug text unique;

create or replace function public.ideias_vip_publico(p_slug text)
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_cli record;
begin
  if p_slug is null or length(p_slug) < 6 then return null; end if;
  select id, nome, logo_url into v_cli from public.clientes where ideias_slug = lower(p_slug);
  if not found then return null; end if;
  return jsonb_build_object(
    'cliente', jsonb_build_object('id', v_cli.id, 'nome', v_cli.nome, 'logo_url', v_cli.logo_url),
    'lotes', coalesce((
      select jsonb_agg(to_jsonb(b) - 'created_by' order by b.reference_month desc nulls last, b.created_at desc)
      from public.idea_batches b where b.client_id = v_cli.id and b.status = 'publicado'), '[]'::jsonb),
    'ideias', coalesce((
      select jsonb_agg(to_jsonb(i) order by i.position)
      from public.ideas i join public.idea_batches b on b.id = i.batch_id
      where i.client_id = v_cli.id and b.status = 'publicado'), '[]'::jsonb),
    'estados', coalesce((
      select jsonb_agg(to_jsonb(s)) from public.idea_client_state s where s.client_id = v_cli.id), '[]'::jsonb)
  );
end;
$$;

create or replace function public.ideias_vip_marcar(p_slug text, p_idea uuid, p_status text, p_copiou boolean default false)
returns jsonb
language plpgsql
volatile
security definer
set search_path = public
as $$
declare
  v_cli uuid;
  v_row public.idea_client_state;
begin
  if p_slug is null or length(p_slug) < 6 then raise exception 'link invalido'; end if;
  select id into v_cli from public.clientes where ideias_slug = lower(p_slug);
  if v_cli is null then raise exception 'link invalido'; end if;
  if p_status is not null and p_status not in ('nova', 'salva', 'usada') then raise exception 'status invalido'; end if;
  if not exists (
    select 1 from public.ideas i join public.idea_batches b on b.id = i.batch_id
    where i.id = p_idea and i.client_id = v_cli and b.status = 'publicado'
  ) then raise exception 'ideia invalida'; end if;

  insert into public.idea_client_state (idea_id, client_id, status, copied_count)
  values (p_idea, v_cli, coalesce(p_status, 'nova'), case when p_copiou then 1 else 0 end)
  on conflict (idea_id, client_id) do update set
    status = coalesce(p_status, public.idea_client_state.status),
    copied_count = public.idea_client_state.copied_count + case when p_copiou then 1 else 0 end,
    updated_at = now()
  returning * into v_row;
  return to_jsonb(v_row);
end;
$$;

revoke all on function public.ideias_vip_publico(text) from public;
revoke all on function public.ideias_vip_marcar(text, uuid, text, boolean) from public;
grant execute on function public.ideias_vip_publico(text) to anon, authenticated;
grant execute on function public.ideias_vip_marcar(text, uuid, text, boolean) to anon, authenticated;
