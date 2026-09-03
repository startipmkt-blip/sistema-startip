import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ROTEIRO_ONBOARDING, type EtapaRoteiro } from '@/modules/onboarding/roteiro';

// Store em memória (semeado do roteiro base). As alterações valem na sessão;
// o programador liga numa tabela quando conectar o Supabase.
let roteiro: EtapaRoteiro[] = ROTEIRO_ONBOARDING.map((e) => ({ ...e, itens: [...e.itens] }));

export type EtapaRoteiroForm = { titulo: string; tempo: string; itens: string[] };

export function useRoteiro() {
  return useQuery({ queryKey: ['roteiro'], queryFn: async () => roteiro });
}

export function useSalvarEtapaRoteiro() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (p: { numero?: number; dados: EtapaRoteiroForm }) => {
      if (p.numero != null) {
        roteiro = roteiro.map((e) =>
          e.numero === p.numero ? { ...e, ...p.dados } : e,
        );
      } else {
        const numero = (roteiro.at(-1)?.numero ?? 0) + 1;
        roteiro = [...roteiro, { numero, ...p.dados }];
      }
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['roteiro'] }),
  });
}

export function useExcluirEtapaRoteiro() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (numero: number) => {
      roteiro = roteiro.filter((e) => e.numero !== numero);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['roteiro'] }),
  });
}
