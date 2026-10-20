-- =============================================================
-- 0083_remove_trigger_ideia_aprovada.sql
-- =============================================================
-- O trigger tg_ideia_aprovada (0036) vem da época em que o cliente aprovava a
-- IDEIA antes da arte: aprovou → nascia uma demanda "A fazer" no Designer.
-- Hoje conteudo_aprovacao guarda a peça PRONTA (espelhada do Designer em
-- "aguardando aprovação"/"concluído", ou criada na Gestão já com link), então
-- toda aprovação do cliente recriava em "A fazer" uma arte já entregue — e de
-- novo a cada vez que o post voltava para "aprovado" (não há unique em ideia_id).
-- Reprovação continua indo ao Designer pela Edge Function aprovacao-publica.
-- =============================================================

drop trigger if exists tg_ideia_aprovada on public.conteudo_aprovacao;
drop function if exists public.fn_ideia_aprovada_vira_demanda();
