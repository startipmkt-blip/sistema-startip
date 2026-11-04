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

export type PopStatus = 'ativo' | 'rascunho' | 'inativo' | 'arquivado';

export interface PopPasso {
  titulo: string;
  descricao: string;
}

export interface ProcessoDoc {
  id: string;
  /** Categoria antiga (enum). As POPs novas usam `categoria_id`. */
  categoria: ProcessoCategoria;
  titulo: string;
  /** Texto livre das versões antigas. Mostrado quando não há passos. */
  conteudo: string;
  autor: string;
  anexos?: ProcessoAnexo[];
  categoria_id?: string | null;
  capa?: CapaPop | null;
  versao?: string;
  status?: PopStatus;
  responsavel?: string;
  objetivo?: string;
  quem_executa?: string;
  quem_aprova?: string;
  quem_impactado?: string;
  quando_utilizar?: string;
  materiais?: string;
  video_url?: string | null;
  passos?: PopPasso[];
  restricoes?: string[];
  updated_at: string;
  created_at: string;
}

export interface CapaPop {
  path: string;
  name: string;
  type: string;
  size: number;
}

export interface ProcessoCategoriaItem {
  id: string;
  nome: string;
  cor: string;
  ordem: number;
  created_at: string;
  updated_at?: string;
}

export const POP_STATUS: { id: PopStatus; label: string; cor: string }[] = [
  { id: 'ativo', label: 'Ativo', cor: 'bg-emerald-500' },
  { id: 'rascunho', label: 'Rascunho', cor: 'bg-amber-500' },
  { id: 'inativo', label: 'Inativo', cor: 'bg-slate-400' },
  { id: 'arquivado', label: 'Arquivado', cor: 'bg-slate-600' },
];

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
