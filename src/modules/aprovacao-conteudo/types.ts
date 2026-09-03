// =============================================================
// Aprovação de Conteúdo — a agência cadastra ideias de conteúdo por
// cliente/mês; o cliente aprova ou reprova (com justificativa) no portal,
// e sugere ideias para o mês seguinte.
// =============================================================
import type { ConteudoTipo } from '@/modules/conteudo/types';

export type AprovacaoStatus = 'pendente' | 'aprovado' | 'reprovado';
export type ProducaoStatus = 'ideia' | 'producao' | 'aprovacao_interna' | 'publicado';

export const PRODUCAO_COLUNAS: { id: ProducaoStatus; label: string }[] = [
  { id: 'ideia',              label: 'Ideia' },
  { id: 'producao',           label: 'Produção' },
  { id: 'aprovacao_interna',  label: 'Aprovação interna' },
  { id: 'publicado',          label: 'Publicado' },
];

export interface ConteudoIdeia {
  id: string;
  cliente_id: string;
  mes_referencia: string; // 'YYYY-MM' a que a ideia se refere
  semana: number; // semana do mês em que será publicado (1-4)
  titulo: string;
  descricao: string;
  formato: ConteudoTipo;
  dia_postagem?: string | null; // 'YYYY-MM-DD' — dia programado da publicação
  visivel_cliente?: boolean;    // false = rascunho interno, ainda não vai pro portal
  producao_status?: ProducaoStatus; // etapa do Kanban de produção
  anexos?: { path: string; name: string; type: string }[];
  status: AprovacaoStatus;
  justificativa: string; // preenchida quando reprovado
  created_at: string;
}

export interface ConteudoSugestao {
  id: string;
  cliente_id: string;
  mes_referencia: string; // mês para o qual a sugestão é (mês seguinte)
  texto: string;
  created_at: string;
}

export const APROVACAO_LABEL: Record<AprovacaoStatus, string> = {
  pendente: 'Pendente',
  aprovado: 'Aprovado',
  reprovado: 'Reprovado',
};

export const APROVACAO_TONE: Record<AprovacaoStatus, 'amber' | 'green' | 'red'> = {
  pendente: 'amber',
  aprovado: 'green',
  reprovado: 'red',
};

// 'YYYY-MM' -> 'YYYY-MM' do mês seguinte.
export function proximoMes(mes: string): string {
  const [y, m] = mes.split('-').map(Number);
  const d = new Date(y, m, 1); // m (1-based) vira índice do mês seguinte
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}
