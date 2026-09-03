import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/shared/lib/supabaseClient';
import { IS_DEMO } from '@/shared/lib/env';

export function useProfilesEquipe() {
  return useQuery({
    queryKey: ['profiles-equipe'],
    queryFn: async (): Promise<{ id: string; nome: string }[]> => {
      if (IS_DEMO) return [];
      const { data, error } = await supabase
        .from('profiles')
        .select('id, nome')
        .eq('tipo', 'equipe')
        .eq('status', 'ativo')
        .order('nome');
      if (error) throw error;
      return (data ?? []) as { id: string; nome: string }[];
    },
  });
}
