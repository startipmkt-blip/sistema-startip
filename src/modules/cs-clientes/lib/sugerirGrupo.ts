import type { GrupoWhatsapp } from '@/modules/cs-clientes/api/csClientesApi';

// Palavras que aparecem em quase todo nome de grupo e não identificam o cliente.
const GENERICAS = new Set([
  'marketing', 'trafego', 'pago', 'organico', 'startip', 'acoes', 'grupo', 'de', 'do', 'da', 'e',
  'informacoes', 'infos', 'casa', 'casas',
]);

function tokens(texto: string): string[] {
  return texto
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .split(/[^a-z0-9]+/)
    .filter((t) => t.length >= 2 && !GENERICAS.has(t));
}

function combina(a: string, b: string): boolean {
  if (a === b) return true;
  // "mariah" × "maria": aceita prefixo quando o trecho comum é longo o bastante.
  const [curto, longo] = a.length <= b.length ? [a, b] : [b, a];
  return curto.length >= 4 && longo.startsWith(curto);
}

/** Fração (0–1) das palavras do nome do cliente que aparecem no nome do grupo. */
function pontuar(nomeCliente: string, nomeGrupo: string): number {
  const tc = tokens(nomeCliente);
  const tg = tokens(nomeGrupo);
  if (tc.length === 0 || tg.length === 0) return 0;
  const achadas = tc.filter((t) => tg.some((g) => combina(t, g))).length;
  return achadas / tc.length;
}

/** Grupo mais provável para o cliente, ou null quando nenhum nome se parece o bastante. */
export function sugerirGrupo(nomeCliente: string, grupos: GrupoWhatsapp[]): GrupoWhatsapp | null {
  let melhor: GrupoWhatsapp | null = null;
  let melhorPts = 0;
  for (const g of grupos) {
    const pts = pontuar(nomeCliente, g.nome);
    // No empate, prefere o grupo de nome mais curto (menos chance de ser um grupo compartilhado).
    if (pts > melhorPts || (pts === melhorPts && pts > 0 && melhor && g.nome.length < melhor.nome.length)) {
      melhor = g;
      melhorPts = pts;
    }
  }
  return melhorPts >= 0.5 ? melhor : null;
}
