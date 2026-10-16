import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/shared/lib/supabaseClient';
import { IS_DEMO } from '@/shared/lib/env';

export type FrequenciaLembrete = 'semanal' | 'mensal';

export interface ClienteLembrete {
  id: string;
  cliente_id: string;
  titulo: string;
  frequencia: FrequenciaLembrete;
  ultima_conclusao: string | null; // 'YYYY-MM-DD'
  created_at: string;
}

export const FREQUENCIA_LABEL: Record<FrequenciaLembrete, string> = {
  semanal: 'Toda semana',
  mensal: 'Todo mês',
};

function dataStr(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

// Semana vai de segunda a domingo; mês é o mês-calendário.
export function inicioDoPeriodo(freq: FrequenciaLembrete, ref = new Date()): string {
  if (freq === 'mensal') return dataStr(new Date(ref.getFullYear(), ref.getMonth(), 1));
  const atras = (ref.getDay() + 6) % 7;
  return dataStr(new Date(ref.getFullYear(), ref.getMonth(), ref.getDate() - atras));
}

// Volta a ficar pendente sozinho quando o período vira, sem nenhum job.
export function lembretePendente(l: ClienteLembrete): boolean {
  return !l.ultima_conclusao || l.ultima_conclusao < inicioDoPeriodo(l.frequencia);
}

const KEY = ['cliente-lembretes'] as const;

let demoLembretes: ClienteLembrete[] = [];

async function fetchLembretes(): Promise<ClienteLembrete[]> {
  if (IS_DEMO) return [...demoLembretes];
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (supabase.from as any)('cliente_lembretes')
    .select('id, cliente_id, titulo, frequencia, ultima_conclusao, created_at')
    .order('created_at');
  if (error) throw error;
  return (data ?? []) as ClienteLembrete[];
}

// Uma consulta só para a carteira inteira: a lista de clientes mostra o sino de todos de uma vez.
export function useLembretes() {
  return useQuery({ queryKey: KEY, queryFn: fetchLembretes });
}

export function useAdicionarLembrete() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (p: { cliente_id: string; titulo: string; frequencia: FrequenciaLembrete }) => {
      if (IS_DEMO) {
        demoLembretes = [...demoLembretes, {
          id: crypto.randomUUID(), ultima_conclusao: null, created_at: new Date().toISOString(), ...p,
        }];
        return;
      }
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { error } = await (supabase.from as any)('cliente_lembretes').insert(p);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: KEY }),
  });
}

export function useMarcarLembrete() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (p: { id: string; feito: boolean }) => {
      const ultima_conclusao = p.feito ? dataStr(new Date()) : null;
      if (IS_DEMO) {
        demoLembretes = demoLembretes.map((l) => (l.id === p.id ? { ...l, ultima_conclusao } : l));
        return;
      }
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { error } = await (supabase.from as any)('cliente_lembretes').update({ ultima_conclusao }).eq('id', p.id);
      if (error) throw error;
    },
    // Marca na hora; volta atrás se o servidor recusar.
    onMutate: async (p) => {
      await qc.cancelQueries({ queryKey: KEY });
      const anterior = qc.getQueryData<ClienteLembrete[]>(KEY);
      const ultima_conclusao = p.feito ? dataStr(new Date()) : null;
      qc.setQueryData<ClienteLembrete[]>(KEY, (lista) =>
        lista?.map((l) => (l.id === p.id ? { ...l, ultima_conclusao } : l)),
      );
      return { anterior };
    },
    onError: (_e, _p, ctx) => {
      if (ctx?.anterior) qc.setQueryData(KEY, ctx.anterior);
    },
    onSettled: () => qc.invalidateQueries({ queryKey: KEY }),
  });
}

export function useExcluirLembrete() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      if (IS_DEMO) {
        demoLembretes = demoLembretes.filter((l) => l.id !== id);
        return;
      }
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { error } = await (supabase.from as any)('cliente_lembretes').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: KEY }),
  });
}
