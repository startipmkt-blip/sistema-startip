export const MESES_PT = [
  'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
  'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro',
];

export function isoHoje(): string {
  return new Date().toISOString().slice(0, 10);
}

export function fmtDia(iso: string): { dia: string; mesAbrev: string; diaSemana: string } {
  const [y, m, d] = iso.split('-').map(Number);
  const dt = new Date(y, m - 1, d);
  const diaSemana = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'][dt.getDay()];
  const mesAbrev = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez'][m - 1];
  return { dia: String(d).padStart(2, '0'), mesAbrev, diaSemana };
}

// Retorna [{ ano, mes }] dos últimos N meses, mais recente primeiro.
export function ultimosMeses(n: number): Array<{ ano: number; mes: number; label: string }> {
  const hoje = new Date();
  const arr: Array<{ ano: number; mes: number; label: string }> = [];
  for (let i = 0; i < n; i++) {
    const d = new Date(hoje.getFullYear(), hoje.getMonth() - i, 1);
    arr.push({
      ano: d.getFullYear(),
      mes: d.getMonth() + 1,
      label: `${MESES_PT[d.getMonth()]} ${d.getFullYear()}`,
    });
  }
  return arr;
}
