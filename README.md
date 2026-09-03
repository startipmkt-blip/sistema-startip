# Startip OS

Sistema operacional interno da agência Startip: cadastro central de clientes,
usuários & acessos (RLS) e todos os painéis de módulos, seguindo um padrão de
arquitetura escalável.

## Stack
- **Frontend:** React + Vite + TypeScript + Tailwind CSS
- **Estado de servidor:** TanStack Query
- **Backend:** Supabase (Postgres + Auth + Row Level Security)
- **Deploy:** Hostinger (build estático → `dist/`)

## Modo Demonstração
Se as chaves do Supabase **não** estiverem configuradas, o app entra em
**Modo Demonstração**: auto-login como admin e dados de exemplo em memória,
para navegar por todo o sistema sem backend. Assim que as chaves reais forem
configuradas, o modo demo se desliga sozinho e tudo passa a usar o Supabase.
Ver `src/shared/lib/env.ts` (`IS_DEMO`).

## Rodando localmente
```bash
npm install
cp .env.example .env.local   # preencha para usar dados reais (opcional em dev)
npm run dev
```

## Build de produção
```bash
npm run build   # gera dist/
npm run preview
```

## Módulos (painéis)
| Módulo | Rota | O que mostra |
|---|---|---|
| Início | `/inicio` | Visão geral da agência (KPIs + demandas em aberto) |
| Clientes | `/clientes` | Lista com busca + CRUD. Detalhe = **workspace estilo Notion**: "Materiais de referência" (Informações, Persona, ICP, Referências, Dores/mecanismo único) e "Fluxo de trabalho" (Funil, Mineração, Ideias, Pilares, Calendário editorial, Estrutura de Instagram, GMN), cada um um documento editável + contas de anúncio |
| CRM | `/crm` | **CRM próprio da agência**: subpainéis Leads/Funil, **etapas personalizáveis** do funil, etiquetas, **conversas de WhatsApp** no lead (Z-API a plugar), export **Excel**/**PDF** |
| Financeiro | `/financeiro` | **Financeiro da agência**: MRR (quanto/quando cada cliente paga), despesas (assinaturas/parcelas), saldo e contas a pagar. Com CRUD. |
| Área do Cliente | `/area-cliente` | Relatório mensal **por cliente** com a **Calculadora ROI/ROAS embutida** (import CSV do Meta / anexo PDF) |
| Portal do cliente | `/portal` | **Acesso externo do cliente** (tipo=cliente): seus relatórios (com PDF do resumo), andamento, **aprovar conteúdo** e indicações privadas |
| Processos | `/processos` | **Documentação/SOPs da agência** por categoria (leitor + CRUD). Interno, sem cliente. |
| Indicação | `/indicacao` | Indicações dos clientes + recompensas |
| Onboarding | `/onboarding` | Andamento por cliente + **templates** + **Fluxo (mapa)** = roteiro de 9 etapas com o tempo de cada uma (visível também no portal do cliente) |
| Conteúdo | `/conteudo` | Produção de conteúdo (kanban) |
| Aprovação de conteúdo | `/aprovacao-conteudo` | Ideias por cliente/mês; cliente **aprova/reprova** no portal (reprovar exige justificativa) e sugere ideias do mês seguinte |
| Demandas | `/demandas` | Kanban por **setor**: Sócios (🔒 privado, só admin), Tráfego pago, Design, Geral |
| Usuários | `/usuarios` | **Admin-only**: equipe, cargos e permissões por módulo — criar/editar/excluir/aprovar |

### Acesso e cargos
- **Administrador (sócios):** acesso total, inclusive Usuários e demandas dos Sócios.
- **Funcionário (operador):** só os módulos liberados em `permissoes` (ex.: gestor de
  tráfego = Clientes, Área do Cliente, Onboarding, Demandas — sem CRM/Financeiro).
- Sidebar e rotas respeitam a permissão (`RequireModulo`). Novo cadastro entra
  **pendente** até um admin aprovar (trigger `handle_new_user`).
- **Modo demo:** seletor "Ver como" no topo troca de usuário para testar cargos.
- **Área do Cliente:** relatório pode ser preenchido por **CSV do Meta** (import) ou
  **PDF** anexado, além do preenchimento manual.

> **CRUD em todos os módulos**: Clientes, CRM (leads), Financeiro (receitas/
> despesas), Processos (docs), Onboarding (templates), Área do Cliente
> (relatórios), Indicação, Conteúdo e Demandas — criar/editar via modal. No modo
> demo as mutações são em memória; em produção usam o Supabase (RLS protege).

## Arquitetura — o padrão de todo módulo
```
src/
├─ app/        # router + providers globais
├─ shared/     # fundação: layout, ui, auth, lib, types
├─ modules/    # um módulo por pasta (pages/components/api/types)
└─ pages/      # telas soltas (login, início, 404)
```
**Regra de ouro:** cada módulo cria **suas próprias tabelas** com FK
`cliente_id → clientes(id)`. Os dados do cliente nunca são replicados — sempre
referenciados. Cada `api/` tem um caminho de Modo Demonstração e um caminho
Supabase real (com RLS fazendo a segurança).

Para adicionar um módulo novo:
1. `src/modules/<modulo>/` com `pages/ components/ api/ types.ts`.
2. Migration com a(s) tabela(s) + FK para `clientes` + policies de RLS
   (siga `supabase/migrations/0003_modulos.sql`).
3. Registre a rota em `src/app/router.tsx`.
4. Adicione o item em `src/shared/layout/navigation.ts`.

## Banco de dados
Migrations em [`supabase/`](./supabase), na ordem:
`0001_init` → `0002_rls` → `0003_modulos`. Ver
[`supabase/README.md`](./supabase/README.md) para aplicar e criar o admin.

---

## ⚠️ O que fica com o programador da agência
Conforme combinado, a **segurança de dados** e a **integração real do Supabase**
são revisadas/finalizadas pelo programador:

1. **Segurança / RLS**
   - Confirmar se usuário **cliente** deve ler módulos internos (financeiro,
     CRM). Se não, restringir esses `SELECT` a `is_equipe()`
     (ver nota em `0003_modulos.sql`).
   - Travar escalonamento de privilégio em `profiles`
     (colunas `tipo`/`papel`/`cliente_id`) — nota em `0002_rls.sql`.
   - Definir admin vs operador nas escritas.
   - Testar as policies logando como cada papel.
2. **Integração Supabase**
   - Criar o projeto, rodar as 3 migrations, criar o primeiro admin.
   - Preencher `.env.local` (e as env vars no ambiente de deploy) com
     `VITE_SUPABASE_URL` e `VITE_SUPABASE_ANON_KEY` (apenas a **anon key**;
     a **service role key nunca** vai ao frontend).
   - Regenerar tipos: `npm run gen:types`.
   - Bucket de Storage para os logos dos clientes + policies.
   - Provisionamento de usuário cliente (convite + linha em `profiles`).
   - **CRUD**: os painéis hoje são de leitura sobre dados de exemplo; ligar
     criar/editar/excluir em cada `api/` usando o Supabase (a estrutura e as
     tabelas já estão prontas).

## Deploy na Hostinger
1. `npm run build` → gera `dist/`.
2. Suba o conteúdo de `dist/` para a pasta pública (`public_html`).
3. O arquivo `public/.htaccess` (copiado para `dist/`) já faz o fallback SPA
   no Apache — toda rota cai em `index.html`. (`public/_redirects` cobre o
   Cloudflare Pages, caso mude de host.)
4. As variáveis `VITE_*` são lidas em **build time**; garanta que estejam
   definidas no ambiente onde o `npm run build` roda.
