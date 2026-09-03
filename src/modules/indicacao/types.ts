export type IndicacaoStatus = 'novo' | 'em_contato' | 'convertido' | 'perdido';

export interface Indicacao {
  id: string;
  cliente_id: string; // quem indicou
  nome_indicado: string;
  contato: string;
  status: IndicacaoStatus;
  recompensa: number;
  created_at: string;
}

export interface IndicacaoView extends Indicacao {
  cliente_nome: string;
}

export const INDICACAO_STATUS_LABEL: Record<IndicacaoStatus, string> = {
  novo: 'Novo',
  em_contato: 'Em contato',
  convertido: 'Convertido',
  perdido: 'Perdido',
};
