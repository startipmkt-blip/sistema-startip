import { criarCrud, type Registro } from '@/shared/lib/crudTabela';

export type FormatoNo = 'retangulo' | 'arredondado' | 'pilula';
export type StatusNo = '' | 'a_fazer' | 'andamento' | 'concluido' | 'bloqueado';

export interface LinkNo {
  rotulo: string;
  url: string;
}

export interface NoMapa {
  id: string;
  texto: string;
  /** null = raiz do mapa. A ordem dos filhos é a ordem no array. */
  pai: string | null;
  cor: string;
  icone: string;
  formato: FormatoNo;
  negrito: boolean;
  status: StatusNo;
  nota: string;
  data: string;
  vinculo: LinkNo | null;
  links: LinkNo[];
  recolhido: boolean;
}

export interface DadosMapa {
  nos: NoMapa[];
}

export interface MapaMental extends Registro {
  titulo: string;
  cliente_id: string | null;
  dados: DadosMapa;
}

export const STATUS_NO: { id: StatusNo; label: string; cor: string }[] = [
  { id: '', label: 'Sem status', cor: '#94a3b8' },
  { id: 'a_fazer', label: 'A fazer', cor: '#64748b' },
  { id: 'andamento', label: 'Em andamento', cor: '#f59e0b' },
  { id: 'concluido', label: 'Concluído', cor: '#10b981' },
  { id: 'bloqueado', label: 'Bloqueado', cor: '#ef4444' },
];

/** Cores de fundo dos nós. Branco usa a faixa azul à esquerda; as escuras usam texto branco. */
export const CORES_NO = ['#ffffff', '#1e9be0', '#e6f4fc', '#dcfce7', '#fef3c7', '#fee2e2', '#ede9fe', '#fce7f3', '#0e1a24'];
export const CORES_ESCURAS = new Set(['#1e9be0', '#0e1a24']);

export const ICONES_NO = [
  'lightbulb', 'target', 'rocket', 'star', 'check-circle', 'alert', 'calendar', 'users', 'user', 'card', 'bar-chart',
  'trending-up', 'megaphone', 'mail', 'phone', 'instagram', 'video', 'image', 'file-text', 'link', 'clock',
];

export function novoNo(pai: string | null, texto = 'Novo nó'): NoMapa {
  return {
    id: crypto.randomUUID(), texto, pai, cor: pai === null ? '#1e9be0' : '#ffffff', icone: '', formato: 'arredondado',
    negrito: false, status: '', nota: '', data: '', vinculo: null, links: [], recolhido: false,
  };
}

export function mapaInicial(): DadosMapa {
  const raiz = novoNo(null, 'Novo Projeto');
  raiz.negrito = true;
  const filho = novoNo(raiz.id);
  return { nos: [raiz, filho, novoNo(filho.id)] };
}

export const mapas = criarCrud<MapaMental>({
  tabela: 'mapas_mentais',
  chave: ['mapa-mental', 'mapas'],
  ordem: [{ coluna: 'updated_at', asc: false }],
});
