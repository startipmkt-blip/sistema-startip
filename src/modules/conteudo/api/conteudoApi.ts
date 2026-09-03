import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/shared/lib/supabaseClient';
import { IS_DEMO } from '@/shared/lib/env';
import { demoClienteNome } from '@/shared/lib/demoData';
import type { Conteudo, ConteudoView } from '@/modules/conteudo/types';

const demoConteudos: Conteudo[] = [
  { id: 'ct1', cliente_id: 'c1', titulo: 'Bastidores da produção', tipo: 'reels', status: 'ideia', data_publicacao: '2026-08-12', created_at: '2026-08-01T10:00:00Z' },
  { id: 'ct2', cliente_id: 'c1', titulo: '5 dicas para o pão perfeito', tipo: 'carrossel', status: 'producao', data_publicacao: '2026-08-08', created_at: '2026-08-01T10:00:00Z' },
  { id: 'ct3', cliente_id: 'c2', titulo: 'Lançamento coleção verão', tipo: 'reels', status: 'aprovacao', data_publicacao: '2026-08-06', created_at: '2026-08-01T10:00:00Z' },
  { id: 'ct4', cliente_id: 'c2', titulo: 'Prova social clientes', tipo: 'estatico', status: 'publicado', data_publicacao: '2026-08-02', created_at: '2026-07-30T10:00:00Z' },
  { id: 'ct5', cliente_id: 'c3', titulo: 'Aula experimental gratuita', tipo: 'carrossel', status: 'ideia', data_publicacao: '2026-08-15', created_at: '2026-08-02T10:00:00Z' },
];

async function fetchConteudos(clienteId: string): Promise<ConteudoView[]> {
  if (IS_DEMO) {
    return demoConteudos
      .filter((c) => !clienteId || c.cliente_id === clienteId)
      .map((c) => ({ ...c, cliente_nome: demoClienteNome(c.cliente_id) }));
  }

  let query = supabase
    .from('conteudos')
    .select('*, clientes(nome)')
    .order('data_publicacao', { ascending: true });
  if (clienteId) query = query.eq('cliente_id', clienteId);

  const { data, error } = await query;
  if (error) throw error;
  return (data ?? []).map((row: any) => ({
    ...row,
    cliente_nome: row.clientes?.nome ?? '—',
  }));
}

export function useConteudos(clienteId: string) {
  return useQuery({
    queryKey: ['conteudos', clienteId],
    queryFn: () => fetchConteudos(clienteId),
  });
}

// ---------- Criar / editar ----------
export type ConteudoFormData = Pick<
  Conteudo,
  'cliente_id' | 'titulo' | 'tipo' | 'status' | 'data_publicacao'
>;

async function saveConteudo(id: string | undefined, dados: ConteudoFormData): Promise<void> {
  if (IS_DEMO) {
    if (id) {
      const c = demoConteudos.find((x) => x.id === id);
      if (c) Object.assign(c, dados);
    } else {
      demoConteudos.unshift({ id: crypto.randomUUID(), created_at: new Date().toISOString(), ...dados });
    }
    return;
  }
  const { error } = id
    ? await supabase.from('conteudos').update(dados as never).eq('id', id)
    : await supabase.from('conteudos').insert(dados as never);
  if (error) throw error;
}

async function deleteConteudo(id: string): Promise<void> {
  if (IS_DEMO) {
    const i = demoConteudos.findIndex((x) => x.id === id);
    if (i >= 0) demoConteudos.splice(i, 1);
    return;
  }
  const { error } = await supabase.from('conteudos').delete().eq('id', id);
  if (error) throw error;
}

export function useSalvarConteudo() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (p: { id?: string; dados: ConteudoFormData }) => saveConteudo(p.id, p.dados),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['conteudos'] }),
  });
}

export function useExcluirConteudo() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => deleteConteudo(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['conteudos'] }),
  });
}
