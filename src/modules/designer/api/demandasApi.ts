import { useEffect } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/shared/lib/supabaseClient';
import { useAuth } from '@/shared/auth/AuthProvider';

export type DesignerStatus = 'a_fazer' | 'em_andamento' | 'aprovacao' | 'concluido';
export type DesignerOrigem = 'manual' | 'ideia_aprovada' | 'calendario';
export type DesignerTipo = 'post' | 'carrossel' | 'reels' | 'story' | 'web' | 'extra';

export const STATUS_COLUNAS: Array<{ id: DesignerStatus; label: string; cor: string; emoji: string }> = [
  { id: 'a_fazer',      label: 'A fazer',        cor: 'slate',   emoji: '📥' },
  { id: 'em_andamento', label: 'Em andamento',   cor: 'blue',    emoji: '🎨' },
  { id: 'aprovacao',    label: 'Aguardando aprovação', cor: 'amber', emoji: '👀' },
  { id: 'concluido',    label: 'Concluído',      cor: 'green',   emoji: '✅' },
];

export const TIPO_LABEL: Record<DesignerTipo, string> = {
  post: 'Post',
  carrossel: 'Carrossel',
  reels: 'Reels',
  story: 'Story',
  web: 'Web',
  extra: 'Extra',
};

export interface DesignerDemanda {
  id: string;
  cliente_id: string | null;
  cliente_nome?: string | null;
  titulo: string;
  descricao: string | null;
  tipo: DesignerTipo;
  status: DesignerStatus;
  responsavel_id: string | null;
  responsavel_nome?: string | null;
  prazo: string | null;
  origem: DesignerOrigem;
  ideia_id: string | null;
  anexos: unknown[];
  criado_por: string | null;
  created_at: string;
  updated_at: string;
}

interface Filtros {
  clienteId?: string | null;
  responsavelId?: string | null;
  tipo?: DesignerTipo | null;
  q?: string;
}

async function fetchDemandas(): Promise<DesignerDemanda[]> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (supabase.from as any)('designer_demandas')
    .select('*')
    .order('ordem', { ascending: true })
    .order('created_at', { ascending: false });
  if (error) throw error;

  const rows = (data ?? []) as DesignerDemanda[];
  // Join nomes de cliente e responsável (dois selects pequenos).
  const cliIds = Array.from(new Set(rows.map((r) => r.cliente_id).filter(Boolean))) as string[];
  const respIds = Array.from(new Set(rows.map((r) => r.responsavel_id).filter(Boolean))) as string[];

  const [clientes, profiles] = await Promise.all([
    cliIds.length
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      ? (supabase.from as any)('clientes').select('id, nome').in('id', cliIds)
      : Promise.resolve({ data: [] as { id: string; nome: string }[] }),
    respIds.length
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      ? (supabase.from as any)('profiles').select('id, nome').in('id', respIds)
      : Promise.resolve({ data: [] as { id: string; nome: string }[] }),
  ]);

  const mapaCli = new Map<string, string>((clientes.data ?? []).map((c: { id: string; nome: string }) => [c.id, c.nome]));
  const mapaProf = new Map<string, string>((profiles.data ?? []).map((p: { id: string; nome: string }) => [p.id, p.nome]));
  return rows.map((r) => ({
    ...r,
    cliente_nome: r.cliente_id ? (mapaCli.get(r.cliente_id) ?? null) : null,
    responsavel_nome: r.responsavel_id ? (mapaProf.get(r.responsavel_id) ?? null) : null,
  }));
}

export function useDemandas(filtros: Filtros = {}) {
  return useQuery({
    queryKey: ['designer', 'demandas', filtros],
    queryFn: async () => {
      const rows = await fetchDemandas();
      return rows.filter((r) => {
        if (filtros.clienteId && r.cliente_id !== filtros.clienteId) return false;
        if (filtros.responsavelId && r.responsavel_id !== filtros.responsavelId) return false;
        if (filtros.tipo && r.tipo !== filtros.tipo) return false;
        if (filtros.q) {
          const q = filtros.q.toLowerCase();
          const hay = `${r.titulo} ${r.descricao ?? ''} ${r.cliente_nome ?? ''}`.toLowerCase();
          if (!hay.includes(q)) return false;
        }
        return true;
      });
    },
    staleTime: 30_000,
  });
}

interface UpsertInput {
  id?: string;
  cliente_id: string | null;
  titulo: string;
  descricao?: string | null;
  tipo: DesignerTipo;
  status?: DesignerStatus;
  responsavel_id?: string | null;
  prazo?: string | null;
}

export function useSalvarDemanda() {
  const qc = useQueryClient();
  const { profile } = useAuth();
  return useMutation({
    mutationFn: async (input: UpsertInput) => {
      const payload = { ...input, criado_por: input.id ? undefined : profile?.id ?? null };
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const tbl = (supabase.from as any)('designer_demandas');
      if (input.id) {
        const { id, ...patch } = payload;
        const { error } = await tbl.update(patch).eq('id', id);
        if (error) throw error;
      } else {
        const { error } = await tbl.insert(payload);
        if (error) throw error;
      }
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['designer'] }),
  });
}

export function useMoverStatus() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (v: { id: string; status: DesignerStatus }) => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { error } = await (supabase.from as any)('designer_demandas')
        .update({ status: v.status, updated_at: new Date().toISOString() })
        .eq('id', v.id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['designer'] }),
  });
}

export function useExcluirDemanda() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { error } = await (supabase.from as any)('designer_demandas').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['designer'] }),
  });
}

// Realtime: atualiza kanban quando trigger da aprovação cria nova demanda.
export function useDemandasRealtime() {
  const qc = useQueryClient();
  useEffect(() => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const canal = (supabase.channel as any)('designer-demandas')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'designer_demandas' }, () => {
        qc.invalidateQueries({ queryKey: ['designer'] });
      })
      .subscribe();
    return () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (supabase as any).removeChannel(canal);
    };
  }, [qc]);
}
