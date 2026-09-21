export type DemandaStatus = 'aberta' | 'iuri' | 'domini' | 'fazendo' | 'concluida';
export type DemandaPrioridade = 'baixa' | 'media' | 'alta';
export type DemandaSetor = 'socios' | 'trafego' | 'design' | 'geral';

export interface Demanda {
  id: string;
  cliente_id: string | null; // pode ser interna (sem cliente)
  setor: DemandaSetor;
  privada: boolean; // demanda privada dos sócios
  titulo: string;
  responsavel: string;
  prioridade: DemandaPrioridade;
  status: DemandaStatus;
  prazo: string; // date
  created_at: string;
}

export const DEMANDA_SETORES: { id: DemandaSetor; label: string; adminOnly?: boolean }[] = [
  { id: 'socios', label: 'Sócios', adminOnly: true },
  { id: 'trafego', label: 'Tráfego pago' },
  { id: 'design', label: 'Design' },
  { id: 'geral', label: 'Geral' },
];

export interface DemandaView extends Demanda {
  cliente_nome: string;
}

export const DEMANDA_COLUNAS: { id: DemandaStatus; label: string; socios_only?: boolean }[] = [
  { id: 'aberta', label: 'Aberta' },
  { id: 'iuri', label: 'Demandas Iuri', socios_only: true },
  { id: 'domini', label: 'Demandas Domini', socios_only: true },
  { id: 'fazendo', label: 'Em andamento' },
  { id: 'concluida', label: 'Concluída' },
];

export const PRIORIDADE_TONE: Record<DemandaPrioridade, 'red' | 'amber' | 'slate'> = {
  alta: 'red',
  media: 'amber',
  baixa: 'slate',
};

export const PRIORIDADE_LABEL: Record<DemandaPrioridade, string> = {
  alta: 'Alta',
  media: 'Média',
  baixa: 'Baixa',
};

// Responsáveis padrão para selects (agência Startip).
export const RESPONSAVEIS = [
  'Iuri',
  'Domini',
  'Gestor de tráfego',
  'Designer',
  'Videomaker',
  'Social media',
  'Copywriter',
  'CS',
  'Equipe',
] as const;

// Horários em blocos de 30min entre 07:00 e 22:00.
export const HORARIOS: string[] = (() => {
  const list: string[] = [];
  for (let h = 7; h <= 22; h++) {
    list.push(`${String(h).padStart(2, '0')}:00`);
    if (h < 22) list.push(`${String(h).padStart(2, '0')}:30`);
  }
  return list;
})();

// Retorna faixa (07:00-08:00) para o formato horário-de-início ou "livre".
export const HORARIOS_FAIXA: string[] = ['', ...HORARIOS.slice(0, -1).map((h, i) => `${h}-${HORARIOS[i + 1]}`)];
