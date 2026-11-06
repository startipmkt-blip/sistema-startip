import { mesLabel } from '@/modules/gestao-conteudo/types';
import type { Roteiro } from './roteirosApi';
import { paraHtml, sanitizar } from '@/shared/ui/texto-rico/regras';

const AUDIO: Record<string, string> = {
  narracao: 'Narração', original: 'Áudio original', musica: 'Música', trend: 'Trend', sem: 'Sem áudio',
};


type Cor = [number, number, number];
type Run = { t: string; b?: boolean; i?: boolean; u?: boolean; s?: boolean; c?: Cor };
type Bloco = { runs: Run[]; indent: number; prefixo?: string };
type Estilo = Omit<Run, 't'>;
const COR_TEXTO: Cor = [30, 41, 59];

/** Qualquer cor CSS (hex, rgb, nome) → [r,g,b]. */
function corRgb(css: string): Cor | undefined {
  const ctx = document.createElement('canvas').getContext('2d');
  if (!ctx) return undefined;
  ctx.fillStyle = '#000000';
  ctx.fillStyle = css;
  const v = ctx.fillStyle;
  if (v.startsWith('#')) return [1, 3, 5].map((i) => parseInt(v.slice(i, i + 2), 16)) as Cor;
  const m = v.match(/\d+(\.\d+)?/g);
  return m ? ([0, 1, 2].map((i) => Math.round(Number(m[i]))) as Cor) : undefined;
}

/** HTML do editor → blocos com trechos formatados (negrito, itálico, cor, listas). */
function paraBlocos(valor: string): Bloco[] {
  const doc = new DOMParser().parseFromString(`<body>${sanitizar(paraHtml(valor))}</body>`, 'text/html');
  const blocos: Bloco[] = [];
  let atual: Bloco | null = null;
  const abrir = (indent: number, prefixo?: string) => { atual = { runs: [], indent, prefixo }; blocos.push(atual); };

  function andar(no: Node, est: Estilo, indent: number, lista?: { n: number }) {
    if (no.nodeType === Node.TEXT_NODE) {
      const t = (no.textContent ?? '').replace(/\s+/g, ' ');
      if (!t.trim() && !atual) return;
      if (!atual) abrir(indent);
      atual!.runs.push({ t, ...est });
      return;
    }
    if (no.nodeType !== Node.ELEMENT_NODE) return;
    const el = no as HTMLElement;
    const tag = el.tagName;
    if (tag === 'BR') { if (!atual) abrir(indent); atual!.runs.push({ t: '\n' }); return; }

    const e: Estilo = { ...est };
    if (/^(B|STRONG|H[1-3])$/.test(tag)) e.b = true;
    if (/^(I|EM)$/.test(tag)) e.i = true;
    if (tag === 'U') e.u = true;
    if (/^(S|STRIKE|DEL)$/.test(tag)) e.s = true;
    if (el.style?.color) { const c = corRgb(el.style.color); if (c) e.c = c; }

    if (tag === 'UL' || tag === 'OL') {
      atual = null;
      const ctx = tag === 'OL' ? { n: 0 } : undefined;
      el.childNodes.forEach((f) => andar(f, e, indent + 1, ctx));
      atual = null;
      return;
    }
    if (tag === 'LI') {
      atual = null;
      abrir(indent, lista ? `${++lista.n}.` : '•');
      el.childNodes.forEach((f) => andar(f, e, indent));
      atual = null;
      return;
    }
    if (/^(P|DIV|H[1-3]|BLOCKQUOTE)$/.test(tag)) {
      atual = null;
      el.childNodes.forEach((f) => andar(f, e, indent));
      atual = null;
      return;
    }
    el.childNodes.forEach((f) => andar(f, e, indent, lista));
  }
  doc.body.childNodes.forEach((n) => andar(n, {}, 0));
  return blocos.filter((b) => b.runs.length);
}

/** PDF com os roteiros filtrados: um bloco por roteiro, com briefing e cenas. */
export async function baixarPdfRoteiros(p: {
  titulo: string; mes: string; roteiros: Roteiro[];
  nomeCliente: (id: string) => string; nomePilar: (id: string | null) => string;
}) {
  const { jsPDF } = await import('jspdf');
  const doc = new jsPDF({ unit: 'mm', format: 'a4' });
  const L = 16, W = 178;
  let y = 18;
  const quebra = (h: number) => { if (y + h > 280) { doc.addPage(); y = 18; } };
  const linha = (t: string, tam: number, negrito = false, cinza = false) => {
    doc.setFont('helvetica', negrito ? 'bold' : 'normal');
    doc.setFontSize(tam);
    doc.setTextColor(...((cinza ? [90, 104, 117] : [30, 41, 59]) as [number, number, number]));
    for (const l of doc.splitTextToSize(t, W) as string[]) { quebra(tam * 0.5); doc.text(l, L, y); y += tam * 0.45; }
  };
  const rico = (valor: string, tam: number) => {
    const lh = tam * 0.45;
    const blocos = paraBlocos(valor);
    for (const b of blocos) {
      const x0 = L + b.indent * 5;
      const xt = b.prefixo ? x0 + 5 : x0;
      const maxX = L + W;
      // quebras de linha explícitas; a última, solta no fim do bloco, não cria linha extra
      let x = xt;
      const nova = () => { y += lh; quebra(lh); x = xt; };
      quebra(lh);
      if (b.prefixo) { doc.setFont('helvetica', 'normal'); doc.setFontSize(tam); doc.setTextColor(...COR_TEXTO); doc.text(b.prefixo, x0 + 1, y); }
      const runs = b.runs.slice();
      if (runs.length > 1 && runs[runs.length - 1].t === '\n') runs.pop();
      for (const r of runs) {
        if (r.t === '\n') { nova(); continue; }
        doc.setFont('helvetica', r.b && r.i ? 'bolditalic' : r.b ? 'bold' : r.i ? 'italic' : 'normal');
        doc.setFontSize(tam);
        doc.setTextColor(...(r.c ?? COR_TEXTO));
        doc.setDrawColor(...(r.c ?? COR_TEXTO));
        doc.setLineWidth(0.2);
        for (const w of r.t.match(/\S+|\s+/g) ?? []) {
          const ehEspaco = !w.trim();
          const larg = doc.getTextWidth(w);
          if (ehEspaco) { if (x > xt) x += larg; continue; }
          if (x + larg > maxX && x > xt) nova();
          doc.text(w, x, y);
          if (r.u) doc.line(x, y + 0.6, x + larg, y + 0.6);
          if (r.s) doc.line(x, y - tam * 0.12, x + larg, y - tam * 0.12);
          x += larg;
        }
      }
      y += lh;
    }
  };

  linha(p.titulo, 18, true);
  linha(mesLabel(p.mes), 11, false, true);
  y += 4;
  p.roteiros.forEach((r, k) => {
    quebra(20);
    linha(`${k + 1}. ${r.titulo}`, 12, true);
    linha([p.nomeCliente(r.cliente_id), r.tipo === 'trafego' ? 'Tráfego pago' : 'Orgânico', p.nomePilar(r.pilar_id),
      r.semana === 6 ? 'Conteúdo extra' : `Semana ${r.semana}`, r.status === 'concluido' ? 'Concluído' : 'Pendente'].filter(Boolean).join(' · '), 9, false, true);
    if (r.gatilhos.length) linha(`Gatilhos: ${r.gatilhos.join(', ')}`, 9.5);
    if (r.descricao) rico(r.descricao, 9.5);
    if (r.como_aplicar) { linha('Como aplicar:', 9.5, true); rico(r.como_aplicar, 9.5); }
    if (r.observacao) { linha('Observação:', 9.5, true); rico(r.observacao, 9.5); }
    r.cenas.forEach((c, i) => {
      linha(`Cena ${i + 1}: ${c.acontece}`, 9.5, true);
      if (c.fala) linha(`Fala: ${c.fala}`, 9.5);
      if (c.audio || c.foto_apoio) linha([c.audio && `Áudio: ${AUDIO[c.audio] ?? c.audio}`, c.foto_apoio && 'Precisa de foto de apoio'].filter(Boolean).join(' · '), 9, false, true);
    });
    if (r.legenda) { linha('Legenda:', 9.5, true); rico(r.legenda, 9.5); }
    y += 4;
  });
  doc.save(`roteiros-${p.mes}.pdf`);
}
