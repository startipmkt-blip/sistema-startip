import type { CrmLead } from '@/modules/crm/types';
import { CRM_ETAPAS, etiquetaInfo } from '@/modules/crm/types';

const etapaLabel = (id: string) => CRM_ETAPAS.find((e) => e.id === id)?.label ?? id;

// Exporta os leads como CSV (abre no Excel).
export function exportarLeadsCsv(leads: CrmLead[]): void {
  const headers = ['Nome', 'Empresa', 'Telefone', 'Origem', 'Etapa', 'Valor', 'Etiquetas'];
  const linhas = leads.map((l) => [
    l.nome,
    l.empresa,
    l.telefone,
    l.origem,
    etapaLabel(l.etapa),
    String(l.valor).replace('.', ','),
    l.etiquetas.map((e) => etiquetaInfo(e).label).join(' / '),
  ]);
  const csv = [headers, ...linhas]
    .map((row) => row.map((c) => `"${(c ?? '').replace(/"/g, '""')}"`).join(';'))
    .join('\n');

  // BOM para o Excel reconhecer acentos.
  const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `crm-leads-${new Date().toISOString().slice(0, 10)}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

// "Exportar PDF" via impressão do navegador (salvar como PDF).
export function exportarPdf(): void {
  window.print();
}
