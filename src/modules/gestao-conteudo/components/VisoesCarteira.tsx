import { useMemo, useState } from 'react';
import { Card } from '@/shared/ui/Card';
import { Button } from '@/shared/ui/Button';
import { Badge } from '@/shared/ui/Badge';
import { Spinner } from '@/shared/ui/Spinner';
import { useMudarEtapa, usePostsPeriodo } from '@/modules/gestao-conteudo/api/gestaoApi';
import {
  DIAS_SEMANA, ETAPAS, isoData, segundaDaSemana, type Etapa, type Post,
} from '@/modules/gestao-conteudo/types';
import {
  COR_ETAPA, ETAPAS_PRONTAS, alertasDoCliente, contar, textoTempoMedio, type ClienteGestao,
} from '@/modules/gestao-conteudo/utils';
import { PostCard } from './PostCard';
import { PreviaDrive } from './PreviaDrive';

interface BaseProps {
  clientes: ClienteGestao[];
  posts: Post[];
  mes: string;
  mesAtual: boolean;
  onAbrir: (clienteId: string) => void;
}

function Logo({ c, tam = 'h-9 w-9' }: { c: ClienteGestao; tam?: string }) {
  return c.logo_url
    ? <img src={c.logo_url} alt="" className={`${tam} shrink-0 rounded-full object-cover`} />
    : <span className={`${tam} grid shrink-0 place-items-center rounded-full bg-white/5`}>🏢</span>;
}

// ------------------------------------------------ Carteira (cards)
export function VisaoCarteira({ clientes, posts, mes, mesAtual, onAbrir }: BaseProps) {
  const ordenados = useMemo(() => {
    return clientes
      .map((c) => {
        const meus = posts.filter((p) => p.cliente_id === c.id);
        const alertas = alertasDoCliente(c, meus, mesAtual);
        const peso = alertas.reduce((s, a) => s + (a.gravidade === 'alta' ? 10 : 1), 0);
        return { c, meus, alertas, peso };
      })
      .sort((a, b) => b.peso - a.peso || a.c.nome.localeCompare(b.c.nome));
  }, [clientes, posts, mesAtual]);

  return (
    <div className="grid gap-3 lg:grid-cols-2 2xl:grid-cols-3">
      {ordenados.map(({ c, meus, alertas }) => {
        const n = contar(meus);
        const meta = c.posts_por_mes ?? 0;
        const base = Math.max(meus.length, meta, 1);
        const tempo = textoTempoMedio(meus);
        return (
          <Card
            key={c.id}
            className="cursor-pointer p-4 transition-all hover:-translate-y-0.5 hover:border-brand-400/40"
            onClick={() => onAbrir(c.id)}
          >
            <div className="flex items-center gap-3">
              <Logo c={c} />
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold text-slate-100">{c.nome}</p>
                <p className="text-[11px] text-slate-400">
                  {meus.length}{meta > 0 ? ` / ${meta}` : ''} posts no mês
                  {c.conteudos_por_semana > 0 && ` · meta ${c.conteudos_por_semana}/semana`}
                </p>
              </div>
              {alertas.length === 0 && meus.length > 0 && <Badge tone="green">Em dia</Badge>}
              {alertas.some((a) => a.gravidade === 'alta') && <Badge tone="red">Atenção</Badge>}
            </div>

            <div className="mt-3 flex h-2 overflow-hidden rounded-full bg-white/5" title={`Etapas de ${mes}`}>
              {ETAPAS.map((e) => n[e.id] > 0 && (
                <div key={e.id} className={COR_ETAPA[e.id]} style={{ width: `${(n[e.id] / base) * 100}%` }} />
              ))}
            </div>

            <div className="mt-2 flex flex-wrap gap-1.5">
              {ETAPAS.filter((e) => n[e.id] > 0).map((e) => (
                <Badge key={e.id} tone={e.tone}>{e.emoji} {n[e.id]} {e.label.toLowerCase()}</Badge>
              ))}
              {meus.length === 0 && <span className="text-[11px] text-slate-500">Nenhum conteúdo planejado.</span>}
            </div>

            {tempo && <p className="mt-2 text-[11px] text-slate-400">⏱ Responde em média em {tempo}</p>}

            {alertas.length > 0 && (
              <ul className="mt-2 space-y-0.5 text-[11px]">
                {alertas.map((a) => (
                  <li key={a.texto} className={a.gravidade === 'alta' ? 'text-red-300' : 'text-amber-300'}>⚠ {a.texto}</li>
                ))}
              </ul>
            )}
          </Card>
        );
      })}
    </div>
  );
}

// ------------------------------------------------ Tabela compacta
export function VisaoTabela({ clientes, posts, mesAtual, onAbrir }: BaseProps) {
  const linhas = useMemo(() => clientes
    .map((c) => {
      const meus = posts.filter((p) => p.cliente_id === c.id);
      return { c, meus, n: contar(meus), alertas: alertasDoCliente(c, meus, mesAtual) };
    })
    .sort((a, b) => b.alertas.length - a.alertas.length || a.c.nome.localeCompare(b.c.nome)),
  [clientes, posts, mesAtual]);

  return (
    <Card className="overflow-x-auto p-0">
      <table className="min-w-full text-xs">
        <thead className="border-b border-white/10 text-[10px] uppercase tracking-wider text-slate-500">
          <tr>
            <th className="px-3 py-2 text-left">Cliente</th>
            <th className="px-2 py-2 text-center">Posts / meta</th>
            {ETAPAS.map((e) => <th key={e.id} className="px-2 py-2 text-center" title={e.label}>{e.emoji}</th>)}
            <th className="px-2 py-2 text-center">Resposta</th>
            <th className="px-3 py-2 text-left">Alertas</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-white/5">
          {linhas.map(({ c, meus, n, alertas }) => {
            const meta = c.posts_por_mes ?? 0;
            return (
              <tr key={c.id} className="cursor-pointer hover:bg-white/5" onClick={() => onAbrir(c.id)}>
                <td className="px-3 py-2">
                  <div className="flex items-center gap-2">
                    <Logo c={c} tam="h-6 w-6" />
                    <span className="font-medium text-slate-100">{c.nome}</span>
                  </div>
                </td>
                <td className={`px-2 py-2 text-center ${meta && meus.length < meta ? 'text-amber-300' : 'text-slate-200'}`}>
                  {meus.length}{meta ? ` / ${meta}` : ''}
                </td>
                {ETAPAS.map((e) => (
                  <td key={e.id} className={`px-2 py-2 text-center ${n[e.id] ? 'font-semibold text-slate-100' : 'text-slate-600'}`}>
                    {n[e.id] || '·'}
                  </td>
                ))}
                <td className="px-2 py-2 text-center text-slate-300">{textoTempoMedio(meus) ?? '—'}</td>
                <td className="px-3 py-2 text-[11px]">
                  {alertas.length === 0
                    ? <span className="text-emerald-400">✓</span>
                    : <span className={alertas.some((a) => a.gravidade === 'alta') ? 'text-red-300' : 'text-amber-300'}>
                      {alertas.map((a) => a.texto).join(' · ')}
                    </span>}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </Card>
  );
}

// ------------------------------------------------ Agenda da semana (todos os clientes)
export function AgendaSemana({
  clientes, etapaFiltro, onAbrir,
}: { clientes: ClienteGestao[]; etapaFiltro: Etapa | ''; onAbrir: (id: string) => void }) {
  const [deslocamento, setDeslocamento] = useState(0);
  const segunda = segundaDaSemana(new Date(), deslocamento);
  const domingo = new Date(segunda); domingo.setDate(domingo.getDate() + 6);
  const { data, isLoading } = usePostsPeriodo(isoData(segunda), isoData(domingo));
  const mudarEtapa = useMudarEtapa();
  const [previa, setPrevia] = useState<Post | null>(null);

  const idsClientes = new Set(clientes.map((c) => c.id));
  const nomes = new Map(clientes.map((c) => [c.id, c.nome]));
  const posts = (data ?? []).filter(
    (p) => idsClientes.has(p.cliente_id) && (!etapaFiltro || p.etapa === etapaFiltro),
  );
  const hoje = isoData(new Date());
  const naoProntos = posts.filter((p) => !ETAPAS_PRONTAS.includes(p.etapa)).length;

  const dias = DIAS_SEMANA.map((nome, i) => {
    const d = new Date(segunda); d.setDate(d.getDate() + i);
    const iso = isoData(d);
    return { nome, iso, dia: d.getDate(), posts: posts.filter((p) => p.dia_postagem === iso) };
  });

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        <Button variant="secondary" onClick={() => setDeslocamento((d) => d - 1)}>←</Button>
        <span className="text-sm font-medium text-slate-100">
          {segunda.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' })} –{' '}
          {domingo.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' })}
        </span>
        <Button variant="secondary" onClick={() => setDeslocamento((d) => d + 1)}>→</Button>
        {deslocamento !== 0 && <button className="text-xs text-brand-300 hover:underline" onClick={() => setDeslocamento(0)}>Esta semana</button>}
        <span className="ml-auto text-xs text-slate-400">
          {posts.length} conteúdo(s) na semana
          {naoProntos > 0 && <span className="text-amber-300"> · {naoProntos} ainda não aprovado(s)</span>}
        </span>
      </div>

      {isLoading ? <div className="flex justify-center py-10"><Spinner /></div> : (
        <div className="grid gap-2 md:grid-cols-2 xl:grid-cols-7">
          {dias.map((d) => (
            <section
              key={d.iso}
              className={`rounded-xl border p-2 ${d.iso === hoje ? 'border-brand-400/60 bg-brand-500/5' : 'border-white/10 bg-white/[0.02]'}`}
            >
              <div className="mb-2 flex items-center justify-between px-1 text-xs">
                <span className="font-semibold text-slate-100">{d.nome} {d.dia}</span>
                <span className="text-slate-500">{d.posts.length || ''}</span>
              </div>
              <div className="space-y-2">
                {d.posts.map((p) => (
                  <div key={p.id} onDoubleClick={() => onAbrir(p.cliente_id)} title="Duplo clique abre o cliente">
                    <PostCard
                      post={p}
                      clienteNome={nomes.get(p.cliente_id)}
                      onEtapa={(etapa) => mudarEtapa.mutate({ id: p.id, etapa })}
                      onPrevia={() => setPrevia(p)}
                    />
                  </div>
                ))}
                {d.posts.length === 0 && <p className="px-1 py-2 text-[11px] text-slate-600">—</p>}
              </div>
            </section>
          ))}
        </div>
      )}
      <p className="text-[11px] text-slate-500">
        Mostra os conteúdos com dia de postagem definido. Conteúdos sem data aparecem só na visão do cliente.
      </p>

      <PreviaDrive
        open={previa !== null} onClose={() => setPrevia(null)}
        titulo={previa?.titulo ?? ''} link={previa?.link_drive ?? null}
      />
    </div>
  );
}
