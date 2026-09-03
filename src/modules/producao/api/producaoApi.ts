import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/shared/lib/supabaseClient';
import { IS_DEMO } from '@/shared/lib/env';

export type ProducaoTipo = 'video' | 'post';
export type ProducaoFase = 'planejado' | 'captado' | 'editado' | 'arte' | 'revisao' | 'entregue';

export interface ProducaoTarefa {
  id: string;
  cliente_id: string;
  tipo: ProducaoTipo;
  fase: ProducaoFase;
  titulo: string;
  data_solicitacao: string | null;
  data_agendamento: string | null;
  responsavel_id: string | null;
  observacao: string | null;
  subtarefas: { texto: string; feito: boolean }[];
  escondido_ate: string | null;
  created_at: string;
  updated_at: string;
}

export interface ProgressoMensal {
  cliente_id: string;
  nome: string;
  ano: number;
  mes: number;
  meta_video: number;
  meta_post: number;
  videos_feitos: number;
  videos_entregues: number;
  posts_feitos: number;
  posts_entregues: number;
  faltam_videos: number;
  faltam_posts: number;
}

const k = {
  tarefas: (tipo: ProducaoTipo) => ['producao', 'tarefas', tipo] as const,
  progresso: ['producao', 'progresso'] as const,
};

export function useProgressoMensal() {
  return useQuery({
    queryKey: k.progresso,
    queryFn: async (): Promise<ProgressoMensal[]> => {
      if (IS_DEMO) return [];
      const { data, error } = await supabase.from('producao_progresso_mensal').select('*');
      if (error) throw error;
      return (data ?? []) as ProgressoMensal[];
    },
  });
}

export function useTarefasProducao(tipo: ProducaoTipo) {
  return useQuery({
    queryKey: k.tarefas(tipo),
    queryFn: async (): Promise<ProducaoTarefa[]> => {
      if (IS_DEMO) return [];
      const { data, error } = await supabase
        .from('producao_tarefas')
        .select('*')
        .eq('tipo', tipo)
        .order('created_at', { ascending: false })
        .limit(500);
      if (error) throw error;
      return (data ?? []).map((r) => ({ ...(r as ProducaoTarefa), subtarefas: (r as ProducaoTarefa).subtarefas ?? [] }));
    },
  });
}

export function useSalvarTarefa() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (p: { id?: string; dados: Partial<ProducaoTarefa> & { cliente_id: string; tipo: ProducaoTipo } }) => {
      if (p.id) {
        const { error } = await supabase.from('producao_tarefas').update(p.dados as never).eq('id', p.id);
        if (error) throw error;
        return p.id;
      }
      const { data, error } = await supabase.from('producao_tarefas').insert(p.dados as never).select('id').single();
      if (error) throw error;
      return (data as { id: string }).id;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['producao'] }),
  });
}

export function useMudarFase() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (p: { id: string; fase: ProducaoFase }) => {
      const { error } = await supabase.from('producao_tarefas').update({ fase: p.fase } as never).eq('id', p.id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['producao'] }),
  });
}

export function useApagarTarefa() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('producao_tarefas').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['producao'] }),
  });
}

// Salvar/atualizar meta mensal do cliente.
export function useSalvarMetaMensal() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (p: {
      cliente_id: string;
      ano: number;
      mes: number;
      meta_video?: number;
      meta_post?: number;
      videomaker_id?: string | null;
      webdesigner_id?: string | null;
    }) => {
      const { error } = await supabase.from('producao_meta_mensal').upsert(p as never);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['producao'] }),
  });
}
