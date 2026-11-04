import { criarCrud, type Registro } from '@/shared/lib/crudTabela';
import type { CriativoAnexo } from '@/modules/ideias/criativos/types';
import type { CenaIdeia } from '@/modules/gestao-conteudo/types';
import type { ConteudoTipo } from '@/modules/conteudo/types';

export type TipoRoteiro = 'organico' | 'trafego';
export type StatusRoteiro = 'pendente' | 'concluido';

export interface Roteiro extends Registro {
  cliente_id: string;
  mes_referencia: string;
  tipo: TipoRoteiro;
  titulo: string;
  pilar_id: string | null;
  semana: number;
  formato: ConteudoTipo;
  plataformas: string[];
  funil: string | null;
  gatilhos: string[];
  descricao: string;
  como_aplicar: string;
  observacao: string;
  link_inspiracao: string | null;
  anexos: CriativoAnexo[];
  cenas: CenaIdeia[];
  legenda: string;
  data_publicacao: string | null;
  status: StatusRoteiro;
}

export const TIPOS_ROTEIRO: { id: TipoRoteiro; label: string; icone: string }[] = [
  { id: 'organico', label: 'Orgânico', icone: 'smartphone' },
  { id: 'trafego', label: 'Tráfego pago', icone: 'target' },
];

export const roteiros = criarCrud<Roteiro>({
  tabela: 'roteiros',
  chave: ['gestao-conteudo', 'roteiros'],
  ordem: [{ coluna: 'semana', asc: true }, { coluna: 'created_at', asc: true }],
});
