import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/shared/lib/supabaseClient';
import { IS_DEMO } from '@/shared/lib/env';
import { demoClienteNome } from '@/shared/lib/demoData';
import type { Demanda, DemandaView } from '@/modules/demandas/types';

const demoDemandas: Demanda[] = [
  { id: 'd1', cliente_id: 'c1', setor: 'design', privada: false, titulo: 'Criar 4 criativos para agosto', responsavel: 'Designer', prioridade: 'alta', status: 'fazendo', prazo: '2026-08-07', created_at: '2026-08-01T10:00:00Z' },
  { id: 'd2', cliente_id: 'c2', setor: 'trafego', privada: false, titulo: 'Configurar campanha de remarketing', responsavel: 'Gestor de Tráfego', prioridade: 'alta', status: 'aberta', prazo: '2026-08-09', created_at: '2026-08-02T10:00:00Z' },
  { id: 'd3', cliente_id: 'c3', setor: 'trafego', privada: false, titulo: 'Otimizar campanha de aula experimental', responsavel: 'Gestor de Tráfego', prioridade: 'media', status: 'aberta', prazo: '2026-08-06', created_at: '2026-08-03T10:00:00Z' },
  { id: 'd4', cliente_id: 'c2', setor: 'design', privada: false, titulo: 'Ajustar peças da coleção verão', responsavel: 'Designer', prioridade: 'media', status: 'aberta', prazo: '2026-08-10', created_at: '2026-08-02T10:00:00Z' },
  { id: 'd5', cliente_id: null, setor: 'socios', privada: true, titulo: 'Fechar contratação do novo gestor', responsavel: 'Iuri', prioridade: 'alta', status: 'fazendo', prazo: '2026-08-15', created_at: '2026-08-01T10:00:00Z' },
  { id: 'd6', cliente_id: null, setor: 'socios', privada: true, titulo: 'Revisar metas do trimestre', responsavel: 'Sócios', prioridade: 'media', status: 'aberta', prazo: '2026-08-25', created_at: '2026-08-01T10:00:00Z' },
  { id: 'd7', cliente_id: null, setor: 'geral', privada: false, titulo: 'Atualizar site da agência', responsavel: 'Equipe', prioridade: 'baixa', status: 'aberta', prazo: '2026-08-20', created_at: '2026-08-01T10:00:00Z' },
];

async function fetchDemandas(clienteId: string): Promise<DemandaView[]> {
  if (IS_DEMO) {
    return demoDemandas
      .filter((d) => !clienteId || d.cliente_id === clienteId)
      .map((d) => ({ ...d, cliente_nome: demoClienteNome(d.cliente_id) }));
  }

  let query = supabase
    .from('demandas')
    .select('*, clientes(nome)')
    .order('prazo', { ascending: true });
  if (clienteId) query = query.eq('cliente_id', clienteId);

  const { data, error } = await query;
  if (error) throw error;
  return (data ?? []).map((row: any) => ({
    ...row,
    cliente_nome: row.clientes?.nome ?? '—',
  }));
}

export function useDemandas(clienteId: string) {
  return useQuery({
    queryKey: ['demandas', clienteId],
    queryFn: () => fetchDemandas(clienteId),
  });
}

// ---------- Criar / editar ----------
export type DemandaFormData = Pick<
  Demanda,
  'cliente_id' | 'setor' | 'privada' | 'titulo' | 'responsavel' | 'prioridade' | 'status' | 'prazo'
>;

async function saveDemanda(id: string | undefined, dados: DemandaFormData): Promise<void> {
  if (IS_DEMO) {
    if (id) {
      const d = demoDemandas.find((x) => x.id === id);
      if (d) Object.assign(d, dados);
    } else {
      demoDemandas.unshift({ id: crypto.randomUUID(), created_at: new Date().toISOString(), ...dados });
    }
    return;
  }
  const { error } = id
    ? await supabase.from('demandas').update(dados as never).eq('id', id)
    : await supabase.from('demandas').insert(dados as never);
  if (error) throw error;
}

async function deleteDemanda(id: string): Promise<void> {
  if (IS_DEMO) {
    const i = demoDemandas.findIndex((x) => x.id === id);
    if (i >= 0) demoDemandas.splice(i, 1);
    return;
  }
  const { error } = await supabase.from('demandas').delete().eq('id', id);
  if (error) throw error;
}

export function useSalvarDemanda() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (p: { id?: string; dados: DemandaFormData }) => saveDemanda(p.id, p.dados),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['demandas'] }),
  });
}

export function useAtualizarStatusDemanda() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (p: { id: string; status: Demanda['status'] }) => {
      if (IS_DEMO) {
        const d = demoDemandas.find((x) => x.id === p.id);
        if (d) d.status = p.status;
        return;
      }
      const { error } = await supabase.from('demandas').update({ status: p.status } as never).eq('id', p.id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['demandas'] }),
  });
}

export function useExcluirDemanda() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => deleteDemanda(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['demandas'] }),
  });
}
