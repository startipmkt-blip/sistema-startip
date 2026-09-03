// =============================================================
// roiCalc — replica a calculadora de ROI/ROAS da planilha da agência.
// Preencha os dados do mês e os resultados calculam sozinhos.
// =============================================================

export interface RoiInputs {
  faturamento: number;       // Faturamento do mês (R$)
  margem: number;            // Margem sobre o produto/serviço (%)
  investimento: number;      // Investimento em tráfego pago (R$)
  ticketMedio: number;       // Ticket médio (R$)
  vendasPago: number;        // Vendas via tráfego pago
  vendasOrganico: number;    // Vendas via tráfego orgânico
  leads: number;             // Leads recebidos no WhatsApp
  comprasPorCliente: number; // Nº médio de compras por cliente
}

export interface RoiResultados {
  lucro: number;                  // Lucro do mês (R$)
  totalVendas: number;            // Total de vendas
  taxaConversao: number;          // Taxa de conversão de leads (%)
  receitaEstimadaTrafego: number; // Receita estimada tráfego pago (R$)
  roas: number;                   // ROAS (x)
  roi: number;                    // ROI (%)
  cpl: number;                    // Custo por lead (R$)
  cpa: number;                    // Custo por venda (R$)
  margemReal: number;             // Margem de lucro real (%)
  ltv: number;                    // LTV (R$)
  ltvCac: number;                 // Relação LTV / CAC
}

// Mapeia os campos do relatório (snake_case) para os inputs da calculadora.
export function inputsDoRelatorio(r: {
  faturamento: number; margem: number; investimento: number; ticket_medio: number;
  vendas_pago: number; vendas_organico: number; leads: number; compras_por_cliente: number;
}): RoiInputs {
  return {
    faturamento: r.faturamento,
    margem: r.margem,
    investimento: r.investimento,
    ticketMedio: r.ticket_medio,
    vendasPago: r.vendas_pago,
    vendasOrganico: r.vendas_organico,
    leads: r.leads,
    comprasPorCliente: r.compras_por_cliente,
  };
}

const div = (a: number, b: number) => (b ? a / b : 0);

export function calcularRoi(i: RoiInputs): RoiResultados {
  const lucro = i.faturamento * (i.margem / 100);
  const totalVendas = i.vendasPago + i.vendasOrganico;
  const receitaEstimadaTrafego = i.vendasPago * i.ticketMedio;
  const cpa = div(i.investimento, totalVendas);
  const ltv = i.ticketMedio * i.comprasPorCliente;
  return {
    lucro,
    totalVendas,
    taxaConversao: div(totalVendas, i.leads) * 100,
    receitaEstimadaTrafego,
    roas: div(receitaEstimadaTrafego, i.investimento),
    roi: div(lucro - i.investimento, i.investimento) * 100,
    cpl: div(i.investimento, i.leads),
    cpa,
    margemReal: div(lucro, i.faturamento) * 100,
    ltv,
    ltvCac: div(ltv, cpa),
  };
}
