import type { Contract } from '@/modules/contratos/types';

// Substitui placeholders {{campo}} pelo valor do contrato. Datas em pt-BR,
// valores em R$ formatados. Placeholders desconhecidos são deixados em branco.
export function preencherTemplate(body: string, c: Partial<Contract>): string {
  const dinheiro = (n: number | null | undefined) =>
    Number(n ?? 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
  const data = (iso: string | null | undefined) =>
    iso ? new Date(iso).toLocaleDateString('pt-BR') : '';

  const map: Record<string, string> = {
    titulo:            c.titulo ?? '',
    contractor_type:   c.contractor_type === 'pj' ? 'pessoa jurídica' : 'pessoa física',
    razao_social:      c.razao_social ?? '',
    cnpj_cpf:          c.cnpj_cpf ?? '',
    endereco:          c.endereco ?? '',
    signer_name:       c.signer_name ?? '',
    signer_email:      c.signer_email ?? '',
    signer_phone:      c.signer_phone ?? '',
    onboarding_value:  dinheiro(c.onboarding_value),
    monthly_value:     dinheiro(c.monthly_value),
    duration_months:   String(c.duration_months ?? 12),
    start_date:        data(c.start_date),
    end_date:          data(c.end_date),
    data_geracao:      new Date().toLocaleDateString('pt-BR'),
  };
  return body.replace(/{{\s*([\w_]+)\s*}}/g, (_m, k) => map[k] ?? '');
}
