# CLAUDE.md — Startip OS

Sistema operacional interno da agência Startip. Referência canônica lida pelo Claude Code em toda conversa neste repositório.

## Objetivo

SaaS de gestão de agência de marketing: CRM WhatsApp integrado, gestão de clientes, calendário editorial, financeiro, projetos e IA operacional. Inspirado no sistema **Turbo Ferramentas** (dossiê completo em `docs/turbo-kit/DOSSIE.md`) — replicamos estrutura e lógica, nunca textos/logos/prompts literais.

## Stack (não desviar sem discutir)

| Camada | Tech |
|---|---|
| Build | **Vite 5** (SPA, code-splitting por rota, bundle único hasheado) |
| Framework | **React 18** + **TypeScript** strict |
| Roteador | **React Router v6** com `React.lazy` + `Suspense` por página |
| Estado servidor | **@tanstack/react-query v5** |
| UI | **Design system próprio** em `src/shared/ui/` (Button, Input, Modal, Card, Badge, Spinner, EmptyState). Adotar shadcn/ui apenas se surgir necessidade específica. |
| Styling | **Tailwind CSS 3.4**, tema dark permanente |
| Ícones | Emojis inline (sem lib de ícones — mais leve, WhatsApp-like) |
| Emojis | **@emoji-mart/react** com `set="native"` |
| Datas | `Intl.DateTimeFormat('pt-BR')` (sem date-fns por enquanto) |
| Forms | `useState` local + validação manual (sem react-hook-form) |
| Backend | **Supabase** (Auth + Postgres + Storage + Edge Functions em Deno) |
| Hospedagem | **Hostinger** (build estático Vite servido de `/public_html`) |
| WhatsApp | **Z-API** (instância `E5EF9FE94EBB89DD03BE71D96C6E7A81`) |
| IA | Ainda não integrada. Quando integrar: **Anthropic Claude** primeiro, **OpenAI** como fallback. |
| PDFs | Ainda não temos. Preferência: `jsPDF` no front; `Puppeteer` em Edge Function só se necessário. |

## Convenções

- **TypeScript strict** em tudo. `any` só com comentário justificando.
- **Idioma padrão do UI e da conversa: pt-BR.** Textos técnicos em inglês (identificadores, migrations) tudo bem.
- **Estrutura por módulo, não por tipo:**
  ```
  src/
    modules/
      <modulo>/
        api/            ← chamadas Supabase deste módulo (crmApi.ts, respostasRapidasApi.ts)
        components/     ← subpasta por sub-área (atendimento/, ...)
        hooks/
        pages/
        types.ts
    shared/
      auth/             ← AuthProvider, ProtectedRoute
      lib/              ← supabaseClient.ts, env.ts, demoData.ts
      ui/               ← Button, Modal, Card, Input, Badge, Spinner, EmptyState, BrandMark
      types/            ← database.ts
    pages/              ← LoginPage.tsx, etc
    App.tsx · main.tsx · index.css · routes.tsx
  supabase/
    migrations/         ← 0001_xxx.sql, 0002_xxx.sql … versionados
    functions/          ← <edge-function>/index.ts (Deno)
  ```
- **Import alias**: `@/` = `src/` (configurado em `vite.config.ts`).
- **Cores/tokens Tailwind**: usar utilities Tailwind + tokens `brand-*` do design system. Nunca hardcodar hex fora de `tailwind.config.js`.
- **Comentários**: só quando o *porquê* não é óbvio (invariantes, workarounds, gotchas). Nunca explicar o *o quê* — nome do identificador faz isso.

## Padrões-chave do domínio

### 4 pilares da agência (adotar como constante)

Todos os módulos que referenciam "área do cliente" usam essas 4 keys. Serão criados enum Postgres + `src/shared/lib/pillars.ts`:

| Key | Label | Cor Tailwind |
|---|---|---|
| `traffic` | Tráfego Pago | `orange` |
| `social` | Social Media | `pink` |
| `gmb` | Google Meu Negócio | `blue` |
| `cs` | Customer Success | `emerald` |

Quando adicionarmos novos módulos (Video Maker, Webdesigner, GMN, etc), sempre trabalhar em cima dessa key.

### Score de saúde do cliente

Média simples de 3 componentes 0-100%:
- Pontualidade (tarefas entregues no prazo / total)
- Ocorrências de fluxo (100 − penalidades registradas)
- Contrato (dias corridos no contrato ativo / duração total)

A ser implementado no módulo `clientes`.

### Papéis (roles)

Enum `papel_operacional` (a criar/estender em `profiles`):

- `videomaker` — captação/edição de vídeos
- `webdesigner` — artes e posts
- `copy` — texto, calendário, atendimento
- `social` — social media
- `cs` — customer success
- `vendedor` — comercial
- `head` — coordenação (pode ser "Criador" de agendamentos)
- `diretor` — visão executiva (acesso a Diretoria)

**Autorização real** é RLS no Postgres. Roles são para permissões de UI e atribuição de tarefas.

### Convenção grupos WhatsApp

Nome padronizado: `🌐 [Empresa] | [Pilar]`. O emoji `🌐` marca grupos monitorados pelo Agente. O `[Pilar]` alimenta filtragem por pilar.

O `crm_leads.is_grupo=true` + parser do nome (`^🌐\s+(.+?)\s*\|\s*(.+)$`) identifica empresa e pilar.

## Integrações

### Ativas
- **Supabase** — Auth (email/senha + Google OAuth), Postgres com RLS, Storage (`crm-media`), Edge Functions (`zapi-enviar`, `zapi-webhook`), Realtime
- **Z-API** — WhatsApp: envio (text/image/audio/document/contact/poll/event/sticker/reaction/edit/delete/forward), webhooks (recebimento + status)
- **Google OAuth** — Login social via Supabase

### Roadmap (não integrado ainda)
- Anthropic Claude / OpenAI (Turbo AI, análise de cliente, classificação de solicitações)
- Meta Marketing API (M2 Gestor de Tráfego)
- Google Business Profile API (M6)
- Autentique (M14 Contratos)
- ffmpeg / Cloudinary Video (M12 Turbo Cenas)

## Variáveis de ambiente

Frontend (`.env.local`):
```
VITE_SUPABASE_URL=https://oxenrjsagtfmdgcrkvzs.supabase.co
VITE_SUPABASE_ANON_KEY=<publishable key>
```

Edge Functions (secrets via `supabase secrets set`):
```
SUPABASE_URL
SUPABASE_ANON_KEY
SUPABASE_SERVICE_ROLE_KEY
ZAPI_INSTANCE_ID
ZAPI_TOKEN
ZAPI_CLIENT_TOKEN
ZAPI_WEBHOOK_TOKEN
# Roadmap:
ANTHROPIC_API_KEY
OPENAI_API_KEY
META_APP_ID / META_APP_SECRET / META_ACCESS_TOKEN
GOOGLE_OAUTH_CLIENT_ID / GOOGLE_OAUTH_CLIENT_SECRET
AUTENTIQUE_API_TOKEN
```

## Regras rígidas

1. **NUNCA** copiar textos, logos, nomes de clientes ou prompts literais do sistema Turbo. Reimplementar do zero baseado na *estrutura* documentada no dossiê.
2. **NUNCA** usar `SUPABASE_SERVICE_ROLE_KEY` no frontend. Só em Edge Functions.
3. **SEMPRE** habilitar RLS em toda tabela nova.
4. **SEMPRE** puxar dados via `@tanstack/react-query` com `queryKey` estruturada `[modulo, subrecurso, params]`.
5. **SEMPRE** commitar via git antes de rodar uma nova rodada grande.
6. **SEMPRE** testar mobile em módulos com rota pública (M12 Turbo Cenas quando existir, área do cliente).
7. **NUNCA** apagar/regravar migrations aplicadas. Novo campo = nova migration numerada.
8. **Deploy manual do frontend**: `npm run build` local → upload dos 3 arquivos em `dist/assets/` para `public_html/assets/` no Hostinger → editar `index.html` (colar o novo do dist) → salvar. Já detectada dificuldade com o click do botão save do Filegator — usar Ctrl+S no editor Ace.
9. **Deploy de Edge Function**: `SUPABASE_ACCESS_TOKEN=... npx supabase functions deploy <nome> --project-ref oxenrjsagtfmdgcrkvzs`.

## Estado atual dos módulos

Mapeamento com os 16 módulos do Turbo (referência: `docs/turbo-kit/DOSSIE.md`):

| # Turbo | Nome | Status | Local |
|---|---|---|---|
| M1 | Gestão de Clientes | 🟡 UI base | `clientes` · `cliente-workspace` · `cliente-perfil` |
| M2 | Gestor de Tráfego | 🔴 | — |
| M3 | Social Mídia | 🟡 calendário parcial | `conteudo` · `aprovacao-conteudo` |
| M4 | Video Maker (workflow) | 🔴 | — |
| M5 | Webdesigner (workflow) | 🔴 | — |
| M6 | GMN + Turbo AI | 🔴 | — |
| M7 | Comercial | 🔴 | — |
| M8 | CopyWriter | 🔴 | — |
| M9 | Empresas (PIN) | 🔴 | — |
| M10 | Gestor de Projetos (agenda) | 🟡 | `reunioes` · `processos` · `demandas` |
| M11 | Diretoria (PIN) | 🔴 | — |
| M12 | ⭐ Turbo Cenas | 🔴 | — |
| M13 | Turbo Marketplace | 🔴 | — |
| M14 | ⭐ Contratos + Autentique | 🔴 | — |
| M15 | Informações Cadastrais | 🟡 | `clientes` · `onboarding` |
| M16 | ⭐⭐⭐ Agente Turbo | 🟡 inbox operacional (não bot) | `crm/atendimento` |

**Módulos exclusivos nossos** (não existem no Turbo — vantagem):
- `financeiro` — contas a pagar, MRR
- `crm/atendimento` — inbox WhatsApp completo estilo WhatsApp Web (áudio nativo, mídia, edição/exclusão, favoritas, ticks de status)
- `area-cliente` — Central do Cliente com link exclusivo
- `usuarios` — gestão de equipe

## Como pedir ajuda ao Claude Code neste projeto

- Sempre referencie o módulo pelo número (`M3`, `M14`) OU pelo path (`crm/atendimento`).
- Antes de criar tabela nova, verificar `supabase/migrations/*` — pode já estar lá com nome parecido.
- Antes de criar componente novo, verificar `src/shared/ui/` — o design system já cobre a maioria.
- Se precisar de dados fake pra testar, usar `IS_DEMO` do `shared/lib/env.ts` (fixtures em `shared/lib/demoData.ts` e per-module).
- Nunca dados de clientes reais em desenvolvimento.
- **Sempre reportar antes de deploy**: mostrar diff da mudança, aguardar OK antes de subir pro Hostinger.
