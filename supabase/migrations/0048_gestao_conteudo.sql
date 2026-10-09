-- 0048_gestao_conteudo.sql
-- Gestao de Conteudo: pipeline por post (editado -> enviado -> aprovado -> programado),
-- link do Drive para previa e meta de posts por mes por cliente.
-- Reaproveita public.conteudo_aprovacao (mesma tabela do portal de aprovacao).

alter table public.conteudo_aprovacao
  add column if not exists link_drive  text,
  add column if not exists etapa       text not null default 'em_edicao',
  add column if not exists enviado_em  timestamptz,
  add column if not exists decidido_em timestamptz;

do $$ begin
  alter table public.conteudo_aprovacao add constraint conteudo_aprovacao_etapa_chk
    check (etapa in ('em_edicao','editado','enviado','aprovado','reprovado','programado','publicado'));
exception when duplicate_object then null; end $$;

-- Carga unica: deduz a etapa dos registros que ja existiam.
update public.conteudo_aprovacao set etapa = case
    when producao_status = 'publicado' then 'publicado'
    when status = 'aprovado'           then 'aprovado'
    when status = 'reprovado'          then 'reprovado'
    when visivel_cliente               then 'enviado'
    else 'em_edicao'
  end
where etapa = 'em_edicao';

-- Meta mensal de posts (a semanal ja existe em clientes.conteudos_por_semana).
alter table public.clientes
  add column if not exists posts_por_mes integer not null default 0;

create index if not exists idx_conteudo_aprov_etapa
  on public.conteudo_aprovacao (cliente_id, mes_referencia, etapa);

-- Mantem etapa coerente com as telas antigas (publicar para o cliente, decisao do cliente).
create or replace function public.conteudo_aprovacao_sync_etapa()
returns trigger language plpgsql as $$
begin
  if tg_op = 'INSERT' then
    if new.etapa = 'em_edicao' and new.visivel_cliente then
      new.etapa := 'enviado';
      new.enviado_em := coalesce(new.enviado_em, now());
    end if;
    return new;
  end if;

  if new.status is distinct from old.status then
    if new.status = 'aprovado' then
      new.etapa := 'aprovado';  new.decidido_em := now();
    elsif new.status = 'reprovado' then
      new.etapa := 'reprovado'; new.decidido_em := now();
    elsif new.status = 'pendente' and new.etapa in ('aprovado','reprovado') then
      new.etapa := 'enviado';   new.decidido_em := null;
    end if;
  elsif new.visivel_cliente and not old.visivel_cliente
        and new.etapa in ('em_edicao','editado') then
    new.etapa := 'enviado';
    new.enviado_em := now();
  end if;
  return new;
end $$;

drop trigger if exists trg_conteudo_aprovacao_etapa on public.conteudo_aprovacao;
create trigger trg_conteudo_aprovacao_etapa
  before insert or update on public.conteudo_aprovacao
  for each row execute function public.conteudo_aprovacao_sync_etapa();
