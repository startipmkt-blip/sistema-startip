import { useEffect, useState } from 'react';
import { urlDoArquivo, type BucketId } from '@/shared/lib/storage';

interface Props {
  bucket: BucketId;
  /** path guardado no BD (ex.: "<cliente_id>/<uuid>-nome.pdf"). */
  path: string | null | undefined;
  /** rótulo mostrado antes do nome do arquivo. */
  prefixo?: string;
  className?: string;
}

// Resolve o path do storage em uma URL utilizável (signed URL nos
// buckets privados, public URL nos buckets públicos) e mostra como
// link. Se o path já é uma URL absoluta (retrocompatibilidade com
// registros antigos), usa como está.
export function AnexoLink({ bucket, path, prefixo = '📎', className }: Props) {
  const [href, setHref] = useState<string | null>(null);
  const [erro, setErro] = useState<string | null>(null);

  useEffect(() => {
    if (!path) { setHref(null); return; }
    if (/^https?:\/\//i.test(path)) { setHref(path); return; }
    let cancelado = false;
    urlDoArquivo(bucket, path)
      .then((u) => { if (!cancelado) setHref(u); })
      .catch((e) => { if (!cancelado) setErro((e as Error).message || 'erro ao gerar link'); });
    return () => { cancelado = true; };
  }, [bucket, path]);

  if (!path) return null;

  const nomeVisivel = path.includes('/')
    ? path.slice(path.lastIndexOf('/') + 1).replace(/^[0-9a-f-]{36}-/i, '')
    : path;

  if (erro) {
    return (
      <span className={className} title={erro}>
        {prefixo} {nomeVisivel} <span className="text-red-400">(erro)</span>
      </span>
    );
  }

  if (!href) {
    return <span className={className}>{prefixo} {nomeVisivel}</span>;
  }

  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className={className}
    >
      {prefixo} {nomeVisivel}
    </a>
  );
}
