import { useMemo } from 'react';
import { Linkify } from '@/shared/ui/Linkify';
import { ehHtml, sanitizar } from './regras';

/** Mostra um texto do editor: HTML formatado (sempre limpo) ou texto simples antigo com quebras de linha. */
export function TextoRico({ texto, className = '' }: { texto: string | null | undefined; className?: string }) {
  const html = useMemo(() => (texto && ehHtml(texto) ? sanitizar(texto) : null), [texto]);
  if (!texto) return null;
  if (html === null) {
    return <div className={`whitespace-pre-line ${className}`}><Linkify texto={texto} /></div>;
  }
  // eslint-disable-next-line react/no-danger -- conteúdo passou por sanitizar (lista fechada de tags; sem scripts, eventos ou estilos além de cor).
  return <div className={`texto-rico ${className}`} dangerouslySetInnerHTML={{ __html: html }} />;
}
