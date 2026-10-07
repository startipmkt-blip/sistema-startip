export type IdeiaT = 'agencia' | 'cliente' | 'projeto';
export type IdeiaImportancia = 'simples' | 'importante' | 'muito_importante';
export type IdeiaAutor = 'iuri' | 'dhomini';

export interface Ideia {
  id: string;
  titulo: string;
  descricao: string;
  tipo: IdeiaT;
  cliente_nome: string | null;
  projeto_nome: string | null;
  autor: IdeiaAutor;
  importancia: IdeiaImportancia;
  data_ideia: string;
  created_at: string;
  updated_at: string;
}

export const TIPO_LABEL: Record<IdeiaT, string> = {
  agencia: 'Agência',
  cliente: 'Cliente',
  projeto: 'Projeto',
};

export const IMPORTANCIA_LABEL: Record<IdeiaImportancia, string> = {
  simples: 'Simples',
  importante: 'Importante',
  muito_importante: 'Muito importante',
};

export const IMPORTANCIA_TONE: Record<IdeiaImportancia, 'slate' | 'amber' | 'red'> = {
  simples: 'slate',
  importante: 'amber',
  muito_importante: 'red',
};

export const TIPO_TONE: Record<IdeiaT, 'blue' | 'green' | 'amber'> = {
  agencia: 'blue',
  cliente: 'green',
  projeto: 'amber',
};

export const AUTOR_LABEL: Record<IdeiaAutor, string> = {
  iuri: 'Iuri',
  dhomini: 'Dhomini',
};
