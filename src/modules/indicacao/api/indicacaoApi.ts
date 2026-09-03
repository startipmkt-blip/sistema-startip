import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/shared/lib/supabaseClient';
import { IS_DEMO } from '@/shared/lib/env';
import { demoClienteNome } from '@/shared/lib/demoData';
import type { Indicacao, IndicacaoView } from '@/modules/indicacao/types';

const demoIndicacoes: Indicacao[] = [
  { id: 'i1', cliente_id: 'c1', nome_indicado: 'Restaurante Sabor', contato: '(11) 91111-0001', status: 'convertido', recompensa: 300, created_at: '2026-07-15T10:00:00Z' },
  { id: 'i2', cliente_id: 'c2', nome_indicado: 'Pet Shop Amigo', contato: '(21) 92222-0002', status: 'em_contato', recompensa: 0, created_at: '2026-07-28T10:00:00Z' },
  { id: 'i3', cliente_id: 'c1', nome_indicado: 'Clínica Sorriso', contato: '(11) 93333-0003', status: 'novo', recompensa: 0, created_at: '2026-08-01T10:00:00Z' },
  { id: 'i4', cliente_id: 'c3', nome_indicado: 'Academia Força', contato: '(31) 94444-0004', status: 'perdido', recompensa: 0, created_at: '2026-06-20T10:00:00Z' },
];

async function fetchIndicacoes(clienteId: string): Promise<IndicacaoView[]> {
  if (IS_DEMO) {
    return demoIndicacoes
      .filter((i) => !clienteId || i.cliente_id === clienteId)
      .map((i) => ({ ...i, cliente_nome: demoClienteNome(i.cliente_id) }));
  }

  let query = supabase
    .from('indicacoes')
    .select('*, clientes(nome)')
    .order('created_at', { ascending: false });
  if (clienteId) query = query.eq('cliente_id', clienteId);

  const { data, error } = await query;
  if (error) throw error;
  return (data ?? []).map((row: any) => ({
    ...row,
    cliente_nome: row.clientes?.nome ?? '—',
  }));
}

export function useIndicacoes(clienteId: string) {
  return useQuery({
    queryKey: ['indicacoes', clienteId],
    queryFn: () => fetchIndicacoes(clienteId),
  });
}

// ---------- Criar / editar ----------
export type IndicacaoFormData = Pick<
  Indicacao,
  'cliente_id' | 'nome_indicado' | 'contato' | 'status' | 'recompensa'
>;

async function saveIndicacao(id: string | undefined, dados: IndicacaoFormData): Promise<void> {
  if (IS_DEMO) {
    if (id) {
      const i = demoIndicacoes.find((x) => x.id === id);
      if (i) Object.assign(i, dados);
    } else {
      demoIndicacoes.unshift({ id: crypto.randomUUID(), created_at: new Date().toISOString(), ...dados });
    }
    return;
  }
  const { error } = id
    ? await supabase.from('indicacoes').update(dados as never).eq('id', id)
    : await supabase.from('indicacoes').insert(dados as never);
  if (error) throw error;
}

async function deleteIndicacao(id: string): Promise<void> {
  if (IS_DEMO) {
    const i = demoIndicacoes.findIndex((x) => x.id === id);
    if (i >= 0) demoIndicacoes.splice(i, 1);
    return;
  }
  const { error } = await supabase.from('indicacoes').delete().eq('id', id);
  if (error) throw error;
}

export function useSalvarIndicacao() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (p: { id?: string; dados: IndicacaoFormData }) => saveIndicacao(p.id, p.dados),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['indicacoes'] }),
  });
}

export function useExcluirIndicacao() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => deleteIndicacao(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['indicacoes'] }),
  });
}
