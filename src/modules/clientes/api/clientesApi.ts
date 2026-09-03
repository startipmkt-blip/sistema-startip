// =============================================================
// clientesApi.ts — Acesso a dados do módulo de clientes.
// Padrão que todo módulo segue: funções puras de fetch + hooks
// TanStack Query. A RLS no banco é quem garante a segurança;
// aqui apenas consultamos.
// =============================================================
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/shared/lib/supabaseClient';
import { IS_DEMO } from '@/shared/lib/env';
import {
  demoClientes,
  demoFindCliente,
  demoAddCliente,
  demoUpdateCliente,
  demoDeleteCliente,
} from '@/shared/lib/demoData';
import type { Cliente } from '@/shared/types/database';

export type ClienteFormData = Pick<Cliente, 'nome' | 'tipo_negocio' | 'status'> &
  Partial<Pick<Cliente, 'logo_url' | 'data_entrada' | 'servicos' | 'conteudos_por_semana'>>;

export const clientesKeys = {
  all: ['clientes'] as const,
  list: (busca: string) => [...clientesKeys.all, 'list', busca] as const,
  detail: (id: string) => [...clientesKeys.all, 'detail', id] as const,
};

async function fetchClientes(busca: string): Promise<Cliente[]> {
  if (IS_DEMO) {
    const termo = busca.trim().toLowerCase();
    return demoClientes.filter((c) => c.nome.toLowerCase().includes(termo));
  }

  let query = supabase
    .from('clientes')
    .select('*')
    .order('nome', { ascending: true });

  if (busca.trim()) {
    query = query.ilike('nome', `%${busca.trim()}%`);
  }

  const { data, error } = await query;
  if (error) throw error;
  return data ?? [];
}

async function fetchCliente(id: string): Promise<Cliente | null> {
  if (IS_DEMO) {
    return demoFindCliente(id);
  }

  const { data, error } = await supabase
    .from('clientes')
    .select('*')
    .eq('id', id)
    .maybeSingle();
  if (error) throw error;
  return data;
}

export function useClientes(busca: string) {
  return useQuery({
    queryKey: clientesKeys.list(busca),
    queryFn: () => fetchClientes(busca),
  });
}

export function useCliente(id: string | undefined) {
  return useQuery({
    queryKey: clientesKeys.detail(id ?? ''),
    queryFn: () => fetchCliente(id as string),
    enabled: Boolean(id),
  });
}

// ---------- Mutações (criar / editar) ----------
async function createCliente(dados: ClienteFormData): Promise<void> {
  if (IS_DEMO) {
    demoAddCliente(dados);
    return;
  }
  const { error } = await supabase.from('clientes').insert(dados as never);
  if (error) throw error;
}

async function updateCliente(id: string, dados: ClienteFormData): Promise<void> {
  if (IS_DEMO) {
    demoUpdateCliente(id, dados);
    return;
  }
  const { error } = await supabase.from('clientes').update(dados as never).eq('id', id);
  if (error) throw error;
}

export function useSalvarCliente() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (params: { id?: string; dados: ClienteFormData }) => {
      if (params.id) await updateCliente(params.id, params.dados);
      else await createCliente(params.dados);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: clientesKeys.all });
    },
  });
}

async function deleteCliente(id: string): Promise<void> {
  if (IS_DEMO) {
    demoDeleteCliente(id);
    return;
  }
  const { error } = await supabase.from('clientes').delete().eq('id', id);
  if (error) throw error;
}

export function useExcluirCliente() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => deleteCliente(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: clientesKeys.all }),
  });
}
