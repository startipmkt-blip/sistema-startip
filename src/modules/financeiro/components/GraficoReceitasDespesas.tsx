import { formatMoney } from '@/shared/lib/format';

export interface PontoMes {
  rotulo: string;
  receitas: number;
  despesas: number;
}

/** Escala "redonda" para o eixo: 1, 2, 2,5 ou 5 × 10^n acima do maior valor. */
function tetoEixo(max: number): number {
  if (max <= 0) return 1000;
  const pot = 10 ** Math.floor(Math.log10(max));
  for (const f of [1, 2, 2.5, 5, 10]) if (f * pot >= max) return f * pot;
  return 10 * pot;
}

function curto(v: number) {
  return v >= 1000 ? `${(v / 1000).toLocaleString('pt-BR', { maximumFractionDigits: 1 })}k` : String(Math.round(v));
}

export function GraficoReceitasDespesas({ pontos }: { pontos: PontoMes[] }) {
  const W = 560, H = 240, ESQ = 44, BASE = 28, TOPO = 10;
  const max = tetoEixo(Math.max(...pontos.flatMap((p) => [p.receitas, p.despesas]), 0));
  const alturaUtil = H - BASE - TOPO;
  const y = (v: number) => TOPO + alturaUtil - (v / max) * alturaUtil;
  const largura = (W - ESQ - 8) / Math.max(pontos.length, 1);
  const barra = Math.min(26, largura * 0.3);
  const ticks = [0, 0.25, 0.5, 0.75, 1].map((f) => f * max);

  return (
    <div className="mt-3">
      <div className="mb-2 flex gap-4 text-xs text-slate-400">
        <span className="flex items-center gap-1.5"><i className="inline-block h-2.5 w-2.5 rounded-sm bg-brand-500" /> Receitas</span>
        <span className="flex items-center gap-1.5"><i className="grafico-despesa inline-block h-2.5 w-2.5 rounded-sm bg-slate-500/60" /> Despesas</span>
      </div>
      <svg viewBox={`0 0 ${W} ${H}`} className="h-auto w-full" role="img" aria-label="Receitas e despesas dos últimos 6 meses">
        {ticks.map((t) => (
          <g key={t}>
            <line x1={ESQ} x2={W - 4} y1={y(t)} y2={y(t)} className="stroke-white/10" strokeDasharray={t === 0 ? undefined : '3 4'} />
            <text x={ESQ - 8} y={y(t) + 4} textAnchor="end" className="fill-slate-400 text-[10px]">{curto(t)}</text>
          </g>
        ))}
        {pontos.map((p, i) => {
          const cx = ESQ + i * largura + largura / 2;
          return (
            <g key={p.rotulo}>
              <rect x={cx - barra - 2} y={y(p.receitas)} width={barra} height={y(0) - y(p.receitas)} rx={4} className="fill-brand-500">
                <title>{`${p.rotulo}: receitas ${formatMoney(p.receitas)}`}</title>
              </rect>
              <rect x={cx + 2} y={y(p.despesas)} width={barra} height={y(0) - y(p.despesas)} rx={4} className="grafico-despesa fill-slate-500/60">
                <title>{`${p.rotulo}: despesas ${formatMoney(p.despesas)}`}</title>
              </rect>
              <text x={cx} y={H - 8} textAnchor="middle" className="fill-slate-400 text-[11px]">{p.rotulo}</text>
            </g>
          );
        })}
      </svg>
    </div>
  );
}
