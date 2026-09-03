# Guia de Entrega — Startip OS

> **Objetivo deste guia:** sair do Modo Demonstração e colocar o Startip OS no
> ar, em produção, na sua hospedagem Hostinger, com Supabase real e segurança
> revisada. Tudo em ordem, sem pular etapas.
>
> Última atualização: 2026-08-27 — inclui migrations `0004_seguranca.sql`,
> `0005_storage.sql`, upload real para Storage, Edge Functions Z-API, hardening
> do frontend (headers de segurança + `drop_console`) e login com Google.

---

## Visão geral do fluxo

1. Criar o projeto Supabase → colar as chaves no `.env.local`.
2. Rodar as **5 migrations** em ordem.
3. Criar o primeiro admin (você).
4. Ligar Google OAuth (opcional, mas recomendado).
5. Criar os buckets de Storage (a migration `0005` já faz isso, mas confira).
6. Fazer deploy das duas Edge Functions da Z-API (se for usar o inbox agora).
7. `npm run build` → subir o conteúdo de `dist/` pro `public_html` da Hostinger.

---

## 1. Projeto Supabase

1. Acesse [supabase.com](https://supabase.com) → **New project**.
2. Anote as duas chaves em **Settings → API**:
   - `Project URL` → vira `VITE_SUPABASE_URL`
   - `anon public` key → vira `VITE_SUPABASE_ANON_KEY`
3. Crie um arquivo `.env.local` na raiz do projeto (não versione — já está no `.gitignore`):
   ```
   VITE_SUPABASE_URL=https://SEU_PROJECT_ID.supabase.co
   VITE_SUPABASE_ANON_KEY=sua_anon_key_publica_aqui
   ```
   ⚠️ **NUNCA** ponha a `service_role` key no frontend nem neste arquivo. Ela só
   vai como *secret* de Edge Function, feito automaticamente pelo Supabase.

## 2. Migrations (SQL)

No painel Supabase → **SQL Editor**, abra e execute **em ordem, um de cada vez**:

| # | Arquivo | O que faz |
|---|---|---|
| 1 | `supabase/migrations/0001_init.sql` | Enums + tabela `clientes` + `contas_anuncio` + `profiles` + trigger `handle_new_user` |
| 2 | `supabase/migrations/0002_rls.sql` | Habilita RLS em clientes/contas/profiles + funções auxiliares `is_equipe()`, `is_admin()`, `meu_cliente_id()` |
| 3 | `supabase/migrations/0003_modulos.sql` | Todas as tabelas dos módulos + RLS por grupo |
| 4 | `supabase/migrations/0004_seguranca.sql` | **Hardening final**: bloqueia escalonamento de privilégio em `profiles`, remove leitura de `financeiro_receitas` pelo cliente, restringe update de `conteudo_aprovacao` pelo cliente |
| 5 | `supabase/migrations/0005_storage.sql` | Cria buckets `logos-clientes` (público), `relatorios`, `materiais-cliente`, `reunioes` (privados) + policies |

Alternativa via CLI (mais rápido):
```bash
supabase link --project-ref SEU_PROJECT_ID
supabase db push
```

## 3. Primeiro admin (você)

1. No painel Supabase → **Authentication → Users → Add user** (crie com email/senha, ou faça login com Google — ver §4).
2. Ainda no SQL Editor:
   ```sql
   update public.profiles
     set tipo='equipe',
         papel='admin',
         status='ativo',
         permissoes='{}',
         nome='Seu Nome',
         cargo='Sócio-fundador'
     where id = (select id from auth.users where email='SEU_EMAIL@dominio.com');
   ```
3. Confirme: `select * from public.profiles where status='ativo';` deve mostrar sua linha com `papel='admin'`.

## 4. Login com Google (recomendado)

1. **Google Cloud Console** → APIs & Services → Credentials → **OAuth 2.0 Client ID** (web).
2. Adicione em **Authorized redirect URIs**:
   ```
   https://SEU_PROJECT_ID.supabase.co/auth/v1/callback
   ```
3. Anote `Client ID` e `Client Secret`.
4. No painel Supabase → **Authentication → Providers → Google** → habilite e cole as duas chaves.
5. Em **URL Configuration**, adicione a URL do site em produção (ex.: `https://cerebro.agenciastartip.com.br`) em **Site URL** e **Additional Redirect URLs**.

Todo cadastro novo entra automaticamente como `equipe/operador/pendente` (trigger `handle_new_user`). Ele só ganha acesso quando um admin aprova em `/usuarios` e marca os módulos.

## 5. Buckets de Storage

A migration `0005_storage.sql` já cria os quatro:

| Bucket | Público | Uso |
|---|---|---|
| `logos-clientes` | ✅ | logos que aparecem nas telas de qualquer usuário |
| `relatorios` | ❌ | PDFs mensais (cliente só vê os seus) |
| `materiais-cliente` | ❌ | PDFs anexados no workspace (cliente só vê os seus) |
| `reunioes` | ❌ | atas de reunião (cliente só vê as suas) |

**Convenção de path** (obrigatória — as policies dependem disso):
```
<cliente_id>/<uuid>-<nome-do-arquivo>.<ext>
```
O helper `src/shared/lib/storage.ts` já cuida disso automaticamente.

## 6. Z-API (WhatsApp) — opcional

Só faça isso se for usar o inbox do CRM agora.

### 6.1 Secrets no Supabase
No painel Supabase → **Edge Functions → Secrets** (ou via CLI `supabase secrets set`):
```
ZAPI_INSTANCE_ID=<instance id do painel Z-API>
ZAPI_TOKEN=<token da instância>
ZAPI_CLIENT_TOKEN=<opcional, dependendo do plano Z-API>
ZAPI_WEBHOOK_TOKEN=<um token forte que VOCÊ inventa aqui>
```

### 6.2 Deploy das functions
```bash
supabase functions deploy zapi-webhook --no-verify-jwt
supabase functions deploy zapi-enviar
```
O `--no-verify-jwt` no webhook é porque a Z-API não passa JWT — a autenticação é feita pelo header `X-Zapi-Token` que a function valida.

### 6.3 Configuração na Z-API
1. Painel Z-API → sua instância → **Webhooks** → **Ao receber mensagem**:
   ```
   URL: https://SEU_PROJECT_ID.supabase.co/functions/v1/zapi-webhook
   ```
2. Nas **headers customizados** do webhook, adicione:
   ```
   X-Zapi-Token: <mesmo valor de ZAPI_WEBHOOK_TOKEN>
   ```

Pronto: mensagens recebidas caem em `crm_mensagens` (criando lead novo se o telefone ainda não estiver cadastrado), e o botão "Enviar" no CRM chama a function `zapi-enviar` que dispara pela Z-API e grava no histórico.

## 7. Revisão final de segurança (checklist)

Já feito na migration `0004_seguranca.sql`:

- [x] Bloqueio de escalonamento de privilégio em `profiles` (usuário comum não muda `tipo`/`papel`/`cliente_id`/`permissoes`/`status`).
- [x] `financeiro_receitas` não é mais visível pelo cliente.
- [x] `conteudo_aprovacao`: cliente só altera `status`/`justificativa`. Reprovar sem justificativa é rejeitado no banco.
- [x] `conteudo_sugestoes`: cliente não pode alterar `cliente_id`.
- [x] `revoke create on schema public from public`.

Frontend:
- [x] Headers de segurança no `.htaccess` (X-Frame-Options DENY, X-Content-Type-Options, Referrer-Policy, Permissions-Policy, HSTS, CSP).
- [x] `console.log`/`debugger` removidos do bundle em produção (`vite.config.ts` → `esbuild.drop`).
- [x] Bloqueio de download de `.env`, `.git`, `package*.json` etc via `.htaccess`.

Teste manualmente:
- [ ] Logue como **admin** e confirme que vê tudo.
- [ ] Logue como **operador** com permissões limitadas → confirme que só aparecem os módulos permitidos e que ele **não** consegue abrir `/usuarios`.
- [ ] Logue como **cliente** → deve entrar direto em `/portal`, sem acesso a nada mais. Tente `select * from public.financeiro_receitas;` no editor SQL logado como ele — deve retornar 0 linhas.

## 8. Build e deploy na Hostinger

```bash
npm install
npm run build
```
Isso gera a pasta `dist/`, 100% estática.

### Upload
1. Painel Hostinger → **File Manager** → `public_html/` (ou a pasta do subdomínio, ex.: `cerebro.agenciastartip.com.br/`).
2. Apague o conteúdo antigo (guarde um backup).
3. Suba **todo o conteúdo de `dist/`** — arquivos e a pasta `assets/`. Também suba o `.htaccess` (fica na raiz de `dist/` porque está em `public/`).
4. Confira que o `.htaccess` está lá (arquivos que começam com ponto ficam ocultos por padrão — ative "mostrar ocultos" no File Manager).

### DNS / SSL
- Se o domínio ainda não estiver apontado, aponte na Hostinger.
- Ative o SSL grátis (Let's Encrypt) na Hostinger antes de o HSTS do `.htaccess` fazer efeito. Sem HTTPS, HSTS pode travar o acesso — se acontecer, comente a linha `Strict-Transport-Security` no `.htaccess`, suba de novo, ative o SSL e depois descomente.

## 9. Checklist final antes de ir ao ar

- [ ] Projeto Supabase criado, `.env.local` preenchido.
- [ ] As **5 migrations** aplicadas em ordem.
- [ ] Primeiro admin criado e testado (`select * from profiles where papel='admin'`).
- [ ] Google OAuth + email/senha habilitados no Supabase Auth.
- [ ] Buckets de Storage criados pela `0005_storage.sql` (confira em Storage no painel).
- [ ] Edge Functions da Z-API deployadas (se for usar).
- [ ] `npm run build` verde.
- [ ] `dist/` (com `.htaccess`) subido no `public_html/`.
- [ ] SSL ativo na Hostinger.
- [ ] Testes: admin, operador, cliente — cada um vê o que deve, nada mais.

---

## Apêndice A — Onde cada peça vive

```
supabase/
  migrations/
    0001_init.sql          → base
    0002_rls.sql           → RLS + funções auxiliares
    0003_modulos.sql       → tabelas dos módulos + RLS por grupo
    0004_seguranca.sql     → hardening final (escalonamento, etc)
    0005_storage.sql       → buckets + policies de Storage
  functions/
    zapi-webhook/index.ts  → recebe mensagens (sem JWT — token custom)
    zapi-enviar/index.ts   → envia mensagens (exige JWT + is_equipe)

src/shared/lib/
  supabaseClient.ts        → client único, usa ANON key
  env.ts                   → IS_DEMO liga quando faltam VITE_SUPABASE_*
  storage.ts               → helper de upload (usa buckets acima)

public/
  .htaccess                → SPA fallback + cache + headers de segurança
  _redirects               → equivalente para Cloudflare Pages
```

## Apêndice B — Regenerar tipos TS depois das migrations

```bash
# ajuste o script gen:types no package.json colocando SEU project id
npm run gen:types
```
Isso reescreve `src/shared/types/database.ts` com o schema real. Se o tipo
gerado divergir do que o código espera (raro), o `tsc` acusa e você ajusta.
