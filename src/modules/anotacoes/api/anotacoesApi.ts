import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/shared/lib/supabaseClient';
import type { Anotacao, AnotacaoAnexo, AnotacaoPrioridade, AnotacaoView } from '@/modules/anotacoes/types';

export interface AnotacaoFormData {
  texto: string;
  cliente_id: string | null;
  autor_id: string | null;
  prazo: string | null;
  prioridade: AnotacaoPrioridade;
  anexos?: AnotacaoAnexo[];
}

const keys = {
  all: ['anotacoes'] as const,
  lista: (clienteId: string) => ['anotacoes', 'lista', clienteId] as const,
  doCliente: (clienteId: string) => ['anotacoes', 'cliente', clienteId] as const,
};

async function fetchAnotacoes(clienteFiltro: string): Promise<AnotacaoView[]> {
  let q = supabase
    .from('anotacoes')
    .select('*, clientes(nome), profiles!anotacoes_autor_id_fkey(nome)')
    .order('criada_em', { ascending: false })
    .limit(500);
  if (clienteFiltro) q = q.eq('cliente_id', clienteFiltro);
  const { data, error } = await q;
  if (error) throw error;
  return (data ?? []).map((row: any) => ({
    ...row,
    cliente_nome: row.clientes?.nome ?? null,
    autor_nome:   row.profiles?.nome ?? null,
  }));
}

export function useAnotacoes(clienteFiltro = '') {
  return useQuery({ queryKey: keys.lista(clienteFiltro), queryFn: () => fetchAnotacoes(clienteFiltro) });
}

export function useAnotacoesDoCliente(clienteId: string) {
  return useQuery({
    queryKey: keys.doCliente(clienteId),
    enabled: !!clienteId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('anotacoes')
        .select('*')
        .eq('cliente_id', clienteId)
        .eq('status', 'pendente')
        .order('criada_em', { ascending: false })
        .limit(50);
      if (error) throw error;
      return (data ?? []) as Anotacao[];
    },
  });
}

export function useSalvarAnotacao() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (p: { id?: string; dados: AnotacaoFormData }) => {
      const base = {
        ...p.dados,
        anexos: p.dados.anexos ?? [],
      };
      const { error } = p.id
        ? await supabase.from('anotacoes').update(base as never).eq('id', p.id)
        : await supabase.from('anotacoes').insert(base as never);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: keys.all }),
  });
}

export function useExcluirAnotacao() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('anotacoes').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: keys.all }),
  });
}

export function useMarcarFeita() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (p: { id: string; feita: boolean; autor_id?: string | null }) => {
      const patch = p.feita
        ? { status: 'feita', concluida_em: new Date().toISOString(), concluida_por: p.autor_id ?? null }
        : { status: 'pendente', concluida_em: null, concluida_por: null };
      const { error } = await supabase.from('anotacoes').update(patch as never).eq('id', p.id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: keys.all }),
  });
}

// Cria uma demanda a partir da anotação e marca a anotação como feita + salva o
// vínculo demanda_id.
export function useVirarDemanda() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (a: AnotacaoView) => {
      const prioridade = a.prioridade === 'urgente' ? 'alta' : a.prioridade === 'importante' ? 'media' : 'baixa';
      const prazo = a.prazo ?? new Date().toISOString().slice(0, 10);
      const titulo = a.texto.length > 120 ? `${a.texto.slice(0, 117)}…` : a.texto;
      const { data, error } = await supabase.from('demandas').insert({
        cliente_id: a.cliente_id,
        setor: 'geral',
        privada: false,
        titulo,
        responsavel: a.autor_nome ?? '',
        prioridade,
        status: 'aberta',
        prazo,
      } as never).select('id').single();
      if (error) throw error;
      const demandaId = (data as { id: string }).id;
      const { error: e2 } = await supabase.from('anotacoes').update({
        status: 'feita',
        concluida_em: new Date().toISOString(),
        demanda_id: demandaId,
      } as never).eq('id', a.id);
      if (e2) throw e2;
      return demandaId;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: keys.all });
      qc.invalidateQueries({ queryKey: ['demandas'] });
    },
  });
}
