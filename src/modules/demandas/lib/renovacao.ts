export type Renovacao = 'nenhuma' | 'semanal' | 'mensal';

export const RENOVACAO_OPTIONS: { value: Renovacao; label: string }[] = [
  { value: 'nenhuma', label: 'Não renova' },
  { value: 'semanal', label: 'Renova toda semana' },
  { value: 'mensal', label: 'Renova todo mês' },
];

function dataStr(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

// 'YYYY-MM-DD' + 1 semana ou 1 mês (dia 31 em mês curto cai no último dia).
export function proximaData(base: string, renovacao: Exclude<Renovacao, 'nenhuma'>): string {
  const [a, m, d] = base.split('-').map(Number);
  if (renovacao === 'semanal') return dataStr(new Date(a, m - 1, d + 7));
  const ultimo = new Date(a, m + 1, 0).getDate();
  return dataStr(new Date(a, m, Math.min(d, ultimo)));
}

export function hojeStr(): string {
  return dataStr(new Date());
}

export function segundaDaSemana(ref = new Date()): string {
  const atras = (ref.getDay() + 6) % 7;
  return dataStr(new Date(ref.getFullYear(), ref.getMonth(), ref.getDate() - atras));
}
