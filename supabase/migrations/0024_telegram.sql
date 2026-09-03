-- 0024_telegram.sql — canal de comunicação com o cliente via Telegram.
-- Cliente pode ter um chat_id (ou "-1001…" pra grupo) que a agência
-- usa pra jogar avisos/relatórios diários.

alter table if exists clientes
  add column if not exists telegram_chat_id text;

comment on column clientes.telegram_chat_id is
  'ID do chat/grupo do Telegram do cliente. Ex: 123456789 (privado) ou -1001234567890 (grupo).';
