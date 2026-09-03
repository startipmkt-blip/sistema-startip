// Utilitários de formatação (pt-BR) usados pelos painéis.

export function formatMoney(valor: number): string {
  return valor.toLocaleString('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  });
}

// Constrói uma Date no fuso LOCAL a partir de 'YYYY-MM-DD' (evita o
// deslocamento de 1 dia que acontece quando o JS interpreta como UTC).
function dataLocal(iso: string): Date {
  const [y, m, d] = iso.split('T')[0].split('-').map(Number);
  return new Date(y, (m ?? 1) - 1, d ?? 1);
}

export function formatDate(iso: string): string {
  // Timestamps completos (com hora) usam o parse normal; datas puras, o local.
  const d = iso.includes('T') ? new Date(iso) : dataLocal(iso);
  return d.toLocaleDateString('pt-BR');
}

export function formatMonth(iso: string): string {
  // Aceita 'YYYY-MM' ou 'YYYY-MM-DD'. Retorna ex.: "janeiro de 2026".
  return dataLocal(iso).toLocaleDateString('pt-BR', {
    month: 'long',
    year: 'numeric',
  });
}
