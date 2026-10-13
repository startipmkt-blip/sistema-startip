import type { ReactNode } from 'react';

const URL_RE = /(https?:\/\/[^\s<>"]+|www\.[^\s<>"]+)/gi;
// Pontuação colada no fim da frase não faz parte do link.
const SOBRA_RE = /[.,;:!?)\]}'"]+$/;

const LINK_CLS = 'break-all text-sky-400 underline decoration-sky-400/40 underline-offset-2 hover:text-sky-300';

interface Trecho { texto: string; href?: string }

function separar(texto: string): Trecho[] {
  const trechos: Trecho[] = [];
  let ultimo = 0;
  for (const m of texto.matchAll(URL_RE)) {
    const inicio = m.index ?? 0;
    const url = m[0].replace(SOBRA_RE, '');
    if (!url) continue;
    if (inicio > ultimo) trechos.push({ texto: texto.slice(ultimo, inicio) });
    trechos.push({ texto: url, href: /^https?:\/\//i.test(url) ? url : `https://${url}` });
    ultimo = inicio + url.length;
  }
  if (ultimo < texto.length) trechos.push({ texto: texto.slice(ultimo) });
  return trechos;
}

export function extrairLinks(texto: string | null | undefined): Array<{ texto: string; href: string }> {
  if (!texto) return [];
  const vistos = new Set<string>();
  const links: Array<{ texto: string; href: string }> = [];
  for (const t of separar(texto)) {
    if (!t.href || vistos.has(t.href)) continue;
    vistos.add(t.href);
    links.push({ texto: t.texto, href: t.href });
  }
  return links;
}

function Ancora({ href, children }: { href: string; children: ReactNode }) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className={LINK_CLS}
      // Dentro de cartão clicável: abre o link sem abrir o cartão.
      onClick={(e) => e.stopPropagation()}
    >
      {children}
    </a>
  );
}

/** Texto digitado pelo usuário com os links clicáveis (abre em nova aba). */
export function Linkify({ texto }: { texto: string | null | undefined }) {
  if (!texto) return null;
  return (
    <>
      {separar(texto).map((t, i) => (t.href ? <Ancora key={i} href={t.href}>{t.texto}</Ancora> : t.texto))}
    </>
  );
}

/** Campo de edição não tem link clicável: lista embaixo os links do texto. */
export function LinksDoCampo({ valor }: { valor: unknown }) {
  const links = extrairLinks(typeof valor === 'string' ? valor : null);
  if (links.length === 0) return null;
  return (
    <div className="flex flex-wrap gap-x-3 gap-y-1 text-xs">
      {links.map((l) => <Ancora key={l.href} href={l.href}>{l.texto}</Ancora>)}
    </div>
  );
}
