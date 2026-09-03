import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/shared/lib/supabaseClient';
import { IS_DEMO } from '@/shared/lib/env';
import { demoClienteNome } from '@/shared/lib/demoData';
import type { RelatorioMensal, RelatorioMensalView } from '@/modules/area-cliente/types';

const demoRelatorios: RelatorioMensal[] = [
  { id: 'r1', cliente_id: 'c1', mes_referencia: '2026-07', faturamento: 18000, margem: 35, investimento: 2000, ticket_medio: 45, vendas_pago: 300, vendas_organico: 100, leads: 480, compras_por_cliente: 2, resumo: 'Mês de crescimento com foco em campanhas de conversão local.', pdf_url: null, created_at: '2026-08-01T10:00:00Z' },
  { id: 'r2', cliente_id: 'c2', mes_referencia: '2026-07', faturamento: 60000, margem: 40, investimento: 5000, ticket_medio: 180, vendas_pago: 250, vendas_organico: 80, leads: 900, compras_por_cliente: 3, resumo: 'Escala de vendas no e-commerce com catálogo dinâmico.', pdf_url: null, created_at: '2026-08-01T10:00:00Z' },
  { id: 'r3', cliente_id: 'c1', mes_referencia: '2026-06', faturamento: 15000, margem: 35, investimento: 1800, ticket_medio: 45, vendas_pago: 260, vendas_organico: 90, leads: 390, compras_por_cliente: 2, resumo: 'Ajustes de segmentação e criativos novos.', pdf_url: null, created_at: '2026-07-01T10:00:00Z' },
];

const acKeys = {
  all: ['area-cliente'] as const,
  list: (clienteId: string) => ['area-cliente', 'relatorios', clienteId] as const,
};

async function fetchRelatorios(clienteId: string): Promise<RelatorioMensalView[]> {
  if (IS_DEMO) {
    return demoRelatorios
      .filter((r) => !clienteId || r.cliente_id === clienteId)
      .map((r) => ({ ...r, cliente_nome: demoClienteNome(r.cliente_id) }));
  }

  let query = supabase
    .from('relatorios_mensais')
    .select('*, clientes(nome)')
    .order('mes_referencia', { ascending: false });
  if (clienteId) query = query.eq('cliente_id', clienteId);

  const { data, error } = await query;
  if (error) throw error;
  return (data ?? []).map((row: any) => ({
    ...row,
    cliente_nome: row.clientes?.nome ?? '—',
  }));
}

export function useRelatorios(clienteId: string) {
  return useQuery({
    queryKey: acKeys.list(clienteId),
    queryFn: () => fetchRelatorios(clienteId),
  });
}

// ---------- Criar / editar ----------
export type RelatorioFormData = Pick<
  RelatorioMensal,
  | 'cliente_id' | 'mes_referencia' | 'faturamento' | 'margem' | 'investimento'
  | 'ticket_medio' | 'vendas_pago' | 'vendas_organico' | 'leads'
  | 'compras_por_cliente' | 'resumo' | 'pdf_url'
>;

async function saveRelatorio(id: string | undefined, dados: RelatorioFormData): Promise<void> {
  if (IS_DEMO) {
    if (id) {
      const r = demoRelatorios.find((x) => x.id === id);
      if (r) Object.assign(r, dados);
    } else {
      demoRelatorios.unshift({ id: crypto.randomUUID(), created_at: new Date().toISOString(), ...dados });
    }
    return;
  }
  const { error } = id
    ? await supabase.from('relatorios_mensais').update(dados as never).eq('id', id)
    : await supabase.from('relatorios_mensais').insert(dados as never);
  if (error) throw error;
}

async function deleteRelatorio(id: string): Promise<void> {
  if (IS_DEMO) {
    const i = demoRelatorios.findIndex((x) => x.id === id);
    if (i >= 0) demoRelatorios.splice(i, 1);
    return;
  }
  const { error } = await supabase.from('relatorios_mensais').delete().eq('id', id);
  if (error) throw error;
}

export function useSalvarRelatorio() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (p: { id?: string; dados: RelatorioFormData }) => saveRelatorio(p.id, p.dados),
    onSuccess: () => qc.invalidateQueries({ queryKey: acKeys.all }),
  });
}

export function useExcluirRelatorio() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => deleteRelatorio(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: acKeys.all }),
  });
}
