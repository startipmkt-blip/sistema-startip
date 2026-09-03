// =============================================================
// parseMetaCsv — leitura best-effort de um CSV exportado do Meta.
// Soma as colunas de investimento e resultados e calcula o CPL.
// Os nomes de coluna do Meta variam (PT/EN); tentamos casar por
// palavras-chave. O programador pode ajustar o mapeamento ao
// formato exato que você exporta.
// =============================================================

export interface MetaCsvResumo {
  investimento: number;
  leads: number;
  cpl: number;
  linhas: number;
}

// Parser CSV simples com suporte a aspas.
function parseCsv(texto: string): string[][] {
  const linhas: string[][] = [];
  let campo = '';
  let linha: string[] = [];
  let aspas = false;
  for (let i = 0; i < texto.length; i++) {
    const c = texto[i];
    if (aspas) {
      if (c === '"' && texto[i + 1] === '"') { campo += '"'; i++; }
      else if (c === '"') aspas = false;
      else campo += c;
    } else if (c === '"') aspas = true;
    else if (c === ',' || c === ';') { linha.push(campo); campo = ''; }
    else if (c === '\n') { linha.push(campo); linhas.push(linha); linha = []; campo = ''; }
    else if (c !== '\r') campo += c;
  }
  if (campo.length || linha.length) { linha.push(campo); linhas.push(linha); }
  return linhas.filter((l) => l.some((c) => c.trim() !== ''));
}

function acharColuna(headers: string[], termos: string[]): number {
  const norm = headers.map((h) => h.toLowerCase());
  return norm.findIndex((h) => termos.some((t) => h.includes(t)));
}

function numero(v: string): number {
  if (!v) return 0;
  // Remove símbolos e trata vírgula decimal.
  const limpo = v.replace(/[^\d,.-]/g, '').replace(/\.(?=\d{3}(\D|$))/g, '').replace(',', '.');
  const n = parseFloat(limpo);
  return Number.isFinite(n) ? n : 0;
}

export function parseMetaCsv(texto: string): MetaCsvResumo {
  const linhas = parseCsv(texto);
  if (linhas.length < 2) return { investimento: 0, leads: 0, cpl: 0, linhas: 0 };

  const headers = linhas[0];
  const colInvest = acharColuna(headers, ['amount spent', 'valor usado', 'valor gasto', 'investimento', 'spend']);
  const colResult = acharColuna(headers, ['results', 'resultados', 'leads', 'conversions', 'conversões', 'compras', 'purchases']);

  let investimento = 0;
  let leads = 0;
  const dados = linhas.slice(1);
  for (const l of dados) {
    if (colInvest >= 0) investimento += numero(l[colInvest]);
    if (colResult >= 0) leads += numero(l[colResult]);
  }
  const cpl = leads > 0 ? Number((investimento / leads).toFixed(2)) : 0;
  return { investimento: Number(investimento.toFixed(2)), leads: Math.round(leads), cpl, linhas: dados.length };
}
