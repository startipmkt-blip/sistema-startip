import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/shared/lib/supabaseClient';
import { IS_DEMO } from '@/shared/lib/env';
import type { Contract, ContractStatus, ContractTemplate } from '@/modules/contratos/types';

const keys = {
  all: ['contratos'] as const,
  lista: ['contratos', 'lista'] as const,
  templates: ['contratos', 'templates'] as const,
};

// ---------- Templates ----------
async function fetchTemplates(): Promise<ContractTemplate[]> {
  if (IS_DEMO) return [];
  const { data, error } = await supabase
    .from('contract_templates')
    .select('*')
    .eq('ativo', true)
    .order('created_at', { ascending: false });
  if (error) throw error;
  return (data ?? []) as ContractTemplate[];
}
export function useContractTemplates() {
  return useQuery({ queryKey: keys.templates, queryFn: fetchTemplates });
}

export type TemplateInput = Partial<ContractTemplate> & { nome: string };

async function salvarTemplate(id: string | undefined, dados: TemplateInput): Promise<void> {
  if (IS_DEMO) return;
  const payload = { ...dados, updated_at: new Date().toISOString() };
  const { error } = id
    ? await supabase.from('contract_templates').update(payload as never).eq('id', id)
    : await supabase.from('contract_templates').insert({ ativo: true, body_text: '', ...payload } as never);
  if (error) throw error;
}
export function useSalvarTemplate() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (p: { id?: string; dados: TemplateInput }) => salvarTemplate(p.id, p.dados),
    onSuccess: () => qc.invalidateQueries({ queryKey: keys.templates }),
  });
}

async function apagarTemplate(id: string): Promise<void> {
  if (IS_DEMO) return;
  const { error } = await supabase.from('contract_templates').delete().eq('id', id);
  if (error) throw error;
}
export function useApagarTemplate() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => apagarTemplate(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: keys.templates }),
  });
}

// ---------- Contratos ----------
async function fetchContratos(status?: ContractStatus | 'todos'): Promise<Contract[]> {
  if (IS_DEMO) return [];
  let q = supabase.from('contracts').select('*').order('created_at', { ascending: false }).limit(500);
  if (status && status !== 'todos') q = q.eq('status', status);
  const { data, error } = await q;
  if (error) throw error;
  return (data ?? []) as Contract[];
}
export function useContratos(status?: ContractStatus | 'todos') {
  return useQuery({ queryKey: [...keys.lista, status ?? 'todos'], queryFn: () => fetchContratos(status) });
}

export type ContratoInput = Partial<Contract> & { titulo: string };

async function salvarContrato(id: string | undefined, dados: ContratoInput): Promise<string> {
  if (IS_DEMO) return 'demo';
  if (id) {
    const { error } = await supabase.from('contracts').update(dados as never).eq('id', id);
    if (error) throw error;
    return id;
  }
  const { data, error } = await supabase.from('contracts').insert(dados as never).select('id').single();
  if (error) throw error;
  return (data as { id: string }).id;
}
export function useSalvarContrato() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (p: { id?: string; dados: ContratoInput }) => salvarContrato(p.id, p.dados),
    onSuccess: () => qc.invalidateQueries({ queryKey: keys.all }),
  });
}

async function apagarContrato(id: string): Promise<void> {
  if (IS_DEMO) return;
  const { error } = await supabase.from('contracts').delete().eq('id', id);
  if (error) throw error;
}
export function useApagarContrato() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => apagarContrato(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: keys.all }),
  });
}
