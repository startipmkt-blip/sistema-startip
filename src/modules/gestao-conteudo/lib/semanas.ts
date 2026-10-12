import { semanasDoMes } from '@/modules/designer/lib/periodo';

// Mesma regra do Designer (domingo a sábado, semana pertence ao mês do sábado),
// para equipe e cliente falarem da mesma "semana 1".

export interface SemanaRotulada {
  numero: number;
  ini: string; // YYYY-MM-DD
  fim: string; // YYYY-MM-DD
  /** "4 a 10 de outubro" ou "27 de setembro a 3 de outubro" */
  periodo: string;
  /** "Semana 1 · 4 a 10 de outubro" */
  label: string;
}

const MESES = [
  'janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho',
  'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro',
];

function partes(iso: string): { d: number; m: number } {
  const [, m, d] = iso.split('-').map(Number);
  return { d, m };
}

function periodoTexto(ini: string, fim: string): string {
  const a = partes(ini);
  const b = partes(fim);
  if (a.m === b.m) return `${a.d} a ${b.d} de ${MESES[b.m - 1]}`;
  return `${a.d} de ${MESES[a.m - 1]} a ${b.d} de ${MESES[b.m - 1]}`;
}

export function semanasRotuladas(mes: string): SemanaRotulada[] {
  return semanasDoMes(mes).map((s) => {
    const periodo = periodoTexto(s.ini, s.fim);
    return { numero: s.numero, ini: s.ini, fim: s.fim, periodo, label: `Semana ${s.numero} · ${periodo}` };
  });
}

export function rotuloSemana(mes: string, numero: number): string {
  return semanasRotuladas(mes).find((s) => s.numero === numero)?.label ?? `Semana ${numero}`;
}
