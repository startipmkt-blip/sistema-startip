-- O formulario de ideias grava estes campos; a tabela original (0003-like) nao os tinha,
-- entao todo insert falhava com "column does not exist".
alter table public.ideias
  add column if not exists tipo          text not null default 'agencia',
  add column if not exists cliente_nome  text,
  add column if not exists projeto_nome  text,
  add column if not exists autor         text not null default 'iuri',
  add column if not exists importancia   text not null default 'simples',
  add column if not exists data_ideia    date not null default current_date;

do $$ begin
  alter table public.ideias add constraint ideias_tipo_chk
    check (tipo in ('agencia','cliente','projeto'));
exception when duplicate_object then null; end $$;

do $$ begin
  alter table public.ideias add constraint ideias_importancia_chk
    check (importancia in ('simples','importante','muito_importante'));
exception when duplicate_object then null; end $$;

do $$ begin
  alter table public.ideias add constraint ideias_autor_chk
    check (autor in ('iuri','dhomini'));
exception when duplicate_object then null; end $$;

create index if not exists idx_ideias_data on public.ideias (data_ideia desc);
