// =============================================================
// Texto rico dos formulários (negrito, itálico, listas, cor...).
// É guardado como HTML nas mesmas colunas de texto. Textos antigos (sem tags)
// continuam válidos: são tratados como texto simples com quebras de linha.
// Tudo que vai para a tela passa por `sanitizar` (só tags e estilos permitidos).
// =============================================================

const TAGS_PERMITIDAS = new Set([
  'P', 'BR', 'DIV', 'B', 'STRONG', 'I', 'EM', 'U', 'S', 'STRIKE', 'DEL', 'OL', 'UL', 'LI',
  'BLOCKQUOTE', 'A', 'H1', 'H2', 'H3', 'SPAN', 'FONT',
]);
// Conteúdo dessas tags é descartado junto (não vira texto solto).
const TAGS_DESCARTADAS = new Set(['SCRIPT', 'STYLE', 'IFRAME', 'OBJECT', 'EMBED', 'NOSCRIPT', 'TEMPLATE', 'SVG', 'MATH']);
const COR_VALIDA = /^(#[0-9a-f]{3,8}|rgba?\([\d\s.,%]+\)|[a-z]+)$/i;

/** O texto já é HTML do editor (e não texto simples antigo)? */
export function ehHtml(valor: string | null | undefined): boolean {
  return Boolean(valor && /<(p|br|div|b|strong|i|em|u|s|ol|ul|li|blockquote|a|h[1-3]|span|font)\b[^>]*>/i.test(valor));
}

function escapar(t: string) {
  return t.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

/** Texto simples → HTML do editor (cada linha vira uma linha; links ficam clicáveis). */
export function paraHtml(valor: string | null | undefined): string {
  if (!valor) return '';
  if (ehHtml(valor)) return valor;
  return escapar(valor)
    .split('\n')
    .map((l) => (l ? `<div>${l.replace(/(https?:\/\/[^\s<]+)/g, '<a href="$1">$1</a>')}</div>` : '<div><br></div>'))
    .join('');
}

function limparNo(no: Node, doc: Document): Node | null {
  if (no.nodeType === Node.TEXT_NODE) return doc.createTextNode(no.textContent ?? '');
  if (no.nodeType !== Node.ELEMENT_NODE) return null;
  const el = no as HTMLElement;
  const tag = el.tagName.toUpperCase();
  if (TAGS_DESCARTADAS.has(tag)) return null;

  const filhos = Array.from(el.childNodes).map((c) => limparNo(c, doc)).filter((c): c is Node => c !== null);
  if (!TAGS_PERMITIDAS.has(tag)) {
    // Tag desconhecida (ex.: <table> colado do Word): mantém só o conteúdo.
    const frag = doc.createDocumentFragment();
    filhos.forEach((f) => frag.appendChild(f));
    return frag;
  }

  const novo = doc.createElement(tag === 'FONT' ? 'span' : tag.toLowerCase());
  if (tag === 'A') {
    const href = el.getAttribute('href') ?? '';
    if (/^(https?:|mailto:|tel:|\/)/i.test(href.trim())) {
      novo.setAttribute('href', href.trim());
      novo.setAttribute('target', '_blank');
      novo.setAttribute('rel', 'noopener noreferrer');
    }
  }
  // Única formatação de estilo aceita: cor do texto.
  const cor = tag === 'FONT' ? el.getAttribute('color') : el.style?.color;
  if (cor && COR_VALIDA.test(cor.trim())) (novo as HTMLElement).style.color = cor.trim();
  filhos.forEach((f) => novo.appendChild(f));
  return novo;
}

/** Remove tudo que não for formatação permitida (scripts, eventos, estilos, iframes...). */
export function sanitizar(html: string): string {
  if (typeof DOMParser === 'undefined') return escapar(html);
  const doc = new DOMParser().parseFromString(`<body>${html}</body>`, 'text/html');
  const saida = doc.createElement('div');
  Array.from(doc.body.childNodes).forEach((c) => {
    const l = limparNo(c, doc);
    if (l) saida.appendChild(l);
  });
  return saida.innerHTML;
}

/** Texto puro para prévias de card, PDFs, busca e mensagens. Mantém quebras de linha e marca listas com "•". */
export function textoPuro(valor: string | null | undefined): string {
  if (!valor) return '';
  if (!ehHtml(valor)) return valor;
  if (typeof DOMParser === 'undefined') return valor.replace(/<[^>]+>/g, '');
  const doc = new DOMParser().parseFromString(`<body>${valor}</body>`, 'text/html');
  const partes: string[] = [];
  function andar(no: Node, numeroLista?: { n: number }) {
    if (no.nodeType === Node.TEXT_NODE) { partes.push(no.textContent ?? ''); return; }
    if (no.nodeType !== Node.ELEMENT_NODE) return;
    const el = no as HTMLElement;
    const tag = el.tagName;
    if (tag === 'BR') { partes.push('\n'); return; }
    if (tag === 'OL') { const c = { n: 0 }; el.childNodes.forEach((f) => andar(f, c)); return; }
    if (tag === 'LI') {
      partes.push(numeroLista ? `${++numeroLista.n}. ` : '• ');
      el.childNodes.forEach((f) => andar(f));
      partes.push('\n');
      return;
    }
    const bloco = /^(P|DIV|H[1-3]|BLOCKQUOTE|UL)$/.test(tag);
    if (bloco && partes.length && !partes[partes.length - 1].endsWith('\n')) partes.push('\n');
    el.childNodes.forEach((f) => andar(f, tag === 'UL' ? undefined : numeroLista));
    if (bloco && !partes[partes.length - 1]?.endsWith('\n')) partes.push('\n');
  }
  doc.body.childNodes.forEach((n) => andar(n));
  return partes.join('').replace(/\n{3,}/g, '\n\n').trim();
}

/** Vazio de verdade? (o editor deixa "<div><br></div>" quando o usuário apaga tudo). */
export function textoVazio(valor: string | null | undefined): boolean {
  return !textoPuro(valor).trim();
}
