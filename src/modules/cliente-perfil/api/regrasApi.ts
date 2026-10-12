import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/shared/lib/supabaseClient';

export type RegraTipo = 'gosta' | 'nao_aprova' | 'obrigatorio' | 'prefere';

export interface RegraCliente {
  id: string;
  cliente_id: string;
  tipo: RegraTipo;
  texto: string;
  critica: boolean;
  created_at: string;
}

export const REGRA_TIPOS: Array<{
  id: RegraTipo; label: string; emoji: string; ajuda: string; tom: 'green' | 'red' | 'amber' | 'blue';
}> = [
  { id: 'gosta',       label: 'Gosta / aprova',  emoji: '✅', ajuda: 'Ex.: fotos reais da loja, tom descontraído',     tom: 'green' },
  { id: 'nao_aprova',  label: 'Não aprova',      emoji: '❌', ajuda: 'Ex.: banco de imagem, excesso de emoji',          tom: 'red'   },
  { id: 'obrigatorio', label: 'Obrigatório',     emoji: '🔒', ajuda: 'Ex.: sempre usar o logo azul, nunca citar preço', tom: 'amber' },
  { id: 'prefere',     label: 'Como prefere',    emoji: '💬', ajuda: 'Ex.: aprova pelo WhatsApp, só de manhã',          tom: 'blue'  },
];

// A tabela ainda não está no tipo gerado do banco.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const tabela = () => (supabase.from as any)('cliente_regras');

const chave = (clienteId: string) => ['cliente-perfil', 'regras', clienteId] as const;

export function useRegras(clienteId: string | null | undefined) {
  return useQuery({
    queryKey: chave(clienteId ?? ''),
    enabled: Boolean(clienteId),
    queryFn: async (): Promise<RegraCliente[]> => {
      const { data, error } = await tabela()
        .select('id, cliente_id, tipo, texto, critica, created_at')
        .eq('cliente_id', clienteId)
        .order('critica', { ascending: false })
        .order('created_at', { ascending: true });
      if (error) throw error;
      return (data ?? []) as RegraCliente[];
    },
  });
}

export function useSalvarRegra(clienteId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (p: { id?: string; tipo: RegraTipo; texto: string; critica: boolean }) => {
      const { id, ...dados } = p;
      const { error } = id
        ? await tabela().update({ ...dados, updated_at: new Date().toISOString() }).eq('id', id)
        : await tabela().insert({ ...dados, cliente_id: clienteId });
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: chave(clienteId) }),
  });
}

export function useExcluirRegra(clienteId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await tabela().delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: chave(clienteId) }),
  });
}
