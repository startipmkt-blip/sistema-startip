export type Prioridade = 'muito_alta' | 'alta' | 'media' | 'baixa' | 'operacional';
export type RegraRecorrencia = 'fixa' | 'semana_do_mes' | 'pascoa' | 'relativa' | 'unica';
export type StatusOcorrencia = 'passada' | 'hoje' | 'em_planejamento' | 'proxima';

/** Data ISO sem horário: 'YYYY-MM-DD'. */
export type IsoDate = string;

export interface Marco {
  dias: number;
  titulo: string;
}

export interface DataBase {
  id: string;
  chave?: string | null;
  nome: string;
  categoria: string;
  prioridade: Prioridade;
  opcional: boolean;
  regra: RegraRecorrencia;
  mes: number | null;
  dia: number | null;
  dia_semana: number | null;
  ordem_semana: number | null;
  dias_offset: number | null;
  relativa_a: string | null;
  data_unica: IsoDate | null;
  angulos: string[];
  observacao: string;
  marcos: Marco[];
}

export interface DataCliente {
  id: string;
  cliente_id?: string;
  data_id: string;
  prioridade: Prioridade | null;
  relevancia: string;
  angulos: string[] | null;
  visivel_cliente?: boolean;
}

export interface CalendarioConfig {
  cliente_id: string;
  slug: string;
  inicio: IsoDate;
}

export interface Ocorrencia {
  key: string;
  item: DataCliente;
  base: DataBase;
  data: IsoDate;
  prioridade: Prioridade;
  angulos: string[];
  marcos: Array<{ data: IsoDate; titulo: string }>;
  status: StatusOcorrencia;
}

export interface CalendarioPublico {
  cliente: { nome: string; logo_url: string | null };
  inicio: IsoDate;
  itens: DataCliente[];
  base: DataBase[];
}

export const PRIORIDADE_LABEL: Record<Prioridade, string> = {
  muito_alta: 'Muito alta',
  alta: 'Alta',
  media: 'Média',
  baixa: 'Baixa',
  operacional: 'Operacional',
};

export const PRIORIDADE_TONE: Record<Prioridade, 'red' | 'amber' | 'blue' | 'slate'> = {
  muito_alta: 'red',
  alta: 'amber',
  media: 'blue',
  baixa: 'slate',
  operacional: 'slate',
};

export const PRIORIDADE_ORDEM: Record<Prioridade, number> = {
  muito_alta: 0, alta: 1, media: 2, baixa: 3, operacional: 4,
};

export const STATUS_LABEL: Record<StatusOcorrencia, string> = {
  passada: 'Passada',
  hoje: 'Hoje',
  em_planejamento: 'Em planejamento',
  proxima: 'Próxima',
};

export const STATUS_TONE: Record<StatusOcorrencia, 'slate' | 'green' | 'amber' | 'blue'> = {
  passada: 'slate',
  hoje: 'green',
  em_planejamento: 'amber',
  proxima: 'blue',
};

export const REGRA_LABEL: Record<RegraRecorrencia, string> = {
  fixa: 'Todo ano no mesmo dia',
  semana_do_mes: 'Dia da semana do mês (ex.: 2º domingo)',
  pascoa: 'Relativa à Páscoa',
  relativa: 'Relativa a outra data',
  unica: 'Data única (não se repete)',
};

export const DIAS_SEMANA = ['domingo', 'segunda-feira', 'terça-feira', 'quarta-feira', 'quinta-feira', 'sexta-feira', 'sábado'];

export const MESES = [
  'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
  'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro',
];
