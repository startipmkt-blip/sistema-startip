-- =============================================================
-- 0061_onboarding_modelo_fases.sql — Modelo de onboarding por fases
-- =============================================================
--  Novo modelo (18 etapas em 6 fases, prazos contados da assinatura = D0).
--  O campo tempo carrega a fase e o prazo. O modelo "Onboarding Startip"
--  original continua existindo.
-- =============================================================

do $$
declare
  tpl uuid;
begin
  if exists (select 1 from public.onboarding_templates where nome = 'Onboarding Startip por Fases') then
    return;
  end if;
  insert into public.onboarding_templates (nome) values ('Onboarding Startip por Fases') returning id into tpl;
  insert into public.onboarding_template_itens (template_id, ordem, etapa, tempo, itens) values
    (tpl, 0, 'Cadastro interno', 'Fase 1 · Entrada · D0 a D1', '["Abrir o cliente no sistema da agência","Definir responsáveis","Registrar data de início e de renovação do contrato","Anexar o checklist do onboarding"]'),
    (tpl, 1, 'Grupo de comunicação e boas-vindas', 'Fase 1 · Entrada · D0 a D1', '["Criar o grupo no WhatsApp (canal oficial)","Enviar a mensagem de boas-vindas com o cronograma do onboarding e a data prevista da primeira campanha no ar","Regras do jogo na mesma mensagem: quem é o decisor e quem aprova criativos e posts","Prazo de aprovação (ex.: até 48h), horário de atendimento e prazo de resposta da agência"]'),
    (tpl, 2, 'Formulário estratégico', 'Fase 1 · Entrada · D0 a D1', '["Enviar o formulário (ICP e persona) com prazo de devolução (ex.: 48h)","Reforçar que o preenchimento precisa ser completo","Incluir no formulário, se ainda não tiver: 3 a 5 concorrentes","Incluir os números atuais do negócio: faturamento médio, leads ou mensagens por mês, ticket médio e taxa de conversão"]'),
    (tpl, 3, 'Materiais do cliente', 'Fase 1 · Entrada · D0 a D1', '["Criar e compartilhar a pasta no Drive","Solicitar fotos, vídeos, logo, identidade visual e materiais institucionais"]'),
    (tpl, 4, 'Acessos', 'Fase 2 · Acessos e estrutura técnica · D1 a D3', '["Solicitar ou criar Gerenciador de Anúncios e Business Manager","Solicitar ou criar Google Business e Google Ads (se aplicável)","Solicitar acessos às redes sociais","Confirmar o uso do WhatsApp Business e orientar a migração, se necessário"]'),
    (tpl, 5, 'Financeiro da mídia', 'Fase 2 · Acessos e estrutura técnica · D1 a D3', '["Definir verba mensal","Definir forma de pagamento da conta de anúncios","Definir quem é o responsável pelo cartão ou boleto","Combinar o que fazer se o pagamento falhar"]'),
    (tpl, 6, 'Rastreamento', 'Fase 2 · Acessos e estrutura técnica · D1 a D3', '["Pixel e API de Conversões","Tintim","Verificação de domínio","Eventos e UTMs","Tudo validado antes de qualquer campanha subir"]'),
    (tpl, 7, 'Análise do formulário e linha de base', 'Fase 3 · Diagnóstico · D3 a D7', '["Analisar o formulário preenchido","Registrar a linha de base com os números atuais do cliente","A linha de base é a referência para todos os relatórios e para a renovação"]'),
    (tpl, 8, 'Auditoria do que já existe', 'Fase 3 · Diagnóstico · D3 a D7', '["Contas e campanhas antigas","Google Meu Negócio e avaliações","Redes sociais","Site ou landing page de destino"]'),
    (tpl, 9, 'Diagnóstico comercial', 'Fase 3 · Diagnóstico · D3 a D7', '["Quem atende os leads","Tempo de resposta","Existência de script","Horário de atendimento"]'),
    (tpl, 10, 'Mercado, concorrência, ICP e persona', 'Fase 3 · Diagnóstico · D3 a D7', '["Estudar o nicho","Analisar os concorrentes na Biblioteca de Anúncios","Definir ICP e persona"]'),
    (tpl, 11, 'Vitória rápida', 'Fase 3 · Diagnóstico · D3 a D7', '["Entregar algo visível ainda nessa fase, como ajuste do Google Meu Negócio ou do perfil do Instagram","Objetivo: o cliente sentir movimento antes das campanhas"]'),
    (tpl, 12, 'Estratégia e setup', 'Fase 4 · Estratégia e alinhamento · D7 a D9', '["Estruturar o setup das contas (Meta Ads, Google Ads, redes sociais)","Preparar a apresentação"]'),
    (tpl, 13, 'Reunião de alinhamento', 'Fase 4 · Estratégia e alinhamento · D7 a D9 · ~30 min', '["Apresentar o diagnóstico e a estratégia inicial e confirmar os ajustes finais","Anotações fundamentais: qual produto ou serviço traz mais retorno e faz mais sentido divulgar","Definir metas para 30, 60 e 90 dias e os KPIs acompanhados","Explicar a fase de aprendizado das campanhas","Definir prioridades estratégicas"]'),
    (tpl, 14, 'Liberação da primeira campanha', 'Fase 5 · Execução · D9 a D12', '["Passar pelo checklist pré-campanha como gate final","Subir a primeira campanha"]'),
    (tpl, 15, 'Planejamento de conteúdo', 'Fase 5 · Execução · D9 a D12', '["Desenvolver o planejamento","Estruturar roteiros e ideias","Iniciar captações, criações e agendamentos"]'),
    (tpl, 16, 'Encerramento do onboarding', 'Fase 5 · Execução · D9 a D12', '["Mensagem no grupo marcando que o cliente entrou em operação","Informar a data do primeiro relatório e da próxima reunião"]'),
    (tpl, 17, 'Check-in de 30 dias', 'Fase 6 · Acompanhamento · D+30', '["Reunião para comparar os primeiros resultados com a linha de base e as metas combinadas","Ajustar a rota"]');
end $$;
