import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/shared/lib/supabaseClient';

export interface Entrega {
  id: string; cliente_id: string; tipo: string; titulo: string;
  descricao: string | null; url: string | null; thumb_url: string | null;
  entregue_em: string; created_at: string;
}
export interface Otimizacao {
  id: string; cliente_id: string; titulo: string; descricao: string | null;
  plataforma: string; criada_em: string;
}
export interface Investimento {
  id: string; cliente_id: string; semana_inicio: string;
  investimento_total: number; media_diaria: number; observacoes: string | null;
}
export interface Aviso {
  id: string; cliente_id: string; titulo: string; conteudo: string; criado_em: string;
}
export interface Persona {
  cliente_id: string;
  persona: string | null; planejamento_estrategico: string | null;
  tom_de_voz: string | null; produtos_servicos: string | null;
  atualizado_em: string;
}

// -------- Entregas --------
export function useEntregas(clienteId: string) {
  return useQuery({
    queryKey: ['painel-cliente', 'entregas', clienteId],
    enabled: !!clienteId,
    queryFn: async (): Promise<Entrega[]> => {
      const { data, error } = await supabase.from('conteudos_entregues').select('*').eq('cliente_id', clienteId).order('entregue_em', { ascending: false });
      if (error) throw error;
      return (data ?? []) as Entrega[];
    },
  });
}
export function useSalvarEntrega() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (p: { id?: string; dados: Partial<Entrega> & { cliente_id: string; titulo: string } }) => {
      const { id, dados } = p;
      const { error } = id
        ? await supabase.from('conteudos_entregues').update(dados as never).eq('id', id)
        : await supabase.from('conteudos_entregues').insert(dados as never);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['painel-cliente', 'entregas'] }),
  });
}
export function useExcluirEntrega() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => { const { error } = await supabase.from('conteudos_entregues').delete().eq('id', id); if (error) throw error; },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['painel-cliente', 'entregas'] }),
  });
}

// -------- Otimizações --------
export function useOtimizacoes(clienteId: string) {
  return useQuery({
    queryKey: ['painel-cliente', 'otim', clienteId],
    enabled: !!clienteId,
    queryFn: async (): Promise<Otimizacao[]> => {
      const { data, error } = await supabase.from('otimizacoes_trafego').select('*').eq('cliente_id', clienteId).order('criada_em', { ascending: false });
      if (error) throw error;
      return (data ?? []) as Otimizacao[];
    },
  });
}
export function useSalvarOtimizacao() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (p: { id?: string; dados: Partial<Otimizacao> & { cliente_id: string; titulo: string } }) => {
      const { id, dados } = p;
      const { error } = id
        ? await supabase.from('otimizacoes_trafego').update(dados as never).eq('id', id)
        : await supabase.from('otimizacoes_trafego').insert(dados as never);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['painel-cliente', 'otim'] }),
  });
}
export function useExcluirOtimizacao() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => { const { error } = await supabase.from('otimizacoes_trafego').delete().eq('id', id); if (error) throw error; },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['painel-cliente', 'otim'] }),
  });
}

// -------- Investimento --------
export function useInvestimentos(clienteId: string) {
  return useQuery({
    queryKey: ['painel-cliente', 'inv', clienteId],
    enabled: !!clienteId,
    queryFn: async (): Promise<Investimento[]> => {
      const { data, error } = await supabase.from('investimento_semanal').select('*').eq('cliente_id', clienteId).order('semana_inicio', { ascending: false });
      if (error) throw error;
      return (data ?? []) as Investimento[];
    },
  });
}
export function useSalvarInvestimento() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (p: { id?: string; dados: Partial<Investimento> & { cliente_id: string; semana_inicio: string } }) => {
      const { id, dados } = p;
      const { error } = id
        ? await supabase.from('investimento_semanal').update(dados as never).eq('id', id)
        : await supabase.from('investimento_semanal').upsert(dados as never, { onConflict: 'cliente_id,semana_inicio' });
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['painel-cliente', 'inv'] }),
  });
}

// -------- Avisos --------
export function useAvisos(clienteId: string) {
  return useQuery({
    queryKey: ['painel-cliente', 'avisos', clienteId],
    enabled: !!clienteId,
    queryFn: async (): Promise<Aviso[]> => {
      const { data, error } = await supabase.from('avisos_cliente').select('*').eq('cliente_id', clienteId).order('criado_em', { ascending: false });
      if (error) throw error;
      return (data ?? []) as Aviso[];
    },
  });
}
export function useSalvarAviso() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (p: { id?: string; dados: Partial<Aviso> & { cliente_id: string; titulo: string; conteudo: string } }) => {
      const { id, dados } = p;
      const { error } = id
        ? await supabase.from('avisos_cliente').update(dados as never).eq('id', id)
        : await supabase.from('avisos_cliente').insert(dados as never);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['painel-cliente', 'avisos'] }),
  });
}
export function useExcluirAviso() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => { const { error } = await supabase.from('avisos_cliente').delete().eq('id', id); if (error) throw error; },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['painel-cliente', 'avisos'] }),
  });
}

// -------- Persona --------
export function usePersona(clienteId: string) {
  return useQuery({
    queryKey: ['painel-cliente', 'persona', clienteId],
    enabled: !!clienteId,
    queryFn: async (): Promise<Persona | null> => {
      const { data, error } = await supabase.from('cliente_persona').select('*').eq('cliente_id', clienteId).maybeSingle();
      if (error) throw error;
      return (data as Persona | null) ?? null;
    },
  });
}
export function useSalvarPersona() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (p: Partial<Persona> & { cliente_id: string }) => {
      const dados = { ...p, atualizado_em: new Date().toISOString() };
      const { error } = await supabase.from('cliente_persona').upsert(dados as never, { onConflict: 'cliente_id' });
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['painel-cliente', 'persona'] }),
  });
}
