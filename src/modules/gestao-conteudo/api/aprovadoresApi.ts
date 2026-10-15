import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/shared/lib/supabaseClient';
import { IS_DEMO } from '@/shared/lib/env';

export interface Aprovador {
  id: string;
  cliente_id: string;
  nome: string;
  ordem: number;
  ativo: boolean;
}

export interface VotoAprovacao {
  post_id: string;
  aprovador_id: string;
  decisao: 'aprovado' | 'reprovado';
}

const demoAprovadores: Aprovador[] = [];

export function useAprovadores(clienteId: string | undefined) {
  return useQuery({
    queryKey: ['gestao-conteudo', 'aprovadores', clienteId],
    enabled: Boolean(clienteId),
    queryFn: async (): Promise<Aprovador[]> => {
      if (IS_DEMO) return demoAprovadores.filter((a) => a.cliente_id === clienteId);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data, error } = await (supabase.from as any)('cliente_aprovadores')
        .select('*').eq('cliente_id', clienteId).order('ordem').order('created_at');
      if (error) throw error;
      return (data ?? []) as Aprovador[];
    },
  });
}

// Votos dos conteúdos de um cliente (para mostrar "2 de 4 aprovaram").
export function useVotosDoCliente(clienteId: string | undefined, postIds: string[]) {
  return useQuery({
    queryKey: ['gestao-conteudo', 'votos', clienteId, postIds.length],
    enabled: Boolean(clienteId) && postIds.length > 0,
    refetchInterval: 60_000,
    queryFn: async (): Promise<VotoAprovacao[]> => {
      if (IS_DEMO) return [];
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data, error } = await (supabase.from as any)('conteudo_aprovacao_votos')
        .select('post_id, aprovador_id, decisao').in('post_id', postIds);
      if (error) throw error;
      return (data ?? []) as VotoAprovacao[];
    },
  });
}

export function useSalvarAprovador() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (a: { id?: string; cliente_id: string; nome: string; ordem?: number; ativo?: boolean }) => {
      if (IS_DEMO) {
        if (a.id) Object.assign(demoAprovadores.find((x) => x.id === a.id) ?? {}, a);
        else demoAprovadores.push({ id: `a${demoAprovadores.length + 1}`, ordem: demoAprovadores.length, ativo: true, ...a });
        return;
      }
      const linha = { cliente_id: a.cliente_id, nome: a.nome.trim(), ordem: a.ordem ?? 0, ativo: a.ativo ?? true };
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const tbl = (supabase.from as any)('cliente_aprovadores');
      const { error } = a.id ? await tbl.update(linha).eq('id', a.id) : await tbl.insert(linha);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['gestao-conteudo', 'aprovadores'] }),
  });
}

export function useExcluirAprovador() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      if (IS_DEMO) {
        const i = demoAprovadores.findIndex((x) => x.id === id);
        if (i >= 0) demoAprovadores.splice(i, 1);
        return;
      }
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { error } = await (supabase.from as any)('cliente_aprovadores').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['gestao-conteudo'] }),
  });
}
