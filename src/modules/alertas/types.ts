export interface AlertasConfig {
  ativo: boolean;
  grupo_interno_id: string | null;
  grupo_interno_nome: string | null;
  nivel1_min: number;
  nivel2_min: number;
  nivel3_min: number;
  sla_min: number;
  horario_comercial_ativo: boolean;
  hc_inicio: string; // HH:MM:SS
  hc_fim: string;
  hc_dias: number[]; // 1=seg ... 7=dom
  max_tentativas: number;
  retencao_dias: number;
}

export interface GrupoAlerta {
  id: string;
  chat_id: string;
  nome_grupo: string | null;
  cliente_nome: string | null;
  cliente_id: string | null;
  monitorar: boolean;
  prazo_min: number | null;
  hc_ativo: boolean | null;
  hc_inicio: string | null;
  hc_fim: string | null;
  hc_dias: number[] | null;
  ultima_msg_cliente_em: string | null;
  ultima_msg_cliente_texto: string | null;
  ultima_resposta_em: string | null;
  ultima_resposta_por: string | null;
}

export interface MembroEquipe {
  id: string;
  nome: string;
  cargo: string | null;
  telefone: string;
  ativo: boolean;
}

export type StatusPendencia = 'aguardando' | 'respondida';

export interface Pendencia {
  id: string;
  chat_id: string;
  grupo_id: string | null;
  cliente_nome: string | null;
  grupo_nome: string | null;
  iniciada_em: string;
  ultima_msg_em: string | null;
  ultima_msg_texto: string | null;
  ultima_msg_tipo: string | null;
  qtd_msgs: number;
  prazo_min: number;
  status: StatusPendencia;
  respondida_em: string | null;
  respondida_por_nome: string | null;
  tempo_resposta_seg: number | null;
  dentro_prazo: boolean | null;
  alertas_enviados: number;
  ultimo_alerta_nivel: number | null;
  ultimo_alerta_em: string | null;
  minutos_decorridos: number | null;
}

export interface EnvioAlerta {
  id: string;
  pendencia_id: string;
  nivel: number;
  status: 'pendente' | 'enviando' | 'enviado' | 'falhou' | 'cancelado';
  tentativas: number;
  erro: string | null;
  enviado_em: string | null;
  created_at: string;
}

export interface EventoAlerta {
  id: string;
  tipo: string;
  texto: string | null;
  remetente_nome: string | null;
  classificacao: string;
  from_me: boolean;
  ocorrido_em: string;
}

export interface LogAlerta {
  id: string;
  em: string;
  tipo: string;
  chat_id: string | null;
  detalhe: Record<string, unknown> | null;
}

export type StatusVisual = 'dentro_prazo' | 'aguardando' | 'atrasado' | 'respondido_atraso' | 'desativado';

export const STATUS_VISUAL: Record<StatusVisual, { label: string; tone: 'green' | 'amber' | 'red' | 'slate' }> = {
  dentro_prazo: { label: 'Respondido dentro do prazo', tone: 'green' },
  aguardando: { label: 'Aguardando resposta', tone: 'amber' },
  atrasado: { label: 'Atendimento atrasado', tone: 'red' },
  respondido_atraso: { label: 'Respondido com atraso', tone: 'red' },
  desativado: { label: 'Monitoramento desativado', tone: 'slate' },
};

export const TIPO_LABEL: Record<string, string> = {
  texto: 'Texto', audio: 'Áudio', imagem: 'Imagem', video: 'Vídeo', documento: 'Documento',
};

export const DIAS_SEMANA: { n: number; label: string }[] = [
  { n: 1, label: 'Seg' }, { n: 2, label: 'Ter' }, { n: 3, label: 'Qua' }, { n: 4, label: 'Qui' },
  { n: 5, label: 'Sex' }, { n: 6, label: 'Sáb' }, { n: 7, label: 'Dom' },
];
