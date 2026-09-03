// =============================================================
// storage.ts — Upload de arquivos para o Supabase Storage.
// =============================================================
// Convenção de PATH em buckets escopados a cliente:
//   <cliente_id>/<uuid>-<nome-sanitizado>.<ext>
// A primeira "pasta" do path é o UUID do cliente. É essa convenção
// que as policies em 0005_storage.sql usam para autorizar acesso.
// =============================================================
import { supabase } from '@/shared/lib/supabaseClient';
import { IS_DEMO } from '@/shared/lib/env';

export type BucketId =
  | 'logos-clientes'
  | 'relatorios'
  | 'materiais-cliente'
  | 'reunioes'
  | 'anexos-internos';

interface UploadParams {
  bucket: BucketId;
  clienteId?: string; // obrigatório para buckets privados
  file: File;
}

interface UploadResult {
  /** path relativo dentro do bucket (o que fica salvo no BD). */
  path: string;
  /** URL usada para exibir (public URL nos buckets públicos, signed URL nos privados). */
  url: string;
}

// Remove caracteres perigosos e limita comprimento do nome do arquivo.
function sanitizarNome(nome: string): string {
  const semAcento = nome.normalize('NFD').replace(/[̀-ͯ]/g, '');
  return semAcento
    .replace(/[^\w.-]+/g, '_')
    .replace(/_+/g, '_')
    .slice(0, 100);
}

function extensao(nome: string): string {
  const i = nome.lastIndexOf('.');
  return i >= 0 ? nome.slice(i) : '';
}

/**
 * Faz upload de um arquivo. Em Modo Demo, retorna um object URL local
 * (o modo demo não conversa com o Supabase).
 */
export async function uploadArquivo(p: UploadParams): Promise<UploadResult> {
  const { bucket, clienteId, file } = p;

  if (IS_DEMO) {
    // Sem servidor: usa Object URL local só para conseguir exibir/testar.
    return { path: file.name, url: URL.createObjectURL(file) };
  }

  if (bucket !== 'logos-clientes' && bucket !== 'anexos-internos' && !clienteId) {
    throw new Error(`Upload em bucket privado (${bucket}) exige clienteId.`);
  }

  const nome = sanitizarNome(file.name.replace(extensao(file.name), ''));
  const ext = extensao(file.name);
  const path = clienteId
    ? `${clienteId}/${crypto.randomUUID()}-${nome}${ext}`
    : `_/${crypto.randomUUID()}-${nome}${ext}`;

  const { error } = await supabase.storage.from(bucket).upload(path, file, {
    upsert: false,
    contentType: file.type || undefined,
    cacheControl: '3600',
  });
  if (error) throw error;

  const url = await urlDoArquivo(bucket, path);
  return { path, url };
}

/**
 * Retorna a URL para exibir um arquivo já enviado. Bucket público usa
 * URL pública; buckets privados usam URL assinada (1 hora).
 */
export async function urlDoArquivo(bucket: BucketId, path: string): Promise<string> {
  if (IS_DEMO) return path;
  if (bucket === 'logos-clientes') {
    const { data } = supabase.storage.from(bucket).getPublicUrl(path);
    return data.publicUrl;
  }
  // anexos-internos: privado, mas equipe pode gerar signed URL.
  // Cai no fluxo padrão de signed URL abaixo.
  const { data, error } = await supabase.storage.from(bucket).createSignedUrl(path, 60 * 60);
  if (error) throw error;
  return data.signedUrl;
}

/**
 * Remove um arquivo. Usa quando o usuário desanexa antes de salvar
 * ou apaga o registro que apontava para ele.
 */
export async function removerArquivo(bucket: BucketId, path: string): Promise<void> {
  if (IS_DEMO) return;
  await supabase.storage.from(bucket).remove([path]);
}
