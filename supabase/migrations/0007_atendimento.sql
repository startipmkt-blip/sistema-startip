-- =============================================================
-- 0007_atendimento.sql — Aba "Atendimento" do CRM (WhatsApp inbox)
-- =============================================================
-- Adiciona o que a nova aba precisa sem quebrar o Kanban existente:
--   * crm_leads: atribuição a atendente, fixar, arquivar, marcar grupo
--   * crm_mensagens: marcar lida, guardar remetente (útil em grupos)
--   * índices para os filtros da inbox rodarem rápido
--   * Realtime habilitado nas duas tabelas (assinatura pelo front)
-- =============================================================

-- ---------- crm_leads: campos de atendimento ----------
alter table public.crm_leads
  add column if not exists atendente_id uuid references public.profiles (id) on delete set null,
  add column if not exists fixado       boolean not null default false,
  add column if not exists arquivado    boolean not null default false,
  add column if not exists is_grupo     boolean not null default false;

comment on column public.crm_leads.atendente_id is
  'Membro da equipe (profiles.id) responsável por atender esse lead. NULL = não atribuído.';
comment on column public.crm_leads.fixado     is 'Fixado no topo da inbox pelo atendente.';
comment on column public.crm_leads.arquivado  is 'Removido da inbox padrão (aba "Arquivadas" mostra).';
comment on column public.crm_leads.is_grupo   is 'Conversa é um grupo do WhatsApp (visível apenas na aba "Grupos").';

create index if not exists idx_crm_leads_atendente on public.crm_leads (atendente_id);
create index if not exists idx_crm_leads_arquivado on public.crm_leads (arquivado) where arquivado = false;
create index if not exists idx_crm_leads_grupo     on public.crm_leads (is_grupo)  where is_grupo  = true;
create index if not exists idx_crm_leads_fixado    on public.crm_leads (fixado)    where fixado    = true;

-- ---------- crm_mensagens: leitura e remetente ----------
alter table public.crm_mensagens
  add column if not exists lida           boolean not null default false,
  add column if not exists nome_remetente text;

comment on column public.crm_mensagens.lida           is
  'Mensagens recebidas nascem lida=false; o front seta true ao abrir a conversa.';
comment on column public.crm_mensagens.nome_remetente is
  'Nome de quem escreveu — importante em grupos, onde o telefone do grupo não identifica a pessoa.';

-- Índice para contar não-lidas por lead sem varrer tudo.
create index if not exists idx_crm_msg_nao_lidas
  on public.crm_mensagens (lead_id)
  where direcao = 'recebida' and lida = false;

-- Índice pela última mensagem (ordenar a inbox por atividade recente).
create index if not exists idx_crm_msg_enviada_em on public.crm_mensagens (enviada_em desc);

-- ---------- Realtime ----------
-- Habilita replicação lógica pras duas tabelas — front assina via
-- supabase.channel().on('postgres_changes',...) na aba de atendimento.
-- Reentrante: só adiciona se ainda não estiver na publication.
do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'crm_mensagens'
  ) then
    execute 'alter publication supabase_realtime add table public.crm_mensagens';
  end if;

  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'crm_leads'
  ) then
    execute 'alter publication supabase_realtime add table public.crm_leads';
  end if;
end $$;

-- ---------- View de suporte à inbox ----------
-- Devolve tudo o que a lista de conversas precisa em uma linha por lead,
-- pronto pra filtrar e ordenar no front. Evita fazer N sub-queries.
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
  l.created_at,
  m_ult.conteudo    as ultima_mensagem,
  m_ult.direcao     as ultima_direcao,
  m_ult.enviada_em  as ultima_em,
  coalesce(nl.n, 0) as nao_lidas,
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

comment on view public.crm_conversas is
  'Linha por lead com o que a inbox de atendimento precisa: última mensagem, contadores, atribuição.';

-- A view herda RLS das tabelas base. Como crm_leads/crm_mensagens já
-- são "somente equipe" (0003_modulos.sql), o cliente não enxerga nada.
