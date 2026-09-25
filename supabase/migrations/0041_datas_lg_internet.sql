-- =============================================================
-- 0041_datas_lg_internet.sql — Calendário inicial da LG Internet
-- =============================================================
-- Link: /calendario/lg-internet · início do calendário: 25/09/2026.
-- Datas anteriores ao início (ex.: Dia do Técnico em Telecom 23/09)
-- ficam vinculadas para aparecer no histórico e se repetir em 2027.
-- =============================================================

do $$
declare
  v_cliente uuid;
begin
  select id into v_cliente
  from public.clientes
  where lower(trim(nome)) in ('lg internet', 'lg-internet')
  limit 1;

  if v_cliente is null then
    raise notice 'Cliente LG Internet não encontrado — calendário não criado.';
    return;
  end if;

  insert into public.datas_calendario (cliente_id, slug, inicio)
  values (v_cliente, 'lg-internet', date '2026-09-25')
  on conflict (cliente_id) do nothing;

  insert into public.datas_cliente (cliente_id, data_id, visivel_cliente, relevancia)
  select
    v_cliente,
    b.id,
    b.chave not in ('nsa_aparecida', 'dia_servidor_publico'),
    case b.chave
      when 'acesso_informacao' then
        'Data ligada ao acesso à informação e à conectividade digital: a LG pode mostrar como a internet amplia o acesso à informação e conecta pessoas.'
      when 'viamao_nsa_conceicao' then
        'Considerar no calendário por a LG atuar em Viamão.'
      when 'black_friday' then
        'Principal data comercial do ano para a LG: aquisição de novos clientes e planos de internet.'
      else ''
    end
  from public.datas_base b
  where b.chave in (
    'dia_consumidor', 'dia_mundial_telecom', 'dia_namorados', 'dia_pais',
    'aniversario_viamao', 'dia_cliente', 'revolucao_farroupilha', 'tecnico_telecom',
    'acesso_informacao', 'dia_criancas', 'nsa_aparecida', 'dia_professores',
    'dia_profissional_ti', 'dia_servidor_publico', 'halloween', 'finados',
    'proclamacao_republica', 'consciencia_negra', 'black_friday', 'cyber_monday',
    'seguranca_informacao', 'viamao_nsa_conceicao', 'vespera_natal', 'natal', 'reveillon'
  )
  on conflict (cliente_id, data_id) do nothing;
end
$$;
