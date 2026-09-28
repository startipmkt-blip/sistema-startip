export type SaudeStatus = 'saudavel' | 'atencao' | 'urgente';

export interface SaudeCliente {
  cliente_id: string;
  status: SaudeStatus;
  motivo: string;
  ordem: number | null;
}

export interface DemandaUrgente {
  id: string;
  titulo: string;
  cliente_id: string | null;
  responsavel: string;
  prazo: string | null;
  concluida: boolean;
  concluida_em: string | null;
  created_at: string;
}

export interface PainelTvDados {
  gerado_em: string;
  clientes: Array<{
    id: string;
    nome: string;
    logo_url: string | null;
    status: SaudeStatus;
    motivo: string;
    ordem: number | null;
  }>;
  demandas: Array<{
    id: string;
    titulo: string;
    cliente: string | null;
    responsavel: string;
    prazo: string | null;
    created_at: string;
  }>;
}

export const STATUS_INFO: Record<SaudeStatus, { label: string; emoji: string }> = {
  saudavel: { label: 'Saudável', emoji: '🟢' },
  atencao: { label: 'Atenção', emoji: '🟡' },
  urgente: { label: 'Urgente', emoji: '🔴' },
};
