// =============================================================
// Processos = biblioteca de DOCUMENTAÇÃO da agência (SOPs).
// Documentos salvos para orientar colaboradores atuais e futuros.
// Não é vinculado a cliente — é conhecimento interno da agência.
// =============================================================

export type ProcessoCategoria =
  | 'trafego'
  | 'atendimento'
  | 'design'
  | 'financeiro'
  | 'onboarding'
  | 'geral';

export interface ProcessoAnexo {
  path: string;
  name: string;
  type: string;
}

export interface ProcessoDoc {
  id: string;
  categoria: ProcessoCategoria;
  titulo: string;
  conteudo: string; // texto (passo a passo). Pode virar rich text depois.
  autor: string;
  anexos?: ProcessoAnexo[];
  updated_at: string;
  created_at: string;
}

export const CATEGORIA_LABEL: Record<ProcessoCategoria, string> = {
  trafego: 'Tráfego',
  atendimento: 'Atendimento',
  design: 'Design',
  financeiro: 'Financeiro',
  onboarding: 'Onboarding',
  geral: 'Geral',
};

export const CATEGORIA_OPTIONS = (
  Object.keys(CATEGORIA_LABEL) as ProcessoCategoria[]
).map((c) => ({ value: c, label: CATEGORIA_LABEL[c] }));
