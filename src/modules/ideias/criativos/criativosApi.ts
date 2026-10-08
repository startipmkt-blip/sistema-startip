import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/shared/lib/supabaseClient';
import { IS_DEMO } from '@/shared/lib/env';
import { uploadArquivo, urlDoArquivo, removerArquivo } from '@/shared/lib/storage';
import type { Criativo, CriativoAnexo, CriativoDados, CriativoStatus } from './types';
import { EXTENSOES_OK, MAX_ANEXO_MB } from './types';

const BUCKET = 'anexos-internos' as const;

// Tabelas novas ainda nao estao no tipo Database gerado.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const tbl = (nome: string) => (supabase.from as any)(nome);

const criativosKeys = {
  all: ['ideias-criativos'] as const,
  doCliente: (id: string) => ['ideias-criativos', 'cliente', id] as const,
};

interface LinhaBanco extends Omit<Criativo, 'cliente_ids'> {
  ideias_criativos_clientes?: { cliente_id: string }[];
}

function mapear(l: LinhaBanco): Criativo {
  const { ideias_criativos_clientes, ...resto } = l;
  return {
    ...resto,
    anexos: Array.isArray(resto.anexos) ? resto.anexos : [],
    cliente_ids: (ideias_criativos_clientes ?? []).map((r) => r.cliente_id),
  };
}

async function fetchCriativos(): Promise<Criativo[]> {
  if (IS_DEMO) return [];
  const { data, error } = await tbl('ideias_criativos')
    .select('*, ideias_criativos_clientes(cliente_id)')
    .order('data_ideia', { ascending: false })
    .order('created_at', { ascending: false });
  if (error) throw error;
  return ((data ?? []) as LinhaBanco[]).map(mapear);
}

export function useCriativos() {
  return useQuery({ queryKey: criativosKeys.all, queryFn: fetchCriativos });
}

/** Ideias de criativos marcadas para um cliente (usado no detalhe do cliente). */
export function useCriativosDoCliente(clienteId: string | undefined) {
  return useQuery({
    queryKey: criativosKeys.doCliente(clienteId ?? ''),
    enabled: Boolean(clienteId) && !IS_DEMO,
    queryFn: async (): Promise<Pick<Criativo, 'id' | 'titulo' | 'status' | 'formato' | 'data_ideia'>[]> => {
      const { data, error } = await tbl('ideias_criativos_clientes')
        .select('ideias_criativos(id, titulo, status, formato, data_ideia)')
        .eq('cliente_id', clienteId);
      if (error) throw error;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      return ((data ?? []) as any[])
        .map((r) => r.ideias_criativos)
        .filter(Boolean)
        .sort((a, b) => String(b.data_ideia).localeCompare(String(a.data_ideia)));
    },
  });
}

async function salvarCriativo(p: { id?: string; dados: CriativoDados }): Promise<string> {
  if (IS_DEMO) return p.id ?? 'demo';
  const { cliente_ids, ...campos } = p.dados;
  const payload = { ...campos, updated_at: new Date().toISOString() };

  let id = p.id;
  if (id) {
    const { error } = await tbl('ideias_criativos').update(payload).eq('id', id);
    if (error) throw error;
  } else {
    const { data, error } = await tbl('ideias_criativos').insert(payload).select('id').single();
    if (error) throw error;
    id = (data as { id: string }).id;
  }

  const { error: eDel } = await tbl('ideias_criativos_clientes').delete().eq('ideia_id', id);
  if (eDel) throw eDel;
  if (!campos.geral && cliente_ids.length > 0) {
    const { error: eIns } = await tbl('ideias_criativos_clientes').insert(
      cliente_ids.map((cliente_id) => ({ ideia_id: id, cliente_id })),
    );
    if (eIns) throw eIns;
  }
  return id as string;
}

async function excluirCriativo(c: Criativo): Promise<void> {
  if (IS_DEMO) return;
  const { error } = await tbl('ideias_criativos').delete().eq('id', c.id);
  if (error) throw error;
  for (const a of c.anexos) {
    try { await removerArquivo(BUCKET, a.path); } catch { /* arquivo orfao nao bloqueia */ }
  }
}

async function copiarAnexo(a: CriativoAnexo): Promise<CriativoAnexo | null> {
  const nome = a.path.split('/').pop() ?? a.name;
  const resto = nome.includes('-') ? nome.slice(nome.indexOf('-') + 1) : nome;
  const novoPath = `_/${crypto.randomUUID()}-${resto}`;
  const { error } = await supabase.storage.from(BUCKET).copy(a.path, novoPath);
  return error ? null : { ...a, path: novoPath };
}

async function duplicarCriativo(c: Criativo): Promise<string> {
  const anexos: CriativoAnexo[] = [];
  for (const a of c.anexos) {
    const copia = await copiarAnexo(a);
    if (copia) anexos.push(copia);
  }
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { id, created_at, updated_at, ...base } = c;
  return salvarCriativo({
    dados: { ...base, titulo: `${c.titulo} (cópia)`, status: 'nova', anexos },
  });
}

async function mudarStatus(p: { id: string; status: CriativoStatus }): Promise<void> {
  if (IS_DEMO) return;
  const { error } = await tbl('ideias_criativos')
    .update({ status: p.status, updated_at: new Date().toISOString() })
    .eq('id', p.id);
  if (error) throw error;
}

function useInvalidar() {
  const qc = useQueryClient();
  return () => qc.invalidateQueries({ queryKey: criativosKeys.all });
}

export function useSalvarCriativo() {
  const invalidar = useInvalidar();
  return useMutation({ mutationFn: salvarCriativo, onSuccess: invalidar });
}
export function useExcluirCriativo() {
  const invalidar = useInvalidar();
  return useMutation({ mutationFn: excluirCriativo, onSuccess: invalidar });
}
export function useDuplicarCriativo() {
  const invalidar = useInvalidar();
  return useMutation({ mutationFn: duplicarCriativo, onSuccess: invalidar });
}
export function useMudarStatusCriativo() {
  const invalidar = useInvalidar();
  return useMutation({ mutationFn: mudarStatus, onSuccess: invalidar });
}

// ---------- Anexos ----------
export function validarArquivo(file: File): string | null {
  const ext = file.name.split('.').pop()?.toLowerCase() ?? '';
  if (!EXTENSOES_OK.includes(ext)) return `"${file.name}": tipo não permitido.`;
  if (file.size > MAX_ANEXO_MB * 1024 * 1024) return `"${file.name}": acima de ${MAX_ANEXO_MB} MB.`;
  return null;
}

export async function enviarAnexo(file: File): Promise<CriativoAnexo> {
  const { path } = await uploadArquivo({ bucket: BUCKET, file });
  return { path, name: file.name, type: file.type || 'application/octet-stream', size: file.size };
}

export async function descartarAnexo(path: string): Promise<void> {
  try { await removerArquivo(BUCKET, path); } catch { /* best effort */ }
}

export function useUrlAnexo(path: string | undefined) {
  return useQuery({
    queryKey: ['ideias-criativos', 'url', path],
    enabled: Boolean(path) && !IS_DEMO,
    staleTime: 50 * 60 * 1000,
    queryFn: () => urlDoArquivo(BUCKET, path as string),
  });
}

export async function urlParaBaixar(a: CriativoAnexo): Promise<string> {
  const { data, error } = await supabase.storage
    .from(BUCKET)
    .createSignedUrl(a.path, 60 * 60, { download: a.name });
  if (error) throw error;
  return data.signedUrl;
}
