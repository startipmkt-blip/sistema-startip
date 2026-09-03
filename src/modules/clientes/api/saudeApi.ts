import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/shared/lib/supabaseClient';
import { IS_DEMO } from '@/shared/lib/env';

export interface ScoreSaude {
  cliente_id: string;
  nome: string;
  score_contrato: number | null;
  score_aprovacao: number | null;
  score_suporte: number | null;
  score_saude: number | null;
}

export function useSaudeCliente(clienteId: string | undefined) {
  return useQuery({
    queryKey: ['saude', clienteId ?? ''],
    enabled: !!clienteId,
    queryFn: async (): Promise<ScoreSaude | null> => {
      if (IS_DEMO || !clienteId) return null;
      const { data, error } = await supabase
        .from('cliente_saude')
        .select('*')
        .eq('cliente_id', clienteId)
        .maybeSingle();
      if (error) throw error;
      return (data as unknown as ScoreSaude) ?? null;
    },
  });
}

export function classificarScore(n: number | null | undefined): { label: string; tone: 'green' | 'amber' | 'red' | 'slate' } {
  if (n == null) return { label: 'Sem dados', tone: 'slate' };
  if (n >= 80)   return { label: 'Ótima',      tone: 'green' };
  if (n >= 60)   return { label: 'Boa',        tone: 'green' };
  if (n >= 40)   return { label: 'Atenção',    tone: 'amber' };
  return             { label: 'Crítica',    tone: 'red' };
}
