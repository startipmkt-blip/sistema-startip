export type ContractStatus = 'rascunho' | 'aguardando' | 'assinado' | 'expirado' | 'cancelado';
export type ContractorType = 'pj' | 'pf';

export interface ContractTemplate {
  id: string;
  nome: string;
  body_text: string;
  ativo: boolean;
  arquivo_path?: string | null;
  arquivo_nome?: string | null;
  arquivo_tipo?: string | null;
  created_at: string;
  updated_at: string;
}

export interface Contract {
  id: string;
  template_id: string | null;
  cliente_id: string | null;
  titulo: string;
  contractor_type: ContractorType;
  razao_social: string | null;
  cnpj_cpf: string | null;
  endereco: string | null;
  signer_name: string | null;
  signer_email: string | null;
  signer_phone: string | null;
  onboarding_value: number;
  monthly_value: number;
  duration_months: number;
  start_date: string;
  end_date: string | null;
  body_text: string | null;
  status: ContractStatus;
  autentique_document_id: string | null;
  autentique_url: string | null;
  created_at: string;
  updated_at: string;
}
