import { labelMes, mesAnteriorProximo, semanasDoMes } from '../lib/periodo';
import { GlassIcon } from '@/shared/ui/GlassIcon';

interface Props {
  mes: string; // YYYY-MM
  semana: number | null; // null = mês inteiro
  onMes: (mes: string) => void;
  onSemana: (n: number | null) => void;
}

const chip = (ativo: boolean) =>
  `rounded-full border px-3 py-1 text-xs font-medium transition-colors ${
    ativo
      ? 'border-brand-400 bg-brand-500/20 text-brand-200'
      : 'border-white/10 bg-white/5 text-slate-300 hover:bg-white/10'
  }`;

export function PeriodoSeletor({ mes, semana, onMes, onSemana }: Props) {
  const semanas = semanasDoMes(mes);
  return (
    <div className="flex flex-wrap items-center gap-2">
      <div className="flex items-center gap-1">
        <button
          type="button" aria-label="Mês anterior"
          onClick={() => { onMes(mesAnteriorProximo(mes, -1)); onSemana(null); }}
          className="rounded-md border border-white/10 px-2 py-1 text-sm text-slate-300 hover:bg-white/10"
        >‹</button>
        <span className="min-w-[9rem] text-center text-sm font-semibold text-slate-100"><GlassIcon name="calendar" /> {labelMes(mes)}</span>
        <button
          type="button" aria-label="Próximo mês"
          onClick={() => { onMes(mesAnteriorProximo(mes, 1)); onSemana(null); }}
          className="rounded-md border border-white/10 px-2 py-1 text-sm text-slate-300 hover:bg-white/10"
        >›</button>
      </div>

      <div className="flex flex-wrap items-center gap-1.5">
        <button type="button" onClick={() => onSemana(null)} className={chip(semana === null)}>Mês inteiro</button>
        {semanas.map((s) => (
          <button key={s.numero} type="button" onClick={() => onSemana(s.numero)} className={chip(semana === s.numero)}>
            Semana {s.numero} · {s.label}
          </button>
        ))}
      </div>
    </div>
  );
}
