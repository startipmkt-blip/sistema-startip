import { criarCrud, type Registro } from '@/shared/lib/crudTabela';

/** Pilar editorial (Autoridade, Educação...). Lista única da agência; `cliente_id` fica para o futuro. */
export interface PilarEditorial extends Registro {
  cliente_id: string | null;
  nome: string;
  cor: string;
  ordem: number;
}

const agora = '2026-11-01T10:00:00Z';

export const pilaresEditoriais = criarCrud<PilarEditorial>({
  tabela: 'pilares_editoriais',
  chave: ['gestao-conteudo', 'pilares'],
  ordem: [{ coluna: 'ordem', asc: true }, { coluna: 'nome', asc: true }],
  demo: [
    { id: 'pil-autoridade', cliente_id: null, nome: 'Autoridade', cor: '#3b82f6', ordem: 1, created_at: agora },
    { id: 'pil-educacao', cliente_id: null, nome: 'Educação', cor: '#10b981', ordem: 2, created_at: agora },
    { id: 'pil-inspiracao', cliente_id: null, nome: 'Inspiração', cor: '#f59e0b', ordem: 3, created_at: agora },
    { id: 'pil-vendas', cliente_id: null, nome: 'Vendas', cor: '#ef4444', ordem: 4, created_at: agora },
    { id: 'pil-engajamento', cliente_id: null, nome: 'Engajamento', cor: '#8b5cf6', ordem: 5, created_at: agora },
    { id: 'pil-conexao', cliente_id: null, nome: 'Conexão', cor: '#ec4899', ordem: 6, created_at: agora },
  ],
});
