-- =============================================================
-- 0065_onboarding_visibilidade.sql
-- Visibilidade por etapa e por sub-item: equipe sempre vê; cliente
-- (página pública /onb/:token) só vê o que não está marcado como interno.
-- =============================================================

alter table public.onboarding_etapas
  add column if not exists interno boolean not null default false,
  add column if not exists itens_internos jsonb not null default '[]'::jsonb;

alter table public.onboarding_template_itens
  add column if not exists interno boolean not null default false,
  add column if not exists itens_internos jsonb not null default '[]'::jsonb;

-- Página pública: oculta etapas internas e sub-itens internos; reindexa itens_feitos
-- para que ainda bata com os itens visíveis.
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
        'itens', (
          select coalesce(jsonb_agg(t.it order by t.idx), '[]'::jsonb)
          from jsonb_array_elements(e.itens) with ordinality t(it, idx)
          where not (e.itens_internos @> to_jsonb((t.idx - 1)::int))
        ),
        'itens_feitos', (
          select coalesce(jsonb_agg(novo_idx - 1 order by novo_idx), '[]'::jsonb)
          from (
            select row_number() over (order by idx) as novo_idx, idx
            from jsonb_array_elements(e.itens) with ordinality t(it, idx)
            where not (e.itens_internos @> to_jsonb((t.idx - 1)::int))
          ) visivel
          where e.itens_feitos @> to_jsonb((visivel.idx - 1)::int)
        ),
        'concluida', e.concluida,
        'concluida_em', e.concluida_em
      ) order by e.ordem, e.created_at)
      from onboarding_etapas e
      where e.cliente_id = a.cliente_id and not coalesce(e.interno, false)
    ), '[]'::json)
  )
  from onboarding_andamentos a
  join clientes c on c.id = a.cliente_id
  where a.token = p_token;
$fn$;

revoke all on function public.onboarding_por_token(text) from public;
grant execute on function public.onboarding_por_token(text) to anon, authenticated;

-- =============================================================
-- Regras pedidas pelo usuário (aplicadas em TODOS os onboardings e no template
-- "Onboarding Startip por Fases" para que novos clientes já saiam assim).
-- =============================================================

-- Etapas inteiras ocultas do cliente
update public.onboarding_etapas set interno = true
 where etapa in ('Vitória rápida', 'Encerramento do onboarding');

update public.onboarding_template_itens set interno = true
 where etapa in ('Vitória rápida', 'Encerramento do onboarding');

-- Sub-itens ocultos do cliente (achamos pelo texto do item para re-indexar certo)
do $$
declare r record; i int; novos jsonb; alvos text[];
begin
  for r in
    select id, etapa, itens, coalesce(itens_internos, '[]'::jsonb) as internos
      from public.onboarding_etapas
     where etapa in ('Estratégia e setup', 'Reunião de alinhamento', 'Check-in de 30 dias')
  loop
    alvos := case r.etapa
      when 'Estratégia e setup'    then array['Preparar a apresentação']
      when 'Reunião de alinhamento' then array['Explicar a fase de aprendizado das campanhas']
      when 'Check-in de 30 dias'    then array['Ajustar a rota']
    end;
    novos := r.internos;
    for i in 0 .. (jsonb_array_length(r.itens) - 1) loop
      if (r.itens->>i) = any(alvos) and not (novos @> to_jsonb(i)) then
        novos := novos || to_jsonb(i);
      end if;
    end loop;
    update public.onboarding_etapas set itens_internos = novos where id = r.id;
  end loop;

  for r in
    select id, etapa, itens, coalesce(itens_internos, '[]'::jsonb) as internos
      from public.onboarding_template_itens
     where etapa in ('Estratégia e setup', 'Reunião de alinhamento', 'Check-in de 30 dias')
  loop
    alvos := case r.etapa
      when 'Estratégia e setup'    then array['Preparar a apresentação']
      when 'Reunião de alinhamento' then array['Explicar a fase de aprendizado das campanhas']
      when 'Check-in de 30 dias'    then array['Ajustar a rota']
    end;
    novos := r.internos;
    for i in 0 .. (jsonb_array_length(r.itens) - 1) loop
      if (r.itens->>i) = any(alvos) and not (novos @> to_jsonb(i)) then
        novos := novos || to_jsonb(i);
      end if;
    end loop;
    update public.onboarding_template_itens set itens_internos = novos where id = r.id;
  end loop;
end $$;
