-- =============================================================
-- 0087_story_ideas.sql — Ideias de Stories (Black Friday 2026)
-- =============================================================
-- Banco de ideias de Stories por cliente, mostradas em cards 9:16.
-- Equipe: acesso total. Cliente final: lê só as ideias ATIVAS e o visual do próprio perfil.
-- Seed: Layfe Imports, XM Gravataí, iGotUp e LG Internet (casados pelo nome do cliente).
-- Preços e condições dos exemplos são fictícios (R$ 0.000).
-- =============================================================

create table if not exists public.story_client_settings (
  client_id         uuid primary key references public.clientes(id) on delete cascade,
  display_name      text not null,
  instagram_handle  text not null default '',
  initials          text not null default '',
  accent_color      text not null default '#1e9be0',
  accent_text_color text not null default '#ffffff',
  bg_from           text not null default '#0b0b0b',
  bg_to             text not null default '#1f2937',
  font_family       text not null default 'poppins' check (font_family in ('poppins', 'montserrat')),
  rules             text not null default '',
  updated_at        timestamptz not null default now()
);

create table if not exists public.story_ideas (
  id            uuid primary key default gen_random_uuid(),
  client_id     uuid not null references public.clientes(id) on delete cascade,
  step          text not null check (step in ('interacao', 'conexao', 'prova', 'oferta')),
  title         text not null,
  photo_hint    text not null default '',
  headline      text not null,
  subtext       text not null default '',
  price_pre     text,
  price_value   text,
  price_post    text,
  sticker_type  text not null default 'none' check (sticker_type in ('poll', 'question', 'quiz', 'countdown', 'button', 'none')),
  sticker_data  jsonb not null default '{}'::jsonb,
  tip           text not null default '',
  show_logo     boolean not null default false,
  active        boolean not null default true,
  sort_order    integer not null default 0,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

create index if not exists idx_story_ideas_cliente on public.story_ideas (client_id, sort_order);

alter table public.story_client_settings enable row level security;
alter table public.story_ideas enable row level security;

drop policy if exists p_story_settings_equipe on public.story_client_settings;
create policy p_story_settings_equipe on public.story_client_settings
  for all to authenticated using (public.is_equipe()) with check (public.is_equipe());

drop policy if exists p_story_settings_cliente on public.story_client_settings;
create policy p_story_settings_cliente on public.story_client_settings
  for select to authenticated using (client_id = public.meu_cliente_id());

drop policy if exists p_story_ideas_equipe on public.story_ideas;
create policy p_story_ideas_equipe on public.story_ideas
  for all to authenticated using (public.is_equipe()) with check (public.is_equipe());

drop policy if exists p_story_ideas_cliente on public.story_ideas;
create policy p_story_ideas_cliente on public.story_ideas
  for select to authenticated using (client_id = public.meu_cliente_id() and active);

-- ---------- Dados iniciais ----------

-- Layfe Imports
insert into public.story_client_settings (client_id, display_name, instagram_handle, initials, accent_color, accent_text_color, bg_from, bg_to, font_family, rules)
select c.id, 'Layfe Imports', 'layfeimports', 'L', '#FF6300', '#FFFFFF', '#0b0b0b', '#2a1608', 'poppins', 'Preço grande e legível, sempre com a condição real.
Novos: "revenda autorizada". Seminovos: "garantia de 6 meses". Nunca misturar.
Foto real do produto. Nada de produto criado por IA.
Laranja só como destaque, base preta e branca.'
from public.clientes c where c.nome ilike '%layfe%' order by c.created_at limit 1
on conflict (client_id) do nothing;
insert into public.story_ideas (client_id, step, title, photo_hint, headline, subtext, price_pre, price_value, price_post, sticker_type, sticker_data, tip, show_logo, sort_order)
select c.id, v.* from (select id from public.clientes where nome ilike '%layfe%' order by created_at limit 1) c
cross join (values
  ('interacao', 'iPhone ou Android?', 'Dois aparelhos lado a lado em fundo preto', 'Seu próximo celular é qual?', '', null, null, null, 'poll', '{"q":"Próximo celular","a":"iPhone","b":"Android"}'::jsonb, 'Abre a conversa sem vender. A resposta mostra quem está pensando em trocar de aparelho, e esse grupo é o seu melhor público para a Black.', false, 0),
  ('interacao', 'O que te impede?', 'Mão segurando um iPhone na vitrine da loja', 'O que te impede de comprar um iPhone?', 'Pode falar, a gente responde aqui.', null, null, null, 'question', '{"q":"Me conta aqui","ph":"Digite sua resposta"}'::jsonb, 'Cada resposta vira conteúdo e quebra objeção. Responda em Story com a foto da loja e o nome de quem perguntou, se a pessoa deixar.', false, 1),
  ('conexao', 'Unboxing de cliente', 'Cliente abrindo a caixa de um iPhone, sorrindo', 'Esse sorriso é o melhor momento do dia', 'Entrega de hoje na loja, em Gravataí.', null, null, null, 'none', '{}'::jsonb, 'Gente real abrindo a caixa. Peça autorização da pessoa antes de postar.', false, 2),
  ('conexao', 'Bastidor da loja', 'Equipe organizando a vitrine na Golden Tower', 'Por trás da vitrine', 'Tudo conferido antes de chegar em você.', null, null, null, 'none', '{}'::jsonb, 'Mostra loja física e endereço real. Reduz o medo de golpe.', false, 3),
  ('prova', 'Cliente satisfeito', 'Print de elogio de cliente no WhatsApp', '+1000 clientes satisfeitos', 'Alguns dos nossos, de verdade.', null, null, null, 'button', '{"label":"Falar com a Layfe","wa":true}'::jsonb, 'Use prints reais, com autorização. Cubra nome e número do cliente.', false, 4),
  ('prova', 'Pergunta de cliente', 'Resposta curta sobre procedência dentro da loja', '"É original?"', 'Sim. Revenda autorizada em produtos novos.', null, null, null, 'quiz', '{"q":"Tem garantia?","opts":["Tem sim","Explica aí"]}'::jsonb, 'Responde a maior dúvida do público. Para seminovos, troque a frase por "garantia de 6 meses".', false, 5),
  ('oferta', 'Produto com preço grande', 'Foto real do produto em fundo limpo', 'iPhone modelo exemplo', '', 'a partir de', 'R$ 0.000', 'parcelamento até 18x quando aplicável', 'button', '{"label":"Chamar no WhatsApp","wa":true}'::jsonb, 'Exemplo de estrutura: produto, preço, condição, botão. Troque pelo item e valor reais confirmados.', false, 6),
  ('oferta', 'Contagem da Black', 'Vitrine com iPhones e luz laranja', 'A Black da Layfe tem hora para acabar', 'Condições válidas enquanto durar o estoque.', null, null, null, 'countdown', '{"label":"Termina em"}'::jsonb, 'Só use depois de confirmar a data final e as condições com o cliente.', false, 7)
) as v(step, title, photo_hint, headline, subtext, price_pre, price_value, price_post, sticker_type, sticker_data, tip, show_logo, sort_order)
where not exists (select 1 from public.story_ideas x where x.client_id = c.id);

-- XM Gravataí
insert into public.story_client_settings (client_id, display_name, instagram_handle, initials, accent_color, accent_text_color, bg_from, bg_to, font_family, rules)
select c.id, 'XM Gravataí', 'xmgravatai', 'XM', '#FFFFFF', '#111111', '#111111', '#2b2b2b', 'poppins', 'Base preta e branca, preço em destaque.
Só falar de oferta com produto, preço e condição confirmados.
Dois modelos lado a lado funcionam bem para enquete.'
from public.clientes c where c.nome ilike '%xm grava%' order by c.created_at limit 1
on conflict (client_id) do nothing;
insert into public.story_ideas (client_id, step, title, photo_hint, headline, subtext, price_pre, price_value, price_post, sticker_type, sticker_data, tip, show_logo, sort_order)
select c.id, v.* from (select id from public.clientes where nome ilike '%xm grava%' order by created_at limit 1) c
cross join (values
  ('interacao', 'Qual você levaria?', 'Dois celulares Xiaomi lado a lado', 'Qual desses você levaria?', '', null, null, null, 'poll', '{"q":"Escolha um","a":"Modelo A","b":"Modelo B"}'::jsonb, 'Compare dois modelos reais da loja. A escolha mostra o que o público procura.', false, 0),
  ('interacao', 'O que você procura?', 'Close da câmera de um celular', 'O que você procura em um celular?', 'Câmera, bateria ou preço?', null, null, null, 'question', '{"q":"Responde aqui","ph":"Escreva aqui"}'::jsonb, 'Use as respostas para montar a oferta certa para cada perfil.', false, 1),
  ('conexao', 'Quem atende você', 'Atendente da loja segurando um aparelho', 'Quem cuida do seu atendimento', 'Loja em Gravataí, atendimento direto.', null, null, null, 'none', '{}'::jsonb, 'Rosto e nome do time aproximam. Poste a equipe real.', false, 2),
  ('prova', 'Entrega feliz', 'Cliente recebendo a caixa na loja', 'Mais uma entrega feita', 'Obrigado pela confiança.', null, null, null, 'none', '{}'::jsonb, 'Fotos reais de entrega, com autorização do cliente.', false, 3),
  ('oferta', 'Preço em destaque', 'Foto real do aparelho em fundo limpo', 'Modelo exemplo', '', 'por', 'R$ 0.000', 'condição a confirmar', 'button', '{"label":"Chamar no WhatsApp","wa":true}'::jsonb, 'Só publique com produto, preço e condição confirmados.', false, 4)
) as v(step, title, photo_hint, headline, subtext, price_pre, price_value, price_post, sticker_type, sticker_data, tip, show_logo, sort_order)
where not exists (select 1 from public.story_ideas x where x.client_id = c.id);

-- iGotUp
insert into public.story_client_settings (client_id, display_name, instagram_handle, initials, accent_color, accent_text_color, bg_from, bg_to, font_family, rules)
select c.id, 'iGotUp', 'igotup', 'iG', '#4DFF00', '#0a0a0a', '#070707', '#16210f', 'poppins', 'Base preta, verde #4DFF00 só como destaque.
Scooter e assistência técnica são assuntos separados.
Não misturar especificações entre modelos.
Só o WhatsApp principal de vendas.'
from public.clientes c where c.nome ilike '%igotup%' order by c.created_at limit 1
on conflict (client_id) do nothing;
insert into public.story_ideas (client_id, step, title, photo_hint, headline, subtext, price_pre, price_value, price_post, sticker_type, sticker_data, tip, show_logo, sort_order)
select c.id, v.* from (select id from public.clientes where nome ilike '%igotup%' order by created_at limit 1) c
cross join (values
  ('interacao', 'Quanto você gasta?', 'Rua movimentada com trânsito de manhã', 'Quanto você gasta por mês com Uber ou ônibus?', '', null, null, null, 'poll', '{"q":"Por mês","a":"Até R$ 200","b":"Mais que isso"}'::jsonb, 'Abre o assunto scooter sem vender. A conta de transporte vira o argumento depois.', false, 0),
  ('conexao', 'Bastidor da assistência', 'Técnico mexendo em uma scooter na bancada', 'Aqui a scooter é cuidada de perto', 'Assistência técnica própria.', null, null, null, 'none', '{}'::jsonb, 'Lembre: assistência e venda de scooter são assuntos separados. Use este Story só para mostrar a oficina.', false, 1),
  ('prova', 'Cliente na rua', 'Cliente na scooter saindo da loja', 'Foi de Uber, voltou de scooter', 'Entrega de hoje.', null, null, null, 'none', '{}'::jsonb, 'Cena real de entrega, com autorização.', false, 2),
  ('oferta', 'Chamada para simular', 'Scooter em fundo preto com luz verde', 'Veja a scooter que cabe no seu dia', 'Fale com a gente e simule.', null, null, null, 'button', '{"label":"WhatsApp de vendas","wa":true}'::jsonb, 'Use somente o WhatsApp principal de vendas.', false, 3)
) as v(step, title, photo_hint, headline, subtext, price_pre, price_value, price_post, sticker_type, sticker_data, tip, show_logo, sort_order)
where not exists (select 1 from public.story_ideas x where x.client_id = c.id);

-- LG Internet
insert into public.story_client_settings (client_id, display_name, instagram_handle, initials, accent_color, accent_text_color, bg_from, bg_to, font_family, rules)
select c.id, 'LG Internet', 'lginternet', 'LG', '#0085FF', '#FFFFFF', '#0085FF', '#003ED5', 'montserrat', 'Nunca abrir com pergunta. O gancho é uma afirmação.
Logo no final da sequência, com "Fale com a gente".
Botão minimalista: ASSINE JÁ.
Só falar de plano e preço quando estiverem confirmados.'
from public.clientes c where c.nome ilike '%lg internet%' order by c.created_at limit 1
on conflict (client_id) do nothing;
insert into public.story_ideas (client_id, step, title, photo_hint, headline, subtext, price_pre, price_value, price_post, sticker_type, sticker_data, tip, show_logo, sort_order)
select c.id, v.* from (select id from public.clientes where nome ilike '%lg internet%' order by created_at limit 1) c
cross join (values
  ('interacao', 'Prioridade da casa', 'Família usando celular e TV na sala', 'Internet boa muda a rotina da casa', '', null, null, null, 'poll', '{"q":"O que pesa mais?","a":"Velocidade","b":"Estabilidade"}'::jsonb, 'O gancho é uma afirmação. A enquete vem como apoio, nunca como abertura.', false, 0),
  ('conexao', 'Equipe em campo', 'Técnico da LG instalando em uma casa em Viamão', 'Quem instala está perto de você', 'Equipe local, em Viamão.', null, null, null, 'none', '{}'::jsonb, 'Mostre a equipe real e uniformizada.', false, 1),
  ('prova', 'Instalação concluída', 'Cliente mostrando o roteador funcionando', 'Mais uma casa conectada', 'Obrigado por escolher a LG.', null, null, null, 'none', '{}'::jsonb, 'Cena real, com autorização do cliente.', false, 2),
  ('oferta', 'A Black da LG chegou', 'Casa com sinal de wi-fi em azul', 'A Black da LG chegou a Viamão', 'Fale com a gente.', null, null, null, 'button', '{"label":"ASSINE JÁ","wa":false,"min":true}'::jsonb, 'Afirmativo, sem pergunta. Logo no fim. Só mencione plano e preço depois de confirmar.', true, 3)
) as v(step, title, photo_hint, headline, subtext, price_pre, price_value, price_post, sticker_type, sticker_data, tip, show_logo, sort_order)
where not exists (select 1 from public.story_ideas x where x.client_id = c.id);
