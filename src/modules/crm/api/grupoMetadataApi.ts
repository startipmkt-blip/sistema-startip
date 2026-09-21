import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/shared/lib/supabaseClient';

export interface GrupoParticipante {
  telefone: string;
  nome: string | null;
  is_admin: boolean;
  is_super_admin: boolean;
  atualizado_em: string;
}

export interface GrupoMetadataResposta {
  ok: true;
  fresh: boolean;
  grupo: {
    assunto: string | null;
    owner: string | null;
    atualizado_em: string | null;
  };
  participantes: GrupoParticipante[];
  total: number;
}

async function invocar(leadId: string, refresh: boolean): Promise<GrupoMetadataResposta> {
  const { data, error } = await supabase.functions.invoke<GrupoMetadataResposta>(
    'zapi-grupo-metadata',
    { body: { leadId, refresh } },
  );
  if (error) throw error;
  if (!data) throw new Error('resposta vazia');
  return data;
}

export function useGrupoMembros(leadId: string | null, isGrupo: boolean) {
  return useQuery({
    queryKey: ['crm', 'grupo-membros', leadId],
    queryFn: () => invocar(leadId!, false),
    enabled: !!leadId && isGrupo,
    staleTime: 5 * 60 * 1000,
  });
}

export function useAtualizarGrupoMembros() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (leadId: string) => invocar(leadId, true),
    onSuccess: (_data, leadId) => {
      qc.invalidateQueries({ queryKey: ['crm', 'grupo-membros', leadId] });
    },
  });
}
