import { IS_DEMO } from '@/shared/lib/env';

// Faixa exibida apenas no Modo Demonstração (sem Supabase configurado).
// Deixa explícito que os dados são de exemplo e não vêm do banco real.
export function DemoBanner() {
  if (!IS_DEMO) return null;
  return (
    <div className="demo-faixa px-8 pt-1 text-xs text-slate-400">
      <span className="inline-flex items-center gap-1.5 rounded-full border border-amber-500/30 bg-amber-500/10 px-2.5 py-0.5 font-semibold text-amber-300">
        <span className="h-1.5 w-1.5 rounded-full bg-amber-400" />
        Modo demonstração
      </span>
      <span className="ml-2 hidden sm:inline">Dados de exemplo, nada é salvo no banco.</span>
    </div>
  );
}
