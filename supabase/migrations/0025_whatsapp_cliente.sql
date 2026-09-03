-- 0025_whatsapp_cliente.sql — canal WhatsApp direto pro cliente
-- (número individual ou id de grupo formato "1203...@g.us")

alter table if exists clientes
  add column if not exists whatsapp_chat_id text;

comment on column clientes.whatsapp_chat_id is
  'Telefone do cliente (ex: 5527999999999) ou id do grupo WhatsApp (ex: 120363...@g.us) usado pelo botão "Enviar pro WhatsApp".';
