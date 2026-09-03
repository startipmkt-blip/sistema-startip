import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect } from 'react';
import { supabase } from '@/shared/lib/supabaseClient';
import { IS_DEMO } from '@/shared/lib/env';
import type { PillarKey } from '@/shared/lib/pillars';

export type SolicitacaoStatus = 'pendente' | 'em_andamento' | 'concluida' | 'descartada';

export interface Solicitacao {
  id: string;
  lead_id: string;
  lead_nome: string | null;
  is_grupo: boolean;
  mensagem_id: string | null;
  pilar: PillarKey | null;
  texto: string;
  origem_em: string;
  status: SolicitacaoStatus;
  criada_em: string;
  concluida_em: string | null;
  concluida_por: string | null;
  observacoes: string | null;
}

const keys = {
  all: ['solicitacoes'] as const,
  lista: (status: SolicitacaoStatus | 'todas') => ['solicitacoes', 'lista', status] as const,
};

async function fetchSolicitacoes(status: SolicitacaoStatus | 'todas'): Promise<Solicitacao[]> {
  if (IS_DEMO) return [];
  let q = supabase
    .from('client_requests')
    .select('id, lead_id, mensagem_id, pilar, texto, origem_em, status, criada_em, concluida_em, concluida_por, observacoes, crm_leads(nome, is_grupo)')
    .order('origem_em', { ascending: false })
    .limit(500);
  if (status !== 'todas') q = q.eq('status', status);
  const { data, error } = await q;
  if (error) throw error;
  return (data ?? []).map((r) => {
    const row = r as unknown as Solicitacao & { crm_leads?: { nome: string; is_grupo: boolean } | null };
    return {
      ...row,
      lead_nome: row.crm_leads?.nome ?? null,
      is_grupo: row.crm_leads?.is_grupo ?? false,
    };
  });
}

export function useSolicitacoes(status: SolicitacaoStatus | 'todas' = 'pendente') {
  return useQuery({ queryKey: keys.lista(status), queryFn: () => fetchSolicitacoes(status) });
}

export function useMudarStatusSolicitacao() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (p: { id: string; status: SolicitacaoStatus }) => {
      const { data: { user } } = await supabase.auth.getUser();
      const patch: Record<string, unknown> = { status: p.status };
      if (p.status === 'concluida') {
        patch.concluida_em = new Date().toISOString();
        patch.concluida_por = user?.id ?? null;
      } else {
        patch.concluida_em = null;
        patch.concluida_por = null;
      }
      const { error } = await supabase.from('client_requests').update(patch as never).eq('id', p.id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: keys.all }),
  });
}

export function useRemoverSolicitacao() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('client_requests').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: keys.all }),
  });
}

// Assina realtime — nova solicitação → invalida cache.
export function useSolicitacoesRealtime() {
  const qc = useQueryClient();
  useEffect(() => {
    if (IS_DEMO) return;
    const canal = supabase
      .channel(`agente-turbo-${crypto.randomUUID()}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'client_requests' }, () => {
        qc.invalidateQueries({ queryKey: keys.all });
      })
      .subscribe();
    return () => { supabase.removeChannel(canal); };
  }, [qc]);
}

// ------------------------------------------------------------
// Grupo monitorado (crm_leads.monitorado + timeout_minutos).
// ------------------------------------------------------------
export function useMarcarMonitorado() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (p: { leadId: string; monitorado: boolean; timeoutMinutos?: number }) => {
      const patch: Record<string, unknown> = { monitorado: p.monitorado };
      if (p.timeoutMinutos != null) patch.timeout_minutos = p.timeoutMinutos;
      const { error } = await supabase.from('crm_leads').update(patch as never).eq('id', p.leadId);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['crm'] }),
  });
}
