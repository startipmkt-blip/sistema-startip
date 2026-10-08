import type { IdeiaAutor, IdeiaImportancia } from '@/modules/ideias/types';

export type CriativoFormato = 'imagem' | 'carrossel' | 'video' | 'ugc' | 'depoimento' | 'outro';
export type CriativoObjetivo = 'leads' | 'vendas' | 'reconhecimento' | 'remarketing' | 'datas' | 'outro';
export type CriativoStatus = 'nova' | 'aprovada' | 'em_producao' | 'publicada' | 'descartada';

export interface CriativoAnexo {
  path: string;
  name: string;
  type: string;
  size: number;
}

export interface Criativo {
  id: string;
  titulo: string;
  descricao: string;
  formato: CriativoFormato | null;
  objetivo: CriativoObjetivo | null;
  link_referencia: string | null;
  autor: IdeiaAutor;
  data_ideia: string;
  importancia: IdeiaImportancia;
  status: CriativoStatus;
  geral: boolean;
  anexos: CriativoAnexo[];
  cliente_ids: string[];
  created_at: string;
  updated_at: string;
}

export type CriativoDados = Omit<Criativo, 'id' | 'created_at' | 'updated_at'>;

export const FORMATO_LABEL: Record<CriativoFormato, string> = {
  imagem: 'Imagem estática',
  carrossel: 'Carrossel',
  video: 'Vídeo / Reels',
  ugc: 'UGC',
  depoimento: 'Depoimento',
  outro: 'Outro',
};

export const OBJETIVO_LABEL: Record<CriativoObjetivo, string> = {
  leads: 'Geração de leads',
  vendas: 'Vendas',
  reconhecimento: 'Reconhecimento',
  remarketing: 'Remarketing',
  datas: 'Datas comemorativas',
  outro: 'Outro',
};

export const STATUS_LABEL: Record<CriativoStatus, string> = {
  nova: 'Nova',
  aprovada: 'Aprovada para produção',
  em_producao: 'Em produção',
  publicada: 'Publicada',
  descartada: 'Descartada',
};

export const STATUS_TONE: Record<CriativoStatus, 'blue' | 'green' | 'amber' | 'slate'> = {
  nova: 'blue',
  aprovada: 'green',
  em_producao: 'amber',
  publicada: 'green',
  descartada: 'slate',
};

export const ACCEPT_ANEXOS =
  'image/png,image/jpeg,image/webp,image/gif,.png,.jpg,.jpeg,.webp,.gif,.pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt';

export const EXTENSOES_OK = [
  'png', 'jpg', 'jpeg', 'webp', 'gif', 'pdf', 'doc', 'docx', 'xls', 'xlsx', 'ppt', 'pptx', 'txt',
];

export const MAX_ANEXO_MB = 20;

export function hojeISO(): string {
  const d = new Date();
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${d.getFullYear()}-${mm}-${dd}`;
}

export function formatarData(iso: string): string {
  if (!iso) return '—';
  const [y, m, d] = iso.split('-');
  return `${d}/${m}/${y}`;
}

export function formatarTamanho(bytes: number): string {
  if (!bytes) return '';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

export function ehImagem(a: Pick<CriativoAnexo, 'type' | 'name'>): boolean {
  return a.type.startsWith('image/') || /\.(png|jpe?g|webp|gif)$/i.test(a.name);
}

export function iconeAnexo(a: Pick<CriativoAnexo, 'type' | 'name'>): string {
  if (ehImagem(a)) return '🖼️';
  const n = a.name.toLowerCase();
  if (n.endsWith('.pdf')) return '📕';
  if (/\.docx?$/.test(n)) return '📝';
  if (/\.xlsx?$/.test(n)) return '📊';
  if (/\.pptx?$/.test(n)) return '📽️';
  return '📎';
}
