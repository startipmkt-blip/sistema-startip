-- 0068_startip_alertas.sql
-- STARTIP ALERTAS: monitora os grupos de WhatsApp dos clientes e avisa o grupo
-- interno quando ninguem da equipe responde dentro do prazo.
--
-- Principios do motor:
--  * Toda a regra vive no Postgres (nada depende do navegador aberto).
--  * Cada evento e gravado uma unica vez (unique instance_id + message_id).
--  * O estado das pendencias e RECALCULADO a partir dos eventos ordenados pelo
--    horario real da mensagem, entao reentrega e ordem trocada nao geram
--    pendencia nem alerta errado.
--  * Um alerta por nivel por pendencia (unique pendencia_id + nivel), mesmo
--    apos reinicializacao.
-- Fuso de referencia para horario comercial e textos: America/Sao_Paulo.

-- ---------- Helpers ----------
-- Chave canonica de telefone BR: 55 + DDD + ultimos 8 digitos (ignora o 9o digito).
create or replace function public.alertas_chave_fone(t text)
returns text
language plpgsql
immutable
as $$
declare
  d text := regexp_replace(coalesce(t, ''), '\D', '', 'g');
begin
  if d = '' then return null; end if;
  if d like '55%' and length(d) >= 12 then d := substr(d, 3); end if;
  if length(d) in (10, 11) then
    return '55' || substr(d, 1, 2) || right(d, 8);
  end if;
  return null; -- id opaco (LID), numero incompleto etc.: remetente incerto
end;
$$;

-- ---------- Tabelas ----------
create table if not exists public.alertas_config (
  id                      boolean primary key default true check (id),
  ativo                   boolean not null default true,
  grupo_interno_id        text,
  grupo_interno_nome      text,
  nivel1_min              integer not null default 10  check (nivel1_min between 1 and 1440),
  nivel2_min              integer not null default 40  check (nivel2_min between 2 and 2880),
  nivel3_min              integer not null default 60  check (nivel3_min between 3 and 4320),
  sla_min                 integer not null default 30  check (sla_min between 1 and 1440),
  horario_comercial_ativo boolean not null default false,
  hc_inicio               time not null default '08:00',
  hc_fim                  time not null default '18:00',
  hc_dias                 integer[] not null default '{1,2,3,4,5}',  -- 1=seg ... 7=dom
  max_tentativas          integer not null default 5 check (max_tentativas between 1 and 10),
  retencao_dias           integer not null default 180 check (retencao_dias between 30 and 3650),
  updated_at              timestamptz not null default now(),
  check (nivel1_min < nivel2_min and nivel2_min < nivel3_min)
);
insert into public.alertas_config (id) values (true) on conflict (id) do nothing;

create table if not exists public.alertas_equipe (
  id         uuid primary key default gen_random_uuid(),
  nome       text not null,
  cargo      text,
  telefone   text not null,
  chave      text generated always as (public.alertas_chave_fone(telefone)) stored,
  ativo      boolean not null default true,
  created_at timestamptz not null default now(),
  check (public.alertas_chave_fone(telefone) is not null)
);
create unique index if not exists alertas_equipe_chave_uq on public.alertas_equipe (chave);

create table if not exists public.alertas_grupos (
  id                       uuid primary key default gen_random_uuid(),
  chat_id                  text not null unique,
  nome_grupo               text,
  cliente_nome             text,
  cliente_id               uuid references public.clientes(id) on delete set null,
  monitorar                boolean not null default false,
  prazo_min                integer check (prazo_min between 1 and 1440),   -- sobrescreve o 1o nivel
  hc_ativo                 boolean,                                        -- null = segue o global
  hc_inicio                time,
  hc_fim                   time,
  hc_dias                  integer[],
  ultima_msg_cliente_em    timestamptz,
  ultima_msg_cliente_texto text,
  ultima_resposta_em       timestamptz,
  ultima_resposta_por      text,
  created_at               timestamptz not null default now(),
  updated_at               timestamptz not null default now()
);

create table if not exists public.alertas_pendencias (
  id                  uuid primary key default gen_random_uuid(),
  grupo_id            uuid references public.alertas_grupos(id) on delete set null,
  chat_id             text not null,
  grupo_nome          text,
  cliente_nome        text,
  primeiro_evento_id  uuid,
  iniciada_em         timestamptz not null,
  ultima_msg_em       timestamptz,
  ultima_msg_texto    text,
  ultima_msg_tipo     text,
  qtd_msgs            integer not null default 1,
  prazo_min           integer not null default 10,
  status              text not null default 'aguardando' check (status in ('aguardando', 'respondida')),
  respondida_em       timestamptz,
  respondida_por_fone text,
  respondida_por_nome text,
  tempo_resposta_seg  integer,   -- considera horario comercial quando ativo
  tempo_bruto_seg     integer,
  dentro_prazo        boolean,
  alertas_enviados    integer not null default 0,
  ultimo_alerta_nivel integer,
  ultimo_alerta_em    timestamptz,
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now()
);
create unique index if not exists alertas_pend_aberta_uq
  on public.alertas_pendencias (chat_id) where status = 'aguardando';
create index if not exists alertas_pend_iniciada_idx on public.alertas_pendencias (iniciada_em desc);

create table if not exists public.alertas_eventos (
  id             uuid primary key default gen_random_uuid(),
  instance_id    text not null,
  message_id     text not null,
  chat_id        text not null,
  remetente_fone text,
  remetente_nome text,
  from_me        boolean not null default false,
  from_api       boolean not null default false,
  tipo           text not null,
  texto          text,
  ocorrido_em    timestamptz not null,
  recebido_em    timestamptz not null default now(),
  classificacao  text not null check (classificacao in ('cliente', 'equipe', 'incerto', 'automatica', 'pendente_origem')),
  pendencia_id   uuid references public.alertas_pendencias(id) on delete set null,
  unique (instance_id, message_id)
);
create index if not exists alertas_eventos_chat_idx on public.alertas_eventos (chat_id, ocorrido_em);

create table if not exists public.alertas_envios (
  id                   uuid primary key default gen_random_uuid(),
  pendencia_id         uuid not null references public.alertas_pendencias(id) on delete cascade,
  nivel                integer not null check (nivel between 1 and 3),
  status               text not null default 'pendente'
                         check (status in ('pendente', 'enviando', 'enviado', 'falhou', 'cancelado')),
  tentativas           integer not null default 0,
  proxima_tentativa_em timestamptz not null default now(),
  bloqueado_em         timestamptz,
  erro                 text,
  enviado_em           timestamptz,
  zapi_message_id      text,
  texto                text,
  created_at           timestamptz not null default now(),
  unique (pendencia_id, nivel)
);
create index if not exists alertas_envios_status_idx on public.alertas_envios (status, proxima_tentativa_em);

create table if not exists public.alertas_log (
  id           uuid primary key default gen_random_uuid(),
  em           timestamptz not null default now(),
  tipo         text not null,
  chat_id      text,
  pendencia_id uuid,
  usuario_id   uuid,
  detalhe      jsonb
);
create index if not exists alertas_log_em_idx on public.alertas_log (em desc);

-- ---------- RLS: so a equipe le; so funcoes SECURITY DEFINER escrevem eventos/pendencias ----------
alter table public.alertas_config     enable row level security;
alter table public.alertas_equipe     enable row level security;
alter table public.alertas_grupos     enable row level security;
alter table public.alertas_pendencias enable row level security;
alter table public.alertas_eventos    enable row level security;
alter table public.alertas_envios     enable row level security;
alter table public.alertas_log        enable row level security;

drop policy if exists alertas_config_equipe on public.alertas_config;
create policy alertas_config_equipe on public.alertas_config
  for all to authenticated using (public.is_equipe()) with check (public.is_equipe());
drop policy if exists alertas_equipe_equipe on public.alertas_equipe;
create policy alertas_equipe_equipe on public.alertas_equipe
  for all to authenticated using (public.is_equipe()) with check (public.is_equipe());
drop policy if exists alertas_grupos_equipe on public.alertas_grupos;
create policy alertas_grupos_equipe on public.alertas_grupos
  for all to authenticated using (public.is_equipe()) with check (public.is_equipe());

drop policy if exists alertas_pend_ler on public.alertas_pendencias;
create policy alertas_pend_ler on public.alertas_pendencias
  for select to authenticated using (public.is_equipe());
drop policy if exists alertas_eventos_ler on public.alertas_eventos;
create policy alertas_eventos_ler on public.alertas_eventos
  for select to authenticated using (public.is_equipe());
drop policy if exists alertas_envios_ler on public.alertas_envios;
create policy alertas_envios_ler on public.alertas_envios
  for select to authenticated using (public.is_equipe());
drop policy if exists alertas_log_ler on public.alertas_log;
create policy alertas_log_ler on public.alertas_log
  for select to authenticated using (public.is_equipe());

-- ---------- Regras de integridade e auditoria ----------
-- O grupo interno nunca e monitorado como grupo de cliente (evita loop de alertas).
create or replace function public.alertas_grupo_guard()
returns trigger language plpgsql as $$
declare v_interno text;
begin
  select grupo_interno_id into v_interno from public.alertas_config where id;
  if v_interno is not null and new.chat_id = v_interno then
    new.monitorar := false;
  end if;
  new.updated_at := now();
  return new;
end;
$$;
drop trigger if exists alertas_grupo_guard_trg on public.alertas_grupos;
create trigger alertas_grupo_guard_trg before insert or update on public.alertas_grupos
  for each row execute function public.alertas_grupo_guard();

create or replace function public.alertas_config_guard()
returns trigger language plpgsql as $$
begin
  if new.grupo_interno_id is not null then
    update public.alertas_grupos set monitorar = false
     where chat_id = new.grupo_interno_id and monitorar;
  end if;
  new.updated_at := now();
  return new;
end;
$$;
drop trigger if exists alertas_config_guard_trg on public.alertas_config;
create trigger alertas_config_guard_trg before insert or update on public.alertas_config
  for each row execute function public.alertas_config_guard();

-- Auditoria de configuracao: guarda quem mexeu e quais campos (sem copiar telefones).
create or replace function public.alertas_audit()
returns trigger language plpgsql security definer set search_path = public as $$
declare v_campos jsonb; v_id text;
begin
  if tg_op = 'DELETE' then
    v_campos := '[]'::jsonb; v_id := (to_jsonb(old)->>'id');
  elsif tg_op = 'INSERT' then
    v_campos := '[]'::jsonb; v_id := (to_jsonb(new)->>'id');
  else
    select coalesce(jsonb_agg(n.key), '[]'::jsonb) into v_campos
      from jsonb_each(to_jsonb(new)) n
     where n.key <> 'updated_at' and n.key not like 'ultima_%' and to_jsonb(old)->n.key is distinct from n.value;
    v_id := (to_jsonb(new)->>'id');
    if v_campos = '[]'::jsonb then return new; end if;
  end if;
  insert into public.alertas_log (tipo, usuario_id, detalhe)
  values ('config_' || tg_table_name || '_' || lower(tg_op), auth.uid(),
          jsonb_build_object('id', v_id, 'campos', v_campos));
  if tg_op = 'DELETE' then return old; end if;
  return new;
end;
$$;
do $$
declare t text;
begin
  foreach t in array array['alertas_config', 'alertas_equipe', 'alertas_grupos'] loop
    execute format('drop trigger if exists %I on public.%I', t || '_audit_trg', t);
    execute format('create trigger %I after insert or update or delete on public.%I
                    for each row execute function public.alertas_audit()', t || '_audit_trg', t);
  end loop;
end $$;

-- ---------- Calculo de minutos (horario comercial opcional) ----------
create or replace function public.alertas_minutos(
  p_ini timestamptz, p_fim timestamptz,
  p_hc boolean, p_h_ini time, p_h_fim time, p_dias integer[]
) returns numeric
language plpgsql
immutable
as $$
declare
  v_ini timestamp; v_fim timestamp; v_dia timestamp;
  v_a timestamp; v_b timestamp; v_total numeric := 0; v_n integer := 0;
begin
  if p_fim <= p_ini then return 0; end if;
  if not coalesce(p_hc, false) then
    return extract(epoch from (p_fim - p_ini)) / 60.0;
  end if;
  v_ini := p_ini at time zone 'America/Sao_Paulo';
  v_fim := p_fim at time zone 'America/Sao_Paulo';
  v_dia := date_trunc('day', v_ini);
  while v_dia <= v_fim and v_n < 400 loop
    if extract(isodow from v_dia)::integer = any (p_dias) then
      v_a := greatest(v_ini, v_dia + p_h_ini);
      v_b := least(v_fim, v_dia + p_h_fim);
      if v_b > v_a then v_total := v_total + extract(epoch from (v_b - v_a)) / 60.0; end if;
    end if;
    v_dia := v_dia + interval '1 day';
    v_n := v_n + 1;
  end loop;
  return v_total;
end;
$$;

-- Parametros efetivos de um grupo (grupo sobrescreve o global).
create or replace function public.alertas_params(p_grupo_id uuid)
returns table (
  n1 integer, n2 integer, n3 integer, sla integer,
  hc boolean, h_ini time, h_fim time, dias integer[]
)
language sql
stable
as $$
  select
    coalesce(g.prazo_min, c.nivel1_min) as n1,
    greatest(c.nivel2_min, coalesce(g.prazo_min, c.nivel1_min) + 1) as n2,
    greatest(c.nivel3_min, greatest(c.nivel2_min, coalesce(g.prazo_min, c.nivel1_min) + 1) + 1) as n3,
    c.sla_min,
    coalesce(g.hc_ativo, c.horario_comercial_ativo),
    coalesce(g.hc_inicio, c.hc_inicio),
    coalesce(g.hc_fim, c.hc_fim),
    coalesce(g.hc_dias, c.hc_dias)
  from public.alertas_config c
  left join public.alertas_grupos g on g.id = p_grupo_id
  where c.id;
$$;

-- ---------- Recalculo das pendencias de um chat ----------
create or replace function public.alertas_recalcular(p_chat_id text, p_agora timestamptz default now())
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_grupo   public.alertas_grupos;
  v_p       record;
  ev        record;
  v_janela  timestamptz;
  v_grupos  jsonb := '[]'::jsonb;   -- pendencias derivadas, em ordem cronologica
  v_open    boolean := false;
  v_ini     timestamptz; v_first uuid; v_qtd integer;
  v_last_em timestamptz; v_last_txt text; v_last_tipo text; v_members uuid[];
  v_g       jsonb; v_cand uuid; v_taken uuid[] := '{}'; v_old uuid[] := '{}';
  v_pid     uuid; v_status text; v_resp timestamptz; v_bruto numeric; v_efet numeric;
  v_resp_tel text; v_resp_nome text;
begin
  select * into v_grupo from public.alertas_grupos where chat_id = p_chat_id;
  if not found then return; end if;
  select * into v_p from public.alertas_params(v_grupo.id);

  -- Janela: ate 3 dias atras, ou desde a pendencia aberta mais antiga.
  select least(coalesce(min(iniciada_em), p_agora), p_agora - interval '3 days')
    into v_janela
    from public.alertas_pendencias
   where chat_id = p_chat_id and status = 'aguardando';

  -- Fase 1: deriva pendencias a partir dos eventos (ordem = horario real da mensagem).
  for ev in
    select id, classificacao, ocorrido_em, texto, tipo, remetente_fone, remetente_nome, from_me
      from public.alertas_eventos
     where chat_id = p_chat_id
       and classificacao in ('cliente', 'equipe')
       and ocorrido_em >= v_janela
     order by ocorrido_em, recebido_em, id
  loop
    if ev.classificacao = 'cliente' then
      if v_open then
        v_qtd := v_qtd + 1; v_last_em := ev.ocorrido_em;
        v_last_txt := ev.texto; v_last_tipo := ev.tipo; v_members := v_members || ev.id;
      else
        v_open := true; v_ini := ev.ocorrido_em; v_first := ev.id; v_qtd := 1;
        v_last_em := ev.ocorrido_em; v_last_txt := ev.texto; v_last_tipo := ev.tipo;
        v_members := array[ev.id];
      end if;
    elsif v_open then   -- equipe respondeu
      v_grupos := v_grupos || jsonb_build_object(
        'ini', v_ini, 'first', v_first, 'qtd', v_qtd, 'last_em', v_last_em,
        'last_txt', v_last_txt, 'last_tipo', v_last_tipo, 'members', to_jsonb(v_members),
        'resp_em', ev.ocorrido_em,
        'resp_fone', case when ev.from_me then null else ev.remetente_fone end,
        'resp_nome', case when ev.from_me then 'Numero da Startip (WhatsApp conectado)' else ev.remetente_nome end);
      v_open := false;
    end if;
  end loop;
  if v_open then
    v_grupos := v_grupos || jsonb_build_object(
      'ini', v_ini, 'first', v_first, 'qtd', v_qtd, 'last_em', v_last_em,
      'last_txt', v_last_txt, 'last_tipo', v_last_tipo, 'members', to_jsonb(v_members));
  end if;

  -- Pendencias ja gravadas que referenciam eventos da janela (candidatas a merge/split).
  select coalesce(array_agg(distinct pendencia_id), '{}') into v_old
    from public.alertas_eventos
   where chat_id = p_chat_id and pendencia_id is not null and ocorrido_em >= v_janela;

  -- Fase 2: persiste, reaproveitando a pendencia existente mais antiga de cada grupo.
  for v_g in select * from jsonb_array_elements(v_grupos) loop
    select pe.id into v_cand
      from public.alertas_pendencias pe
     where pe.id = any (v_old) and not (pe.id = any (v_taken))
       and pe.id in (
         select e.pendencia_id from public.alertas_eventos e
          where e.id in (select (jsonb_array_elements_text(v_g->'members'))::uuid)
       )
     order by pe.iniciada_em
     limit 1;

    v_resp   := nullif(v_g->>'resp_em', '')::timestamptz;
    v_status := case when v_resp is null then 'aguardando' else 'respondida' end;
    v_bruto  := null; v_efet := null;
    if v_resp is not null then
      v_bruto := extract(epoch from (v_resp - (v_g->>'ini')::timestamptz));
      v_efet  := public.alertas_minutos((v_g->>'ini')::timestamptz, v_resp,
                                        v_p.hc, v_p.h_ini, v_p.h_fim, v_p.dias) * 60;
    end if;

    if v_cand is null then
      -- Evita colidir com a pendencia aberta (indice unico) em corridas.
      insert into public.alertas_pendencias (
        grupo_id, chat_id, grupo_nome, cliente_nome, primeiro_evento_id, iniciada_em,
        ultima_msg_em, ultima_msg_texto, ultima_msg_tipo, qtd_msgs, prazo_min, status,
        respondida_em, respondida_por_fone, respondida_por_nome,
        tempo_resposta_seg, tempo_bruto_seg, dentro_prazo)
      values (
        v_grupo.id, p_chat_id, v_grupo.nome_grupo, coalesce(v_grupo.cliente_nome, v_grupo.nome_grupo),
        (v_g->>'first')::uuid, (v_g->>'ini')::timestamptz,
        (v_g->>'last_em')::timestamptz, v_g->>'last_txt', v_g->>'last_tipo',
        (v_g->>'qtd')::integer, v_p.n1, v_status,
        v_resp, v_g->>'resp_fone', v_g->>'resp_nome',
        round(v_efet)::integer, round(v_bruto)::integer,
        case when v_resp is null then null else (v_efet / 60.0) <= v_p.n1 end)
      returning id into v_pid;
    else
      v_pid := v_cand;
      -- Pendencia aberta duplicada de outra derivacao? libera pelo indice parcial.
      update public.alertas_pendencias set
        grupo_id = v_grupo.id, grupo_nome = v_grupo.nome_grupo,
        cliente_nome = coalesce(v_grupo.cliente_nome, v_grupo.nome_grupo),
        primeiro_evento_id = (v_g->>'first')::uuid, iniciada_em = (v_g->>'ini')::timestamptz,
        ultima_msg_em = (v_g->>'last_em')::timestamptz, ultima_msg_texto = v_g->>'last_txt',
        ultima_msg_tipo = v_g->>'last_tipo', qtd_msgs = (v_g->>'qtd')::integer,
        prazo_min = v_p.n1, status = v_status, respondida_em = v_resp,
        respondida_por_fone = v_g->>'resp_fone', respondida_por_nome = v_g->>'resp_nome',
        tempo_resposta_seg = round(v_efet)::integer, tempo_bruto_seg = round(v_bruto)::integer,
        dentro_prazo = case when v_resp is null then null else (v_efet / 60.0) <= v_p.n1 end,
        updated_at = now()
       where id = v_pid;
    end if;
    v_taken := v_taken || v_pid;

    update public.alertas_eventos set pendencia_id = v_pid
     where id in (select (jsonb_array_elements_text(v_g->'members'))::uuid);
    if v_resp is not null then
      update public.alertas_envios set status = 'cancelado', erro = 'equipe respondeu'
       where pendencia_id = v_pid and status = 'pendente';
    end if;
  end loop;

  -- Pendencias antigas sem eventos restantes: funde os envios na sobrevivente mais proxima e remove.
  for v_pid in
    select x from unnest(v_old) x where not (x = any (v_taken))
  loop
    update public.alertas_envios e set pendencia_id = v_taken[1]
     where e.pendencia_id = v_pid and v_taken[1] is not null
       and not exists (select 1 from public.alertas_envios o
                        where o.pendencia_id = v_taken[1] and o.nivel = e.nivel);
    delete from public.alertas_pendencias where id = v_pid;
  end loop;

  -- Contadores de alerta e resumo do grupo.
  update public.alertas_pendencias pe set
    alertas_enviados = (select count(*) from public.alertas_envios e
                         where e.pendencia_id = pe.id and e.status = 'enviado'),
    ultimo_alerta_nivel = (select max(e.nivel) from public.alertas_envios e
                            where e.pendencia_id = pe.id and e.status = 'enviado'),
    ultimo_alerta_em = (select max(e.enviado_em) from public.alertas_envios e
                         where e.pendencia_id = pe.id and e.status = 'enviado')
   where pe.id = any (v_taken);

  update public.alertas_grupos g set
    ultima_msg_cliente_em = (select e.ocorrido_em from public.alertas_eventos e
                              where e.chat_id = p_chat_id and e.classificacao = 'cliente'
                              order by e.ocorrido_em desc limit 1),
    ultima_msg_cliente_texto = (select left(coalesce(e.texto, '[' || e.tipo || ']'), 200)
                                  from public.alertas_eventos e
                                 where e.chat_id = p_chat_id and e.classificacao = 'cliente'
                                 order by e.ocorrido_em desc limit 1),
    ultima_resposta_em = (select e.ocorrido_em from public.alertas_eventos e
                           where e.chat_id = p_chat_id and e.classificacao = 'equipe'
                           order by e.ocorrido_em desc limit 1),
    ultima_resposta_por = (select case when e.from_me then 'Numero da Startip' else e.remetente_nome end
                             from public.alertas_eventos e
                            where e.chat_id = p_chat_id and e.classificacao = 'equipe'
                            order by e.ocorrido_em desc limit 1)
   where g.id = v_grupo.id;
end;
$$;

-- ---------- Ingestao de evento (chamada pelo zapi-webhook) ----------
create or replace function public.alertas_registrar_evento(
  p_instance text, p_message_id text, p_chat_id text, p_chat_nome text,
  p_remetente_fone text, p_remetente_nome text,
  p_from_me boolean, p_from_api boolean,
  p_tipo text, p_texto text, p_ocorrido_em timestamptz,
  p_agora timestamptz default now()
) returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_cfg     public.alertas_config;
  v_grupo   public.alertas_grupos;
  v_class   text;
  v_chave   text;
  v_id      uuid;
  v_nome_cli text;
begin
  if p_tipo not in ('texto', 'imagem', 'audio', 'video', 'documento') then
    return jsonb_build_object('ignorado', true, 'motivo', 'tipo_sem_atendimento');
  end if;
  if coalesce(p_message_id, '') = '' or coalesce(p_chat_id, '') = '' then
    return jsonb_build_object('ignorado', true, 'motivo', 'sem_identificador');
  end if;
  if p_tipo = 'texto' and coalesce(btrim(p_texto), '') = '' then
    return jsonb_build_object('ignorado', true, 'motivo', 'sem_texto');
  end if;

  select * into v_cfg from public.alertas_config where id;
  if not v_cfg.ativo then
    return jsonb_build_object('ignorado', true, 'motivo', 'sistema_desativado');
  end if;

  -- Descobre o grupo (so cataloga: monitorar nasce desligado).
  v_nome_cli := nullif(btrim(regexp_replace(
                  split_part(regexp_replace(coalesce(p_chat_nome, ''), '^\s*🌐\s*', ''), '|', 1),
                  '\s+$', '')), '');
  insert into public.alertas_grupos (chat_id, nome_grupo, cliente_nome)
  values (p_chat_id, nullif(p_chat_nome, ''), v_nome_cli)
  on conflict (chat_id) do update
     set nome_grupo = coalesce(nullif(excluded.nome_grupo, ''), public.alertas_grupos.nome_grupo)
  returning * into v_grupo;

  if v_cfg.grupo_interno_id is not null and p_chat_id = v_cfg.grupo_interno_id then
    return jsonb_build_object('ignorado', true, 'motivo', 'grupo_interno');
  end if;
  if not v_grupo.monitorar then
    return jsonb_build_object('ignorado', true, 'motivo', 'grupo_nao_monitorado');
  end if;

  -- Eco do proprio alerta enviado pelo sistema.
  if exists (select 1 from public.alertas_envios where zapi_message_id = p_message_id) then
    return jsonb_build_object('ignorado', true, 'motivo', 'mensagem_do_sistema');
  end if;

  -- Classificacao do remetente.
  if p_from_me then
    v_class := case when p_from_api then 'pendente_origem' else 'equipe' end;
  else
    v_chave := public.alertas_chave_fone(p_remetente_fone);
    if v_chave is null then
      v_class := 'incerto';
    elsif exists (select 1 from public.alertas_equipe where chave = v_chave and ativo) then
      v_class := 'equipe';
    else
      v_class := 'cliente';
    end if;
  end if;

  insert into public.alertas_eventos (
    instance_id, message_id, chat_id, remetente_fone, remetente_nome,
    from_me, from_api, tipo, texto, ocorrido_em, recebido_em, classificacao)
  values (
    coalesce(nullif(p_instance, ''), 'default'), p_message_id, p_chat_id,
    nullif(public.alertas_chave_fone(p_remetente_fone), ''), p_remetente_nome,
    p_from_me, p_from_api, p_tipo, left(p_texto, 500),
    coalesce(p_ocorrido_em, p_agora), p_agora, v_class)
  on conflict (instance_id, message_id) do nothing
  returning id into v_id;

  if v_id is null then
    return jsonb_build_object('ok', true, 'duplicado', true);
  end if;

  if v_class in ('cliente', 'equipe') then
    perform public.alertas_recalcular(p_chat_id, p_agora);
  elsif v_class = 'incerto' then
    insert into public.alertas_log (tipo, chat_id, detalhe)
    values ('remetente_incerto', p_chat_id, jsonb_build_object('message_id', p_message_id));
  end if;

  return jsonb_build_object('ok', true, 'classificacao', v_class, 'evento_id', v_id);
end;
$$;

-- Mensagens da conectada enviadas via API: humano (inbox do CRM) ou automacao?
create or replace function public.alertas_resolver_origem(p_agora timestamptz default now())
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare ev record; v_n integer := 0; v_novo text;
begin
  for ev in
    select id, chat_id, message_id, recebido_em from public.alertas_eventos
     where classificacao = 'pendente_origem'
  loop
    v_novo := null;
    if to_regclass('public.crm_mensagens') is not null
       and exists (select 1 from public.crm_mensagens
                    where wa_message_id = ev.message_id and direcao = 'enviada') then
      v_novo := 'equipe';          -- resposta humana enviada pelo inbox do Startip OS
    elsif ev.recebido_em < p_agora - interval '90 seconds' then
      v_novo := 'automatica';      -- aviso automatico (saldo, lembrete etc.): nao e atendimento
    end if;
    if v_novo is not null then
      update public.alertas_eventos set classificacao = v_novo where id = ev.id;
      if v_novo = 'equipe' then perform public.alertas_recalcular(ev.chat_id, p_agora); end if;
      v_n := v_n + 1;
    end if;
  end loop;
  return v_n;
end;
$$;

-- ---------- Fila de alertas ----------
create or replace function public.alertas_enfileirar(p_agora timestamptz default now())
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  v_cfg public.alertas_config;
  r record; v_p record; v_min numeric; v_nivel integer; v_n integer := 0; v_lv integer;
begin
  select * into v_cfg from public.alertas_config where id;
  if not v_cfg.ativo or v_cfg.grupo_interno_id is null then return 0; end if;

  for r in
    select pe.id, pe.grupo_id, pe.iniciada_em
      from public.alertas_pendencias pe
      join public.alertas_grupos g on g.id = pe.grupo_id
     where pe.status = 'aguardando' and g.monitorar
  loop
    select * into v_p from public.alertas_params(r.grupo_id);
    v_min := public.alertas_minutos(r.iniciada_em, p_agora, v_p.hc, v_p.h_ini, v_p.h_fim, v_p.dias);
    v_nivel := case when v_min >= v_p.n3 then 3 when v_min >= v_p.n2 then 2
                    when v_min >= v_p.n1 then 1 else 0 end;
    if v_nivel = 0 then continue; end if;
    -- So o nivel mais alto vira envio; os anteriores nao disparam atrasados.
    for v_lv in 1..v_nivel loop
      insert into public.alertas_envios (pendencia_id, nivel, status, erro, proxima_tentativa_em)
      values (r.id, v_lv,
              case when v_lv = v_nivel then 'pendente' else 'cancelado' end,
              case when v_lv = v_nivel then null else 'nivel superado antes do envio' end,
              p_agora)
      on conflict (pendencia_id, nivel) do nothing;
      if found and v_lv = v_nivel then v_n := v_n + 1; end if;
    end loop;
  end loop;
  return v_n;
end;
$$;

create or replace function public.alertas_reivindicar_envios(p_limite integer default 20, p_agora timestamptz default now())
returns table (
  envio_id uuid, pendencia_id uuid, nivel integer, tentativas integer,
  grupo_interno_id text, cliente_nome text, grupo_nome text,
  iniciada_em timestamptz, ultima_msg_texto text, ultima_msg_tipo text, minutos integer
)
language plpgsql
security definer
set search_path = public
as $$
declare v_cfg public.alertas_config;
begin
  select * into v_cfg from public.alertas_config where id;

  -- Libera envios presos (funcao morreu no meio do envio).
  update public.alertas_envios set status = 'pendente', bloqueado_em = null
   where status = 'enviando' and bloqueado_em < p_agora - interval '5 minutes';

  -- Cancela os que perderam o sentido (equipe respondeu, grupo desligado, sistema desativado).
  update public.alertas_envios e set status = 'cancelado', erro = 'pendencia encerrada ou monitoramento desativado'
   where e.status = 'pendente'
     and (not v_cfg.ativo
          or exists (select 1 from public.alertas_pendencias pe
                      left join public.alertas_grupos g on g.id = pe.grupo_id
                     where pe.id = e.pendencia_id
                       and (pe.status <> 'aguardando' or not coalesce(g.monitorar, false))));

  return query
  with c as (
    select e.id from public.alertas_envios e
     where e.status = 'pendente' and e.proxima_tentativa_em <= p_agora
     order by e.created_at
     limit p_limite
     for update skip locked
  ), u as (
    update public.alertas_envios e
       set status = 'enviando', bloqueado_em = p_agora, tentativas = e.tentativas + 1
      from c where e.id = c.id
    returning e.id, e.pendencia_id, e.nivel, e.tentativas
  )
  select u.id, u.pendencia_id, u.nivel, u.tentativas,
         v_cfg.grupo_interno_id, pe.cliente_nome, pe.grupo_nome,
         pe.iniciada_em, pe.ultima_msg_texto, pe.ultima_msg_tipo,
         round(public.alertas_minutos(pe.iniciada_em, p_agora, pr.hc, pr.h_ini, pr.h_fim, pr.dias))::integer
    from u
    join public.alertas_pendencias pe on pe.id = u.pendencia_id
    cross join lateral public.alertas_params(pe.grupo_id) pr;
end;
$$;

create or replace function public.alertas_marcar_envio(
  p_envio_id uuid, p_ok boolean, p_zapi_message_id text, p_erro text, p_texto text,
  p_agora timestamptz default now()
) returns void
language plpgsql
security definer
set search_path = public
as $$
declare v_e public.alertas_envios; v_max integer;
begin
  select * into v_e from public.alertas_envios where id = p_envio_id;
  if not found then return; end if;
  select max_tentativas into v_max from public.alertas_config where id;

  if p_ok then
    update public.alertas_envios set status = 'enviado', enviado_em = p_agora,
           zapi_message_id = p_zapi_message_id, texto = p_texto, erro = null, bloqueado_em = null
     where id = p_envio_id;
    update public.alertas_pendencias pe set
      alertas_enviados = (select count(*) from public.alertas_envios e where e.pendencia_id = pe.id and e.status = 'enviado'),
      ultimo_alerta_nivel = v_e.nivel, ultimo_alerta_em = p_agora, updated_at = now()
     where pe.id = v_e.pendencia_id;
    insert into public.alertas_log (tipo, pendencia_id, detalhe)
    values ('alerta_enviado', v_e.pendencia_id, jsonb_build_object('nivel', v_e.nivel, 'tentativa', v_e.tentativas));
  else
    if v_e.tentativas >= v_max then
      update public.alertas_envios set status = 'falhou', erro = left(p_erro, 500), bloqueado_em = null
       where id = p_envio_id;
      insert into public.alertas_log (tipo, pendencia_id, detalhe)
      values ('alerta_falhou', v_e.pendencia_id,
              jsonb_build_object('nivel', v_e.nivel, 'tentativas', v_e.tentativas, 'erro', left(p_erro, 200)));
    else
      update public.alertas_envios set status = 'pendente', erro = left(p_erro, 500), bloqueado_em = null,
             proxima_tentativa_em = p_agora + (power(2, v_e.tentativas) || ' minutes')::interval
       where id = p_envio_id;
    end if;
  end if;
end;
$$;

-- Retencao (LGPD): apaga eventos e pendencias encerradas alem do prazo configurado.
create or replace function public.alertas_limpar(p_agora timestamptz default now())
returns void
language plpgsql
security definer
set search_path = public
as $$
declare v_dias integer;
begin
  select retencao_dias into v_dias from public.alertas_config where id;
  delete from public.alertas_eventos where ocorrido_em < p_agora - make_interval(days => v_dias);
  delete from public.alertas_pendencias
   where status = 'respondida' and respondida_em < p_agora - make_interval(days => v_dias);
  delete from public.alertas_log where em < p_agora - make_interval(days => v_dias);
end;
$$;

-- ---------- Leitura do painel (SECURITY INVOKER: respeita a RLS da equipe) ----------
-- minutos_decorridos usa a mesma regra do motor (horario comercial incluso).
create or replace function public.alertas_painel(
  p_inicio timestamptz default null,
  p_fim    timestamptz default null,
  p_agora  timestamptz default now()
) returns table (
  id uuid, chat_id text, grupo_id uuid, cliente_nome text, grupo_nome text,
  iniciada_em timestamptz, ultima_msg_em timestamptz, ultima_msg_texto text, ultima_msg_tipo text,
  qtd_msgs integer, prazo_min integer, status text, respondida_em timestamptz,
  respondida_por_nome text, tempo_resposta_seg integer, dentro_prazo boolean,
  alertas_enviados integer, ultimo_alerta_nivel integer, ultimo_alerta_em timestamptz,
  minutos_decorridos numeric
)
language sql
stable
as $$
  select pe.id, pe.chat_id, pe.grupo_id, pe.cliente_nome, pe.grupo_nome,
         pe.iniciada_em, pe.ultima_msg_em, pe.ultima_msg_texto, pe.ultima_msg_tipo,
         pe.qtd_msgs, pe.prazo_min, pe.status, pe.respondida_em,
         pe.respondida_por_nome, pe.tempo_resposta_seg, pe.dentro_prazo,
         pe.alertas_enviados, pe.ultimo_alerta_nivel, pe.ultimo_alerta_em,
         case when pe.status = 'aguardando'
              then public.alertas_minutos(pe.iniciada_em, p_agora, pr.hc, pr.h_ini, pr.h_fim, pr.dias)
              else pe.tempo_resposta_seg / 60.0 end
    from public.alertas_pendencias pe
    cross join lateral public.alertas_params(pe.grupo_id) pr
   where pe.status = 'aguardando'
      or ((p_inicio is null or pe.iniciada_em >= p_inicio) and (p_fim is null or pe.iniciada_em < p_fim))
   order by pe.iniciada_em desc
   limit 5000;
$$;

-- Somente o service role (Edge Functions) executa o motor.
do $$
declare f text;
begin
  foreach f in array array[
    'alertas_recalcular(text,timestamptz)',
    'alertas_registrar_evento(text,text,text,text,text,text,boolean,boolean,text,text,timestamptz,timestamptz)',
    'alertas_resolver_origem(timestamptz)',
    'alertas_enfileirar(timestamptz)',
    'alertas_reivindicar_envios(integer,timestamptz)',
    'alertas_marcar_envio(uuid,boolean,text,text,text,timestamptz)',
    'alertas_limpar(timestamptz)'
  ] loop
    execute format('revoke all on function public.%s from public', f);
    begin
      execute format('revoke all on function public.%s from anon, authenticated', f);
      execute format('grant execute on function public.%s to service_role', f);
    exception when undefined_object then null;  -- ambiente sem esses papeis (testes locais)
    end;
  end loop;
end $$;

-- ---------- Agendamento (pg_cron + pg_net) ----------
-- A funcao alertas-processar e idempotente: pode rodar a cada minuto sem repetir alertas.
do $$
begin
  create extension if not exists pg_net with schema extensions;
  perform cron.unschedule('alertas-processar');
exception when others then null;
end $$;

do $$
begin
  perform cron.schedule(
    'alertas-processar',
    '* * * * *',
    $job$
      select net.http_post(
        url := 'https://oxenrjsagtfmdgcrkvzs.supabase.co/functions/v1/alertas-processar',
        headers := '{"Content-Type":"application/json"}'::jsonb,
        body := '{}'::jsonb
      );
    $job$
  );
exception when others then
  raise notice 'pg_cron indisponivel: agende alertas-processar manualmente (%).', sqlerrm;
end $$;
