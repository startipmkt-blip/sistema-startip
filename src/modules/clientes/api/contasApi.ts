import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/shared/lib/supabaseClient';
import { IS_DEMO } from '@/shared/lib/env';
import { demoContasDoCliente } from '@/shared/lib/demoData';
import type { ContaAnuncio } from '@/shared/types/database';

async function fetchContas(clienteId: string): Promise<ContaAnuncio[]> {
  if (IS_DEMO) return demoContasDoCliente(clienteId);

  const { data, error } = await supabase
    .from('contas_anuncio')
    .select('*')
    .eq('cliente_id', clienteId)
    .order('plataforma', { ascending: true });
  if (error) throw error;
  return data ?? [];
}

export function useContasAnuncio(clienteId: string | undefined) {
  return useQuery({
    queryKey: ['contas_anuncio', clienteId],
    queryFn: () => fetchContas(clienteId as string),
    enabled: Boolean(clienteId),
  });
}
