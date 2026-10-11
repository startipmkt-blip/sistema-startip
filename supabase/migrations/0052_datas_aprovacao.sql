-- =============================================================
-- 0052_datas_aprovacao.sql — Aprovação das datas comemorativas pelo cliente
-- =============================================================
-- O cliente aprova ou reprova cada data no link público (/calendario/:slug).
-- A resposta vale por OCORRÊNCIA (data do cliente + ano), porque a mesma
-- data se repete todo ano e precisa ser reavaliada a cada ciclo.
-- Reprovar exige justificativa.
-- Escrita pública só pela RPC security definer `calendario_responder`.
-- =============================================================

create table if not exists public.datas_aprovacao (
  datas_cliente_id  uuid not null references public.datas_cliente(id) on delete cascade,
  ano               smallint not null check (ano between 2000 and 2100),
  status            text not null check (status in ('aprovada', 'reprovada')),
  justificativa     text not null default '',
  respondido_em     timestamptz not null default now(),
  primary key (datas_cliente_id, ano),
  constraint datas_aprovacao_justificativa check (status <> 'reprovada' or btrim(justificativa) <> '')
);

comment on table public.datas_aprovacao is
  'Resposta do cliente (aprovada/reprovada) para cada ocorrência anual de uma data do seu calendário.';

alter table public.datas_aprovacao enable row level security;

drop policy if exists p_datas_aprovacao_equipe on public.datas_aprovacao;
create policy p_datas_aprovacao_equipe on public.datas_aprovacao
  for all to authenticated using (public.is_equipe()) with check (public.is_equipe());

-- ---------- Resposta pública pelo slug ----------
-- Só aceita datas visíveis do calendário daquele slug, no ano corrente ou no
-- seguinte, para o link não servir de porta de escrita arbitrária.
create or replace function public.calendario_responder(
  p_slug           text,
  p_item_id        uuid,
  p_ano            int,
  p_status         text,
  p_justificativa  text default ''
)
returns void
language plpgsql
security definer
set search_path = public
as $fn$
declare
  v_ano_atual int := extract(year from (now() at time zone 'America/Sao_Paulo'))::int;
  v_just      text := left(btrim(coalesce(p_justificativa, '')), 2000);
begin
  if p_status not in ('aprovada', 'reprovada') then
    raise exception 'status invalido';
  end if;
  if p_status = 'reprovada' and v_just = '' then
    raise exception 'justificativa obrigatoria';
  end if;
  if p_ano is null or p_ano < v_ano_atual or p_ano > v_ano_atual + 1 then
    raise exception 'ano invalido';
  end if;
  if not exists (
    select 1
    from public.datas_cliente dcl
    join public.datas_calendario dc on dc.cliente_id = dcl.cliente_id
    where dcl.id = p_item_id and dc.slug = lower(p_slug) and dcl.visivel_cliente
  ) then
    raise exception 'data nao encontrada';
  end if;

  insert into public.datas_aprovacao (datas_cliente_id, ano, status, justificativa, respondido_em)
  values (p_item_id, p_ano, p_status, case when p_status = 'reprovada' then v_just else '' end, now())
  on conflict (datas_cliente_id, ano) do update
    set status = excluded.status,
        justificativa = excluded.justificativa,
        respondido_em = excluded.respondido_em;
end;
$fn$;

revoke all on function public.calendario_responder(text, uuid, int, text, text) from public;
grant execute on function public.calendario_responder(text, uuid, int, text, text) to anon, authenticated;

-- ---------- Leitura pública: passa a devolver as respostas ----------
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
    ), '[]'::jsonb),
    'aprovacoes', coalesce((
      select jsonb_agg(jsonb_build_object(
        'datas_cliente_id', a.datas_cliente_id, 'ano', a.ano, 'status', a.status,
        'justificativa', a.justificativa, 'respondido_em', a.respondido_em
      ))
      from public.datas_aprovacao a where a.datas_cliente_id in (select id from itens)
    ), '[]'::jsonb)
  ) end;
$fn$;

grant execute on function public.calendario_publico(text) to anon, authenticated;
