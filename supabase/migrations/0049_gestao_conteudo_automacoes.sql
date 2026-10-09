-- 0049_gestao_conteudo_automacoes.sql
-- Lembrete automatico de aprovacao, aviso interno de reprovacao e configuracao.

alter table public.conteudo_aprovacao
  add column if not exists lembrete_em        timestamptz,
  add column if not exists lembretes_enviados integer not null default 0;

-- Uma unica linha de configuracao.
create table if not exists public.gestao_conteudo_config (
  id                 boolean primary key default true check (id),
  whatsapp_equipe    text,                       -- grupo/numero que recebe avisos internos
  avisar_reprovacao  boolean not null default true,
  lembrete_ativo     boolean not null default true,
  lembrete_horas     integer not null default 48 check (lembrete_horas between 1 and 720),
  lembrete_maximo    integer not null default 3  check (lembrete_maximo between 1 and 10),
  updated_at         timestamptz not null default now()
);
insert into public.gestao_conteudo_config (id) values (true) on conflict (id) do nothing;

alter table public.gestao_conteudo_config enable row level security;
drop policy if exists gestao_conteudo_config_equipe on public.gestao_conteudo_config;
create policy gestao_conteudo_config_equipe on public.gestao_conteudo_config
  for all to authenticated
  using (public.is_equipe()) with check (public.is_equipe());

-- Agendamento: a funcao e idempotente (so age quando o prazo vence e respeita o maximo),
-- entao pode ser chamada com frequencia sem risco de repetir mensagens.
create extension if not exists pg_net with schema extensions;

do $$ begin
  perform cron.unschedule('lembrete-aprovacao-conteudo');
exception when others then null; end $$;

select cron.schedule(
  'lembrete-aprovacao-conteudo',
  '0 12-21 * * 1-5',   -- a cada hora cheia, 09h-18h (Brasilia), seg-sex
  $job$
    select net.http_post(
      url := 'https://oxenrjsagtfmdgcrkvzs.supabase.co/functions/v1/lembrete-aprovacao',
      headers := '{"Content-Type":"application/json"}'::jsonb,
      body := '{}'::jsonb
    );
  $job$
);
