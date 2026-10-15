-- 0069_alertas_contatos.sql
-- STARTIP ALERTAS: alem de grupos, permite monitorar CONTATOS especificos
-- (clientes que preferem conversar no privado).
--  * Contatos so entram por cadastro manual (tipo = 'contato'); conversas privadas
--    de numeros nao cadastrados sao descartadas e nunca sao gravadas.
--  * Chat privado = id so com digitos; grupos tem "-" ou "-group" no id.

alter table public.alertas_grupos
  add column if not exists tipo text not null default 'grupo'
  check (tipo in ('grupo', 'contato'));

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
  v_cfg      public.alertas_config;
  v_grupo    public.alertas_grupos;
  v_class    text;
  v_chave    text;
  v_id       uuid;
  v_nome_cli text;
  v_privado  boolean;
  v_remetente text := p_remetente_fone;
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

  v_privado := p_chat_id ~ '^\d+$';

  if v_privado then
    -- So contatos cadastrados (compara pela chave: ignora o 9o digito).
    select * into v_grupo from public.alertas_grupos
     where tipo = 'contato'
       and public.alertas_chave_fone(chat_id) = public.alertas_chave_fone(p_chat_id)
     limit 1;
    if not found then
      return jsonb_build_object('ignorado', true, 'motivo', 'contato_nao_cadastrado');
    end if;
    p_chat_id := v_grupo.chat_id;        -- id canonico do cadastro
    v_remetente := coalesce(v_remetente, p_chat_id);
  else
    v_nome_cli := nullif(btrim(regexp_replace(
                    split_part(regexp_replace(coalesce(p_chat_nome, ''), '^\s*🌐\s*', ''), '|', 1),
                    '\s+$', '')), '');
    insert into public.alertas_grupos (chat_id, nome_grupo, cliente_nome)
    values (p_chat_id, nullif(p_chat_nome, ''), v_nome_cli)
    on conflict (chat_id) do update
       set nome_grupo = coalesce(nullif(excluded.nome_grupo, ''), public.alertas_grupos.nome_grupo)
    returning * into v_grupo;
  end if;

  if v_cfg.grupo_interno_id is not null and p_chat_id = v_cfg.grupo_interno_id then
    return jsonb_build_object('ignorado', true, 'motivo', 'grupo_interno');
  end if;
  if not v_grupo.monitorar then
    return jsonb_build_object('ignorado', true, 'motivo', 'grupo_nao_monitorado');
  end if;

  if exists (select 1 from public.alertas_envios where zapi_message_id = p_message_id) then
    return jsonb_build_object('ignorado', true, 'motivo', 'mensagem_do_sistema');
  end if;

  if p_from_me then
    v_class := case when p_from_api then 'pendente_origem' else 'equipe' end;
  else
    v_chave := public.alertas_chave_fone(v_remetente);
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
    nullif(public.alertas_chave_fone(v_remetente), ''), p_remetente_nome,
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

do $$
begin
  revoke all on function public.alertas_registrar_evento(text,text,text,text,text,text,boolean,boolean,text,text,timestamptz,timestamptz) from public;
  begin
    revoke all on function public.alertas_registrar_evento(text,text,text,text,text,text,boolean,boolean,text,text,timestamptz,timestamptz) from anon, authenticated;
    grant execute on function public.alertas_registrar_evento(text,text,text,text,text,text,boolean,boolean,text,text,timestamptz,timestamptz) to service_role;
  exception when undefined_object then null;
  end;
end $$;
