import {
  DIAS_SEMANA, MESES, PRIORIDADE_ORDEM,
  type DataBase, type DataCliente, type IsoDate, type Ocorrencia, type StatusOcorrencia,
} from '@/modules/datas-comemorativas/types';

// Toda a aritmética usa UTC sobre datas ISO puras para não sofrer com
// fuso/horário de verão; "hoje" é sempre o dia civil de São Paulo.
const DIA_MS = 86_400_000;
export const JANELA_PLANEJAMENTO_DIAS = 30;

function toUtc(d: IsoDate): number {
  const [y, m, dd] = d.split('-').map(Number);
  return Date.UTC(y, m - 1, dd);
}

function fromUtc(ms: number): IsoDate {
  return new Date(ms).toISOString().slice(0, 10);
}

export function isoDate(ano: number, mes: number, dia: number): IsoDate | null {
  const ms = Date.UTC(ano, mes - 1, dia);
  const d = new Date(ms);
  if (d.getUTCFullYear() !== ano || d.getUTCMonth() !== mes - 1 || d.getUTCDate() !== dia) return null;
  return fromUtc(ms);
}

export function addDias(d: IsoDate, dias: number): IsoDate {
  return fromUtc(toUtc(d) + dias * DIA_MS);
}

export function diasEntre(de: IsoDate, ate: IsoDate): number {
  return Math.round((toUtc(ate) - toUtc(de)) / DIA_MS);
}

export function hojeSaoPaulo(): IsoDate {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/Sao_Paulo', year: 'numeric', month: '2-digit', day: '2-digit',
  }).format(new Date());
}

export function anoDe(d: IsoDate): number {
  return Number(d.slice(0, 4));
}

export function mesDe(d: IsoDate): number {
  return Number(d.slice(5, 7));
}

export function diaSemana(d: IsoDate): number {
  return new Date(toUtc(d)).getUTCDay();
}

export function formatarData(d: IsoDate, opts: Intl.DateTimeFormatOptions = { day: '2-digit', month: '2-digit', year: 'numeric' }): string {
  return new Intl.DateTimeFormat('pt-BR', { ...opts, timeZone: 'UTC' }).format(new Date(toUtc(d)));
}

// Algoritmo gregoriano anônimo (Meeus/Jones/Butcher).
export function pascoa(ano: number): IsoDate {
  const a = ano % 19;
  const b = Math.floor(ano / 100);
  const c = ano % 100;
  const d = Math.floor(b / 4);
  const e = b % 4;
  const f = Math.floor((b + 8) / 25);
  const g = Math.floor((b - f + 1) / 3);
  const h = (19 * a + b - d - g + 15) % 30;
  const i = Math.floor(c / 4);
  const k = c % 4;
  const l = (32 + 2 * e + 2 * i - h - k) % 7;
  const m = Math.floor((a + 11 * h + 22 * l) / 451);
  const mes = Math.floor((h + l - 7 * m + 114) / 31);
  const dia = ((h + l - 7 * m + 114) % 31) + 1;
  return isoDate(ano, mes, dia)!;
}

function nesimoDiaSemana(ano: number, mes: number, diaSem: number, ordem: number): IsoDate | null {
  if (ordem === -1) {
    const ultimo = fromUtc(Date.UTC(ano, mes, 0));
    const recuo = (diaSemana(ultimo) - diaSem + 7) % 7;
    return addDias(ultimo, -recuo);
  }
  const primeiro = isoDate(ano, mes, 1)!;
  const avanco = (diaSem - diaSemana(primeiro) + 7) % 7;
  const d = addDias(primeiro, avanco + (ordem - 1) * 7);
  return mesDe(d) === mes ? d : null;
}

export function ocorrenciaNoAno(
  base: DataBase,
  ano: number,
  mapaBase: Map<string, DataBase>,
  profundidade = 0,
): IsoDate | null {
  switch (base.regra) {
    case 'fixa':
      return base.mes && base.dia ? isoDate(ano, base.mes, base.dia) : null;
    case 'semana_do_mes':
      if (!base.mes || base.dia_semana == null || !base.ordem_semana) return null;
      return nesimoDiaSemana(ano, base.mes, base.dia_semana, base.ordem_semana);
    case 'pascoa':
      return addDias(pascoa(ano), base.dias_offset ?? 0);
    case 'relativa': {
      const ancora = base.relativa_a ? mapaBase.get(base.relativa_a) : undefined;
      if (!ancora || profundidade > 5) return null;
      const d = ocorrenciaNoAno(ancora, ano, mapaBase, profundidade + 1);
      return d ? addDias(d, base.dias_offset ?? 0) : null;
    }
    case 'unica':
      return base.data_unica && anoDe(base.data_unica) === ano ? base.data_unica : null;
  }
}

export function statusOcorrencia(data: IsoDate, hoje: IsoDate, marcos: IsoDate[]): StatusOcorrencia {
  if (data < hoje) return 'passada';
  if (data === hoje) return 'hoje';
  if (diasEntre(hoje, data) <= JANELA_PLANEJAMENTO_DIAS || marcos.some((m) => m <= hoje)) return 'em_planejamento';
  return 'proxima';
}

export function gerarOcorrencias(
  itens: DataCliente[],
  base: DataBase[],
  anos: number[],
  hoje: IsoDate,
): Ocorrencia[] {
  const mapa = new Map(base.map((b) => [b.id, b]));
  const out: Ocorrencia[] = [];
  for (const ano of anos) {
    for (const item of itens) {
      const b = mapa.get(item.data_id);
      if (!b) continue;
      const data = ocorrenciaNoAno(b, ano, mapa);
      if (!data) continue;
      const marcos = (b.marcos ?? [])
        .map((m) => ({ data: addDias(data, m.dias), titulo: m.titulo }))
        .sort((x, y) => x.data.localeCompare(y.data));
      out.push({
        key: `${item.id}:${ano}`,
        item,
        base: b,
        data,
        prioridade: item.prioridade ?? b.prioridade,
        angulos: item.angulos ?? b.angulos ?? [],
        marcos,
        status: statusOcorrencia(data, hoje, marcos.map((m) => m.data)),
      });
    }
  }
  return out.sort((a, b) =>
    a.data.localeCompare(b.data) || PRIORIDADE_ORDEM[a.prioridade] - PRIORIDADE_ORDEM[b.prioridade],
  );
}

/**
 * Período vigente do calendário do cliente: do início configurado (ou 1º de
 * janeiro, se o início já ficou em anos anteriores) até 31/12 do ano corrente.
 * Na virada do ano passa sozinho para o ano seguinte inteiro.
 */
export function periodoVigente(inicio: IsoDate, hoje: IsoDate): { de: IsoDate; ate: IsoDate; ano: number } {
  const ano = Math.max(anoDe(hoje), anoDe(inicio));
  const primeiroDia = `${ano}-01-01`;
  return { de: inicio > primeiroDia ? inicio : primeiroDia, ate: `${ano}-12-31`, ano };
}

export function agruparPorMes(ocorrencias: Ocorrencia[]): Array<{ chave: string; titulo: string; itens: Ocorrencia[] }> {
  const grupos = new Map<string, Ocorrencia[]>();
  for (const o of ocorrencias) {
    const chave = o.data.slice(0, 7);
    grupos.set(chave, [...(grupos.get(chave) ?? []), o]);
  }
  return [...grupos.entries()].map(([chave, itens]) => ({
    chave,
    titulo: `${MESES[mesDe(`${chave}-01`) - 1]} ${chave.slice(0, 4)}`,
    itens,
  }));
}

const ORDINAL = ['', '1º', '2º', '3º', '4º', '5º'];

export function descreverRegra(b: DataBase, mapaBase: Map<string, DataBase>): string {
  switch (b.regra) {
    case 'fixa':
      return b.mes && b.dia ? `Todo ${String(b.dia).padStart(2, '0')}/${String(b.mes).padStart(2, '0')}` : '—';
    case 'semana_do_mes': {
      if (!b.mes || b.dia_semana == null || !b.ordem_semana) return '—';
      const ord = b.ordem_semana === -1 ? 'Último(a)' : ORDINAL[b.ordem_semana];
      return `${ord} ${DIAS_SEMANA[b.dia_semana]} de ${MESES[b.mes - 1].toLowerCase()}`;
    }
    case 'pascoa': {
      const n = b.dias_offset ?? 0;
      return n === 0 ? 'Domingo de Páscoa' : `${Math.abs(n)} dia(s) ${n < 0 ? 'antes' : 'depois'} da Páscoa`;
    }
    case 'relativa': {
      const n = b.dias_offset ?? 0;
      const ancora = b.relativa_a ? mapaBase.get(b.relativa_a)?.nome ?? '?' : '?';
      return n === 0 ? `Mesmo dia de ${ancora}` : `${Math.abs(n)} dia(s) ${n < 0 ? 'antes' : 'depois'} de ${ancora}`;
    }
    case 'unica':
      return b.data_unica ? `Somente em ${formatarData(b.data_unica)}` : '—';
  }
}

export function slugify(texto: string): string {
  return texto
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}
