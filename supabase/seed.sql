-- =============================================================
-- seed.sql — Dados iniciais para desenvolvimento
-- =============================================================
-- COMO CRIAR O PRIMEIRO ADMIN:
--   1) Crie o usuário no Supabase Auth (Dashboard > Authentication >
--      Add user, ou via signup na tela de login).
--   2) Copie o UUID desse usuário (auth.users.id).
--   3) Rode o INSERT abaixo trocando o UUID.
--
-- Sem um profile do tipo 'equipe'/'admin', o app trata o usuário como
-- "sem acesso" — isso é proposital (nada de auto-promover ninguém).
-- =============================================================

-- insert into public.profiles (id, nome, tipo, papel)
-- values ('00000000-0000-0000-0000-000000000000', 'Admin Startip', 'equipe', 'admin');

-- ---------- Clientes de exemplo (opcional, para dev) ----------
-- insert into public.clientes (nome, tipo_negocio, status) values
--   ('Padaria do Bairro', 'local',     'ativo'),
--   ('Loja Online XYZ',   'ecommerce', 'prospect');
