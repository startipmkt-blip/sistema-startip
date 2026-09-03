-- =============================================================
-- 0003_modulos.sql — Tabelas de TODOS os módulos + RLS
-- =============================================================
-- Dois tipos de tabela:
--  A) Ligadas a cliente (FK cliente_id): SELECT equipe OU dono; escrita equipe.
--  B) Internas da agência (sem cliente): apenas equipe.
-- Funções is_equipe() / meu_cliente_id() vêm de 0002_rls.sql.
-- =============================================================

-- ---------- Enums ----------
create type public.crm_etapa          as enum ('novo', 'contato', 'proposta', 'ganho', 'perdido');
create type public.receita_status     as enum ('em_dia', 'atrasado');
create type public.despesa_categoria  as enum ('assinatura', 'parcela', 'imposto', 'salario', 'outro');
create type public.despesa_status     as enum ('paga', 'pendente');
create type public.processo_categoria as enum ('trafego', 'atendimento', 'design', 'financeiro', 'onboarding', 'geral');
create type public.indicacao_status   as enum ('novo', 'em_contato', 'convertido', 'perdido');
create type public.conteudo_tipo      as enum ('reels', 'carrossel', 'estatico');
create type public.conteudo_status    as enum ('ideia', 'producao', 'aprovacao', 'publicado');
create type public.aprovacao_status   as enum ('pendente', 'aprovado', 'reprovado');
create type public.demanda_status     as enum ('aberta', 'fazendo', 'concluida');
create type public.demanda_prioridade as enum ('baixa', 'media', 'alta');
create type public.demanda_setor      as enum ('socios', 'trafego', 'design', 'geral');

-- =============================================================
-- (B) CRM — leads DA AGÊNCIA (funil próprio, conectado ao WhatsApp).
--     Não é por cliente: são os prospects da agência.
-- =============================================================
-- Etapas do funil (personalizáveis). Semente com as 5 padrão via seed/app.
create table public.crm_etapas (
  id    text primary key,
  label text not null,
  ordem integer not null default 0
);

create table public.crm_leads (
  id         uuid primary key default gen_random_uuid(),
  nome       text not null,
  empresa    text,
  telefone   text,
  origem     text,
  etapa      text not null default 'novo',  -- referencia crm_etapas.id
  valor      numeric(12,2) not null default 0,
  etiquetas  text[] not null default '{}',  -- qualificada, reuniao, negociacao, venda
  created_at timestamptz not null default now()
);

-- =============================================================
-- (A) Financeiro — RECEITAS (pagamento recorrente de cada cliente)
-- =============================================================
create table public.financeiro_receitas (
  id             uuid primary key default gen_random_uuid(),
  cliente_id     uuid not null references public.clientes (id) on delete cascade,
  valor_mensal   numeric(12,2) not null default 0,
  dia_vencimento integer not null default 5 check (dia_vencimento between 1 and 31),
  status         public.receita_status not null default 'em_dia',
  ativo          boolean not null default true,
  created_at     timestamptz not null default now()
);
create index idx_fin_rec_cliente on public.financeiro_receitas (cliente_id);

-- =============================================================
-- (B) Financeiro — DESPESAS da agência (assinaturas, parcelas, contas a pagar)
--     Sem cliente_id: é custo da agência, não de um cliente.
-- =============================================================
create table public.financeiro_despesas (
  id         uuid primary key default gen_random_uuid(),
  descricao  text not null,
  categoria  public.despesa_categoria not null default 'outro',
  valor      numeric(12,2) not null default 0,
  vencimento date not null,
  recorrente boolean not null default true,
  status     public.despesa_status not null default 'pendente',
  created_at timestamptz not null default now()
);

-- =============================================================
-- (A) Área do Cliente — relatórios mensais
-- =============================================================
create table public.relatorios_mensais (
  id                  uuid primary key default gen_random_uuid(),
  cliente_id          uuid not null references public.clientes (id) on delete cascade,
  mes_referencia      text not null,
  -- entradas da calculadora ROI/ROAS (os resultados são calculados no app):
  faturamento         numeric(12,2) not null default 0,
  margem              numeric(6,2) not null default 0,
  investimento        numeric(12,2) not null default 0,
  ticket_medio        numeric(12,2) not null default 0,
  vendas_pago         integer not null default 0,
  vendas_organico     integer not null default 0,
  leads               integer not null default 0,
  compras_por_cliente numeric(6,2) not null default 1,
  resumo              text,
  pdf_url             text,
  created_at          timestamptz not null default now()
);
create index idx_rel_cliente on public.relatorios_mensais (cliente_id);

-- =============================================================
-- (B) Processos — DOCUMENTAÇÃO da agência (SOPs). Sem cliente_id.
-- =============================================================
create table public.processos (
  id         uuid primary key default gen_random_uuid(),
  categoria  public.processo_categoria not null default 'geral',
  titulo     text not null,
  conteudo   text not null default '',
  autor      text,
  updated_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);

-- =============================================================
-- (A) Indicação
-- =============================================================
create table public.indicacoes (
  id            uuid primary key default gen_random_uuid(),
  cliente_id    uuid not null references public.clientes (id) on delete cascade,
  nome_indicado text not null,
  contato       text,
  status        public.indicacao_status not null default 'novo',
  recompensa    numeric(12,2) not null default 0,
  created_at    timestamptz not null default now()
);
create index idx_ind_cliente on public.indicacoes (cliente_id);

-- =============================================================
-- (B) Onboarding — TEMPLATES (roteiros reutilizáveis) + itens
-- =============================================================
create table public.onboarding_templates (
  id         uuid primary key default gen_random_uuid(),
  nome       text not null,
  created_at timestamptz not null default now()
);
create table public.onboarding_template_itens (
  id          uuid primary key default gen_random_uuid(),
  template_id uuid not null references public.onboarding_templates (id) on delete cascade,
  etapa       text not null,
  ordem       integer not null default 0
);
create index idx_onb_tpl_item on public.onboarding_template_itens (template_id);

-- =============================================================
-- (A) Onboarding — ANDAMENTO por cliente (template aplicado)
-- =============================================================
create table public.onboarding_etapas (
  id         uuid primary key default gen_random_uuid(),
  cliente_id uuid not null references public.clientes (id) on delete cascade,
  etapa      text not null,
  concluida  boolean not null default false,
  ordem      integer not null default 0,
  created_at timestamptz not null default now()
);
create index idx_onb_cliente on public.onboarding_etapas (cliente_id);

-- =============================================================
-- (A) Conteúdo
-- =============================================================
create table public.conteudos (
  id              uuid primary key default gen_random_uuid(),
  cliente_id      uuid not null references public.clientes (id) on delete cascade,
  titulo          text not null,
  tipo            public.conteudo_tipo not null,
  status          public.conteudo_status not null default 'ideia',
  data_publicacao date,
  created_at      timestamptz not null default now()
);
create index idx_cont_cliente on public.conteudos (cliente_id);

-- =============================================================
-- (A*) Aprovação de conteúdo — ideias por cliente/mês + sugestões.
--      RLS especial: o CLIENTE pode aprovar/reprovar as próprias ideias
--      e enviar sugestões (diferente do padrão só-equipe).
-- =============================================================
create table public.conteudo_aprovacao (
  id             uuid primary key default gen_random_uuid(),
  cliente_id     uuid not null references public.clientes (id) on delete cascade,
  mes_referencia text not null,
  semana         integer not null default 1 check (semana between 1 and 5),
  titulo         text not null,
  descricao      text,
  formato        public.conteudo_tipo not null default 'reels',
  status         public.aprovacao_status not null default 'pendente',
  justificativa  text not null default '',
  created_at     timestamptz not null default now()
);
create index idx_aprov_cliente on public.conteudo_aprovacao (cliente_id);

create table public.conteudo_sugestoes (
  id             uuid primary key default gen_random_uuid(),
  cliente_id     uuid not null references public.clientes (id) on delete cascade,
  mes_referencia text not null,
  texto          text not null,
  created_at     timestamptz not null default now()
);
create index idx_sugest_cliente on public.conteudo_sugestoes (cliente_id);

-- =============================================================
-- (A) Perfil do cliente — ICP (1 por cliente) e Personas (N)
-- =============================================================
create table public.cliente_icp (
  cliente_id   uuid primary key references public.clientes (id) on delete cascade,
  publico_alvo text,
  regiao       text,
  ticket_medio numeric(12,2) not null default 0,
  canais       text[] not null default '{}',
  dores        text[] not null default '{}',
  created_at   timestamptz not null default now()
);
create table public.personas (
  id         uuid primary key default gen_random_uuid(),
  cliente_id uuid not null references public.clientes (id) on delete cascade,
  nome       text not null,
  idade      integer,
  ocupacao   text,
  descricao  text,
  objetivos  text[] not null default '{}',
  objecoes   text[] not null default '{}',
  created_at timestamptz not null default now()
);
create index idx_persona_cliente on public.personas (cliente_id);

-- =============================================================
-- (A) Workspace do cliente — documentos (Materiais + Fluxo de trabalho)
--     Espelha a estrutura do Notion: um documento por "chave" por cliente.
-- =============================================================
create table public.cliente_docs (
  id         uuid primary key default gen_random_uuid(),
  cliente_id uuid not null references public.clientes (id) on delete cascade,
  chave      text not null,   -- ex.: 'icp', 'persona', 'funil', 'gmn'...
  conteudo   text not null default '',
  anexo_url  text,            -- PDF/documento anexado (Storage URL)
  updated_at timestamptz not null default now(),
  unique (cliente_id, chave)
);
create index idx_cliente_docs_cliente on public.cliente_docs (cliente_id);

-- =============================================================
-- (A) Reuniões por cliente — resumo em texto + PDF anexado.
--     Cliente lê as próprias (portal); equipe cria/edita/exclui.
-- =============================================================
create table public.reunioes (
  id         uuid primary key default gen_random_uuid(),
  cliente_id uuid not null references public.clientes (id) on delete cascade,
  data       date not null default current_date,
  titulo     text not null,
  resumo     text not null default '',
  pdf_url    text,   -- URL do PDF no Storage
  created_at timestamptz not null default now()
);
create index idx_reunioes_cliente on public.reunioes (cliente_id);

-- =============================================================
-- (B) CRM — conversas do WhatsApp (Z-API). Estrutura pronta; a
--     integração (webhook Z-API -> insert) é ligada pelo programador.
-- =============================================================
create table public.crm_mensagens (
  id         uuid primary key default gen_random_uuid(),
  lead_id    uuid references public.crm_leads (id) on delete cascade,
  telefone   text,
  direcao    text not null default 'recebida', -- 'recebida' | 'enviada'
  conteudo   text,
  enviada_em timestamptz not null default now()
);
create index idx_crm_msg_lead on public.crm_mensagens (lead_id);

-- =============================================================
-- (A/B) Demandas — cliente_id OPCIONAL (pode ser interna da agência)
-- =============================================================
create table public.demandas (
  id          uuid primary key default gen_random_uuid(),
  cliente_id  uuid references public.clientes (id) on delete cascade,
  setor       public.demanda_setor not null default 'geral',
  privada     boolean not null default false,  -- privada dos sócios (admin)
  titulo      text not null,
  responsavel text,
  prioridade  public.demanda_prioridade not null default 'media',
  status      public.demanda_status not null default 'aberta',
  prazo       date,
  created_at  timestamptz not null default now()
);
create index idx_dem_cliente on public.demandas (cliente_id);

-- =============================================================
-- RLS
-- =============================================================
-- (A) Tabelas ligadas a cliente: SELECT equipe OU dono; escrita só equipe.
do $$
declare
  t text;
  tabelas text[] := array[
    'financeiro_receitas', 'relatorios_mensais',
    'indicacoes', 'onboarding_etapas', 'conteudos', 'personas', 'cliente_docs', 'reunioes'
  ];
begin
  foreach t in array tabelas loop
    execute format('alter table public.%I enable row level security;', t);
    execute format($f$
      create policy %1$s_select on public.%1$I
        for select using (public.is_equipe() or cliente_id = public.meu_cliente_id());
    $f$, t);
    execute format($f$
      create policy %1$s_write on public.%1$I
        for all using (public.is_equipe()) with check (public.is_equipe());
    $f$, t);
  end loop;
end $$;

-- cliente_icp: PK é cliente_id (mesma lógica de dono).
alter table public.cliente_icp enable row level security;
create policy cliente_icp_select on public.cliente_icp
  for select using (public.is_equipe() or cliente_id = public.meu_cliente_id());
create policy cliente_icp_write on public.cliente_icp
  for all using (public.is_equipe()) with check (public.is_equipe());

-- (B) Tabelas INTERNAS da agência: só equipe (cliente não acessa).
do $$
declare
  t text;
  internas text[] := array[
    'crm_leads', 'crm_mensagens', 'crm_etapas', 'financeiro_despesas', 'processos',
    'onboarding_templates', 'onboarding_template_itens'
  ];
begin
  foreach t in array internas loop
    execute format('alter table public.%I enable row level security;', t);
    execute format($f$
      create policy %1$s_equipe on public.%1$I
        for all using (public.is_equipe()) with check (public.is_equipe());
    $f$, t);
  end loop;
end $$;

-- Demandas: equipe vê tudo; cliente só as do próprio cliente (nunca internas).
alter table public.demandas enable row level security;
create policy demandas_select on public.demandas
  for select using (
    public.is_admin()                                             -- sócios veem tudo
    or (public.is_equipe() and setor <> 'socios' and not privada) -- funcionário: sem sócios/privadas
    or (cliente_id is not null and cliente_id = public.meu_cliente_id())
  );
create policy demandas_write on public.demandas
  for all using (public.is_equipe()) with check (public.is_equipe());

-- Aprovação de conteúdo: equipe cria/gerencia; o CLIENTE lê e ATUALIZA
-- (aprovar/reprovar) as próprias ideias.
alter table public.conteudo_aprovacao enable row level security;
create policy aprov_select on public.conteudo_aprovacao
  for select using (public.is_equipe() or cliente_id = public.meu_cliente_id());
create policy aprov_insert on public.conteudo_aprovacao
  for insert with check (public.is_equipe());
create policy aprov_update on public.conteudo_aprovacao
  for update using (public.is_equipe() or cliente_id = public.meu_cliente_id())
  with check (public.is_equipe() or cliente_id = public.meu_cliente_id());
create policy aprov_delete on public.conteudo_aprovacao
  for delete using (public.is_equipe());
-- >>> REVISAR: idealmente o cliente só pode alterar status/justificativa
--     (restrição por coluna). Ver revisão de RLS no fim do arquivo.

-- Sugestões: equipe lê tudo; o cliente lê e INSERE as próprias.
alter table public.conteudo_sugestoes enable row level security;
create policy sugest_select on public.conteudo_sugestoes
  for select using (public.is_equipe() or cliente_id = public.meu_cliente_id());
create policy sugest_insert on public.conteudo_sugestoes
  for insert with check (public.is_equipe() or cliente_id = public.meu_cliente_id());
create policy sugest_manage on public.conteudo_sugestoes
  for delete using (public.is_equipe());

-- =============================================================
-- >>> PONTO DE REVISÃO DO PROGRAMADOR <<<
-- 1) financeiro_receitas hoje permite o cliente LER o próprio pagamento.
--    Se não quiser expor isso ao cliente, troque o SELECT para só is_equipe().
-- 2) Ajustar quais escritas exigem admin vs operador.
-- 3) Testar policies logando como cada papel (admin, operador, cliente).
-- =============================================================
