-- 0084_demandas_anexos.sql
-- Anexos (prints colados, imagens, PDFs) nas demandas internas do quadro.
-- Mesmo formato dos anexos do Designer: [{ path, name, type, size }] no bucket anexos-internos.
alter table public.demandas
  add column if not exists anexos jsonb not null default '[]'::jsonb;
