import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/shared/lib/supabaseClient';
import { IS_DEMO } from '@/shared/lib/env';
import { demoClienteNome } from '@/shared/lib/demoData';
import type {
  Despesa,
  ReceitaCliente,
  ReceitaClienteView,
} from '@/modules/financeiro/types';

// ---------- Dados demo (mutáveis em memória) ----------
const demoReceitas: ReceitaCliente[] = [
  { id: 'rc1', cliente_id: 'c1', valor_mensal: 1500, dia_vencimento: 5, status: 'em_dia', ativo: true, created_at: '2025-11-10T10:00:00Z' },
  { id: 'rc2', cliente_id: 'c2', valor_mensal: 2500, dia_vencimento: 10, status: 'atrasado', ativo: true, created_at: '2026-01-05T10:00:00Z' },
  { id: 'rc3', cliente_id: 'c3', valor_mensal: 1800, dia_vencimento: 15, status: 'em_dia', ativo: true, created_at: '2026-07-20T10:00:00Z' },
  { id: 'rc4', cliente_id: 'c4', valor_mensal: 1200, dia_vencimento: 20, status: 'em_dia', ativo: false, created_at: '2025-03-15T10:00:00Z' },
];

const demoDespesas: Despesa[] = [
  { id: 'dp1', descricao: 'Meta Business / ferramentas de anúncio', categoria: 'assinatura', valor: 320, vencimento: '2026-08-05', recorrente: true, status: 'pendente', created_at: '2026-08-01T10:00:00Z' },
  { id: 'dp2', descricao: 'Canva Pro + banco de imagens', categoria: 'assinatura', valor: 180, vencimento: '2026-08-08', recorrente: true, status: 'paga', created_at: '2026-08-01T10:00:00Z' },
  { id: 'dp3', descricao: 'Parcela do notebook da equipe', categoria: 'parcela', valor: 450, vencimento: '2026-08-12', recorrente: true, status: 'pendente', created_at: '2026-08-01T10:00:00Z' },
  { id: 'dp4', descricao: 'Simples Nacional (DAS)', categoria: 'imposto', valor: 680, vencimento: '2026-08-20', recorrente: true, status: 'pendente', created_at: '2026-08-01T10:00:00Z' },
  { id: 'dp5', descricao: 'Pró-labore', categoria: 'salario', valor: 3000, vencimento: '2026-08-05', recorrente: true, status: 'paga', created_at: '2026-08-01T10:00:00Z' },
];

// ---------- Receitas (pagamentos dos clientes) ----------
async function fetchReceitas(): Promise<ReceitaClienteView[]> {
  if (IS_DEMO) {
    return demoReceitas.map((r) => ({ ...r, cliente_nome: demoClienteNome(r.cliente_id) }));
  }
  const { data, error } = await supabase
    .from('financeiro_receitas')
    .select('*, clientes(nome)')
    .order('dia_vencimento', { ascending: true });
  if (error) throw error;
  return (data ?? []).map((row: any) => ({ ...row, cliente_nome: row.clientes?.nome ?? '—' }));
}

export type ReceitaFormData = Pick<
  ReceitaCliente,
  'cliente_id' | 'valor_mensal' | 'dia_vencimento' | 'status' | 'ativo'
>;

async function saveReceita(id: string | undefined, dados: ReceitaFormData): Promise<void> {
  if (IS_DEMO) {
    if (id) {
      const r = demoReceitas.find((x) => x.id === id);
      if (r) Object.assign(r, dados);
    } else {
      demoReceitas.push({ id: crypto.randomUUID(), created_at: new Date().toISOString(), ...dados });
    }
    return;
  }
  const { error } = id
    ? await supabase.from('financeiro_receitas').update(dados as never).eq('id', id)
    : await supabase.from('financeiro_receitas').insert(dados as never);
  if (error) throw error;
}

// ---------- Despesas / contas a pagar ----------
async function fetchDespesas(): Promise<Despesa[]> {
  if (IS_DEMO) return [...demoDespesas].sort((a, b) => a.vencimento.localeCompare(b.vencimento));
  const { data, error } = await supabase
    .from('financeiro_despesas')
    .select('*')
    .order('vencimento', { ascending: true });
  if (error) throw error;
  return (data ?? []) as Despesa[];
}

export type DespesaFormData = Pick<
  Despesa,
  'descricao' | 'categoria' | 'valor' | 'vencimento' | 'recorrente' | 'status'
> & { parcela_atual?: number | null; parcelas_total?: number | null };

async function saveDespesa(id: string | undefined, dados: DespesaFormData): Promise<void> {
  if (IS_DEMO) {
    if (id) {
      const d = demoDespesas.find((x) => x.id === id);
      if (d) Object.assign(d, dados);
    } else {
      demoDespesas.push({ id: crypto.randomUUID(), created_at: new Date().toISOString(), ...dados });
    }
    return;
  }
  const { error } = id
    ? await supabase.from('financeiro_despesas').update(dados as never).eq('id', id)
    : await supabase.from('financeiro_despesas').insert(dados as never);
  if (error) throw error;
}

async function marcarDespesaPaga(id: string): Promise<void> {
  if (IS_DEMO) {
    const d = demoDespesas.find((x) => x.id === id);
    if (d) d.status = d.status === 'paga' ? 'pendente' : 'paga';
    return;
  }
  const { data: atual } = await supabase.from('financeiro_despesas').select('status').eq('id', id).single();
  const novo = (atual as any)?.status === 'paga' ? 'pendente' : 'paga';
  const { error } = await supabase.from('financeiro_despesas').update({ status: novo } as never).eq('id', id);
  if (error) throw error;
}

// ---------- Hooks ----------
export function useReceitas() {
  return useQuery({ queryKey: ['financeiro', 'receitas'], queryFn: fetchReceitas });
}
export function useDespesas() {
  return useQuery({ queryKey: ['financeiro', 'despesas'], queryFn: fetchDespesas });
}

export function useSalvarReceita() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (p: { id?: string; dados: ReceitaFormData }) => saveReceita(p.id, p.dados),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['financeiro', 'receitas'] }),
  });
}
export function useSalvarDespesa() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (p: { id?: string; dados: DespesaFormData }) => saveDespesa(p.id, p.dados),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['financeiro', 'despesas'] }),
  });
}
export function useMarcarDespesaPaga() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => marcarDespesaPaga(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['financeiro', 'despesas'] }),
  });
}
