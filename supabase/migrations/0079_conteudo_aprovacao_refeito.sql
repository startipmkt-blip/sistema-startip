-- 0079_conteudo_aprovacao_refeito.sql
-- Marca o post que o cliente reprovou e a equipe refez. Quando a peça volta
-- para "Editado" a justificativa é limpa, então sem este marcador não há como
-- saber depois que ela é um reenvio. Alimenta o botão "Reenviar alterados"
-- (gestao-conteudo), que avisa o grupo do cliente no WhatsApp com um clique.
-- Volta para false assim que o reenvio é disparado.

alter table public.conteudo_aprovacao
  add column if not exists refeito boolean not null default false;
