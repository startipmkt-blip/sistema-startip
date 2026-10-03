export interface Ideia {
  id: string;
  titulo: string;
  descricao: string;
  categoria: IdeiaCategoria;
  autor_id: string | null;
  autor_nome: string;
  fixada: boolean;
  created_at: string;
  updated_at: string;
}

export type IdeiaCategoria = 'geral' | 'conteudo' | 'produto' | 'processo' | 'marketing' | 'cliente';

export const CATEGORIAS: { id: IdeiaCategoria; label: string; cor: string }[] = [
  { id: 'geral', label: 'Geral', cor: 'bg-slate-500/20 text-slate-300' },
  { id: 'conteudo', label: 'Conteúdo', cor: 'bg-purple-500/20 text-purple-300' },
  { id: 'produto', label: 'Produto', cor: 'bg-blue-500/20 text-blue-300' },
  { id: 'processo', label: 'Processo', cor: 'bg-amber-500/20 text-amber-300' },
  { id: 'marketing', label: 'Marketing', cor: 'bg-emerald-500/20 text-emerald-300' },
  { id: 'cliente', label: 'Cliente', cor: 'bg-cyan-500/20 text-cyan-300' },
];
