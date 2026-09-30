import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/shared/lib/supabaseClient';
import { useAuth } from '@/shared/auth/AuthProvider';

export interface Anexo {
  url: string;
  nome: string;
}

export interface Otimizacao {
  id: string;
  cliente_slug: string;
  data: string;            // YYYY-MM-DD
  conteudo: string;
  anexos: Anexo[];
  updated_at: string;
}

// Lista otimizações de um cliente no mês (ex: '2026-10').
export function useOtimizacoesMes(clienteSlug: string, ano: number, mes: number) {
  const inicio = `${ano}-${String(mes).padStart(2, '0')}-01`;
  const fimD = new Date(ano, mes, 0).getDate();
  const fim = `${ano}-${String(mes).padStart(2, '0')}-${String(fimD).padStart(2, '0')}`;
  return useQuery({
    queryKey: ['otimizacoes', clienteSlug, ano, mes],
    queryFn: async (): Promise<Otimizacao[]> => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data, error } = await (supabase.from as any)('otimizacoes_diarias')
        .select('id, cliente_slug, data, conteudo, anexos, updated_at')
        .eq('cliente_slug', clienteSlug)
        .gte('data', inicio)
        .lte('data', fim)
        .order('data', { ascending: false });
      if (error) throw error;
      return ((data ?? []) as Otimizacao[]).map((o) => ({ ...o, anexos: o.anexos ?? [] }));
    },
    staleTime: 30_000,
  });
}

// Conta otimizações por cliente no mês atual — pra badge da lista.
export function useContagemMesAtual() {
  const hoje = new Date();
  const ano = hoje.getFullYear();
  const mes = hoje.getMonth() + 1;
  const inicio = `${ano}-${String(mes).padStart(2, '0')}-01`;
  return useQuery({
    queryKey: ['otimizacoes', 'contagem', ano, mes],
    queryFn: async (): Promise<Record<string, { total: number; ultima: string | null }>> => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data, error } = await (supabase.from as any)('otimizacoes_diarias')
        .select('cliente_slug, data')
        .gte('data', inicio);
      if (error) throw error;
      const acc: Record<string, { total: number; ultima: string | null }> = {};
      for (const row of (data ?? []) as { cliente_slug: string; data: string }[]) {
        const cur = acc[row.cliente_slug] ?? { total: 0, ultima: null };
        cur.total += 1;
        cur.ultima = cur.ultima && cur.ultima > row.data ? cur.ultima : row.data;
        acc[row.cliente_slug] = cur;
      }
      return acc;
    },
    staleTime: 30_000,
  });
}

export function useSalvarOtimizacao() {
  const qc = useQueryClient();
  const { profile } = useAuth();
  return useMutation({
    mutationFn: async (v: { cliente_slug: string; data: string; conteudo: string; anexos: Anexo[] }) => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { error } = await (supabase.from as any)('otimizacoes_diarias').upsert({
        cliente_slug: v.cliente_slug,
        data: v.data,
        conteudo: v.conteudo,
        anexos: v.anexos,
        updated_by: profile?.id ?? null,
        updated_at: new Date().toISOString(),
      }, { onConflict: 'cliente_slug,data' });
      if (error) throw error;
    },
    onSuccess: (_d, v) => {
      qc.invalidateQueries({ queryKey: ['otimizacoes', v.cliente_slug] });
      qc.invalidateQueries({ queryKey: ['otimizacoes', 'contagem'] });
    },
  });
}

export function useApagarOtimizacao() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (v: { cliente_slug: string; data: string }) => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { error } = await (supabase.from as any)('otimizacoes_diarias')
        .delete().eq('cliente_slug', v.cliente_slug).eq('data', v.data);
      if (error) throw error;
    },
    onSuccess: (_d, v) => {
      qc.invalidateQueries({ queryKey: ['otimizacoes', v.cliente_slug] });
      qc.invalidateQueries({ queryKey: ['otimizacoes', 'contagem'] });
    },
  });
}

// ============ Link público permanente por cliente ============

export interface LinkPublico {
  cliente_slug: string;
  token: string;
  ativo: boolean;
}

export function useLinkPublico(clienteSlug: string) {
  return useQuery({
    queryKey: ['otimizacoes', 'link', clienteSlug],
    queryFn: async (): Promise<LinkPublico | null> => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data, error } = await (supabase.from as any)('otimizacoes_links_publicos')
        .select('*').eq('cliente_slug', clienteSlug).maybeSingle();
      if (error) throw error;
      return (data as LinkPublico | null) ?? null;
    },
    staleTime: 60_000,
  });
}

function novoToken(): string {
  const bytes = new Uint8Array(16);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('');
}

export function useGerarOuRotacionarLink() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (v: { cliente_slug: string; rotacionar?: boolean }): Promise<LinkPublico> => {
      const token = novoToken();
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data, error } = await (supabase.from as any)('otimizacoes_links_publicos').upsert({
        cliente_slug: v.cliente_slug,
        token,
        ativo: true,
      }, { onConflict: 'cliente_slug' }).select().single();
      if (error) throw error;
      return data as LinkPublico;
    },
    onSuccess: (_d, v) => {
      qc.invalidateQueries({ queryKey: ['otimizacoes', 'link', v.cliente_slug] });
    },
  });
}

// ============ Visão pública (sem auth) ============

export interface OtimizacaoPublica {
  cliente_slug: string;
  data: string;
  conteudo: string;
  anexos: Anexo[];
  updated_at: string;
}

export function useOtimizacoesPublicas(token: string | undefined) {
  return useQuery({
    queryKey: ['otimizacoes', 'publico', token],
    queryFn: async (): Promise<OtimizacaoPublica[]> => {
      if (!token) return [];
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data, error } = await (supabase as any).rpc('otimizacoes_por_token', { p_token: token });
      if (error) throw error;
      return ((data ?? []) as OtimizacaoPublica[]).map((o) => ({ ...o, anexos: o.anexos ?? [] }));
    },
    enabled: !!token,
    staleTime: 30_000,
  });
}

// ============ Upload de prints ============

export async function uploadPrint(clienteSlug: string, data: string, file: File): Promise<Anexo> {
  const ext = file.name.includes('.') ? file.name.slice(file.name.lastIndexOf('.')) : '';
  const path = `${clienteSlug}/${data}/${crypto.randomUUID()}${ext}`;
  const { error } = await supabase.storage.from('otimizacoes-prints').upload(path, file, {
    contentType: file.type || undefined,
    cacheControl: '3600',
    upsert: false,
  });
  if (error) throw error;
  const { data: pub } = supabase.storage.from('otimizacoes-prints').getPublicUrl(path);
  return { url: pub.publicUrl, nome: file.name };
}

export async function removerPrint(anexo: Anexo): Promise<void> {
  // Extrai o path após "/otimizacoes-prints/" da URL pública.
  const m = anexo.url.match(/\/otimizacoes-prints\/(.+)$/);
  if (!m) return;
  await supabase.storage.from('otimizacoes-prints').remove([m[1]]);
}
