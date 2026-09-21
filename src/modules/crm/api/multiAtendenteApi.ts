import { useEffect } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/shared/lib/supabaseClient';
import { useAuth } from '@/shared/auth/AuthProvider';

// ============ Notas internas ============
export interface NotaInterna {
  id: string;
  lead_id: string;
  autor_id: string | null;
  autor_nome: string | null;
  texto: string;
  created_at: string;
}

export function useNotasInternas(leadId: string | null) {
  return useQuery({
    queryKey: ['crm', 'notas-internas', leadId],
    queryFn: async (): Promise<NotaInterna[]> => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data, error } = await (supabase.from as any)('crm_notas_internas')
        .select('*')
        .eq('lead_id', leadId)
        .order('created_at', { ascending: true });
      if (error) throw error;
      return (data ?? []) as NotaInterna[];
    },
    enabled: !!leadId,
    staleTime: 30_000,
  });
}

export function useAdicionarNota() {
  const qc = useQueryClient();
  const { profile } = useAuth();
  return useMutation({
    mutationFn: async (v: { leadId: string; texto: string }) => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { error } = await (supabase.from as any)('crm_notas_internas').insert({
        lead_id: v.leadId,
        autor_id: profile?.id ?? null,
        autor_nome: profile?.nome ?? null,
        texto: v.texto.trim(),
      });
      if (error) throw error;
    },
    onSuccess: (_r, v) => {
      qc.invalidateQueries({ queryKey: ['crm', 'notas-internas', v.leadId] });
    },
  });
}

// ============ Assumir / transferir ============
export function useAssumirConversa() {
  const qc = useQueryClient();
  const { profile } = useAuth();
  return useMutation({
    mutationFn: async (leadId: string) => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { error } = await (supabase.from as any)('crm_leads').update({
        atendente_id: profile?.id ?? null,
        status_atendimento: 'em_atendimento',
        atendente_desde: new Date().toISOString(),
      }).eq('id', leadId);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['crm'] }),
  });
}

export function useLiberarConversa() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (leadId: string) => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { error } = await (supabase.from as any)('crm_leads').update({
        atendente_id: null,
        status_atendimento: 'livre',
        atendente_desde: null,
      }).eq('id', leadId);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['crm'] }),
  });
}

export function useTransferirConversa() {
  const qc = useQueryClient();
  const { profile } = useAuth();
  return useMutation({
    mutationFn: async (v: { leadId: string; paraId: string; motivo?: string }) => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await (supabase.from as any)('crm_transferencias').insert({
        lead_id: v.leadId,
        de_id: profile?.id ?? null,
        para_id: v.paraId,
        motivo: v.motivo ?? null,
      });
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { error } = await (supabase.from as any)('crm_leads').update({
        atendente_id: v.paraId,
        atendente_desde: new Date().toISOString(),
      }).eq('id', v.leadId);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['crm'] }),
  });
}

// ============ Presença ao vivo ============
export interface Presenca {
  user_id: string;
  user_nome: string | null;
  ultimo_ping: string;
}

export function useRegistrarPresenca(leadId: string | null) {
  const { profile } = useAuth();
  useEffect(() => {
    if (!leadId || !profile?.id) return;
    const upsert = async () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await (supabase.from as any)('crm_visualizando').upsert({
        lead_id: leadId,
        user_id: profile.id,
        user_nome: profile.nome ?? null,
        ultimo_ping: new Date().toISOString(),
      }, { onConflict: 'lead_id,user_id' });
    };
    upsert();
    const iv = window.setInterval(upsert, 30_000);
    return () => {
      window.clearInterval(iv);
      // Remove presence on unmount
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (supabase.from as any)('crm_visualizando').delete()
        .eq('lead_id', leadId).eq('user_id', profile.id).then(() => {}, () => {});
    };
  }, [leadId, profile?.id, profile?.nome]);
}

export function usePresencas(leadId: string | null) {
  return useQuery({
    queryKey: ['crm', 'presenca', leadId],
    queryFn: async (): Promise<Presenca[]> => {
      const doisMinAtras = new Date(Date.now() - 2 * 60 * 1000).toISOString();
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data, error } = await (supabase.from as any)('crm_visualizando')
        .select('user_id, user_nome, ultimo_ping')
        .eq('lead_id', leadId)
        .gt('ultimo_ping', doisMinAtras);
      if (error) throw error;
      return (data ?? []) as Presenca[];
    },
    enabled: !!leadId,
    refetchInterval: 15_000,
  });
}
