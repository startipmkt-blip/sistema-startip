-- =============================================================
-- 0040_datas_comemorativas.sql — Calendário de datas comemorativas
-- =============================================================
-- datas_base        → Base Mãe: catálogo global com REGRA de recorrência.
--                     As ocorrências de cada ano são calculadas no front
--                     (src/modules/datas-comemorativas/lib/recorrencia.ts),
--                     então nenhum ano precisa ser recadastrado.
-- datas_cliente     → quais datas da Base Mãe cada cliente usa + ajustes.
-- datas_calendario  → link público (/calendario/:slug) e início do calendário.
-- Leitura pública só pela RPC security definer `calendario_publico`.
-- =============================================================

create table if not exists public.datas_base (
  id            uuid primary key default gen_random_uuid(),
  chave         text unique,
  nome          text not null,
  categoria     text not null default '',
  prioridade    text not null default 'media'
                check (prioridade in ('muito_alta', 'alta', 'media', 'baixa', 'operacional')),
  opcional      boolean not null default false,
  regra         text not null
                check (regra in ('fixa', 'semana_do_mes', 'pascoa', 'relativa', 'unica')),
  mes           smallint check (mes between 1 and 12),
  dia           smallint check (dia between 1 and 31),
  dia_semana    smallint check (dia_semana between 0 and 6),
  ordem_semana  smallint check (ordem_semana in (-1, 1, 2, 3, 4, 5)),
  dias_offset   int,
  relativa_a    uuid references public.datas_base(id) on delete restrict,
  data_unica    date,
  angulos       text[] not null default '{}',
  observacao    text not null default '',
  -- Marcos de preparação relativos à data: [{"dias": -31, "titulo": "..."}]
  marcos        jsonb not null default '[]'::jsonb,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),
  constraint datas_base_regra_completa check (
    case regra
      when 'fixa'          then mes is not null and dia is not null
      when 'semana_do_mes' then mes is not null and dia_semana is not null and ordem_semana is not null
      when 'pascoa'        then dias_offset is not null
      when 'relativa'      then relativa_a is not null and dias_offset is not null and relativa_a <> id
      when 'unica'         then data_unica is not null
    end
  )
);

comment on table public.datas_base is
  'Base Mãe de datas comemorativas. Cada linha é uma regra de recorrência, não uma data de um ano específico.';

create table if not exists public.datas_cliente (
  id               uuid primary key default gen_random_uuid(),
  cliente_id       uuid not null references public.clientes(id) on delete cascade,
  -- restrict: não deixa apagar da Base Mãe uma data que algum cliente usa.
  data_id          uuid not null references public.datas_base(id) on delete restrict,
  prioridade       text check (prioridade in ('muito_alta', 'alta', 'media', 'baixa', 'operacional')),
  relevancia       text not null default '',
  angulos          text[],
  visivel_cliente  boolean not null default true,
  created_at       timestamptz not null default now(),
  unique (cliente_id, data_id)
);

comment on column public.datas_cliente.prioridade is 'NULL = usa a prioridade da Base Mãe.';
comment on column public.datas_cliente.angulos is 'NULL = usa os ângulos da Base Mãe.';

create index if not exists idx_datas_cliente_cliente on public.datas_cliente (cliente_id);

create table if not exists public.datas_calendario (
  cliente_id  uuid primary key references public.clientes(id) on delete cascade,
  slug        text not null unique check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  inicio      date not null default current_date,
  created_at  timestamptz not null default now()
);

alter table public.datas_base       enable row level security;
alter table public.datas_cliente    enable row level security;
alter table public.datas_calendario enable row level security;

drop policy if exists p_datas_base_equipe on public.datas_base;
create policy p_datas_base_equipe on public.datas_base
  for all to authenticated using (public.is_equipe()) with check (public.is_equipe());

drop policy if exists p_datas_cliente_equipe on public.datas_cliente;
create policy p_datas_cliente_equipe on public.datas_cliente
  for all to authenticated using (public.is_equipe()) with check (public.is_equipe());

drop policy if exists p_datas_calendario_equipe on public.datas_calendario;
create policy p_datas_calendario_equipe on public.datas_calendario
  for all to authenticated using (public.is_equipe()) with check (public.is_equipe());

-- ---------- Leitura pública pelo slug ----------
-- Devolve só o que o cliente pode ver: datas com visivel_cliente = true e
-- as linhas da Base Mãe necessárias para calcular as ocorrências
-- (inclusive âncoras de regras relativas, ex.: Cyber Monday → Black Friday).
create or replace function public.calendario_publico(p_slug text)
returns jsonb
language sql
stable
security definer
set search_path = public
as $fn$
  with cal as (
    select c.id, c.nome, c.logo_url, dc.inicio
    from public.datas_calendario dc
    join public.clientes c on c.id = dc.cliente_id
    where dc.slug = lower(p_slug)
  ),
  itens as (
    select dcl.id, dcl.data_id, dcl.prioridade, dcl.relevancia, dcl.angulos
    from public.datas_cliente dcl
    join cal on cal.id = dcl.cliente_id
    where dcl.visivel_cliente
  ),
  base_ids as (
    with recursive r(id) as (
      select data_id from itens
      union
      select b.relativa_a from public.datas_base b join r on b.id = r.id
      where b.relativa_a is not null
    )
    select id from r
  )
  select case when not exists (select 1 from cal) then null else jsonb_build_object(
    'cliente', (select jsonb_build_object('nome', nome, 'logo_url', logo_url) from cal),
    'inicio',  (select inicio from cal),
    'itens',   coalesce((select jsonb_agg(to_jsonb(itens)) from itens), '[]'::jsonb),
    'base',    coalesce((
      select jsonb_agg(jsonb_build_object(
        'id', b.id, 'nome', b.nome, 'categoria', b.categoria, 'prioridade', b.prioridade,
        'opcional', b.opcional, 'regra', b.regra, 'mes', b.mes, 'dia', b.dia,
        'dia_semana', b.dia_semana, 'ordem_semana', b.ordem_semana, 'dias_offset', b.dias_offset,
        'relativa_a', b.relativa_a, 'data_unica', b.data_unica, 'angulos', b.angulos,
        'observacao', b.observacao, 'marcos', b.marcos
      ))
      from public.datas_base b where b.id in (select id from base_ids)
    ), '[]'::jsonb)
  ) end;
$fn$;

grant execute on function public.calendario_publico(text) to anon, authenticated;

-- =============================================================
-- Seed da Base Mãe (datas genéricas, sem vínculo com cliente)
-- =============================================================
insert into public.datas_base
  (chave, nome, categoria, prioridade, opcional, regra, mes, dia, angulos, observacao)
values
  ('ano_novo', 'Ano Novo — Confraternização Universal', 'Feriado nacional', 'operacional', true, 'fixa', 1, 1,
    '{}', ''),
  ('dia_consumidor', 'Dia do Consumidor', 'Comercial', 'alta', false, 'fixa', 3, 15,
    '{"condições especiais","relacionamento com o cliente","direitos e transparência"}', ''),
  ('tiradentes', 'Tiradentes', 'Feriado nacional', 'operacional', true, 'fixa', 4, 21,
    '{}', ''),
  ('dia_trabalho', 'Dia do Trabalho', 'Feriado nacional / Institucional', 'baixa', true, 'fixa', 5, 1,
    '{"homenagem a quem trabalha","bastidores da equipe"}', ''),
  ('dia_mundial_telecom', 'Dia Mundial das Telecomunicações', 'Setorial / Tecnologia', 'alta', false, 'fixa', 5, 17,
    '{"evolução das telecomunicações","conectividade no dia a dia","infraestrutura por trás da conexão"}', ''),
  ('dia_namorados', 'Dia dos Namorados', 'Sazonal / Comercial', 'media', false, 'fixa', 6, 12,
    '{"conexão entre pessoas","momentos a dois","streaming e filmes em casa"}', ''),
  ('independencia', 'Independência do Brasil', 'Feriado nacional', 'operacional', true, 'fixa', 9, 7,
    '{}', ''),
  ('aniversario_viamao', 'Aniversário de Viamão', 'Regional (Viamão/RS)', 'media', false, 'fixa', 9, 14,
    '{"orgulho local","história da cidade","presença na comunidade"}', ''),
  ('dia_cliente', 'Dia do Cliente', 'Comercial / Relacionamento', 'alta', false, 'fixa', 9, 15,
    '{"gratidão aos clientes","benefícios exclusivos","depoimentos"}', ''),
  ('revolucao_farroupilha', 'Revolução Farroupilha', 'Regional (RS) / Feriado estadual', 'media', false, 'fixa', 9, 20,
    '{"tradição gaúcha","orgulho regional"}', ''),
  ('tecnico_telecom', 'Dia do Técnico em Telecomunicações', 'Setorial / Tecnologia', 'media', false, 'fixa', 9, 23,
    '{"quem mantém a rede funcionando","bastidores da instalação","homenagem à equipe técnica"}', ''),
  ('acesso_informacao', 'Dia Internacional do Acesso Universal à Informação', 'Setorial / Tecnologia / Educacional', 'alta', false, 'fixa', 9, 28,
    '{"informação ao alcance de todos","internet como ferramenta de acesso","conectividade e inclusão digital","importância de uma conexão confiável","acesso à informação na era digital"}',
    'Data reconhecida pela UNESCO em 28 de setembro.'),
  ('dia_criancas', 'Dia das Crianças', 'Institucional / Sazonal / Comercial', 'media', false, 'fixa', 10, 12,
    '{"crianças conectadas","jogos online","desenhos e streaming","internet em família","segurança das crianças na internet"}', ''),
  ('nsa_aparecida', 'Nossa Senhora Aparecida', 'Feriado nacional', 'operacional', true, 'fixa', 10, 12,
    '{}', 'Não é obrigatório gerar conteúdo.'),
  ('dia_professores', 'Dia dos Professores', 'Institucional / Educacional', 'media', false, 'fixa', 10, 15,
    '{"internet como ferramenta de educação","aulas online","pesquisa","tecnologia na educação","professores conectados","acesso ao conhecimento"}', ''),
  ('dia_profissional_ti', 'Dia do Profissional de Tecnologia / TI', 'Setorial / Tecnologia', 'baixa', true, 'fixa', 10, 19,
    '{"profissionais por trás da tecnologia","evolução da internet","tecnologia no cotidiano","profissionais que mantêm o mundo conectado"}',
    'Tratar como oportunidade editorial — não é feriado nem data oficial nacional.'),
  ('dia_servidor_publico', 'Dia do Servidor Público', 'Operacional / Institucional', 'baixa', true, 'fixa', 10, 28,
    '{}', 'Não é obrigatório gerar conteúdo.'),
  ('halloween', 'Halloween', 'Sazonal', 'baixa', true, 'fixa', 10, 31,
    '{"internet que não assusta","o terror de ficar sem internet","humor","velocidade assustadoramente boa"}',
    'Não é obrigatório gerar conteúdo.'),
  ('finados', 'Finados', 'Feriado nacional', 'operacional', true, 'fixa', 11, 2,
    '{}', 'Não é obrigatório gerar conteúdo.'),
  ('proclamacao_republica', 'Proclamação da República', 'Feriado nacional / Institucional', 'operacional', false, 'fixa', 11, 15,
    '{}', ''),
  ('consciencia_negra', 'Dia Nacional de Zumbi e da Consciência Negra', 'Institucional / Feriado nacional', 'media', false, 'fixa', 11, 20,
    '{}', 'Trabalhar de forma respeitosa e institucional.'),
  ('seguranca_informacao', 'Dia Internacional da Segurança da Informação', 'Setorial / Tecnologia / Educacional', 'alta', false, 'fixa', 11, 30,
    '{"segurança do Wi-Fi","senhas fortes","golpes digitais","segurança de dados","proteção da rede doméstica","cuidados em redes públicas"}', ''),
  ('viamao_nsa_conceicao', 'Nossa Senhora da Conceição — Feriado municipal de Viamão', 'Regional / Feriado municipal (Viamão)', 'operacional', false, 'fixa', 12, 8,
    '{}', 'Feriado da padroeira de Viamão.'),
  ('vespera_natal', 'Véspera de Natal', 'Sazonal / Operacional', 'media', false, 'fixa', 12, 24,
    '{}', 'Considerar planejamento de funcionamento e atendimento.'),
  ('natal', 'Natal', 'Institucional / Sazonal', 'alta', false, 'fixa', 12, 25,
    '{"conexão entre famílias","estar perto de quem importa","mensagens de Natal","momentos compartilhados","gratidão aos clientes"}', ''),
  ('reveillon', 'Véspera de Ano Novo / Réveillon', 'Institucional / Sazonal', 'media', false, 'fixa', 12, 31,
    '{"retrospectiva do ano","agradecimento aos clientes","expectativa para o novo ano","novos planos"}', '')
on conflict (chave) do nothing;

insert into public.datas_base
  (chave, nome, categoria, prioridade, opcional, regra, mes, dia_semana, ordem_semana, angulos, observacao, marcos)
values
  ('dia_maes', 'Dia das Mães', 'Sazonal / Comercial', 'alta', false, 'semana_do_mes', 5, 0, 2,
    '{"homenagem às mães","conexão em família"}', '2º domingo de maio.', '[]'),
  ('dia_pais', 'Dia dos Pais', 'Sazonal / Comercial', 'media', false, 'semana_do_mes', 8, 0, 2,
    '{"homenagem aos pais","conexão em família"}', '2º domingo de agosto.', '[]'),
  ('black_friday', 'Black Friday', 'Comercial', 'muito_alta', false, 'semana_do_mes', 11, 5, -1,
    '{"aquisição de novos clientes","campanhas comerciais","condições especiais","conversão"}',
    'Última sexta-feira de novembro. Começar o planejamento com antecedência.',
    '[{"dias": -31, "titulo": "Definição da campanha"},
      {"dias": -24, "titulo": "Oferta e comunicação"},
      {"dias": -17, "titulo": "Produção dos criativos"},
      {"dias": -10, "titulo": "Campanha em aprovação"},
      {"dias": -7,  "titulo": "Início da comunicação"}]')
on conflict (chave) do nothing;

insert into public.datas_base
  (chave, nome, categoria, prioridade, opcional, regra, dias_offset, angulos, observacao)
values
  ('carnaval', 'Carnaval', 'Sazonal', 'media', true, 'pascoa', -47, '{}', 'Terça-feira de Carnaval (47 dias antes da Páscoa).'),
  ('sexta_santa', 'Sexta-feira Santa', 'Feriado nacional', 'operacional', true, 'pascoa', -2, '{}', ''),
  ('pascoa', 'Páscoa', 'Sazonal / Institucional', 'media', false, 'pascoa', 0, '{"renovação","momentos em família"}', ''),
  ('corpus_christi', 'Corpus Christi', 'Ponto facultativo', 'operacional', true, 'pascoa', 60, '{}', '')
on conflict (chave) do nothing;

insert into public.datas_base
  (chave, nome, categoria, prioridade, opcional, regra, relativa_a, dias_offset, angulos, observacao)
select 'cyber_monday', 'Cyber Monday', 'Comercial / Tecnologia', 'alta', false, 'relativa', b.id, 3,
  '{"extensão da Black Friday","ofertas online"}',
  'Segunda-feira após a Black Friday. Pode funcionar como extensão da campanha.'
from public.datas_base b where b.chave = 'black_friday'
on conflict (chave) do nothing;
