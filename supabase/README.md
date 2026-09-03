# Supabase — Startip OS

Núcleo de dados e segurança da fundação.

## Ordem de execução
As migrations rodam em ordem numérica:

1. `migrations/0001_init.sql` — enums, tabelas (`clientes`, `contas_anuncio`, `profiles`), triggers.
2. `migrations/0002_rls.sql` — funções auxiliares (`SECURITY DEFINER`) e políticas de RLS.
3. `seed.sql` — cria o primeiro admin (editar UUID antes de rodar).

### Via Supabase CLI (recomendado)
```bash
supabase db push          # aplica as migrations em migrations/
psql "$DATABASE_URL" -f supabase/seed.sql   # após ajustar o UUID do admin
```

### Via Dashboard
Cole o conteúdo de cada arquivo no **SQL Editor**, na ordem acima.

## Gerar os tipos TypeScript a partir do schema
Depois que o banco existir, mantenha `src/shared/types/database.ts` sincronizado:
```bash
npm run gen:types   # ajuste <SEU_PROJECT_ID> no package.json antes
```
Enquanto o projeto Supabase não existe, `database.ts` é mantido à mão
espelhando exatamente estas migrations.

## Pontos para o programador revisar
- **Escalonamento de privilégio em `profiles`**: restringir por coluna as
  alterações de `tipo`/`papel`/`cliente_id` por usuários não-admin (ver nota
  no fim de `0002_rls.sql`).
- **Provisionamento de usuário cliente**: definir o fluxo de convite e a
  criação da linha em `profiles` com `tipo='cliente'` e `cliente_id`.
- **Storage dos logos**: criar bucket e políticas de acesso ao `logo_url`.
- **Service role key**: nunca no frontend — apenas em ambiente de servidor.
