import type { IdeaDraft, IdeaType } from '@/modules/ideias-vip/types';

export interface LinhaImport {
  linha: number;
  dados: IdeaDraft;
  erros: string[];
}

const semAcento = (s: string) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().trim().replace(/[\s-]+/g, '_');

const TIPOS: Record<string, IdeaType> = {
  bom_dia: 'bom_dia', bomdia: 'bom_dia',
  valor: 'valor', conteudo: 'valor', conteudo_de_valor: 'valor',
  enquete: 'enquete',
  enredo: 'enredo',
  oferta: 'oferta',
  teaser: 'teaser',
  boa_noite: 'boa_noite', boanoite: 'boa_noite',
  outro: 'outro', outros: 'outro',
};

export function normalizarTipo(v: string): IdeaType | null {
  return TIPOS[semAcento(v)] ?? null;
}

const CABECALHOS: Record<string, string> = {
  data: 'data', dia: 'data',
  horario: 'horario', hora: 'horario',
  tipo: 'tipo',
  tema: 'tema',
  titulo: 'titulo',
  texto: 'texto', mensagem: 'texto', copy: 'texto',
  midia: 'midia', imagem: 'midia',
};

// Lê CSV ou texto colado de planilha (separador vírgula, ponto e vírgula ou tab), com aspas.
export function lerTabela(texto: string): string[][] {
  const limpo = (texto.charCodeAt(0) === 0xfeff ? texto.slice(1) : texto).replace(/\r\n?/g, '\n');
  const primeira = limpo.split('\n', 1)[0] ?? '';
  const cont = (c: string) => primeira.split(c).length - 1;
  const sep = cont('\t') > 0 ? '\t' : cont(';') > cont(',') ? ';' : ',';
  const linhas: string[][] = [];
  let campo = '';
  let linha: string[] = [];
  let aspas = false;
  for (let i = 0; i < limpo.length; i++) {
    const c = limpo[i];
    if (aspas) {
      if (c === '"' && limpo[i + 1] === '"') { campo += '"'; i++; } else if (c === '"') aspas = false; else campo += c;
    } else if (c === '"') aspas = true;
    else if (c === sep) { linha.push(campo); campo = ''; } else if (c === '\n') {
      linha.push(campo); campo = '';
      linhas.push(linha); linha = [];
    } else campo += c;
  }
  linha.push(campo);
  linhas.push(linha);
  return linhas.filter((l) => l.some((c) => c.trim()));
}

function lerData(v: string, anoPadrao: number): string | null | 'invalida' {
  const s = v.trim();
  if (!s) return null;
  let d: number; let m: number; let a: number;
  let r = /^(\d{4})-(\d{1,2})-(\d{1,2})$/.exec(s);
  if (r) { a = +r[1]; m = +r[2]; d = +r[3]; } else {
    r = /^(\d{1,2})[/.-](\d{1,2})(?:[/.-](\d{2,4}))?$/.exec(s);
    if (!r) return 'invalida';
    d = +r[1]; m = +r[2]; a = r[3] ? (+r[3] < 100 ? 2000 + +r[3] : +r[3]) : anoPadrao;
  }
  const dt = new Date(a, m - 1, d);
  if (dt.getFullYear() !== a || dt.getMonth() !== m - 1 || dt.getDate() !== d) return 'invalida';
  return `${a}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
}

function lerHora(v: string): string | null | 'invalida' {
  const s = v.trim().toLowerCase();
  if (!s) return null;
  const r = /^(\d{1,2})(?:[:h](\d{2})?)?$/.exec(s);
  if (!r) return 'invalida';
  const h = +r[1]; const min = r[2] ? +r[2] : 0;
  if (h > 23 || min > 59) return 'invalida';
  return `${String(h).padStart(2, '0')}:${String(min).padStart(2, '0')}`;
}

export function interpretar(texto: string, anoPadrao: number): { linhas: LinhaImport[]; erroGeral?: string } {
  const tabela = lerTabela(texto);
  if (tabela.length < 2) return { linhas: [], erroGeral: 'Não encontrei linhas. A primeira linha precisa ter os nomes das colunas.' };
  const cols = tabela[0].map((h) => CABECALHOS[semAcento(h)] ?? '');
  if (!cols.includes('texto')) return { linhas: [], erroGeral: 'Falta a coluna "texto" na primeira linha.' };
  const linhas = tabela.slice(1).map((cel, n): LinhaImport => {
    const v = (nome: string) => (cel[cols.indexOf(nome)] ?? '').trim();
    const erros: string[] = [];
    const tipoBruto = v('tipo');
    const tipo = tipoBruto ? normalizarTipo(tipoBruto) : 'outro';
    if (!tipo) erros.push(`Tipo inválido: "${tipoBruto}"`);
    const data = cols.includes('data') ? lerData(v('data'), anoPadrao) : null;
    if (data === 'invalida') erros.push(`Data inválida: "${v('data')}"`);
    const hora = cols.includes('horario') ? lerHora(v('horario')) : null;
    if (hora === 'invalida') erros.push(`Horário inválido: "${v('horario')}"`);
    const body = v('texto');
    if (!body) erros.push('Texto vazio');
    return {
      linha: n + 2,
      erros,
      dados: {
        type: tipo ?? 'outro',
        title: v('titulo') || null,
        body,
        media_suggestion: v('midia') || null,
        theme: v('tema') || null,
        suggested_date: data === 'invalida' ? null : data,
        suggested_time: hora === 'invalida' ? null : hora,
      },
    };
  });
  return { linhas };
}

export function modeloCsv(): string {
  const aspas = (s: string) => `"${s.replace(/"/g, '""')}"`;
  const linhas = [
    ['data', 'horario', 'tipo', 'tema', 'titulo', 'texto', 'midia'],
    ['02/11/2026', '07:30', 'Bom dia', 'Início de semana', 'Bom dia VIP', 'Bom dia, pessoal. Começando a semana com tudo.', 'Foto da loja'],
    ['03/11/2026', '12:30', 'Enquete', 'Preferência', 'Qual você prefere?', 'Qual você prefere: [OPÇÃO A] ou [OPÇÃO B]?', ''],
    ['05/11/2026', '15:30', 'Oferta', 'Oferta da semana', 'Oferta VIP', 'Oferta exclusiva do grupo: [PRODUTO] por [VALOR].', 'Foto do produto'],
    ['05/11/2026', '21:00', 'Boa noite', '', '', 'Boa noite, pessoal. Até amanhã.', ''],
  ];
  return String.fromCharCode(0xfeff) + linhas.map((l) => l.map(aspas).join(';')).join('\r\n');
}

export const temPendencia = (texto: string) => /\[[^\]]+\]/.test(texto);
export const pendencias = (texto: string) => texto.match(/\[[^\]]+\]/g) ?? [];

export function dataLocal(d = new Date()): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

export function segundaDaSemana(iso: string): string {
  const [a, m, d] = iso.split('-').map(Number);
  const dt = new Date(a, m - 1, d);
  dt.setDate(dt.getDate() - ((dt.getDay() + 6) % 7));
  return dataLocal(dt);
}

export function formatarDia(iso: string, curto = false): string {
  const [a, m, d] = iso.split('-').map(Number);
  return new Intl.DateTimeFormat('pt-BR', curto
    ? { weekday: 'short', day: '2-digit', month: '2-digit' }
    : { weekday: 'long', day: '2-digit', month: 'long' }).format(new Date(a, m - 1, d));
}
