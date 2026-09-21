// =============================================================
// CRM DA AGÊNCIA (não por cliente). Conecta ao WhatsApp da agência
// via Z-API. Cada lead é um contato/oportunidade do funil da agência.
// =============================================================
import type { PillarKey } from '@/shared/lib/pillars';

export type CrmEtapa = 'novo' | 'contato' | 'proposta' | 'ganho' | 'perdido';

export interface CrmLead {
  id: string;
  nome: string;
  empresa: string;
  telefone: string;
  origem: string;
  etapa: string; // id da etapa (padrão ou personalizada)
  valor: number;
  etiquetas: string[];
  created_at: string;
  // ↓ campos do módulo de Atendimento (0007_atendimento.sql).
  atendente_id?: string | null;
  fixado?: boolean;
  arquivado?: boolean;
  is_grupo?: boolean;
  pilar?: PillarKey | null;
}

export interface EtapaCrm {
  id: string;
  label: string;
}

// Etapas padrão do funil (semente). O usuário pode criar/remover etapas.
export const CRM_ETAPAS: EtapaCrm[] = [
  { id: 'novo', label: 'Novo' },
  { id: 'contato', label: 'Em contato' },
  { id: 'proposta', label: 'Proposta' },
  { id: 'ganho', label: 'Ganho' },
  { id: 'perdido', label: 'Perdido' },
];

// Etiquetas (tags) do lead.
export type EtiquetaTone = 'green' | 'amber' | 'blue' | 'red' | 'slate';
export interface Etiqueta {
  id: string;
  label: string;
  tone: EtiquetaTone;
}

export const CRM_ETIQUETAS: Etiqueta[] = [
  { id: 'qualificada', label: 'Lead qualificada', tone: 'blue' },
  { id: 'reuniao', label: 'Reunião marcada', tone: 'amber' },
  { id: 'negociacao', label: 'Negociação', tone: 'red' },
  { id: 'venda', label: 'Venda', tone: 'green' },
];

export function etiquetaInfo(id: string): Etiqueta {
  return CRM_ETIQUETAS.find((e) => e.id === id) ?? { id, label: id, tone: 'slate' };
}

// Mensagem de conversa (WhatsApp via Z-API).
export type TipoMensagem =
  | 'texto' | 'imagem' | 'audio' | 'documento' | 'video' | 'sticker' | 'sistema';

export interface CrmMensagem {
  id: string;
  lead_id: string;
  direcao: 'recebida' | 'enviada';
  texto: string;
  hora: string; // ISO
  lida?: boolean;
  nome_remetente?: string | null; // relevante em grupos
  tipo?: TipoMensagem;
  midia_path?: string | null;
  midia_mime?: string | null;
  midia_nome?: string | null;
  midia_duracao?: number | null;
  wa_message_id?: string | null;
  respondendo_id?: string | null;
  reacoes?: Record<string, string[]>; // emoji → array de participantPhone
  editada_em?: string | null;
  apagada_em?: string | null;
  apagada_para_todos?: boolean;
  favorita_ids?: string[]; // ids de atendentes que favoritaram
  status?: 'enviada' | 'entregue' | 'lida' | 'falhou' | 'apagada' | null;
  link_preview?: {
    url: string;
    title: string | null;
    description: string | null;
    image: string | null;
    site_name: string | null;
  } | null;
}

// Uma linha da inbox: lead + últimos metadados de conversa.
// Reflete a view public.crm_conversas.
export interface CrmConversa {
  id: string;
  nome: string;
  empresa: string | null;
  telefone: string;
  origem: string | null;
  etapa: string;
  etiquetas: string[];
  valor: number;
  atendente_id: string | null;
  atendente_nome: string | null;
  fixado: boolean;
  arquivado: boolean;
  is_grupo: boolean;
  foto_url?: string | null;
  created_at: string;
  ultima_mensagem: string | null;
  ultima_direcao: 'recebida' | 'enviada' | null;
  ultima_em: string | null;
  ultima_saida_em: string | null; // última mensagem enviada por nós
  nao_lidas: number;
  pilar?: PillarKey | null;
  monitorado?: boolean;
  timeout_minutos?: number;
}

// Filtro principal da lateral esquerda da inbox.
export type FiltroInbox =
  | 'todas'
  | 'nao_lidas'
  | 'grupos'
  | 'sem_resposta' // sem resposta há 3+ dias (só etapas ativas)
  | 'fixadas'
  | 'arquivadas';

// Etapas consideradas "ativas" para o filtro Sem-resposta.
export const ETAPAS_ATIVAS = ['novo', 'contato', 'proposta'] as const;
