// =============================================================
// CRUD simples de uma tabela do Supabase com react-query.
// No Modo Demonstração os registros ficam num array em memória,
// para as telas novas funcionarem sem banco.
// =============================================================
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/shared/lib/supabaseClient';
import { IS_DEMO } from '@/shared/lib/env';

export interface Registro {
  id: string;
  created_at: string;
  updated_at?: string;
}

interface Config<T extends Registro> {
  tabela: string;
  /** Primeira parte da queryKey: [modulo, subrecurso]. */
  chave: readonly [string, string];
  ordem?: { coluna: keyof T & string; asc?: boolean }[];
  demo?: T[];
}

export function criarCrud<T extends Registro>(cfg: Config<T>) {
  const memoria: T[] = [...(cfg.demo ?? [])];
  // A tabela ainda não está no tipo gerado do Supabase (database.ts).
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const tabela = () => (supabase as any).from(cfg.tabela);

  function ordenar(lista: T[]): T[] {
    const ordem = cfg.ordem ?? [{ coluna: 'created_at' as keyof T & string, asc: false }];
    return [...lista].sort((a, b) => {
      for (const o of ordem) {
        const va = a[o.coluna] as unknown as string | number | null;
        const vb = b[o.coluna] as unknown as string | number | null;
        if (va === vb) continue;
        if (va == null) return 1;
        if (vb == null) return -1;
        const r = va < vb ? -1 : 1;
        return o.asc === false ? -r : r;
      }
      return 0;
    });
  }

  async function listar(filtro: Partial<Record<keyof T & string, string | null>>): Promise<T[]> {
    if (IS_DEMO) {
      return ordenar(memoria.filter((r) => Object.entries(filtro).every(([k, v]) => v === undefined || (r as Record<string, unknown>)[k] === v)));
    }
    let q = tabela().select('*');
    for (const [k, v] of Object.entries(filtro)) {
      if (v === undefined) continue;
      q = v === null ? q.is(k, null) : q.eq(k, v);
    }
    for (const o of cfg.ordem ?? [{ coluna: 'created_at', asc: false }]) q = q.order(o.coluna, { ascending: o.asc !== false });
    const { data, error } = await q;
    if (error) throw error;
    return (data ?? []) as T[];
  }

  async function salvar(id: string | undefined, dados: Partial<T>): Promise<T> {
    const agora = new Date().toISOString();
    if (IS_DEMO) {
      if (id) {
        const r = memoria.find((x) => x.id === id);
        if (r) Object.assign(r, dados, { updated_at: agora });
        return r as T;
      }
      const novo = { id: crypto.randomUUID(), created_at: agora, updated_at: agora, ...dados } as T;
      memoria.unshift(novo);
      return novo;
    }
    const { data, error } = id
      ? await tabela().update({ ...dados, updated_at: agora }).eq('id', id).select().single()
      : await tabela().insert(dados).select().single();
    if (error) throw error;
    return data as T;
  }

  async function excluir(id: string): Promise<void> {
    if (IS_DEMO) {
      const i = memoria.findIndex((x) => x.id === id);
      if (i >= 0) memoria.splice(i, 1);
      return;
    }
    const { error } = await tabela().delete().eq('id', id);
    if (error) throw error;
  }

  function useLista(filtro: Partial<Record<keyof T & string, string | null>> = {}, ativo = true) {
    return useQuery({
      queryKey: [...cfg.chave, 'lista', filtro] as const,
      queryFn: () => listar(filtro),
      enabled: ativo,
    });
  }

  function useUm(id: string | undefined) {
    return useQuery({
      queryKey: [...cfg.chave, 'um', id] as const,
      enabled: Boolean(id),
      queryFn: async (): Promise<T | null> => {
        if (IS_DEMO) return memoria.find((r) => r.id === id) ?? null;
        const { data, error } = await tabela().select('*').eq('id', id).maybeSingle();
        if (error) throw error;
        return (data ?? null) as T | null;
      },
    });
  }

  function useSalvar() {
    const qc = useQueryClient();
    return useMutation({
      mutationFn: (p: { id?: string; dados: Partial<T> }) => salvar(p.id, p.dados),
      onSuccess: () => qc.invalidateQueries({ queryKey: cfg.chave }),
    });
  }

  function useExcluir() {
    const qc = useQueryClient();
    return useMutation({
      mutationFn: (id: string) => excluir(id),
      onSuccess: () => qc.invalidateQueries({ queryKey: cfg.chave }),
    });
  }

  return { useLista, useUm, useSalvar, useExcluir, salvar };
}
