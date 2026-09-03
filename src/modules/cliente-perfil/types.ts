export interface ClienteIcp {
  cliente_id: string;
  publico_alvo: string;
  regiao: string;
  ticket_medio: number;
  canais: string[];
  dores: string[];
}

export interface Persona {
  id: string;
  cliente_id: string;
  nome: string;
  idade: number;
  ocupacao: string;
  descricao: string;
  objetivos: string[];
  objecoes: string[];
}

export interface ClientePerfil {
  icp: ClienteIcp | null;
  personas: Persona[];
}
