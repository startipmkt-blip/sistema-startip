import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/shared/lib/supabaseClient';
import { IS_DEMO } from '@/shared/lib/env';
import type { PillarKey } from '@/shared/lib/pillars';

export type AgendaStatus = 'agendado' | 'concluido' | 'reagendado' | 'desistencia';
export type Recorrencia  = 'none' | 'daily' | 'weekly' | 'biweekly' | 'monthly';

export interface AgendaEvent {
  id: string;
  titulo: string;
  descricao: string | null;
  data: string;           // YYYY-MM-DD
  hora: string;           // HH:MM:SS
  duracao_min: number;
  clientes: string[];
  responsaveis: string[];
  pilares: PillarKey[];
  status: AgendaStatus;
  lembrete_min: number | null;
  recorrencia: Recorrencia;
  criador_id: string | null;
  virou_tarefa_id: string | null;
  created_at: string;
  updated_at: string;
}

export interface AgendaTemplate {
  id: string;
  titulo: string;
  pilares_padrao: PillarKey[];
  duracao_min_padrao: number;
}

const k = {
  eventos: (de: string, ate: string) => ['agenda', 'eventos', de, ate] as const,
  templates: ['agenda', 'templates'] as const,
};

// ---- Eventos ----
export function useAgendaEventos(de: string, ate: string) {
  return useQuery({
    queryKey: k.eventos(de, ate),
    queryFn: async (): Promise<AgendaEvent[]> => {
      if (IS_DEMO) return [];
      const { data, error } = await supabase
        .from('agenda_events')
        .select('*')
        .gte('data', de)
        .lte('data', ate)
        .order('data')
        .order('hora');
      if (error) throw error;
      return (data ?? []) as AgendaEvent[];
    },
  });
}

export type AgendaInput = Partial<AgendaEvent> & { titulo: string; data: string };

export function useSalvarEvento() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (p: { id?: string; dados: AgendaInput }) => {
      if (IS_DEMO) return 'demo';
      if (p.id) {
        const { error } = await supabase.from('agenda_events').update(p.dados as never).eq('id', p.id);
        if (error) throw error;
        return p.id;
      }
      const { data, error } = await supabase.from('agenda_events').insert(p.dados as never).select('id').single();
      if (error) throw error;
      return (data as { id: string }).id;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['agenda'] }),
  });
}

export function useApagarEvento() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('agenda_events').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['agenda'] }),
  });
}

export function useMudarStatusEvento() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (p: { id: string; status: AgendaStatus }) => {
      const { error } = await supabase.from('agenda_events').update({ status: p.status } as never).eq('id', p.id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['agenda'] }),
  });
}

// ---- Templates ----
export function useAgendaTemplates() {
  return useQuery({
    queryKey: k.templates,
    queryFn: async (): Promise<AgendaTemplate[]> => {
      if (IS_DEMO) return [];
      const { data, error } = await supabase.from('agenda_templates').select('*').order('titulo');
      if (error) throw error;
      return (data ?? []) as AgendaTemplate[];
    },
  });
}
