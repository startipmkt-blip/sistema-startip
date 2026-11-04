import { criarCrud, type Registro } from '@/shared/lib/crudTabela';
import type { CriativoAnexo } from '@/modules/ideias/criativos/types';

export type FormatoInspiracao = 'video' | 'carrossel' | 'imagem' | 'stories' | 'texto' | 'outro';
export type OrigemInspiracao = 'tendencia' | 'cliente' | 'concorrente' | 'outro';

export interface Inspiracao extends Registro {
  /** null = vale para todos os clientes (referência geral da agência). */
  cliente_id: string | null;
  titulo: string;
  formato: FormatoInspiracao;
  origem: OrigemInspiracao;
  link: string | null;
  capa: CriativoAnexo | null;
  descricao: string;
  insights: string;
  tags: string[];
  arquivada: boolean;
}

export const FORMATOS_INSPIRACAO: { value: FormatoInspiracao; label: string }[] = [
  { value: 'video', label: 'Vídeo' },
  { value: 'carrossel', label: 'Carrossel' },
  { value: 'imagem', label: 'Imagem' },
  { value: 'stories', label: 'Stories' },
  { value: 'texto', label: 'Texto' },
  { value: 'outro', label: 'Outro' },
];

export const ORIGENS_INSPIRACAO: { value: OrigemInspiracao; label: string }[] = [
  { value: 'tendencia', label: 'Tendência' },
  { value: 'cliente', label: 'Cliente' },
  { value: 'concorrente', label: 'Concorrente' },
  { value: 'outro', label: 'Outro' },
];

export const rotuloFormato = (f: string) => FORMATOS_INSPIRACAO.find((x) => x.value === f)?.label ?? f;
export const rotuloOrigem = (o: string) => ORIGENS_INSPIRACAO.find((x) => x.value === o)?.label ?? o;

/** Formato da inspiração → formato da linha editorial (mesmos valores do enum de posts). */
export function formatoParaConteudo(f: FormatoInspiracao): 'reels' | 'carrossel' | 'estatico' {
  if (f === 'video' || f === 'stories') return 'reels';
  if (f === 'carrossel') return 'carrossel';
  return 'estatico';
}

export const inspiracoes = criarCrud<Inspiracao>({
  tabela: 'inspiracoes',
  chave: ['gestao-conteudo', 'inspiracoes'],
  demo: [
    {
      id: 'insp-1', cliente_id: null, titulo: 'Trend de transição criativa no Reels', formato: 'video', origem: 'tendencia',
      link: 'https://www.instagram.com/reels/', capa: null,
      descricao: 'Transição com estalo de dedo trocando o look/ambiente. Está em alta em moda e beleza.',
      insights: 'Usar para mostrar antes e depois do produto do cliente.', tags: ['reels', 'transição', 'viral'],
      arquivada: false, created_at: '2026-11-02T10:00:00Z',
    },
    {
      id: 'insp-2', cliente_id: null, titulo: 'Carrossel "5 erros que custam caro"', formato: 'carrossel', origem: 'concorrente',
      link: null, capa: null,
      descricao: 'Formato lista com capa de alerta vermelha, muito salvo e compartilhado.',
      insights: 'Adaptar para serviços: 5 erros ao contratar uma agência.', tags: ['carrossel', 'autoridade'],
      arquivada: false, created_at: '2026-10-28T10:00:00Z',
    },
  ],
});
