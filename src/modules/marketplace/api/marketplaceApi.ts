import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/shared/lib/supabaseClient';
import { IS_DEMO } from '@/shared/lib/env';

export type MpCategoria = 'base' | 'beneficios';

export interface MpPerfil {
  cliente_id: string;
  cliente_nome: string;
  categoria: MpCategoria;
  segmento: string | null;
  logo_url: string | null;
  whatsapp: string | null;
  instagram: string | null;
  publicado: boolean;
}

export interface MpProduto {
  id: string;
  cliente_id: string;
  titulo: string;
  descricao: string | null;
  preco_brl: number | null;
  desconto_texto: string | null;
  imagem_url: string | null;
  ativo: boolean;
  ordem: number;
}

const k = {
  perfis:   ['marketplace', 'perfis']   as const,
  produtos: (cid: string) => ['marketplace', 'produtos', cid] as const,
};

export function useMpPerfis() {
  return useQuery({
    queryKey: k.perfis,
    queryFn: async (): Promise<MpPerfil[]> => {
      if (IS_DEMO) return [];
      const { data, error } = await supabase
        .from('marketplace_perfis')
        .select('cliente_id, categoria, segmento, logo_url, whatsapp, instagram, publicado, clientes(nome)')
        .order('cliente_id');
      if (error) throw error;
      return (data ?? []).map((r) => {
        const row = r as unknown as MpPerfil & { clientes?: { nome: string } | null };
        return { ...row, cliente_nome: row.clientes?.nome ?? '—' };
      });
    },
  });
}

export function useSalvarPerfil() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (p: Partial<MpPerfil> & { cliente_id: string }) => {
      const { error } = await supabase.from('marketplace_perfis').upsert(p as never);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: k.perfis }),
  });
}

export function useMpProdutos(clienteId: string | null) {
  return useQuery({
    queryKey: k.produtos(clienteId ?? ''),
    enabled: !!clienteId,
    queryFn: async (): Promise<MpProduto[]> => {
      if (IS_DEMO || !clienteId) return [];
      const { data, error } = await supabase
        .from('marketplace_produtos')
        .select('*')
        .eq('cliente_id', clienteId)
        .order('ordem');
      if (error) throw error;
      return (data ?? []) as MpProduto[];
    },
  });
}

export function useSalvarProduto() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (p: Partial<MpProduto> & { cliente_id: string; titulo: string }) => {
      if (p.id) {
        const { error } = await supabase.from('marketplace_produtos').update(p as never).eq('id', p.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from('marketplace_produtos').insert(p as never);
        if (error) throw error;
      }
    },
    onSuccess: (_d, p) => qc.invalidateQueries({ queryKey: k.produtos(p.cliente_id) }),
  });
}

export function useApagarProduto() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (p: { id: string; cliente_id: string }) => {
      const { error } = await supabase.from('marketplace_produtos').delete().eq('id', p.id);
      if (error) throw error;
    },
    onSuccess: (_d, p) => qc.invalidateQueries({ queryKey: k.produtos(p.cliente_id) }),
  });
}
