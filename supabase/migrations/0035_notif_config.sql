-- 0035_notif_config.sql
-- Preferências de notificação por usuário.
-- Estrutura do jsonb (defaults abaixo):
-- {
--   "som":            true,
--   "notificacao":    true,
--   "titulo_badge":   true,
--   "mute_ate":       null,      // ISO opcional
--   "novas_atribuidas": true,    // notificar mensagens em conversas que são minhas
--   "fila_livre":       true     // notificar mensagens novas na fila (sem atendente)
-- }

alter table if exists public.profiles
  add column if not exists notif_config jsonb not null default
    '{"som":true,"notificacao":true,"titulo_badge":true,"novas_atribuidas":true,"fila_livre":true}'::jsonb;
