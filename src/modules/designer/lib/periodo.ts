// Navegação mês → semana do Designer. Semanas vão de domingo a sábado
// (ex.: 11/10 a 17/10) e são recortadas nas bordas do mês, para que uma
// demanda nunca apareça em dois meses.

export interface Periodo {
  ini: string; // YYYY-MM-DD, inclusivo
  fim: string; // YYYY-MM-DD, inclusivo
}

export interface SemanaMes extends Periodo {
  numero: number;
  label: string; // "11/10 a 17/10"
}

const iso = (d: Date) => d.toLocaleDateString('sv-SE');
const dm = (d: Date) => d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });

export function chaveMes(d: Date): string {
  return iso(d).slice(0, 7);
}

export function periodoDoMes(chave: string): Periodo {
  const [a, m] = chave.split('-').map(Number);
  return { ini: iso(new Date(a, m - 1, 1)), fim: iso(new Date(a, m, 0)) };
}

export function labelMes(chave: string): string {
  const [a, m] = chave.split('-').map(Number);
  const nome = new Date(a, m - 1, 1).toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });
  return nome.charAt(0).toUpperCase() + nome.slice(1);
}

export function mesAnteriorProximo(chave: string, delta: number): string {
  const [a, m] = chave.split('-').map(Number);
  return chaveMes(new Date(a, m - 1 + delta, 1));
}

export function semanasDoMes(chave: string): SemanaMes[] {
  const [a, m] = chave.split('-').map(Number);
  const ultimo = new Date(a, m, 0);
  const semanas: SemanaMes[] = [];
  let ini = new Date(a, m - 1, 1);
  while (ini <= ultimo) {
    const fimSemana = new Date(ini);
    fimSemana.setDate(ini.getDate() + (6 - ini.getDay())); // até o sábado
    const fim = fimSemana > ultimo ? ultimo : fimSemana;
    semanas.push({ numero: semanas.length + 1, ini: iso(ini), fim: iso(fim), label: `${dm(ini)} a ${dm(fim)}` });
    ini = new Date(fim);
    ini.setDate(fim.getDate() + 1);
  }
  return semanas;
}

// Semana do mês que contém a data (ou a primeira, se nenhuma).
export function semanaDe(chave: string, dia: string): SemanaMes {
  const semanas = semanasDoMes(chave);
  return semanas.find((s) => dia >= s.ini && dia <= s.fim) ?? semanas[0];
}

// Data de referência da demanda: quando foi feita; senão o prazo; senão a criação.
export function dataRef(d: { concluido_em: string | null; prazo: string | null; created_at: string }): string {
  if (d.concluido_em) return iso(new Date(d.concluido_em));
  if (d.prazo) return d.prazo.slice(0, 10);
  return iso(new Date(d.created_at));
}
