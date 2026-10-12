import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/shared/lib/supabaseClient';

export interface Pauta {
  id: string;
  cliente_id: string;
  titulo: string;
  descricao: string;
  ordem: number;
  created_at: string;
}

export type PautaForm = Pick<Pauta, 'titulo' | 'descricao'>;

// A tabela ainda não está no tipo gerado do banco.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const tabela = () => (supabase.from as any)('cliente_pautas');

const chave = (clienteId: string) => ['gestao-conteudo', 'pautas', clienteId] as const;

export function usePautas(clienteId: string | null) {
  return useQuery({
    queryKey: chave(clienteId ?? ''),
    enabled: Boolean(clienteId),
    queryFn: async (): Promise<Pauta[]> => {
      const { data, error } = await tabela()
        .select('id, cliente_id, titulo, descricao, ordem, created_at')
        .eq('cliente_id', clienteId)
        .order('ordem', { ascending: true })
        .order('created_at', { ascending: true });
      if (error) throw error;
      return (data ?? []) as Pauta[];
    },
  });
}

export function useSalvarPauta(clienteId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (p: { id?: string; dados: PautaForm }) => {
      const { error } = p.id
        ? await tabela().update({ ...p.dados, updated_at: new Date().toISOString() }).eq('id', p.id)
        : await tabela().insert({ ...p.dados, cliente_id: clienteId, ordem: Date.now() % 2_000_000_000 });
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: chave(clienteId) }),
  });
}

export function useExcluirPauta(clienteId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await tabela().delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: chave(clienteId) }),
  });
}
