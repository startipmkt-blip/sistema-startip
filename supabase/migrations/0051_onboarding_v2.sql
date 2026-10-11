-- =============================================================
-- 0051_onboarding_v2.sql — Onboarding 100% persistido + página do cliente
-- =============================================================
--  - Etapas (de modelo e de andamento) ganham tempo + passos detalhados.
--  - onboarding_andamentos: 1 onboarding por cliente, com o modelo de origem
--    e um token opaco para a página pública /onb/:token.
--  - Semeia o roteiro padrão da agência como modelo (antes vivia só no front).
--  - RPC onboarding_por_token: leitura pública somente por quem tem o link.
-- =============================================================

alter table public.onboarding_template_itens
  add column if not exists tempo text,
  add column if not exists itens jsonb not null default '[]'::jsonb;

alter table public.onboarding_etapas
  add column if not exists tempo text,
  add column if not exists itens jsonb not null default '[]'::jsonb,
  add column if not exists concluida_em timestamptz;

create table if not exists public.onboarding_andamentos (
  cliente_id    uuid primary key references public.clientes (id) on delete cascade,
  template_id   uuid references public.onboarding_templates (id) on delete set null,
  template_nome text not null default '',
  token         text not null unique default replace(gen_random_uuid()::text, '-', ''),
  created_at    timestamptz not null default now()
);

alter table public.onboarding_andamentos enable row level security;

drop policy if exists onboarding_andamentos_select on public.onboarding_andamentos;
create policy onboarding_andamentos_select on public.onboarding_andamentos
  for select using (public.is_equipe() or cliente_id = public.meu_cliente_id());

drop policy if exists onboarding_andamentos_write on public.onboarding_andamentos;
create policy onboarding_andamentos_write on public.onboarding_andamentos
  for all using (public.is_equipe()) with check (public.is_equipe());

-- Onboardings iniciados antes desta migration passam a ter cabeçalho + link.
insert into public.onboarding_andamentos (cliente_id, created_at)
select cliente_id, min(created_at)
from public.onboarding_etapas
group by cliente_id
on conflict (cliente_id) do nothing;

-- Modelo padrão da agência (roteiro do mapa mental).
do $$
declare
  tpl uuid;
begin
  if exists (select 1 from public.onboarding_templates where nome = 'Onboarding Startip') then
    return;
  end if;
  insert into public.onboarding_templates (nome) values ('Onboarding Startip') returning id into tpl;
  insert into public.onboarding_template_itens (template_id, ordem, etapa, tempo, itens) values
    (tpl, 0, 'Reunião de Fechamento / Confirmação', '15–20 min', '["Confirmação de parceria (\"sim\")","Explicar próximos passos e fluxo de onboarding","Apresentar programa de indicação (30% em crédito de mídia)"]'),
    (tpl, 1, 'Contrato', '1 dia', '["Solicitar dados (CNPJ, razão social, nome, CPF, endereço, estado civil)","Elaboração do contrato","Enviar contrato para assinatura"]'),
    (tpl, 2, 'Criação de Estruturas e Acessos', null, '["Solicitar Gerenciador de Anúncios / Redes Sociais (Meta)","Solicitar acesso ao Google Business / Google Ads (se aplicável)","Solicitar todos os acessos (Meta, Google, redes sociais)","Confirmar uso do WhatsApp Business (orientar migração se necessário)"]'),
    (tpl, 3, 'Formulário Estratégico', null, '["Enviar formulário (ICP e Persona)","Preenchimento tem que ser completo"]'),
    (tpl, 4, 'Grupo de Comunicação', null, '["Criação do grupo no WhatsApp","Canal oficial de comunicação"]'),
    (tpl, 5, 'Materiais do Cliente', null, '["Criar e compartilhar pasta no Drive","Solicitar fotos, vídeos, logo, identidade visual e materiais institucionais"]'),
    (tpl, 6, 'Estratégia e Setup', 'até 5 dias úteis', '["Analisar formulário preenchido","Definir ICP e Persona","Estudar mercado / nicho do cliente","Estruturar setup das contas (Meta / Google / Redes Sociais)","Revisar redes sociais"]'),
    (tpl, 7, 'Reunião de Alinhamento', '~30 min', '["Apresentar setup e a estratégia inicial","Confirmar ajustes finais","Anotações fundamentais: qual produto/serviço tem mais retorno?","Definir prioridades estratégicas"]'),
    (tpl, 8, 'Planejamento', 'até 3 dias úteis', '["Desenvolvimento do planejamento","Estruturação de roteiro e ideias","Início das captações/criações e agendamento de conteúdo"]');
end $$;

-- Página pública do cliente: só devolve dados para quem tem o token do link.
create or replace function public.onboarding_por_token(p_token text)
returns json
language sql
stable
security definer
set search_path = public
as $fn$
  select json_build_object(
    'cliente_nome', c.nome,
    'template_nome', a.template_nome,
    'iniciado_em', a.created_at,
    'concluido_em', (select k.concluido_em from onboarding_conclusao k where k.cliente_id = a.cliente_id),
    'etapas', coalesce((
      select json_agg(json_build_object(
        'etapa', e.etapa,
        'tempo', e.tempo,
        'itens', e.itens,
        'concluida', e.concluida,
        'concluida_em', e.concluida_em
      ) order by e.ordem, e.created_at)
      from onboarding_etapas e
      where e.cliente_id = a.cliente_id
    ), '[]'::json)
  )
  from onboarding_andamentos a
  join clientes c on c.id = a.cliente_id
  where a.token = p_token;
$fn$;

revoke all on function public.onboarding_por_token(text) from public;
grant execute on function public.onboarding_por_token(text) to anon, authenticated;
