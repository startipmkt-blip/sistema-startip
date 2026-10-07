import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/shared/lib/supabaseClient';
import { IS_DEMO } from '@/shared/lib/env';
import type { Ideia } from '@/modules/ideias/types';

function hoje(): string {
  const d = new Date();
  const dd = String(d.getDate()).padStart(2, '0');
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  return `${d.getFullYear()}-${mm}-${dd}`;
}

const demoIdeias: Ideia[] = [
  {
    id: 'idea-1',
    titulo: 'Criar relatório automático de oportunidades perdidas',
    descricao: 'Analisar automaticamente os leads que não converteram e gerar insights sobre o motivo da perda.',
    tipo: 'agencia',
    cliente_nome: null,
    projeto_nome: null,
    autor: 'iuri',
    importancia: 'muito_importante',
    data_ideia: '2026-10-01',
    created_at: '2026-10-01T10:00:00Z',
    updated_at: '2026-10-01T10:00:00Z',
  },
  {
    id: 'idea-2',
    titulo: 'Campanha de indicação gamificada',
    descricao: 'Criar um programa de indicação com pontos e premiações para os clientes que trouxerem novos contratos.',
    tipo: 'projeto',
    cliente_nome: null,
    projeto_nome: 'Programa de Indicação 2.0',
    autor: 'dhomini',
    importancia: 'importante',
    data_ideia: '2026-10-03',
    created_at: '2026-10-03T14:00:00Z',
    updated_at: '2026-10-03T14:00:00Z',
  },
  {
    id: 'idea-3',
    titulo: 'Automação de atendimentos por IA',
    descricao: 'Criar uma ferramenta que analise automaticamente os atendimentos dos clientes e identifique oportunidades de melhoria.',
    tipo: 'agencia',
    cliente_nome: null,
    projeto_nome: null,
    autor: 'iuri',
    importancia: 'muito_importante',
    data_ideia: '2026-10-04',
    created_at: '2026-10-04T09:00:00Z',
    updated_at: '2026-10-04T09:00:00Z',
  },
  {
    id: 'idea-4',
    titulo: 'Teste A/B nos criativos do mês',
    descricao: 'Rodar testes A/B com variações de copy e imagem nos anúncios do próximo mês.',
    tipo: 'cliente',
    cliente_nome: 'Dra. Camila Rocha',
    projeto_nome: null,
    autor: 'dhomini',
    importancia: 'simples',
    data_ideia: '2026-10-05',
    created_at: '2026-10-05T11:00:00Z',
    updated_at: '2026-10-05T11:00:00Z',
  },
];

async function fetchIdeias(): Promise<Ideia[]> {
  if (IS_DEMO) return [...demoIdeias];

  const { data, error } = await supabase
    .from('ideias')
    .select('*')
    .order('data_ideia', { ascending: false });
  if (error) throw error;
  return data ?? [];
}

export function useIdeias() {
  return useQuery({
    queryKey: ['ideias'],
    queryFn: fetchIdeias,
  });
}

export type IdeiaFormData = Omit<Ideia, 'id' | 'created_at' | 'updated_at'>;

async function saveIdeia(id: string | undefined, dados: IdeiaFormData): Promise<void> {
  if (IS_DEMO) {
    const now = new Date().toISOString();
    if (id) {
      const idx = demoIdeias.findIndex((x) => x.id === id);
      if (idx >= 0) Object.assign(demoIdeias[idx], dados, { updated_at: now });
    } else {
      demoIdeias.unshift({ id: crypto.randomUUID(), created_at: now, updated_at: now, ...dados });
    }
    return;
  }
  const now = new Date().toISOString();
  const { error } = id
    ? await supabase.from('ideias').update({ ...dados, updated_at: now } as never).eq('id', id)
    : await supabase.from('ideias').insert({ ...dados, created_at: now, updated_at: now } as never);
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

export { hoje };
