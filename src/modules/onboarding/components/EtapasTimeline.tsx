
import { GlassIcon, glassify } from '@/shared/ui/GlassIcon';
interface EtapaTimeline {
  etapa: string;
  tempo: string;
  itens: string[];
  itens_feitos?: number[];
  concluida?: boolean;
}

// Linha do tempo do onboarding. Com `comStatus`, destaca o que já foi feito
// e a etapa atual (a primeira ainda não concluída).
export function EtapasTimeline({ etapas, comStatus = false }: { etapas: EtapaTimeline[]; comStatus?: boolean }) {
  const atual = comStatus ? etapas.findIndex((e) => !e.concluida) : -1;

  return (
    <div className="relative">
      <div className="absolute bottom-0 left-4 top-2 w-px bg-brand-500/20" aria-hidden />
      <ol className="space-y-4">
        {etapas.map((e, i) => {
          const feita = comStatus && e.concluida;
          const ehAtual = i === atual;
          return (
            <li key={i} className="relative pl-12">
              <span
                className={`absolute left-0 top-0 flex h-8 w-8 items-center justify-center rounded-full text-sm font-semibold text-white ${
                  feita ? 'bg-emerald-600' : comStatus && !ehAtual ? 'bg-slate-700' : 'bg-brand-600'
                }`}
              >
                {glassify(feita ? '✓' : i + 1)}
              </span>
              <div
                className={`rounded-lg border p-4 shadow-sm ${
                  ehAtual ? 'border-brand-400/50 bg-brand-500/10' : 'border-white/10 bg-white/5'
                }`}
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <h3 className={`text-sm font-semibold ${feita ? 'text-slate-400' : 'text-slate-100'}`}>{e.etapa}</h3>
                  <div className="flex flex-wrap items-center gap-2">
                    {e.tempo && (
                      <span className="rounded-full bg-amber-500/15 px-2 py-0.5 text-xs font-medium text-amber-300">
                        <GlassIcon name="timer" /> {e.tempo}
                      </span>
                    )}
                    {feita && (
                      <span className="rounded-full bg-emerald-500/15 px-2 py-0.5 text-xs font-medium text-emerald-300">
                        Concluída
                      </span>
                    )}
                    {ehAtual && (
                      <span className="rounded-full bg-brand-500/20 px-2 py-0.5 text-xs font-medium text-brand-200">
                        Em andamento
                      </span>
                    )}
                  </div>
                </div>
                {e.itens.length > 0 && (
                  <ul className="mt-2 space-y-1">
                    {e.itens.map((it, j) => {
                      const feito = comStatus && ((e.itens_feitos ?? []).includes(j) || e.concluida);
                      if (!comStatus) {
                        return (
                          <li key={j} className="flex items-start gap-2 text-xs text-slate-300">
                            <span className="mt-px text-brand-400" aria-hidden>›</span>
                            {it}
                          </li>
                        );
                      }
                      return (
                        <li key={j} className="flex items-start gap-2 text-xs">
                          <span
                            className={`mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded border text-[10px] ${
                              feito
                                ? 'border-emerald-400/60 bg-emerald-500/20 text-emerald-200'
                                : 'border-white/20 bg-white/5 text-transparent'
                            }`}
                            aria-hidden
                          >
                            {feito ? '✓' : ''}
                          </span>
                          <span className={feito ? 'text-slate-500 line-through' : 'text-slate-300'}>{it}</span>
                        </li>
                      );
                    })}
                  </ul>
                )}
              </div>
            </li>
          );
        })}
      </ol>
    </div>
  );
}
