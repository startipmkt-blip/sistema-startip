export type ConteudoTipo = 'reels' | 'carrossel' | 'estatico';
export type ConteudoStatus = 'ideia' | 'producao' | 'aprovacao' | 'publicado';

export interface Conteudo {
  id: string;
  cliente_id: string;
  titulo: string;
  tipo: ConteudoTipo;
  status: ConteudoStatus;
  data_publicacao: string; // date
  created_at: string;
}

export interface ConteudoView extends Conteudo {
  cliente_nome: string;
}

export const CONTEUDO_COLUNAS: { id: ConteudoStatus; label: string }[] = [
  { id: 'ideia', label: 'Ideia' },
  { id: 'producao', label: 'Produção' },
  { id: 'aprovacao', label: 'Aprovação' },
  { id: 'publicado', label: 'Publicado' },
];

export const TIPO_LABEL: Record<ConteudoTipo, string> = {
  reels: 'Reels',
  carrossel: 'Carrossel',
  estatico: 'Estático',
};
