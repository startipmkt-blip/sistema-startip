import { jsPDF } from 'jspdf';
import type { Contract } from '@/modules/contratos/types';
import { preencherTemplate } from './preencherTemplate';

/**
 * Gera um PDF simples do contrato usando jsPDF (sem dependência de fonte
 * externa; usa Helvetica embutida). Retorna Blob para download.
 */
export function gerarPdfContrato(contrato: Contract, templateBody: string | null): Blob {
  const doc = new jsPDF({ unit: 'mm', format: 'a4' });
  const margem = 20;
  const larguraUtil = 210 - 2 * margem;
  const alturaPag = 297;

  // Cabeçalho
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(14);
  doc.text(contrato.titulo, margem, margem + 5);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(120);
  doc.text(`Gerado em ${new Date().toLocaleString('pt-BR')}`, margem, margem + 11);
  doc.setDrawColor(200);
  doc.line(margem, margem + 14, 210 - margem, margem + 14);

  // Corpo
  const corpo = preencherTemplate(templateBody ?? contrato.body_text ?? '', contrato);
  const linhas = doc.splitTextToSize(corpo, larguraUtil);
  doc.setTextColor(30);
  doc.setFontSize(11);

  let y = margem + 22;
  const alturaLinha = 5.5;
  for (const linha of linhas) {
    if (y + alturaLinha > alturaPag - margem) {
      doc.addPage();
      y = margem;
    }
    doc.text(linha, margem, y);
    y += alturaLinha;
  }

  // Rodapé com assinatura
  if (y + 40 > alturaPag - margem) { doc.addPage(); y = margem; }
  y += 15;
  doc.setDrawColor(150);
  doc.line(margem, y, margem + 70, y);
  doc.line(210 - margem - 70, y, 210 - margem, y);
  doc.setFontSize(9);
  doc.setTextColor(80);
  doc.text('Contratante', margem, y + 5);
  doc.text(contrato.signer_name ?? '(nome)', margem, y + 10);
  doc.text('Startip Marketing Digital', 210 - margem - 70, y + 5);
  doc.text('Contratada', 210 - margem - 70, y + 10);

  return doc.output('blob');
}
