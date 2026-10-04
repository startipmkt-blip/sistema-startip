import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/shared/lib/supabaseClient';
import { IS_DEMO } from '@/shared/lib/env';
import type { Ideia } from '@/modules/ideias/types';

const demoIdeias: Ideia[] = [
  { id: '1', titulo: 'Série de reels sobre bastidores', descricao: 'Mostrar o dia a dia da agência em formato de reels semanais.', categoria: 'conteudo', autor_id: null, autor_nome: 'Iuri', fixada: true, created_at: '2026-10-01T10:00:00Z', updated_at: '2026-10-01T10:00:00Z' },
  { id: '2', titulo: 'Dashboard de métricas para clientes', descricao: 'Criar um painel visual que o cliente consiga ver suas métricas em tempo real.', categoria: 'produto', autor_id: null, autor_nome: 'Dhomini', fixada: false, created_at: '2026-10-02T14:00:00Z', updated_at: '2026-10-02T14:00:00Z' },
  { id: '3', titulo: 'Programa de indicação com recompensa', descricao: 'Oferecer desconto no próximo mês para clientes que indicarem novos.', categoria: 'marketing', autor_id: null, autor_nome: 'Iuri', fixada: false, created_at: '2026-10-03T09:00:00Z', updated_at: '2026-10-03T09:00:00Z' },
];

async function fetchIdeias(): Promise<Ideia[]> {
  if (IS_DEMO) return demoIdeias;

  const { data, error } = await supabase
    .from('ideias')
    .select('*')
    .order('fixada', { ascending: false })
    .order('created_at', { ascending: false });
  if (error) throw error;
  return data ?? [];
}

export function useIdeias() {
  return useQuery({
    queryKey: ['ideias'],
    queryFn: fetchIdeias,
  });
}

export type IdeiaFormData = Pick<Ideia, 'titulo' | 'descricao' | 'categoria' | 'autor_nome'>;

async function saveIdeia(id: string | undefined, dados: IdeiaFormData): Promise<void> {
  if (IS_DEMO) {
    if (id) {
      const d = demoIdeias.find((x) => x.id === id);
      if (d) Object.assign(d, dados);
    } else {
      demoIdeias.unshift({ id: crypto.randomUUID(), autor_id: null, fixada: false, created_at: new Date().toISOString(), updated_at: new Date().toISOString(), ...dados });
    }
    return;
  }
  const { error } = id
    ? await supabase.from('ideias').update(dados as never).eq('id', id)
    : await supabase.from('ideias').insert(dados as never);
  if (error) throw error;
}

async function deleteIdeia(id: string): Promise<void> {
  if (IS_DEMO) {
    const i = demoIdeias.findIndex((x) => x.id === id);
    if (i >= 0) demoIdeias.splice(i, 1);
    return;
  }
  const { error } = await supabase.from('ideias').delete().eq('id', id);
  if (error) throw error;
}

async function toggleFixada(id: string, fixada: boolean): Promise<void> {
  if (IS_DEMO) {
    const d = demoIdeias.find((x) => x.id === id);
    if (d) d.fixada = fixada;
    return;
  }
  const { error } = await supabase.from('ideias').update({ fixada } as never).eq('id', id);
  if (error) throw error;
}

export function useSalvarIdeia() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (p: { id?: string; dados: IdeiaFormData }) => saveIdeia(p.id, p.dados),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['ideias'] }),
  });
}

export function useExcluirIdeia() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => deleteIdeia(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['ideias'] }),
  });
}

export function useToggleFixada() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (p: { id: string; fixada: boolean }) => toggleFixada(p.id, p.fixada),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['ideias'] }),
  });
}
