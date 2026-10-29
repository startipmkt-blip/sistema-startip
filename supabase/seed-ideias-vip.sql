-- =============================================================
-- seed-ideias-vip.sql — Lote de exemplo da aba Ideias (rodar UMA vez, opcional)
-- =============================================================
-- Cria 1 lote em RASCUNHO com 8 ideias para o cliente "Layfe imports".
-- Para usar outro cliente, troque o trecho  ilike '%layfe%'  abaixo.
-- Não publica nada. Alguns textos têm [campos entre colchetes] de propósito,
-- para testar o aviso "Preencher" e o bloqueio de publicação.
-- =============================================================

with cli as (
  select id from public.clientes where nome ilike '%layfe%' order by created_at limit 1
), lote as (
  insert into public.idea_batches (client_id, title, reference_month, status)
  select id, 'Novembro 2026 (exemplo)', date '2026-11-01', 'rascunho' from cli
  where not exists (select 1 from public.idea_batches b where b.client_id = cli.id and b.title = 'Novembro 2026 (exemplo)')
  returning id, client_id
)
insert into public.ideas (batch_id, client_id, type, title, body, media_suggestion, theme, suggested_date, suggested_time, position)
select lote.id, lote.client_id, v.type, v.title, v.body, v.media, v.theme, v.dia, v.hora, v.pos
from lote
cross join (values
  ('bom_dia',   'Bom dia VIP',        'Bom dia, pessoal do grupo VIP. Hoje o dia começa com novidade na loja.', 'Foto da vitrine', 'Início de semana', date '2026-11-02', '07:30', 0),
  ('valor',     'Dica da semana',     'Antes de comprar [PRODUTO], confira estes 3 pontos para não errar na escolha. Se tiver dúvida, é só responder aqui.', null, 'Educação', date '2026-11-02', '12:30', 1),
  ('enquete',   'Qual você prefere?', 'Enquete rápida: qual você prefere, [OPÇÃO A] ou [OPÇÃO B]? Responda com A ou B.', null, 'Interação', date '2026-11-03', '12:30', 2),
  ('enredo',    'Entrega do dia',     'Mais uma entrega feita hoje. Obrigado pela confiança de sempre.', 'Foto do cliente retirando o pedido', 'Bastidores', date '2026-11-04', '14:30', 3),
  ('teaser',    'Vem novidade',       'Amanhã o grupo VIP recebe uma condição especial. Fique de olho.', null, 'Expectativa', date '2026-11-04', '18:00', 4),
  ('oferta',    'Oferta VIP',         'Oferta exclusiva do grupo: [PRODUTO] por [VALOR], só até as 16h. Responda aqui para garantir.', 'Foto do produto', 'Oferta da semana', date '2026-11-05', '15:30', 5),
  ('valor',     'Pergunta frequente', 'Muita gente pergunta como funciona a garantia. Resumindo: a garantia é de [PRAZO] e vale a partir da retirada.', null, 'Dúvidas', null, null, 6),
  ('boa_noite', 'Boa noite',          'Boa noite, pessoal. Obrigado por fazer parte do grupo. Amanhã tem mais.', null, 'Encerramento', date '2026-11-05', '21:00', 7)
) as v(type, title, body, media, theme, dia, hora, pos);
