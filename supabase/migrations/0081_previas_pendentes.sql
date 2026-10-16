-- IDs dos videos do Drive em aprovacao; a Action "Previas de video" converte cada um para uma
-- previa leve (1080p H.264). Expoe so o ID do arquivo, que ja aparece nas paginas publicas.
create or replace function public.previas_pendentes()
returns table (drive_id text)
language sql
stable
security definer
set search_path = public
as $$
  select distinct (regexp_match(link_drive, '/d/([A-Za-z0-9_-]{10,80})'))[1]
  from public.conteudo_aprovacao
  where link_drive is not null
    and formato = 'reels'
    and link_drive ~ '/d/[A-Za-z0-9_-]{10,80}'
    and status <> 'reprovado';
$$;

revoke all on function public.previas_pendentes() from public;
grant execute on function public.previas_pendentes() to anon, authenticated;
