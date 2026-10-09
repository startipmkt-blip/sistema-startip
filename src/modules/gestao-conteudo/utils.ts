import type { Cliente } from '@/modules/clientes/types';
import { ETAPAS, formatarDuracao, type Etapa, type Post } from '@/modules/gestao-conteudo/types';

/** Campos de cliente ainda fora do tipo gerado. */
export type ClienteGestao = Cliente & { posts_por_mes?: number };

export const COR_ETAPA: Record<Etapa, string> = {
  em_edicao: 'bg-slate-500', editado: 'bg-sky-500', enviado: 'bg-amber-500',
  reprovado: 'bg-red-500', aprovado: 'bg-emerald-500', programado: 'bg-indigo-500',
  publicado: 'bg-emerald-300',
};

const DIA_MS = 24 * 60 * 60 * 1000;

export function contar(posts: Post[]): Record<Etapa, number> {
  const base = Object.fromEntries(ETAPAS.map((e) => [e.id, 0])) as Record<Etapa, number>;
  for (const p of posts) base[p.etapa] += 1;
  return base;
}

/** Tempo médio entre enviar e o cliente decidir (ms), ou null se não houver dados. */
export function tempoMedioResposta(posts: Post[]): number | null {
  const tempos = posts
    .filter((p) => p.enviado_em && p.decidido_em)
    .map((p) => new Date(p.decidido_em as string).getTime() - new Date(p.enviado_em as string).getTime())
    .filter((t) => t > 0);
  if (tempos.length === 0) return null;
  return tempos.reduce((a, b) => a + b, 0) / tempos.length;
}

export function textoTempoMedio(posts: Post[]): string | null {
  const t = tempoMedioResposta(posts);
  return t === null ? null : formatarDuracao(t);
}

export interface Alerta {
  texto: string;
  gravidade: 'alta' | 'media';
}

export function alertasDoCliente(c: ClienteGestao, posts: Post[], mesAtual: boolean): Alerta[] {
  const out: Alerta[] = [];
  const porMes = c.posts_por_mes ?? 0;
  const porSemana = c.conteudos_por_semana ?? 0;

  const reprovados = posts.filter((p) => p.etapa === 'reprovado').length;
  if (reprovados) out.push({ texto: `${reprovados} reprovado(s) aguardando ajuste`, gravidade: 'alta' });

  const parados = posts.filter(
    (p) => p.etapa === 'enviado' && p.enviado_em && Date.now() - new Date(p.enviado_em).getTime() > 2 * DIA_MS,
  ).length;
  if (parados) out.push({ texto: `${parados} aguardando o cliente há +2 dias`, gravidade: 'alta' });

  if (porMes > 0 && posts.length < porMes) {
    out.push({ texto: `Faltam ${porMes - posts.length} post(s) para a meta do mês`, gravidade: 'media' });
  }
  if (mesAtual && porSemana > 0) {
    const semanaHoje = Math.min(4, Math.ceil(new Date().getDate() / 7));
    const daSemana = posts.filter((p) => p.semana === semanaHoje).length;
    if (daSemana < porSemana) {
      out.push({ texto: `Semana ${semanaHoje}: ${daSemana}/${porSemana} posts`, gravidade: 'media' });
    }
  }
  return out;
}

/** Posts que ainda não estão prontos para sair (usado na agenda da semana). */
export const ETAPAS_PRONTAS: Etapa[] = ['aprovado', 'programado', 'publicado'];
