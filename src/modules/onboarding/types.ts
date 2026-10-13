// =============================================================
// Onboarding = modelos de passo a passo + andamento por cliente.
//  - Modelo (template): roteiro nomeado com etapas ordenadas; cada etapa
//    tem tempo estimado e os passos que a compõem.
//  - Andamento: cópia do modelo aplicada a um cliente (um por cliente),
//    com marcação de concluído e um link público (/onb/:token).
// =============================================================

export interface EtapaModelo {
  titulo: string;
  tempo: string; // ex.: "1 dia", "~30 min"; '' = sem prazo definido
  itens: string[];
}

export interface OnboardingTemplate {
  id: string;
  nome: string;
  etapas: EtapaModelo[];
  created_at: string;
}

export interface EtapaAndamento {
  id: string;
  etapa: string;
  tempo: string;
  itens: string[];
  itens_feitos: number[];
  concluida: boolean;
  concluida_em: string | null;
}

export interface OnboardingAndamento {
  id: string;
  cliente_id: string;
  cliente_nome: string;
  template_nome: string;
  token: string;
  etapas: EtapaAndamento[];
  created_at: string;
}

// O que a página pública do cliente recebe (sem ids internos).
export interface OnboardingPublico {
  cliente_nome: string;
  template_nome: string;
  iniciado_em: string;
  concluido_em: string | null;
  etapas: Omit<EtapaAndamento, 'id'>[];
}
