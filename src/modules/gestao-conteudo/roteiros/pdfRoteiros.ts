import { mesLabel } from '@/modules/gestao-conteudo/types';
import type { Roteiro } from './roteirosApi';
import { textoPuro } from '@/shared/ui/texto-rico/regras';

const AUDIO: Record<string, string> = {
  narracao: 'Narração', original: 'Áudio original', musica: 'Música', trend: 'Trend', sem: 'Sem áudio',
};

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

  linha(p.titulo, 18, true);
  linha(mesLabel(p.mes), 11, false, true);
  y += 4;
  p.roteiros.forEach((r, k) => {
    quebra(20);
    linha(`${k + 1}. ${r.titulo}`, 12, true);
    linha([p.nomeCliente(r.cliente_id), r.tipo === 'trafego' ? 'Tráfego pago' : 'Orgânico', p.nomePilar(r.pilar_id),
      r.semana === 6 ? 'Conteúdo extra' : `Semana ${r.semana}`, r.status === 'concluido' ? 'Concluído' : 'Pendente'].filter(Boolean).join(' · '), 9, false, true);
    if (r.gatilhos.length) linha(`Gatilhos: ${r.gatilhos.join(', ')}`, 9.5);
    if (r.descricao) linha(textoPuro(r.descricao), 9.5);
    if (r.como_aplicar) linha(`Como aplicar: ${textoPuro(r.como_aplicar)}`, 9.5);
    if (r.observacao) linha(`Observação: ${textoPuro(r.observacao)}`, 9.5);
    r.cenas.forEach((c, i) => {
      linha(`Cena ${i + 1}: ${c.acontece}`, 9.5, true);
      if (c.fala) linha(`Fala: ${c.fala}`, 9.5);
      if (c.audio || c.foto_apoio) linha([c.audio && `Áudio: ${AUDIO[c.audio] ?? c.audio}`, c.foto_apoio && 'Precisa de foto de apoio'].filter(Boolean).join(' · '), 9, false, true);
    });
    if (r.legenda) linha(`Legenda: ${r.legenda}`, 9.5);
    y += 4;
  });
  doc.save(`roteiros-${p.mes}.pdf`);
}
