-- =============================================================
-- 0053_datas_clientes_out_dez.sql — Datas comemorativas de out–dez/2026
-- =============================================================
-- Fonte: "datas sazonais.md" (tabela padrão + data específica por cliente).
--
-- 1) Completa a Base Mãe (datas_base) com as datas que ainda não existiam.
-- 2) Anexa a tabela PADRÃO a cada cliente do arquivo, visível, para o
--    cliente aprovar (quem não quiser é ocultado em "Ajustar").
-- 3) Anexa as datas ESPECÍFICAS do nicho (visivel_cliente = true), com a
--    prioridade do arquivo e a descrição em `relevancia`.
-- Prioridades do arquivo: A = alta · M = media · O = operacional.
-- Não cria link público (datas_calendario) — gerar pela tela do cliente.
-- =============================================================

-- ---------- 1) Base Mãe ----------
insert into public.datas_base
  (chave, nome, categoria, prioridade, opcional, regra, mes, dia, observacao)
values
  -- padrão
  ('dia_menina',                'Dia Internacional da Menina', 'Institucional', 'media', false, 'fixa', 10, 11, ''),
  ('outubro_rosa',              'Outubro Rosa', 'Campanha de saúde', 'alta', false, 'fixa', 10, 1, 'Campanha ao longo de todo o mês de outubro.'),
  ('dia_democracia',            'Dia da Democracia', 'Institucional', 'operacional', true, 'fixa', 10, 25, ''),
  ('novembro_azul',             'Novembro Azul', 'Campanha de saúde', 'alta', false, 'fixa', 11, 1, 'Campanha ao longo de todo o mês de novembro.'),
  ('dia_gentileza',             'Dia Mundial da Gentileza', 'Institucional', 'media', false, 'fixa', 11, 13, ''),
  ('dia_tolerancia',            'Dia Internacional da Tolerância', 'Institucional', 'operacional', true, 'fixa', 11, 16, ''),
  ('dia_bandeira',              'Dia da Bandeira', 'Institucional / Cívica', 'media', false, 'fixa', 11, 19, ''),
  ('violencia_mulher',          'Dia Internacional pela Eliminação da Violência contra as Mulheres', 'Institucional', 'media', false, 'fixa', 11, 25, ''),
  ('dezembro_vermelho_laranja', 'Dezembro Vermelho e Dezembro Laranja', 'Campanha de saúde', 'media', false, 'fixa', 12, 1, 'Campanha ao longo de todo o mês de dezembro.'),
  ('dia_pessoa_deficiencia',    'Dia Internacional das Pessoas com Deficiência', 'Institucional', 'media', false, 'fixa', 12, 3, ''),
  ('dia_voluntariado',          'Dia Internacional do Voluntariado', 'Institucional', 'operacional', true, 'fixa', 12, 5, ''),
  ('dia_familia',               'Dia da Família', 'Institucional / Sazonal', 'alta', false, 'fixa', 12, 8, ''),
  ('direitos_humanos',          'Dia Internacional dos Direitos Humanos', 'Institucional', 'media', false, 'fixa', 12, 10, ''),
  ('solidariedade_humana',      'Dia Internacional da Solidariedade Humana', 'Institucional', 'media', false, 'fixa', 12, 20, ''),
  ('inicio_verao',              'Início do verão', 'Sazonal', 'alta', false, 'fixa', 12, 21, ''),
  ('retrospectiva',             'Retrospectiva e agradecimento pelo ano', 'Institucional / Sazonal', 'alta', false, 'fixa', 12, 26, 'Janela de 26 a 30/12.'),
  -- nicho
  ('dia_chefe',                 'Dia do Chefe', 'Setorial', 'media', false, 'fixa', 10, 16, ''),
  ('dia_cultura_ciencia',       'Dia Nacional da Cultura e da Ciência', 'Setorial', 'operacional', true, 'fixa', 11, 5, 'Incluindo temas de gestão e desenvolvimento.'),
  ('onze_onze',                 '11.11', 'Comercial', 'media', false, 'fixa', 11, 11, ''),
  ('dia_criatividade',          'Dia da Criatividade', 'Setorial', 'operacional', true, 'fixa', 11, 17, 'Data popular em calendários.'),
  ('empreendedorismo_feminino', 'Dia Mundial do Empreendedorismo Feminino', 'Setorial', 'alta', false, 'fixa', 11, 19, ''),
  ('tecnico_contabilidade',     'Dia do Técnico em Contabilidade', 'Setorial', 'media', false, 'fixa', 11, 20, ''),
  ('dia_maquinista',            'Dia do Maquinista', 'Setorial', 'operacional', true, 'fixa', 10, 20, ''),
  ('dia_engenheiro_agricola',   'Dia do Engenheiro Agrícola', 'Setorial', 'operacional', true, 'fixa', 10, 27, ''),
  ('tecnico_eletronica',        'Dia do Técnico em Eletrônica', 'Setorial', 'media', false, 'fixa', 11, 5, ''),
  ('tecnico_seguranca_trabalho','Dia do Técnico de Segurança do Trabalho', 'Setorial', 'alta', false, 'fixa', 11, 27, ''),
  ('dia_mecanico',              'Dia do Mecânico', 'Setorial', 'alta', false, 'fixa', 12, 20, ''),
  ('dia_poeta',                 'Dia do Poeta', 'Cultural', 'operacional', true, 'fixa', 10, 20, ''),
  ('dia_musico',                'Dia do Músico', 'Cultural', 'media', false, 'fixa', 11, 22, ''),
  ('doze_doze',                 '12.12', 'Comercial', 'media', false, 'fixa', 12, 12, ''),
  ('dia_eletricista',           'Dia do Eletricista', 'Setorial', 'media', false, 'fixa', 10, 17, ''),
  ('dia_inovacao',              'Dia Nacional da Inovação', 'Setorial', 'media', false, 'fixa', 10, 19, ''),
  ('dia_engenheiro_civil',      'Dia do Engenheiro Civil', 'Setorial', 'alta', false, 'fixa', 10, 25, ''),
  ('eng_seguranca_trabalho',    'Dia do Engenheiro de Segurança do Trabalho', 'Setorial', 'media', false, 'fixa', 11, 27, ''),
  ('dia_engenheiro',            'Dia do Engenheiro', 'Setorial', 'alta', false, 'fixa', 12, 11, ''),
  ('dia_pedreiro',              'Dia do Pedreiro', 'Setorial', 'alta', false, 'fixa', 12, 13, ''),
  ('dia_alimentacao',           'Dia Mundial da Alimentação', 'Setorial / Gastronomia', 'alta', false, 'fixa', 10, 16, ''),
  ('dia_chef',                  'Dia Internacional do Chef de Cozinha', 'Setorial / Gastronomia', 'alta', false, 'fixa', 10, 20, ''),
  ('dia_cheesecake',            'Dia Mundial do Cheesecake', 'Gastronômica', 'operacional', true, 'fixa', 10, 25, ''),
  ('dia_sushi',                 'Dia do Sushi', 'Gastronômica', 'operacional', true, 'fixa', 11, 1, 'Data gastronômica de calendário.'),
  ('dia_bolo',                  'Dia Nacional do Bolo', 'Gastronômica', 'alta', false, 'fixa', 11, 26, ''),
  ('dia_cookie',                'Dia do Cookie', 'Gastronômica', 'media', false, 'fixa', 12, 4, 'Data gastronômica.'),
  ('dia_brownie',               'Dia do Brownie', 'Gastronômica', 'media', false, 'fixa', 12, 8, 'Comemoração gastronômica.'),
  -- pautas sazonais do mês (não são datas oficiais; ancoradas em 01/12)
  ('pauta_fechamento_contabil',      'Fechamento contábil e planejamento de 2027', 'Pauta sazonal (dezembro)', 'alta', false, 'fixa', 12, 1, 'Pauta sazonal, não é data comemorativa oficial.'),
  ('pauta_revisao_tributaria',       'Revisão tributária, fluxo de caixa e obrigações de fim de ano', 'Pauta sazonal (dezembro)', 'alta', false, 'fixa', 12, 1, 'Pauta sazonal, não é data comemorativa oficial.'),
  ('pauta_presentes_kits',           'Presentes personalizados e kits de Natal', 'Pauta sazonal (dezembro)', 'alta', false, 'fixa', 12, 1, 'Pauta sazonal, não é data comemorativa oficial.'),
  ('pauta_ferias_verao',             'Férias e deslocamentos de verão', 'Pauta sazonal (dezembro)', 'alta', false, 'fixa', 12, 1, 'Pauta sazonal, não é data comemorativa oficial.'),
  ('pauta_presentes_encerramento',   'Presentes de Natal e campanhas de encerramento', 'Pauta sazonal (dezembro)', 'alta', false, 'fixa', 12, 1, 'Pauta sazonal, não é data comemorativa oficial.'),
  ('pauta_presentes_smartphones',    'Presentes de Natal: smartphones e smartwatches', 'Pauta sazonal (dezembro)', 'alta', false, 'fixa', 12, 1, 'Pauta sazonal, não é data comemorativa oficial.'),
  ('pauta_13_salario',               '13º salário e compras de fim de ano', 'Pauta sazonal (dezembro)', 'alta', false, 'fixa', 12, 1, 'Pauta sazonal, não é data comemorativa oficial.'),
  ('pauta_casa_propria_2027',        'Planejamento da casa própria para 2027', 'Pauta sazonal (dezembro)', 'alta', false, 'fixa', 12, 1, 'Pauta sazonal, não é data comemorativa oficial.'),
  ('pauta_confraternizacoes',        'Temporada de confraternizações corporativas', 'Pauta sazonal (dezembro)', 'alta', false, 'fixa', 12, 1, 'Pauta sazonal, não é data comemorativa oficial.'),
  ('pauta_coffee_encerramento',      'Coffee breaks e eventos de encerramento do ano', 'Pauta sazonal (dezembro)', 'alta', false, 'fixa', 12, 1, 'Pauta sazonal, não é data comemorativa oficial.'),
  ('pauta_reservas_2027',            'Reservas e planejamento de eventos para 2027', 'Pauta sazonal (dezembro)', 'alta', false, 'fixa', 12, 1, 'Pauta sazonal, não é data comemorativa oficial.')
on conflict (chave) do nothing;

-- ---------- 2 e 3) Vínculo com os clientes ----------
do $$
declare
  v_chaves_padrao text[] := array[
    'dia_menina', 'dia_criancas', 'nsa_aparecida', 'dia_professores', 'outubro_rosa',
    'dia_democracia', 'halloween', 'novembro_azul', 'finados', 'dia_gentileza',
    'proclamacao_republica', 'dia_tolerancia', 'dia_bandeira', 'consciencia_negra',
    'violencia_mulher', 'black_friday', 'cyber_monday', 'dezembro_vermelho_laranja',
    'dia_pessoa_deficiencia', 'dia_voluntariado', 'dia_familia', 'direitos_humanos',
    'solidariedade_humana', 'inicio_verao', 'vespera_natal', 'natal', 'retrospectiva',
    'reveillon'
  ];
  r record;
  v_id uuid;
begin
  -- chave do cliente no arquivo → padrão de nome na tabela clientes
  for r in
    select * from (values
      ('bg',  'bg gest%'),
      ('ajs', 'ajs'),
      ('fun', 'funer%carvalho%'),
      ('mat', 'match%'),
      ('igu', 'igotup%'),
      ('lay', 'layfe%'),
      ('cas', 'casas paran%'),
      ('cre', 'creative%')
    ) as t(k, padrao)
  loop
    select id into v_id from public.clientes where lower(trim(nome)) like r.padrao limit 1;
    if v_id is null then
      raise notice 'Cliente "%" não encontrado — datas não anexadas.', r.padrao;
      continue;
    end if;

    -- 2) padrão: anexa visível para o cliente aprovar; a etapa 3 acrescenta
    --    prioridade e descrição das que a lista do cliente cita
    insert into public.datas_cliente (cliente_id, data_id, visivel_cliente)
    select v_id, b.id, true
    from public.datas_base b
    where b.chave = any (v_chaves_padrao)
    on conflict (cliente_id, data_id) do nothing;

    -- 3) lista do cliente (visível), com prioridade e descrição
    insert into public.datas_cliente (cliente_id, data_id, visivel_cliente, prioridade, relevancia)
    select v_id, b.id, true, p.prio, p.relev
    from (values
      -- BG Gestão
      ('bg', 'dia_chefe', 'media', ''),
      ('bg', 'dia_cultura_ciencia', 'operacional', 'Incluindo temas de gestão e desenvolvimento.'),
      ('bg', 'onze_onze', 'media', 'Planejamento de promoções e margens.'),
      ('bg', 'dia_criatividade', 'operacional', ''),
      ('bg', 'empreendedorismo_feminino', 'alta', ''),
      ('bg', 'tecnico_contabilidade', 'media', ''),
      ('bg', 'black_friday', null, 'Gestão de margem, estoque e faturamento.'),
      ('bg', 'cyber_monday', 'media', 'Planejamento financeiro.'),
      ('bg', 'pauta_fechamento_contabil', 'alta', ''),
      ('bg', 'pauta_revisao_tributaria', 'alta', ''),
      -- AJS Empilhadeiras
      ('ajs', 'dia_maquinista', 'operacional', ''),
      ('ajs', 'dia_engenheiro_agricola', 'operacional', ''),
      ('ajs', 'tecnico_eletronica', 'media', ''),
      ('ajs', 'tecnico_seguranca_trabalho', 'alta', ''),
      ('ajs', 'dia_mecanico', 'alta', ''),
      -- Funerária Carvalho
      ('fun', 'dia_professores', 'media', 'Homenagem e legado.'),
      ('fun', 'finados', 'alta', 'Homenagem, memória e saudade.'),
      ('fun', 'dia_gentileza', 'alta', ''),
      ('fun', 'dia_familia', 'alta', ''),
      ('fun', 'solidariedade_humana', 'alta', ''),
      ('fun', 'vespera_natal', 'alta', 'Natal (24–25/12): memória, saudade e acolhimento.'),
      ('fun', 'natal', 'alta', 'Memória, saudade e acolhimento.'),
      ('fun', 'reveillon', 'alta', 'Ano-Novo: esperança, gratidão e lembranças.'),
      -- Matchêria
      ('mat', 'dia_poeta', 'operacional', 'Cultura e tradição gaúcha.'),
      ('mat', 'halloween', 'operacional', 'Ações temáticas leves.'),
      ('mat', 'dia_musico', 'media', 'Tradição cultural.'),
      ('mat', 'black_friday', null, 'Ofertas em cuias e kits.'),
      ('mat', 'cyber_monday', 'media', ''),
      ('mat', 'dia_familia', 'alta', 'Chimarrão como momento de conexão.'),
      ('mat', 'doze_doze', 'media', 'Presentes e combos.'),
      ('mat', 'inicio_verao', 'media', 'Chimarrão e hábitos de verão.'),
      ('mat', 'pauta_presentes_kits', 'alta', ''),
      -- iGotUp
      ('igu', 'onze_onze', 'media', 'Campanha comercial de scooters.'),
      ('igu', 'black_friday', null, 'Ofertas de scooters.'),
      ('igu', 'cyber_monday', 'media', ''),
      ('igu', 'dia_familia', 'media', 'Mobilidade para diferentes gerações.'),
      ('igu', 'doze_doze', 'media', 'Campanha de vendas.'),
      ('igu', 'dia_mecanico', 'alta', 'Equipe de assistência técnica.'),
      ('igu', 'inicio_verao', 'alta', 'Mobilidade no dia a dia.'),
      ('igu', 'pauta_ferias_verao', 'alta', ''),
      ('igu', 'pauta_presentes_encerramento', 'alta', ''),
      -- Layfe Imports
      ('lay', 'onze_onze', 'alta', 'Campanha promocional de eletrônicos.'),
      ('lay', 'black_friday', null, 'Smartphones e acessórios.'),
      ('lay', 'cyber_monday', 'alta', 'Ofertas em eletrônicos.'),
      ('lay', 'dia_familia', 'alta', 'Tecnologia para presentear.'),
      ('lay', 'doze_doze', 'alta', 'Ofertas especiais.'),
      ('lay', 'inicio_verao', 'media', 'Fotografia, viagens e tecnologia.'),
      ('lay', 'pauta_presentes_smartphones', 'alta', ''),
      ('lay', 'pauta_13_salario', 'alta', ''),
      -- Casas Paranaense
      ('cas', 'dia_eletricista', 'media', ''),
      ('cas', 'dia_inovacao', 'media', 'Técnicas de construção.'),
      ('cas', 'dia_engenheiro_civil', 'alta', ''),
      ('cas', 'eng_seguranca_trabalho', 'media', ''),
      ('cas', 'dia_familia', 'alta', 'Realização da casa própria.'),
      ('cas', 'dia_engenheiro', 'alta', ''),
      ('cas', 'dia_pedreiro', 'alta', ''),
      ('cas', 'inicio_verao', 'alta', 'Casas de praia e veraneio.'),
      ('cas', 'pauta_casa_propria_2027', 'alta', ''),
      -- Creative Eventos
      ('cre', 'dia_alimentacao', 'alta', ''),
      ('cre', 'dia_chef', 'alta', ''),
      ('cre', 'dia_cheesecake', 'operacional', ''),
      ('cre', 'dia_sushi', 'operacional', ''),
      ('cre', 'dia_bolo', 'alta', ''),
      ('cre', 'dia_cookie', 'media', ''),
      ('cre', 'dia_brownie', 'media', ''),
      ('cre', 'pauta_confraternizacoes', 'alta', ''),
      ('cre', 'pauta_coffee_encerramento', 'alta', ''),
      ('cre', 'pauta_reservas_2027', 'alta', '')
    ) as p(k, chave, prio, relev)
    join public.datas_base b on b.chave = p.chave
    where p.k = r.k
    on conflict (cliente_id, data_id) do update
      set visivel_cliente = true,
          prioridade      = excluded.prioridade,
          relevancia      = excluded.relevancia;
  end loop;
end
$$;
