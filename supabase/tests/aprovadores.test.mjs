// Testa a migration 0075 (aprovadores/votos) em Postgres real (PGlite). Uso igual ao alertas.test.mjs.
import { readFileSync } from 'node:fs';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { dirname, join } from 'node:path';

const aqui = dirname(fileURLToPath(import.meta.url));
const url = process.env.PGLITE_DIR
  ? pathToFileURL(join(process.env.PGLITE_DIR, 'node_modules/@electric-sql/pglite/dist/index.js')).href
  : '@electric-sql/pglite';
const { PGlite } = await import(url);
const db = new PGlite();
await db.exec(`
  create role authenticated;
  create table public.clientes (id uuid primary key default gen_random_uuid(), nome text);
  create function public.is_equipe() returns boolean language sql as $$ select true $$;
  create table public.conteudo_aprovacao (id uuid primary key default gen_random_uuid(),
    cliente_id uuid, status text not null default 'pendente', justificativa text default '');
`);
await db.exec(readFileSync(join(aqui, '../migrations/0075_aprovadores_cliente.sql'), 'utf8'));

let falhas = 0;
const ok = (c, n) => { console.log(`${c ? '  PASS' : '  FAIL'}  ${n}`); if (!c) falhas += 1; };
const q = async (s, p = []) => (await db.query(s, p)).rows;

const [{ id: cli }] = await q(`insert into public.clientes (nome) values ('BG') returning id`);
const aprs = [];
for (const [i, nome] of ['Lenise', 'Igor', 'Bruna', 'Guilherme'].entries()) {
  aprs.push((await q(`insert into public.cliente_aprovadores (cliente_id, nome, ordem) values ($1,$2,$3) returning id`, [cli, nome, i]))[0].id);
}
const [{ id: post }] = await q(`insert into public.conteudo_aprovacao (cliente_id) values ($1) returning id`, [cli]);

console.log('\nVotos');
for (const a of aprs.slice(0, 3)) {
  await q(`insert into public.conteudo_aprovacao_votos (post_id, aprovador_id, decisao) values ($1,$2,'aprovado')`, [post, a]);
}
ok((await q(`select count(*)::int c from public.conteudo_aprovacao_votos where post_id=$1`, [post]))[0].c === 3, '3 de 4 votaram');
let duplicou = false;
try { await q(`insert into public.conteudo_aprovacao_votos (post_id, aprovador_id, decisao) values ($1,$2,'aprovado')`, [post, aprs[0]]); }
catch { duplicou = true; }
ok(duplicou, 'o mesmo aprovador nao vota duas vezes no mesmo conteudo');

console.log('\nNova rodada');
await q(`update public.conteudo_aprovacao set status='reprovado', justificativa='Igor: trocar musica' where id=$1`, [post]);
ok((await q(`select count(*)::int c from public.conteudo_aprovacao_votos where post_id=$1`, [post]))[0].c === 3,
  'reprovar nao apaga os votos (historico da rodada)');
await q(`update public.conteudo_aprovacao set status='pendente' where id=$1`, [post]);
ok((await q(`select count(*)::int c from public.conteudo_aprovacao_votos where post_id=$1`, [post]))[0].c === 0,
  'ao voltar para pendente (refeito) os votos zeram e todos votam de novo');

console.log(`\n${falhas === 0 ? 'TODOS OS TESTES PASSARAM' : `${falhas} FALHA(S)`}`);
process.exit(falhas === 0 ? 0 : 1);
