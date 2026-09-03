-- 0022_crm_foto.sql — foto de perfil do contato/grupo (Z-API).
-- Recria a view crm_conversas incluindo foto_url e pilar/monitorado
-- (caso ainda não estejam expostos).

alter table if exists public.crm_leads
  add column if not exists foto_url text;

create or replace view public.crm_conversas as
select
  l.id,
  l.nome,
  l.empresa,
  l.telefone,
  l.origem,
  l.etapa,
  l.etiquetas,
  l.valor,
  l.atendente_id,
  p.nome as atendente_nome,
  l.fixado,
  l.arquivado,
  l.is_grupo,
  l.foto_url,
  l.pilar,
  l.monitorado,
  l.timeout_minutos,
  l.created_at,
  m_ult.conteudo     as ultima_mensagem,
  m_ult.direcao      as ultima_direcao,
  m_ult.enviada_em   as ultima_em,
  coalesce(nl.n, 0)  as nao_lidas,
  m_saida.enviada_em as ultima_saida_em
from public.crm_leads l
left join public.profiles p on p.id = l.atendente_id
left join lateral (
  select conteudo, direcao, enviada_em
  from public.crm_mensagens
  where lead_id = l.id
  order by enviada_em desc
  limit 1
) m_ult on true
left join lateral (
  select enviada_em
  from public.crm_mensagens
  where lead_id = l.id and direcao = 'enviada'
  order by enviada_em desc
  limit 1
) m_saida on true
left join lateral (
  select count(*)::int as n
  from public.crm_mensagens
  where lead_id = l.id and direcao = 'recebida' and lida = false
) nl on true;
