// =============================================================
// Onboarding = templates de passo a passo + andamento por cliente.
//  - Template: um roteiro nomeado com etapas ordenadas.
//  - Andamento: aplicação de um template a um cliente (etapas com
//    marcação de concluído). "Aplico o template ao cliente que entrou."
// =============================================================

export interface OnboardingTemplate {
  id: string;
  nome: string;
  etapas: string[]; // etapas ordenadas
  created_at: string;
}

export interface EtapaAndamento {
  etapa: string;
  concluida: boolean;
}

export interface OnboardingAndamento {
  id: string;
  cliente_id: string;
  cliente_nome: string;
  template_nome: string;
  etapas: EtapaAndamento[];
  created_at: string;
}
