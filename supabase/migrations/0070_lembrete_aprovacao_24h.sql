-- 0070_lembrete_aprovacao_24h.sql
-- Lembrete de aprovacao: a cada 24h ate o cliente aprovar/reprovar.
-- lembrete_maximo = 0 passa a significar "sem limite" (ate responder).

do $$
declare c text;
begin
  for c in
    select conname from pg_constraint
     where conrelid = 'public.gestao_conteudo_config'::regclass
       and contype = 'c'
       and pg_get_constraintdef(oid) ilike '%lembrete_maximo%'
  loop
    execute format('alter table public.gestao_conteudo_config drop constraint %I', c);
  end loop;
end $$;

alter table public.gestao_conteudo_config
  add constraint gestao_conteudo_config_lembrete_maximo_check
  check (lembrete_maximo between 0 and 100);

alter table public.gestao_conteudo_config
  alter column lembrete_horas set default 24,
  alter column lembrete_maximo set default 0;

update public.gestao_conteudo_config set lembrete_horas = 24, lembrete_maximo = 0 where id;
