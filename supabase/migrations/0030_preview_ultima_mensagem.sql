-- 0030_preview_ultima_mensagem.sql
-- Restaura a prévia da última mensagem por tipo no view crm_conversas.

drop view if exists public.crm_conversas cascade;
create view public.crm_conversas as
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
  case
    when m_ult.tipo = 'imagem'    then coalesce(nullif(trim(m_ult.conteudo), ''), '📷 Foto')
    when m_ult.tipo = 'video'     then coalesce(nullif(trim(m_ult.conteudo), ''), '🎥 Vídeo')
    when m_ult.tipo = 'audio'     then '🎤 Áudio'
    when m_ult.tipo = 'documento' then '📎 ' || coalesce(nullif(trim(m_ult.midia_nome), ''), 'Documento')
    when m_ult.tipo = 'sticker'   then 'Figurinha'
    when m_ult.tipo = 'reacao'    then 'Reagiu à mensagem'
    when m_ult.tipo = 'sistema'   then coalesce(nullif(trim(m_ult.conteudo), ''), 'Evento')
    else m_ult.conteudo
  end                as ultima_mensagem,
  m_ult.direcao      as ultima_direcao,
  m_ult.enviada_em   as ultima_em,
  coalesce(nl.n, 0)  as nao_lidas,
  m_saida.enviada_em as ultima_saida_em
from public.crm_leads l
left join public.profiles p on p.id = l.atendente_id
left join lateral (
  select conteudo, direcao, enviada_em, tipo, midia_nome
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
