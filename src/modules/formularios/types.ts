export type FormularioTipo = 'icp' | 'nicho' | 'unificado' | 'padrao';
export type FormularioStatus = 'pendente' | 'preenchido' | 'arquivado';

export interface Pergunta {
  id: string;
  tipo: 'texto' | 'longo' | 'escolha' | 'multipla';
  label: string;
  obrigatoria?: boolean;
  opcoes?: string[];
  secao?: string;
  ajuda?: string;
  // só entra no formulário se o cliente tiver o serviço
  condicao?: 'trafego_pago';
}

export interface FormularioModelo {
  id: string;
  chave: string;
  titulo: string;
  descricao: string | null;
  perguntas: Pergunta[];
  ativo: boolean;
  created_at: string;
  updated_at: string;
}

export interface Formulario {
  id: string;
  cliente_id: string;
  tipo: FormularioTipo;
  modelo_id: string | null;
  slug: string;
  titulo: string;
  perguntas: Pergunta[];
  respostas: Record<string, string> | null;
  status: FormularioStatus;
  criado_por: string | null;
  criado_em: string;
  preenchido_em: string | null;
  expira_em: string | null;
}

export const TIPO_LABEL: Record<FormularioTipo, string> = {
  icp: 'ICP Padrão',
  nicho: 'Adaptado ao Nicho',
  unificado: 'Unificado (ICP + Nicho)',
  padrao: 'Briefing Padrão',
};
