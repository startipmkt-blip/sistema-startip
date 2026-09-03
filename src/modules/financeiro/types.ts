// =============================================================
// Financeiro DA AGÊNCIA (não do cliente).
//  - Receitas: quanto cada cliente paga à agência e quando (MRR).
//  - Despesas: assinaturas, parcelas, impostos etc. (contas a pagar).
// =============================================================

export type ReceitaStatus = 'em_dia' | 'atrasado';

export interface ReceitaCliente {
  id: string;
  cliente_id: string;
  valor_mensal: number;
  dia_vencimento: number; // dia do mês (1-31)
  status: ReceitaStatus;
  ativo: boolean;
  created_at: string;
}

export interface ReceitaClienteView extends ReceitaCliente {
  cliente_nome: string;
}

export type DespesaCategoria = 'assinatura' | 'parcela' | 'imposto' | 'salario' | 'investimento' | 'outro';
export type DespesaStatus = 'paga' | 'pendente';

export interface Despesa {
  id: string;
  descricao: string;
  categoria: DespesaCategoria;
  valor: number;
  vencimento: string; // date
  recorrente: boolean;
  parcela_atual?: number | null;
  parcelas_total?: number | null;
  status: DespesaStatus;
  created_at: string;
}

export const DESPESA_CATEGORIA_LABEL: Record<DespesaCategoria, string> = {
  assinatura: 'Assinatura',
  parcela: 'Parcela',
  imposto: 'Imposto',
  salario: 'Salário',
  investimento: 'Investimento',
  outro: 'Outro',
};
