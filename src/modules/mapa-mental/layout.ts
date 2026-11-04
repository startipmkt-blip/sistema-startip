import type { NoMapa } from './types';

export interface Caixa {
  no: NoMapa;
  x: number;
  y: number;
  w: number;
  h: number;
  linhas: string[];
  /** Filhos escondidos por "Recolher". */
  ocultos: number;
}

const ESPACO_X = 72;
const ESPACO_Y = 18;
const MIN_W = 150;
const MAX_W = 260;
const PAD_X = 46; // ícone + menu
const LINHA = 20;

/** Quebra o texto em linhas pela largura estimada (≈7,6px por caractere a 14px). */
function quebrar(texto: string, larguraUtil: number, negrito: boolean): string[] {
  const porChar = negrito ? 8.2 : 7.6;
  const max = Math.max(8, Math.floor(larguraUtil / porChar));
  const linhas: string[] = [];
  for (const paragrafo of (texto || ' ').split('\n')) {
    let atual = '';
    for (const palavra of paragrafo.split(' ')) {
      const teste = atual ? `${atual} ${palavra}` : palavra;
      if (teste.length > max && atual) { linhas.push(atual); atual = palavra; } else atual = teste;
    }
    linhas.push(atual);
  }
  return linhas;
}

export function temDetalhes(no: NoMapa) {
  return Boolean(no.status || no.data || no.nota || no.vinculo || no.links.length);
}

/** Árvore horizontal: raiz à esquerda, filhos empilhados à direita, cada pai centrado nos filhos. */
export function calcularLayout(
  nos: NoMapa[],
  /** Arraste em andamento: soma um deslocamento extra a um nó (e à subárvore dele) antes de gravar. */
  extra?: { id: string; dx: number; dy: number } | null,
): { caixas: Caixa[]; largura: number; altura: number; minX: number; minY: number } {
  const filhos = new Map<string | null, NoMapa[]>();
  for (const n of nos) {
    const l = filhos.get(n.pai) ?? [];
    l.push(n);
    filhos.set(n.pai, l);
  }
  const medidas = new Map<string, { w: number; h: number; linhas: string[] }>();
  for (const n of nos) {
    const porChar = n.negrito ? 8.2 : 7.6;
    const natural = (n.texto || ' ').split('\n').reduce((m, l) => Math.max(m, l.length), 0) * porChar + PAD_X + (n.icone ? 22 : 0);
    const w = Math.min(MAX_W, Math.max(MIN_W, natural));
    const linhas = quebrar(n.texto, w - PAD_X - (n.icone ? 22 : 0), n.negrito);
    const h = 18 + linhas.length * LINHA + (temDetalhes(n) ? 22 : 0) + (n.pai === null ? 6 : 0);
    medidas.set(n.id, { w, h, linhas });
  }

  const altSub = new Map<string, number>();
  function altura(n: NoMapa): number {
    const m = medidas.get(n.id)!;
    const fs = n.recolhido ? [] : filhos.get(n.id) ?? [];
    const soma = fs.reduce((s, f, i) => s + altura(f) + (i ? ESPACO_Y : 0), 0);
    const a = Math.max(m.h, soma);
    altSub.set(n.id, a);
    return a;
  }

  const caixas: Caixa[] = [];
  function posicionar(n: NoMapa, x: number, topo: number) {
    const m = medidas.get(n.id)!;
    const a = altSub.get(n.id)!;
    const todos = filhos.get(n.id) ?? [];
    caixas.push({ no: n, x, y: topo + (a - m.h) / 2, w: m.w, h: m.h, linhas: m.linhas, ocultos: n.recolhido ? contar(n.id) : 0 });
    if (n.recolhido) return;
    const soma = todos.reduce((s, f, i) => s + altSub.get(f.id)! + (i ? ESPACO_Y : 0), 0);
    let y = topo + (a - soma) / 2;
    for (const f of todos) {
      posicionar(f, x + m.w + ESPACO_X, y);
      y += altSub.get(f.id)! + ESPACO_Y;
    }
  }
  function contar(id: string): number {
    return (filhos.get(id) ?? []).reduce((s, f) => s + 1 + contar(f.id), 0);
  }

  let topo = 0;
  for (const raiz of filhos.get(null) ?? []) {
    altura(raiz);
    posicionar(raiz, 0, topo);
    topo += altSub.get(raiz.id)! + 60;
  }
  // Posição manual: o deslocamento de cada nó vale para ele e para todos os descendentes.
  const porId = new Map(nos.map((n) => [n.id, n]));
  const acumulado = new Map<string, { dx: number; dy: number }>();
  function deslocamento(n: NoMapa): { dx: number; dy: number } {
    const salvo = acumulado.get(n.id);
    if (salvo) return salvo;
    const pai = n.pai ? porId.get(n.pai) : undefined;
    const base = pai ? deslocamento(pai) : { dx: 0, dy: 0 };
    const extraAqui = extra && extra.id === n.id ? extra : { dx: 0, dy: 0 };
    const total = { dx: base.dx + (n.dx ?? 0) + extraAqui.dx, dy: base.dy + (n.dy ?? 0) + extraAqui.dy };
    acumulado.set(n.id, total);
    return total;
  }
  for (const c of caixas) {
    const d = deslocamento(c.no);
    c.x += d.dx;
    c.y += d.dy;
  }
  // Arrastado para a esquerda/cima pode ficar negativo: minX/minY dão os limites reais do desenho.
  const minX = Math.min(0, ...caixas.map((c) => c.x));
  const minY = Math.min(0, ...caixas.map((c) => c.y));
  const largura = caixas.reduce((m, c) => Math.max(m, c.x + c.w), 0);
  const alturaTotal = caixas.reduce((m, c) => Math.max(m, c.y + c.h), 0);
  return { caixas, largura, altura: alturaTotal, minX, minY };
}

export function descendentes(nos: NoMapa[], id: string): Set<string> {
  const saida = new Set<string>();
  const fila = [id];
  while (fila.length) {
    const atual = fila.shift()!;
    for (const n of nos) if (n.pai === atual && !saida.has(n.id)) { saida.add(n.id); fila.push(n.id); }
  }
  return saida;
}
