import { useMemo } from 'react';
import { Card } from '@/shared/ui/Card';
import { Spinner } from '@/shared/ui/Spinner';
import { GlassIcon } from '@/shared/ui/GlassIcon';
import { LogoCliente } from '@/shared/ui/LogoCliente';
import { usePostsDoMes } from '@/modules/gestao-conteudo/api/gestaoApi';
import { type Etapa, type Post } from '@/modules/gestao-conteudo/types';
import { contar, type ClienteGestao } from '@/modules/gestao-conteudo/utils';
import { semanasRotuladas } from '@/modules/gestao-conteudo/lib/semanas';
import { diasEntre, hojeLocal, mesDaSemana } from '@/modules/designer/lib/periodo';

interface Props {
  clientes: ClienteGestao[];
  onAbrir: (clienteId: string) => void;
}

type Grupo = 'acao' | 'cliente' | 'concluido';
type EtapaVisual = 'producao' | 'aprovacao' | 'aprovado' | 'concluido';

const ETAPAS_VISUAIS: { id: EtapaVisual; label: string; cor: string; texto: string }[] = [
  { id: 'producao', label: 'Produção', cor: 'bg-slate-500', texto: 'text-white' },
  { id: 'aprovacao', label: 'Aguardando aprovação', cor: 'bg-amber-400', texto: 'text-slate-950' },
  { id: 'aprovado', label: 'Aprovado, pronto para programar', cor: 'bg-sky-500', texto: 'text-white' },
  { id: 'concluido', label: 'Concluído', cor: 'bg-emerald-500', texto: 'text-slate-950' },
];

const GRUPOS: { id: Grupo; titulo: string }[] = [
  { id: 'acao', titulo: 'Precisa de ação' },
  { id: 'cliente', titulo: 'Só esperando o cliente' },
  { id: 'concluido', titulo: 'Concluído' },
];

function etapasVisuais(n: Record<Etapa, number>): Record<EtapaVisual, number> {
  return {
    producao: n.em_edicao + n.editado,
    aprovacao: n.enviado + n.reprovado,
    aprovado: n.aprovado,
    concluido: n.programado + n.publicado,
  };
}

function BarraEtapas({ valores, total, rotulo }: {
  valores: Record<EtapaVisual, number>;
  total: number;
  rotulo: string;
}) {
  return (
    <div
      className="flex min-h-7 w-full overflow-hidden rounded-lg bg-white/10"
      role="img"
      aria-label={`${rotulo}: ${ETAPAS_VISUAIS.map((e) => `${e.label} ${valores[e.id]}`).join(', ')}`}
    >
      {total > 0 && ETAPAS_VISUAIS.filter((e) => valores[e.id] > 0).map((e) => (
        <span
          key={e.id}
          className={`flex min-w-[1.75rem] items-center justify-center border-r border-slate-950/20 px-1 text-xs font-bold last:border-r-0 ${e.cor} ${e.texto}`}
          style={{ flexGrow: valores[e.id], flexBasis: 0 }}
          title={`${e.label}: ${valores[e.id]}`}
          aria-hidden="true"
        >
          {valores[e.id]}
        </span>
      ))}
    </div>
  );
}

function nomes(posts: Post[], etapas: Etapa[]): string {
  return posts.filter((p) => etapas.includes(p.etapa)).map((p) => p.titulo).join(', ');
}

function detalhePorCliente(linhas: Linha[], etapa: Etapa): string {
  return linhas.filter((l) => l.n[etapa] > 0)
    .map((l) => `${l.c.nome}: ${l.n[etapa]}`).join(' · ');
}

interface Linha {
  c: ClienteGestao;
  meus: Post[];
  n: Record<Etapa, number>;
  visual: Record<EtapaVisual, number>;
  meta: number;
  grupo: Grupo;
  pendencias: number;
}

export function SemanaAtual({ clientes, onAbrir }: Props) {
  const hoje = hojeLocal();
  const mes = mesDaSemana(hoje);
  const semana = useMemo(
    () => semanasRotuladas(mes).find((s) => hoje >= s.ini && hoje <= s.fim),
    [mes, hoje],
  );
  const postsQ = usePostsDoMes(mes);

  const linhas = useMemo((): Linha[] => {
    const porCliente = new Map<string, Post[]>();
    const ids = new Set(clientes.map((c) => c.id));
    for (const post of postsQ.data ?? []) {
      if (post.semana !== semana?.numero || !ids.has(post.cliente_id)) continue;
      const lista = porCliente.get(post.cliente_id) ?? [];
      lista.push(post);
      porCliente.set(post.cliente_id, lista);
    }
    return clientes.map((c) => {
      const meus = porCliente.get(c.id) ?? [];
      const n = contar(meus);
      const meta = c.conteudos_por_semana ?? 0;
      const pendencias = n.aprovado + n.editado + n.reprovado + n.em_edicao + Math.max(0, meta - meus.length);
      const grupo: Grupo = pendencias > 0 || meus.length === 0
        ? 'acao'
        : meus.every((p) => p.etapa === 'enviado')
          ? 'cliente'
          : meus.every((p) => p.etapa === 'programado' || p.etapa === 'publicado')
            ? 'concluido'
            : 'acao';
      return { c, meus, n, visual: etapasVisuais(n), meta, grupo, pendencias };
    }).sort((a, b) => {
      const ordem = GRUPOS.findIndex((g) => g.id === a.grupo) - GRUPOS.findIndex((g) => g.id === b.grupo);
      return ordem || (a.grupo === 'acao' ? b.pendencias - a.pendencias : 0) || a.c.nome.localeCompare(b.c.nome);
    });
  }, [clientes, postsQ.data, semana]);

  // Resumos e linhas partem exatamente da mesma lista de clientes e posts.
  const todos = linhas.flatMap((l) => l.meus);
  const totais = contar(todos);
  const total = todos.length;
  const naoConcluidos = total - totais.programado - totais.publicado;
  const dia = new Date(`${hoje}T12:00:00`);
  const diaSemana = new Intl.DateTimeFormat('pt-BR', { weekday: 'long' }).format(dia);
  const dataCurta = new Intl.DateTimeFormat('pt-BR', { day: '2-digit', month: '2-digit' }).format(dia);

  if (!semana) {
    return <Card className="p-6 text-sm text-slate-400">Hoje não cai em nenhuma semana do mês {mes}.</Card>;
  }

  return (
    <div className="space-y-5">
      <h2 className="text-base font-semibold text-white">{semana.label}</h2>

      <Card className="grid gap-5 p-5 lg:grid-cols-[minmax(0,1fr)_minmax(16rem,1fr)] lg:items-center">
        <div>
          <p className="text-base font-semibold text-white">
            Hoje é {diaSemana}, {dataCurta}. Faltam {diasEntre(hoje, semana.fim)} dias para fechar a semana.
          </p>
          <p className="mt-1 text-sm text-slate-300">
            {naoConcluidos} de {total} posts ainda não foram programados nem publicados.
          </p>
        </div>
        <div>
          <p className="mb-2 text-xs font-medium text-slate-300">Todos os posts da semana, por etapa</p>
          <BarraEtapas valores={etapasVisuais(totais)} total={total} rotulo="Todos os posts da semana" />
        </div>
      </Card>

      {postsQ.isLoading && <div className="flex justify-center py-10"><Spinner /></div>}
      {postsQ.error && <Card className="p-4 text-sm text-red-300">Erro ao carregar: {(postsQ.error as Error).message}</Card>}

      {!postsQ.isLoading && !postsQ.error && (
        <>
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <Card className="border-sky-500/40 bg-sky-950/70 p-4">
              <p className="text-xs font-bold uppercase tracking-wide text-sky-200">Sua vez</p>
              <p className="mt-2 text-3xl font-bold text-white">{totais.aprovado}</p>
              <p className="text-sm text-sky-100">aprovados para programar</p>
              <p className="mt-3 text-xs leading-relaxed text-sky-100">{detalhePorCliente(linhas, 'aprovado') || 'Nenhum post aguardando programação'}</p>
            </Card>
            <Card className="p-4">
              <p className="text-xs font-bold uppercase tracking-wide text-slate-300">Designer</p>
              <p className="mt-2 text-3xl font-bold text-white">{totais.editado}</p>
              <p className="text-sm text-slate-200">editados para enviar à aprovação</p>
              <p className="mt-3 text-xs leading-relaxed text-slate-300">{detalhePorCliente(linhas, 'editado') || 'Nenhum post aguardando envio'}</p>
            </Card>
            <Card className="border-amber-400/40 bg-amber-400/10 p-4">
              <p className="text-xs font-bold uppercase tracking-wide text-amber-200">Cliente</p>
              <p className="mt-2 text-3xl font-bold text-white">{totais.enviado}</p>
              <p className="text-sm text-amber-100">aguardando aprovação em {linhas.filter((l) => l.n.enviado > 0).length} clientes</p>
            </Card>
            <Card className="border-emerald-500/40 bg-emerald-500/10 p-4">
              <p className="text-xs font-bold uppercase tracking-wide text-emerald-200">Concluído</p>
              <p className="mt-2 text-3xl font-bold text-white">{totais.publicado + totais.programado}</p>
              <p className="text-sm text-emerald-100">{totais.publicado} publicados · {totais.programado} programados</p>
            </Card>
          </div>

          <div className="flex flex-wrap gap-x-5 gap-y-2 text-xs text-slate-300" aria-label="Legenda das etapas">
            {ETAPAS_VISUAIS.map((e) => (
              <span key={e.id} className="inline-flex items-center gap-2">
                <span className={`h-2.5 w-2.5 rounded-sm ${e.cor}`} aria-hidden="true" />{e.label}
              </span>
            ))}
          </div>

          {GRUPOS.map((grupo) => {
            const doGrupo = linhas.filter((l) => l.grupo === grupo.id);
            return (
              <section key={grupo.id} aria-labelledby={`grupo-${grupo.id}`} className="space-y-2">
                <h3 id={`grupo-${grupo.id}`} className="text-sm font-semibold text-white">
                  {grupo.titulo} <span className="ml-1 text-xs font-normal text-slate-400">{doGrupo.length} {doGrupo.length === 1 ? 'cliente' : 'clientes'}</span>
                </h3>
                {doGrupo.length === 0 ? (
                  <Card className="p-4 text-sm text-slate-400">Nenhum cliente neste grupo.</Card>
                ) : doGrupo.map(({ c, meus, n, visual, meta }) => {
                  const detalhes = [
                    { label: 'Em produção', texto: nomes(meus, ['em_edicao', 'editado']) },
                    { label: 'Aguardando aprovação', texto: nomes(meus, ['enviado']) },
                    { label: 'Reprovados', texto: nomes(meus, ['reprovado']) },
                    { label: 'Aprovados', texto: nomes(meus, ['aprovado']) },
                    { label: 'Programados', texto: nomes(meus, ['programado']) },
                    { label: 'Publicados', texto: nomes(meus, ['publicado']) },
                  ].filter((d) => d.texto);
                  return (
                    <button
                      type="button"
                      key={c.id}
                      onClick={() => onAbrir(c.id)}
                      className={`w-full rounded-xl border bg-white/[0.03] p-4 text-left transition-colors hover:bg-white/[0.07] focus-visible:outline focus-visible:outline-2 focus-visible:outline-sky-400 ${n.reprovado ? 'border-red-500/60' : 'border-white/10'}`}
                    >
                      <div className="grid min-w-0 gap-4 lg:grid-cols-[minmax(12rem,1fr)_minmax(0,2fr)_minmax(12rem,1fr)] lg:items-start">
                        <div className="flex min-w-0 items-center gap-3">
                          {c.logo_url
                            ? <LogoCliente src={c.logo_url} alt="" className="h-9 w-9 shrink-0 rounded-full object-cover" />
                            : <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-white/5"><GlassIcon name="building" /></span>}
                          <div className="min-w-0">
                            <p className="truncate text-sm font-semibold text-white">{c.nome}</p>
                            <p className="text-xs text-slate-300">{meta > 0 ? `${meus.length} de ${meta} posts` : `${meus.length} posts`}</p>
                          </div>
                        </div>
                        <div className="min-w-0">
                          <BarraEtapas valores={visual} total={meus.length} rotulo={`Posts de ${c.nome}`} />
                          <div className="mt-2 space-y-1 break-words text-xs leading-relaxed text-slate-300">
                            {detalhes.map((d) => <p key={d.label} className={d.label === 'Reprovados' ? 'text-red-300' : ''}><span className="font-medium">{d.label}:</span> {d.texto}</p>)}
                            {meus.length === 0 && <p>Nenhum post cadastrado nesta semana.</p>}
                          </div>
                        </div>
                        <div className="flex flex-wrap gap-1.5 lg:justify-end">
                          {n.aprovado > 0 && <span className="rounded-full bg-sky-800 px-2.5 py-1 text-xs font-medium text-white">Você: programar {n.aprovado} posts</span>}
                          {n.editado > 0 && <span className="rounded-full bg-slate-600 px-2.5 py-1 text-xs font-medium text-white">Designer: enviar {n.editado} para aprovação</span>}
                          {n.reprovado > 0 && <span className="rounded-full border border-red-400/70 bg-red-500/15 px-2.5 py-1 text-xs font-medium text-red-100">Designer: refazer {n.reprovado}</span>}
                          {n.enviado > 0 && <span className="rounded-full border border-amber-400/70 bg-amber-400/10 px-2.5 py-1 text-xs font-medium text-amber-100">Cliente: aprovar {n.enviado} posts</span>}
                          {n.em_edicao > 0 && <span className="rounded-full bg-slate-700 px-2.5 py-1 text-xs font-medium text-slate-100">Designer: editar {n.em_edicao}</span>}
                          {meta > meus.length && <span className="rounded-full border border-slate-500 px-2.5 py-1 text-xs font-medium text-slate-200">{meta - meus.length} sem planejar</span>}
                          {meus.length > 0 && n.programado + n.publicado === meus.length && (
                            <span className="rounded-full bg-emerald-600 px-2.5 py-1 text-xs font-medium text-white">{n.publicado === meus.length ? 'Tudo publicado' : 'Tudo programado ou publicado'}</span>
                          )}
                        </div>
                      </div>
                    </button>
                  );
                })}
              </section>
            );
          })}
        </>
      )}
    </div>
  );
}
