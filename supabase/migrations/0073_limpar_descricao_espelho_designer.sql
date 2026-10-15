-- 0073_limpar_descricao_espelho_designer.sql
-- A descricao/briefing da demanda do designer e interna e estava sendo copiada para o
-- post de gestao de conteudo, que o cliente ve na aprovacao.
-- Limpa SOMENTE as copias identicas ao texto da demanda. Se o texto trazia um link
-- e o post nao tinha link_drive, o 1o link vira link_drive antes de limpar.

update public.conteudo_aprovacao c
   set link_drive = coalesce(nullif(btrim(c.link_drive), ''),
                             (regexp_match(c.descricao, 'https?://[^\s]+'))[1],
                             c.link_drive),
       descricao  = ''
  from public.designer_demandas d
 where c.designer_demanda_id = d.id
   and coalesce(btrim(c.descricao), '') <> ''
   and btrim(c.descricao) = btrim(coalesce(d.descricao, d.briefing, ''));
