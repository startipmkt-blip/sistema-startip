-- 0037_link_preview.sql
-- Cache de metadados Open Graph para links citados em crm_mensagens.
-- Ex.: { url, title, description, image, site_name }

alter table if exists public.crm_mensagens
  add column if not exists link_preview jsonb;
