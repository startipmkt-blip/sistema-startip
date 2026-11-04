import type { Ideia } from '@/modules/gestao-conteudo/types';
import { STATUS_IDEIA, mesLabel } from '@/modules/gestao-conteudo/types';
import { textoPuro } from '@/shared/ui/texto-rico/regras';

interface Grupo { titulo: string; periodo?: string; itens: Ideia[] }

const FORMATO: Record<string, string> = { reels: 'Vídeo', carrossel: 'Carrossel', estatico: 'Imagem estática' };
const FUNIL: Record<string, string> = { topo: 'Topo', meio: 'Meio', fundo: 'Fundo', pos: 'Pós-vendas' };

/** PDF da linha editorial do mês: uma seção por semana, com o briefing de cada item. */
export async function baixarPdfLinhaEditorial(p: {
  clienteNome: string; mes: string; grupos: Grupo[]; pilarNome: (id: string | null | undefined) => string;
}) {
  const { jsPDF } = await import('jspdf');
  const doc = new jsPDF({ unit: 'mm', format: 'a4' });
  const L = 16, W = 210 - 32;
  let y = 18;

  function quebra(alt: number) {
    if (y + alt > 280) { doc.addPage(); y = 18; }
  }
  function texto(t: string, tam: number, estilo: 'normal' | 'bold' = 'normal', cor: [number, number, number] = [30, 41, 59]) {
    doc.setFont('helvetica', estilo);
    doc.setFontSize(tam);
    doc.setTextColor(...cor);
    const linhas = doc.splitTextToSize(t, W) as string[];
    for (const l of linhas) { quebra(tam * 0.5); doc.text(l, L, y); y += tam * 0.45; }
  }

  texto('Linha Editorial', 20, 'bold', [14, 26, 36]);
  texto(`${p.clienteNome} · ${mesLabel(p.mes)}`, 11, 'normal', [90, 104, 117]);
  y += 4;

  for (const g of p.grupos) {
    quebra(14);
    doc.setFillColor(238, 245, 251);
    doc.rect(L, y - 4, W, 8, 'F');
    texto(`${g.titulo}${g.periodo ? ` · ${g.periodo}` : ''}`, 11, 'bold', [11, 93, 140]);
    y += 2;
    if (g.itens.length === 0) { texto('Sem itens.', 9, 'normal', [138, 151, 163]); y += 2; continue; }
    for (const i of g.itens) {
      quebra(16);
      texto(i.titulo, 11, 'bold');
      const meta = [FORMATO[i.formato] ?? i.formato, p.pilarNome(i.pilar_id), i.funil ? `Funil: ${FUNIL[i.funil] ?? i.funil}` : '',
        (i.plataformas ?? []).join(', '), STATUS_IDEIA[i.status].label].filter(Boolean).join(' · ');
      texto(meta, 9, 'normal', [90, 104, 117]);
      if (i.descricao) texto(textoPuro(i.descricao), 9.5);
      if (i.como_aplicar) texto(`Como aplicar: ${textoPuro(i.como_aplicar)}`, 9.5);
      (i.cenas ?? []).forEach((c, k) => {
        texto(`Cena ${k + 1}: ${c.acontece}${c.fala ? ` — Fala: ${c.fala}` : ''}${c.foto_apoio ? ' (foto de apoio)' : ''}`, 9);
      });
      y += 3;
    }
    y += 2;
  }
  doc.save(`linha-editorial-${p.clienteNome.toLowerCase().replace(/[^a-z0-9]+/g, '-')}-${p.mes}.pdf`);
}
