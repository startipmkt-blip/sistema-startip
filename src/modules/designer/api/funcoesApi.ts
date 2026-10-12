import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/shared/lib/supabaseClient';

export type FuncaoFrequencia = 'diaria' | 'semanal' | 'quinzenal' | 'mensal' | 'avulsa';

export const FREQUENCIA_LABEL: Record<FuncaoFrequencia, string> = {
  diaria: 'Todo dia',
  semanal: 'Toda semana',
  quinzenal: 'Quinzenal',
  mensal: 'Todo mês',
  avulsa: 'Sob demanda',
};

export interface DesignerFuncao {
  id: string;
  titulo: string;
  descricao: string;
  frequencia: FuncaoFrequencia;
  todos_clientes: boolean;
  cliente_ids: string[];
  ordem: number;
  created_at: string;
}

export type FuncaoForm = Pick<DesignerFuncao, 'titulo' | 'descricao' | 'frequencia' | 'todos_clientes' | 'cliente_ids'>;

const KEY = ['designer', 'funcoes'] as const;

// A tabela ainda não está no tipo gerado do banco.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const tabela = () => (supabase.from as any)('designer_funcoes');

export function useFuncoes() {
  return useQuery({
    queryKey: KEY,
    queryFn: async (): Promise<DesignerFuncao[]> => {
      const { data, error } = await tabela()
        .select('id, titulo, descricao, frequencia, todos_clientes, cliente_ids, ordem, created_at')
        .eq('ativo', true)
        .order('ordem', { ascending: true })
        .order('created_at', { ascending: true });
      if (error) throw error;
      return (data ?? []) as DesignerFuncao[];
    },
  });
}

export function useSalvarFuncao() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (p: { id?: string; dados: FuncaoForm }) => {
      const payload = {
        ...p.dados,
        cliente_ids: p.dados.todos_clientes ? [] : p.dados.cliente_ids,
      };
      const { error } = p.id
        ? await tabela().update({ ...payload, updated_at: new Date().toISOString() }).eq('id', p.id)
        : await tabela().insert(payload);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: KEY }),
  });
}

export function useExcluirFuncao() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await tabela().delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: KEY }),
  });
}
