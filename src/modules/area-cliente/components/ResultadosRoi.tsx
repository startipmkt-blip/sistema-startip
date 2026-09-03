import type { RoiResultados } from '@/modules/area-cliente/lib/roiCalc';
import { StatCard } from '@/shared/ui/StatCard';
import { formatMoney } from '@/shared/lib/format';

const num = (v: number) => v.toLocaleString('pt-BR', { maximumFractionDigits: 2 });

export function ResultadosRoi({ r }: { r: RoiResultados }) {
  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <StatCard label="ROAS" value={`${num(r.roas)}x`} tone="blue" />
        <StatCard label="ROI" value={`${num(r.roi)}%`} tone={r.roi >= 0 ? 'green' : 'red'} />
        <StatCard label="Lucro" value={formatMoney(r.lucro)} tone="green" />
        <StatCard label="Total de vendas" value={num(r.totalVendas)} tone="slate" />
      </div>
      <div className="grid grid-cols-2 gap-x-6 gap-y-1 rounded-md border border-white/10 p-3 text-sm sm:grid-cols-3">
        <Linha label="Taxa de conversão" valor={`${num(r.taxaConversao)}%`} />
        <Linha label="Receita est. tráfego" valor={formatMoney(r.receitaEstimadaTrafego)} />
        <Linha label="CPL" valor={formatMoney(r.cpl)} />
        <Linha label="CPA" valor={formatMoney(r.cpa)} />
        <Linha label="Margem real" valor={`${num(r.margemReal)}%`} />
        <Linha label="LTV" valor={formatMoney(r.ltv)} />
        <Linha label="LTV / CAC" valor={`${num(r.ltvCac)}x`} />
      </div>
    </div>
  );
}

function Linha({ label, valor }: { label: string; valor: string }) {
  return (
    <div className="flex items-center justify-between border-b border-white/10 py-1">
      <span className="text-slate-400">{label}</span>
      <span className="font-medium text-slate-100">{valor}</span>
    </div>
  );
}
