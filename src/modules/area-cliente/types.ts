// Relatório mensal POR CLIENTE — guarda os dados da calculadora ROI/ROAS
// daquele cliente naquele mês. Os resultados (ROAS, ROI, CPL...) são
// calculados a partir destes campos (ver lib/roiCalc.ts).
export interface RelatorioMensal {
  id: string;
  cliente_id: string;
  mes_referencia: string; // 'YYYY-MM'
  // Entradas da calculadora:
  faturamento: number;
  margem: number; // %
  investimento: number;
  ticket_medio: number;
  vendas_pago: number;
  vendas_organico: number;
  leads: number;
  compras_por_cliente: number;
  // Extras:
  resumo: string;
  pdf_url: string | null;
  created_at: string;
}

export interface RelatorioMensalView extends RelatorioMensal {
  cliente_nome: string;
}
