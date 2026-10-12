import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/shared/lib/supabaseClient';
import { uploadArquivo, removerArquivo } from '@/shared/lib/storage';
import type { CriativoAnexo } from '@/modules/ideias/criativos/types';

export interface ArquivoIdentidade extends CriativoAnexo {
  id: string;
  cliente_id: string;
  created_at: string;
}

export const MAX_IDENTIDADE_MB = 50;

// Tipos aceitos: imagens, vetores/projetos de design, fontes, documentos e compactados.
const EXTENSOES = [
  'png', 'jpg', 'jpeg', 'webp', 'gif', 'svg', 'pdf', 'ai', 'eps', 'psd', 'indd', 'fig', 'sketch',
  'zip', 'rar', '7z', 'ttf', 'otf', 'woff', 'woff2',
  'doc', 'docx', 'ppt', 'pptx', 'xls', 'xlsx', 'txt', 'mp4', 'mov',
];

export const ACCEPT_IDENTIDADE = EXTENSOES.map((e) => `.${e}`).join(',');

export function validarIdentidade(file: File): string | null {
  const ext = file.name.split('.').pop()?.toLowerCase() ?? '';
  if (!EXTENSOES.includes(ext)) return `"${file.name}": tipo não permitido (.${ext || '?'}).`;
  if (file.size > MAX_IDENTIDADE_MB * 1024 * 1024) return `"${file.name}": acima de ${MAX_IDENTIDADE_MB} MB.`;
  return null;
}

// A tabela ainda não está no tipo gerado do banco.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const tabela = () => (supabase.from as any)('cliente_identidade_arquivos');

const chave = (clienteId: string) => ['cliente-perfil', 'identidade', clienteId] as const;

export function useArquivosIdentidade(clienteId: string) {
  return useQuery({
    queryKey: chave(clienteId),
    queryFn: async (): Promise<ArquivoIdentidade[]> => {
      const { data, error } = await tabela()
        .select('id, cliente_id, path, name, type, size, created_at')
        .eq('cliente_id', clienteId)
        .order('created_at', { ascending: true });
      if (error) throw error;
      return (data ?? []) as ArquivoIdentidade[];
    },
  });
}

export function useEnviarIdentidade(clienteId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (file: File) => {
      const { path } = await uploadArquivo({ bucket: 'anexos-internos', clienteId, file });
      const { error } = await tabela().insert({
        cliente_id: clienteId,
        path,
        name: file.name,
        type: file.type || 'application/octet-stream',
        size: file.size,
      });
      if (error) {
        await removerArquivo('anexos-internos', path); // não deixa arquivo órfão
        throw error;
      }
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: chave(clienteId) }),
  });
}

export function useExcluirIdentidade(clienteId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (a: ArquivoIdentidade) => {
      const { error } = await tabela().delete().eq('id', a.id);
      if (error) throw error;
      await removerArquivo('anexos-internos', a.path).catch(() => undefined);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: chave(clienteId) }),
  });
}
