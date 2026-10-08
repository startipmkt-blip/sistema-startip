export type AnotacaoPrioridade = 'normal' | 'importante' | 'urgente';
export type AnotacaoStatus = 'pendente' | 'feita';

export interface AnotacaoAnexo {
  path: string;
  name: string;
  type: string;
}

export interface Anotacao {
  id: string;
  texto: string;
  cliente_id: string | null;
  autor_id: string | null;
  prazo: string | null; // 'YYYY-MM-DD'
  prioridade: AnotacaoPrioridade;
  status: AnotacaoStatus;
  demanda_id: string | null;
  anexos: AnotacaoAnexo[];
  criada_em: string;
  concluida_em: string | null;
  concluida_por: string | null;
}

export interface AnotacaoView extends Anotacao {
  cliente_nome: string | null;
  autor_nome: string | null;
}

export const PRIORIDADE_LABEL: Record<AnotacaoPrioridade, string> = {
  normal: 'Normal',
  importante: 'Importante',
  urgente: 'Urgente',
};

export const PRIORIDADE_TONE: Record<AnotacaoPrioridade, 'slate' | 'amber' | 'red'> = {
  normal: 'slate',
  importante: 'amber',
  urgente: 'red',
};
