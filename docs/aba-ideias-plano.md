# Aba Ideias (grupo VIP de WhatsApp)

## O que existe hoje no sistema

- Vite + React 18 + TypeScript strict, Tailwind, React Query, Supabase. Scripts: `npm run build` (tsc + vite) e `npm run lint`.
- Equipe x cliente: tabela `profiles` com `tipo` ('equipe' ou 'cliente') e `cliente_id`. No banco: `is_equipe()` e `meu_cliente_id()`. No front: `useAuth()` com `isCliente` e `profile.cliente_id`.
- Página interna do cliente: `src/modules/clientes/pages/ClienteDetailPage.tsx`. Portal do cliente: `src/portal/` (menu em `PortalShell.tsx`, rotas em `src/app/router.tsx`).
- Já existe o módulo `stories` (Ideias de Stories) com o mesmo desenho equipe + cliente. Foi usado como modelo de segurança e de estilo.
- Migrações: arquivos numerados em `supabase/migrations`, aplicados à mão no Supabase (o pipeline não aplica).

## Decisões

- Módulo novo `src/modules/ideias-vip/`, para não colidir com os módulos `ideias` e `stories`.
- Migração `0088_ideias_vip.sql`: `idea_batches`, `ideas`, `idea_client_state`, RLS ligado, só aditiva.
- Equipe: nova aba "Ideias" dentro da página de cada cliente (lotes, importação por CSV ou colagem, edição, duplicar para outros clientes, aviso de campos entre colchetes, indicador de uso).
- Cliente: nova entrada "Ideias" no portal (`/portal/ideias`), com bloco "Para hoje", filtros, visão por semana e ações de copiar, salvar e marcar como usada.
- Modo demonstração (sem Supabase) funciona com dados em memória, como nos outros módulos.
- Textos em pt-BR, caixa de frase, sem exclamações e sem travessão longo.

## Próximo passo: pedir ideias com IA

Não implementado nesta versão. O campo `ideas.source` já aceita `'ia'`. Quando for a hora:

1. Uma Edge Function (`ideias-vip-gerar`) recebe `client_id`, tipo e o pedido livre do cliente (a caixa "Pedir ideias" do mockup).
2. A função lê o briefing e o DNA do cliente (pautas, regras e identidade visual) com a service role, só dentro da função.
3. Chama a API da Anthropic (chave no segredo `ANTHROPIC_API_KEY`) e recebe algumas ideias.
4. As ideias são gravadas em `ideas` com `source = 'ia'`, em um lote próprio em rascunho para a equipe revisar, ou em um lote publicado se a equipe preferir liberar direto.
