-- =============================================================
-- 0064_onboarding_itens_feitos.sql
-- Marcação de sub-tarefas (itens) dentro de cada etapa do onboarding.
-- Guarda os ÍNDICES feitos (estáveis mesmo se o texto do item mudar).
-- =============================================================

alter table public.onboarding_etapas
  add column if not exists itens_feitos jsonb not null default '[]'::jsonb;

-- Página pública do cliente: devolve também os sub-itens já concluídos.
create or replace function public.onboarding_por_token(p_token text)
returns json
language sql
stable
security definer
set search_path = public
as $fn$
  select json_build_object(
    'cliente_nome', c.nome,
    'template_nome', a.template_nome,
    'iniciado_em', a.created_at,
    'concluido_em', (select k.concluido_em from onboarding_conclusao k where k.cliente_id = a.cliente_id),
    'etapas', coalesce((
      select json_agg(json_build_object(
        'etapa', e.etapa,
        'tempo', e.tempo,
        'itens', e.itens,
        'itens_feitos', e.itens_feitos,
        'concluida', e.concluida,
        'concluida_em', e.concluida_em
      ) order by e.ordem, e.created_at)
      from onboarding_etapas e
      where e.cliente_id = a.cliente_id
    ), '[]'::json)
  )
  from onboarding_andamentos a
  join clientes c on c.id = a.cliente_id
  where a.token = p_token;
$fn$;

revoke all on function public.onboarding_por_token(text) from public;
grant execute on function public.onboarding_por_token(text) to anon, authenticated;
