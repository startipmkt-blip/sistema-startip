// Testes do motor STARTIP ALERTAS (migration 0068) em Postgres real (PGlite, em memoria).
// Nao toca no banco de producao. Uso:
//   npm i --no-save @electric-sql/pglite   (ou PGLITE_DIR=<pasta com node_modules>)
//   node supabase/tests/alertas.test.mjs
import { readFileSync } from 'node:fs';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { dirname, join } from 'node:path';

const aqui = dirname(fileURLToPath(import.meta.url));
const pgliteUrl = process.env.PGLITE_DIR
  ? pathToFileURL(join(process.env.PGLITE_DIR, 'node_modules/@electric-sql/pglite/dist/index.js')).href
  : '@electric-sql/pglite';
const { PGlite } = await import(pgliteUrl);

const db = new PGlite();
await db.exec(`
  create role anon; create role authenticated; create role service_role;
  create schema auth; create function auth.uid() returns uuid language sql as $$ select null::uuid $$;
  create table public.clientes (id uuid primary key default gen_random_uuid(), nome text);
  create function public.is_equipe() returns boolean language sql as $$ select true $$;
  create table public.crm_mensagens (wa_message_id text, direcao text);
`);
await db.exec(readFileSync(join(aqui, '../migrations/0068_startip_alertas.sql'), 'utf8'));
await db.exec(readFileSync(join(aqui, '../migrations/0069_alertas_contatos.sql'), 'utf8'));

// ---------- helpers ----------
const T0 = Date.parse('2026-10-15T13:00:00Z'); // 10:00 em Sao Paulo
const iso = (min) => new Date(T0 + min * 60000).toISOString();
const GRUPO = '120363000000000001-group';
const GRUPO2 = '120363000000000002-group';
const INTERNO = '120363999999999999-group';
const CLIENTE = '5511999990001';
const EQUIPE_CAD = '+55 (11) 98765-4321';      // como cadastrado
const EQUIPE_WA = '5511987654321';             // como chega do WhatsApp
const EQUIPE_SEM9 = '551187654321';            // mesma pessoa sem o 9o digito

let n = 0;
async function msg(o) {
  n += 1;
  const r = await db.query(
    `select public.alertas_registrar_evento($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11::timestamptz,$12::timestamptz) as r`,
    [
      'inst', o.id ?? `m${n}`, o.chat ?? GRUPO, o.chatNome ?? 'LG Internet | Startip',
      o.fone ?? CLIENTE, o.nome ?? 'Cliente', o.fromMe ?? false, o.fromApi ?? false,
      o.tipo ?? 'texto', o.texto ?? 'Pessoal, precisamos ajustar a campanha.',
      iso(o.at ?? 0), iso(o.chega ?? o.at ?? 0),
    ],
  );
  return r.rows[0].r;
}
const enviados = [];
async function tick(min) {
  await db.query(`select public.alertas_resolver_origem($1::timestamptz)`, [iso(min)]);
  await db.query(`select public.alertas_enfileirar($1::timestamptz)`, [iso(min)]);
  const { rows } = await db.query(`select * from public.alertas_reivindicar_envios(20, $1::timestamptz)`, [iso(min)]);
  for (const e of rows) {
    enviados.push({ ...e, min });
    await db.query(`select public.alertas_marcar_envio($1,true,$2,null,$3,$4::timestamptz)`,
      [e.envio_id, `zapi-${e.envio_id}`, `alerta nivel ${e.nivel}`, iso(min)]);
  }
  return rows;
}
const q = async (sql, p = []) => (await db.query(sql, p)).rows;
const pend = (chat = GRUPO) => q(`select * from public.alertas_pendencias where chat_id=$1 order by iniciada_em`, [chat]);

let falhas = 0;
function ok(cond, nome) {
  console.log(`${cond ? '  PASS' : '  FAIL'}  ${nome}`);
  if (!cond) falhas += 1;
}
async function reset() {
  await db.exec(`delete from public.alertas_envios; delete from public.alertas_eventos;
                 delete from public.alertas_pendencias; delete from public.alertas_log;`);
  enviados.length = 0;
}

// ---------- configuracao ----------
await db.exec(`
  update public.alertas_config set grupo_interno_id='${INTERNO}', grupo_interno_nome='Startip | Alertas';
  insert into public.alertas_equipe (nome, cargo, telefone) values ('Ana Social', 'Social media', '${EQUIPE_CAD}');
  insert into public.alertas_grupos (chat_id, nome_grupo, cliente_nome, monitorar) values
    ('${GRUPO}', 'LG Internet | Startip', 'LG Internet', true),
    ('${GRUPO2}', 'Outro Cliente | Startip', 'Outro Cliente', true),
    ('${INTERNO}', 'Startip | Alertas', 'Interno', true);
`);

console.log('\nConfiguracao');
ok((await q(`select monitorar from public.alertas_grupos where chat_id=$1`, [INTERNO]))[0].monitorar === false,
  'grupo interno nunca fica monitorado (sem loop de alertas)');
ok((await msg({ chat: INTERNO, at: 0 })).motivo === 'grupo_interno', 'mensagem do grupo interno e ignorada');

console.log('\nTeste 1 - equipe responde em 5 min: nenhum alerta');
await reset();
await msg({ at: 0 });
await msg({ at: 5, fone: EQUIPE_WA, nome: 'Ana', texto: 'Ja ajustamos!' });
for (const m of [5, 10, 11, 30, 60, 120]) await tick(m);
let p = await pend();
ok(p.length === 1 && p[0].status === 'respondida', 'pendencia encerrada pela resposta');
ok(p[0].tempo_resposta_seg === 300 && p[0].dentro_prazo === true, 'tempo de resposta = 5 min, dentro do prazo');
ok(enviados.length === 0, 'nenhum alerta enviado');

console.log('\nTeste 2 - ninguem responde: alertas 10/40/60 uma vez cada');
await reset();
await msg({ at: 0 });
await tick(9);
ok(enviados.length === 0, 'antes de 10 min nao envia');
await tick(10); await tick(10); await tick(11);
ok(enviados.length === 1 && enviados[0].nivel === 1 && enviados[0].grupo_interno_id === INTERNO,
  'aos 10 min: 1 alerta nivel 1 para o grupo interno (repeticoes nao duplicam)');
await tick(30);
ok(enviados.length === 1, 'aos 30 min o grupo interno ja tem o aviso (continua 1)');
await tick(40); await tick(41);
ok(enviados.length === 2 && enviados[1].nivel === 2, 'aos 40 min: nivel 2');
await tick(60); await tick(75);
ok(enviados.length === 3 && enviados[2].nivel === 3, 'aos 60 min: nivel 3, e nada alem disso');
ok(enviados[2].cliente_nome === 'LG Internet' && enviados[2].minutos === 60, 'dados do alerta (cliente, 60 min)');

console.log('\nTeste 3 - varias mensagens seguidas: uma pendencia, horario da primeira');
await reset();
await msg({ at: 0, texto: 'Oi' });
await msg({ at: 2, texto: 'Alguem ai?' });
await msg({ at: 4, tipo: 'audio', texto: null });
p = await pend();
ok(p.length === 1 && p[0].qtd_msgs === 3, 'uma unica pendencia com 3 mensagens');
ok(new Date(p[0].iniciada_em).toISOString() === iso(0), 'contagem parte da primeira mensagem');
ok(p[0].ultima_msg_tipo === 'audio', 'tipo da ultima mensagem registrado (audio)');
await tick(10);
ok(enviados.length === 1 && enviados[0].minutos === 10, 'alerta aos 10 min contados desde a primeira mensagem');

console.log('\nTeste 4 - responde apos o 1o alerta: encerra e cancela os proximos');
await reset();
await msg({ at: 0 });
await tick(10);
await msg({ at: 15, fone: EQUIPE_WA, nome: 'Ana' });
await tick(40); await tick(60); await tick(90);
p = await pend();
ok(p[0].status === 'respondida' && p[0].tempo_resposta_seg === 900, 'resposta registrada com 15 min');
ok(p[0].dentro_prazo === false && p[0].alertas_enviados === 1, 'marcada como atraso, 1 alerta enviado');
ok(enviados.length === 1, 'alertas 2 e 3 nao sao enviados');

console.log('\nTeste 5 - integrante responde pelo proprio numero');
await reset();
await msg({ at: 0 });
await msg({ at: 3, fone: EQUIPE_SEM9, nome: 'Ana' });
p = await pend();
ok(p[0].status === 'respondida', 'numero cadastrado com formatacao diferente e reconhecido');
await reset();
await msg({ at: 0 });
await msg({ at: 3, fone: '5511900000099', nome: 'Outro cliente do grupo' });
p = await pend();
ok(p[0].status === 'aguardando', 'outro participante que nao e da equipe NAO conta como resposta');
await reset();
await msg({ at: 0 });
await msg({ at: 3, fone: '1234567890123456', nome: '???' });
p = await pend();
ok(p[0].status === 'aguardando', 'remetente incerto nao encerra pendencia');
await reset();
await msg({ at: 0, chat: GRUPO });
await msg({ at: 2, chat: GRUPO2, fone: EQUIPE_WA });
ok((await pend(GRUPO))[0].status === 'aguardando', 'resposta em outro grupo nao encerra esta pendencia');

console.log('\nTeste 6 - mesmo webhook duas vezes');
await reset();
const a = await msg({ id: 'dup1', at: 0 });
const b = await msg({ id: 'dup1', at: 0, chega: 0.1 });
p = await pend();
ok(a.ok && b.duplicado === true, 'segunda entrega e reconhecida como duplicada');
ok(p.length === 1 && p[0].qtd_msgs === 1, 'nao duplica a pendencia');
await tick(10); await tick(10);
ok(enviados.length === 1, 'nao duplica o alerta');

console.log('\nTeste 7 - servidor continua sem navegador / apos reinicio');
await reset();
await msg({ at: 0 });
await tick(10);
// "reinicio": envio travado em 'enviando' e rodada nova do job
await q(`update public.alertas_envios set status='enviando', bloqueado_em=$1::timestamptz, tentativas=1, enviado_em=null`, [iso(10)]);
await tick(12);
ok(enviados.length === 1, 'envio recem-travado nao e reenviado antes de 5 min');
await tick(16);
ok(enviados.length === 2 && enviados[1].nivel === 1, 'envio travado e retomado depois do timeout (1 reenvio, mesmo nivel)');
await tick(17); await tick(18);
ok(enviados.length === 2, 'apos o envio confirmado nao ha repeticao');
ok((await q(`select count(*)::int c from public.alertas_envios where nivel=1`))[0].c === 1, 'uma linha por nivel/pendencia (garantia do banco)');

console.log('\nTeste 8 - mensagens fora de ordem');
await reset();
// resposta (10:02) chega ANTES da mensagem do cliente (10:00)
await msg({ at: 2, fone: EQUIPE_WA, nome: 'Ana', chega: 2 });
await msg({ at: 0, chega: 3 });
p = await pend();
ok(p.length === 1 && p[0].status === 'respondida' && p[0].tempo_resposta_seg === 120,
  'resposta que chegou primeiro encerra a pendencia pelo horario real');
await tick(10); await tick(60);
ok(enviados.length === 0, 'nenhum alerta incorreto');

await reset();
// cliente (10:00), resposta (10:02) e mensagem tardia do cliente (10:01) chegando por ultimo
await msg({ at: 0 });
await msg({ at: 2, fone: EQUIPE_WA, nome: 'Ana' });
await msg({ at: 1, texto: 'esqueci de dizer...', chega: 4 });
p = await pend();
ok(p.length === 1 && p[0].status === 'respondida' && p[0].qtd_msgs === 2, 'mensagem tardia entra na mesma pendencia');
await tick(10); await tick(60);
ok(enviados.length === 0, 'sem alerta');

await reset();
// resposta com horario ANTERIOR ao da mensagem do cliente, chegando depois: nao responde a ela
await msg({ at: 10 });
await msg({ at: 5, fone: EQUIPE_WA, nome: 'Ana', chega: 11 });
p = await pend();
ok(p.length === 1 && p[0].status === 'aguardando', 'resposta mais antiga que a mensagem nao a encerra');
await tick(20);
ok(enviados.length === 1 && enviados[0].minutos === 10, 'alerta conta a partir do horario real do cliente');

await reset();
// ordem trocada que divide uma pendencia: C(0) C(5) e T(2) chegando depois
await msg({ at: 0 });
await msg({ at: 5 });
await tick(10);
const antes = enviados.length;
await msg({ at: 2, fone: EQUIPE_WA, nome: 'Ana', chega: 11 });
p = await pend();
ok(p.length === 2 && p[0].status === 'respondida' && p[1].status === 'aguardando',
  'resposta tardia divide: 1a mensagem respondida, 2a continua aguardando');
ok(antes === 1, 'o alerta ja enviado antes permanece registrado');

console.log('\nRegras de ignorados');
await reset();
ok((await msg({ tipo: 'reacao' })).motivo === 'tipo_sem_atendimento', 'reacao ignorada');
ok((await msg({ tipo: 'sticker' })).motivo === 'tipo_sem_atendimento', 'figurinha ignorada');
ok((await msg({ tipo: 'texto', texto: '   ' })).motivo === 'sem_texto', 'evento sem texto ignorado');
ok((await pend()).length === 0, 'nenhuma pendencia criada por eventos ignorados');
await msg({ at: 0 });
await msg({ at: 2, fromMe: true, fromApi: true, id: 'auto1' });   // aviso automatico (saldo etc.)
await tick(3);
ok((await pend())[0].status === 'aguardando', 'mensagem automatica do sistema nao e resposta (apos resolver origem)');
await db.query(`insert into public.crm_mensagens values ('hum1','enviada')`);
await msg({ at: 4, fromMe: true, fromApi: true, id: 'hum1' });     // atendente respondeu pelo inbox
await tick(5);
ok((await pend())[0].status === 'respondida', 'resposta enviada pelo inbox do CRM conta como equipe');
await reset();
await msg({ at: 0 });
await msg({ at: 1, fromMe: true, fromApi: false });
ok((await pend())[0].status === 'respondida', 'resposta do celular conectado (nao-API) conta como equipe');
ok((await msg({ chat: '120363777-group', at: 0 })).motivo === 'grupo_nao_monitorado', 'grupo nao monitorado e ignorado');

console.log('\nHorario comercial');
await reset();
await db.exec(`update public.alertas_config set horario_comercial_ativo=true, hc_inicio='08:00', hc_fim='18:00'`);
// 17:55 BRT (20:55Z) de quinta -> 10 min uteis so completam na sexta 08:05
const base = Date.parse('2026-10-15T20:55:00Z');
await db.query(`select public.alertas_registrar_evento('inst','hc1',$1,'LG Internet | Startip',$2,'Cliente',false,false,'texto','Fora do horario',$3::timestamptz,$3::timestamptz)`,
  [GRUPO, CLIENTE, new Date(base).toISOString()]);
await db.query(`select public.alertas_enfileirar($1::timestamptz)`, [new Date(base + 60 * 60000).toISOString()]);
ok((await q(`select count(*)::int c from public.alertas_envios`))[0].c === 0, 'depois do expediente nao dispara (1h corrida = 5 min uteis)');
await db.query(`select public.alertas_enfileirar($1::timestamptz)`, [new Date(Date.parse('2026-10-16T11:06:00Z')).toISOString()]);
ok((await q(`select count(*)::int c from public.alertas_envios where nivel=1`))[0].c === 1, 'dispara quando completa 10 min uteis na manha seguinte');
await db.exec(`update public.alertas_config set horario_comercial_ativo=false`);

console.log('\nFalha de envio e novas tentativas');
await reset();
await msg({ at: 0 });
await db.query(`select public.alertas_enfileirar($1::timestamptz)`, [iso(10)]);
let r = await q(`select * from public.alertas_reivindicar_envios(5,$1::timestamptz)`, [iso(10)]);
await db.query(`select public.alertas_marcar_envio($1,false,null,'HTTP 500',null,$2::timestamptz)`, [r[0].envio_id, iso(10)]);
r = await q(`select * from public.alertas_reivindicar_envios(5,$1::timestamptz)`, [iso(10.5)]);
ok(r.length === 0, 'nova tentativa respeita o intervalo (backoff)');
r = await q(`select * from public.alertas_reivindicar_envios(5,$1::timestamptz)`, [iso(13)]);
ok(r.length === 1 && r[0].tentativas === 2, 'reenvio controlado apos o intervalo');
for (let i = 3; i <= 5; i += 1) {
  await db.query(`select public.alertas_marcar_envio($1,false,null,'HTTP 500',null,$2::timestamptz)`, [r[0].envio_id, iso(13)]);
  r = await q(`select * from public.alertas_reivindicar_envios(5,$1::timestamptz)`, [iso(13 + i * 20)]);
}
await db.query(`select public.alertas_marcar_envio($1,false,null,'HTTP 500',null,$2::timestamptz)`, [r[0].envio_id, iso(200)]);
ok((await q(`select status from public.alertas_envios`))[0].status === 'falhou', 'apos o maximo de tentativas fica como falhou (registrado)');

console.log('\nContatos privados');
await reset();
const PRIV = '5511977770001';
ok((await msg({ chat: PRIV, fone: PRIV, at: 0 })).motivo === 'contato_nao_cadastrado', 'privado nao cadastrado e descartado');
ok((await q(`select count(*)::int c from public.alertas_eventos`))[0].c === 0, 'nada e gravado de conversa nao cadastrada');
await db.exec(`insert into public.alertas_grupos (chat_id, nome_grupo, cliente_nome, monitorar, tipo)
               values ('${PRIV}', 'Maria (privado)', 'Maria Cliente', true, 'contato')`);
await msg({ chat: '551177770001', fone: '551177770001', chatNome: 'Maria', at: 0 });   // chega sem o 9o digito
p = await pend(PRIV);
ok(p.length === 1 && p[0].status === 'aguardando' && p[0].cliente_nome === 'Maria Cliente', 'contato cadastrado abre pendencia (id canonico)');
await tick(10);
ok(enviados.length === 1 && enviados[0].grupo_interno_id === INTERNO, 'alerta vai para o grupo interno');
await msg({ chat: PRIV, fone: PRIV, fromMe: true, at: 12 });
ok((await pend(PRIV))[0].status === 'respondida', 'resposta do numero conectado encerra a pendencia do privado');

console.log('\nLeitura do painel');
await reset();
await msg({ at: 0 });
const pn = await q(`select * from public.alertas_painel(null, null, $1::timestamptz)`, [iso(25)]);
ok(pn.length === 1 && Math.round(Number(pn[0].minutos_decorridos)) === 25, 'painel devolve o tempo decorrido calculado no servidor');

console.log(`\n${falhas === 0 ? 'TODOS OS TESTES PASSARAM' : `${falhas} FALHA(S)`}`);
process.exit(falhas === 0 ? 0 : 1);
