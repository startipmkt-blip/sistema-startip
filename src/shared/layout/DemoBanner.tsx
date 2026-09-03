import { IS_DEMO } from '@/shared/lib/env';

// Faixa exibida apenas no Modo Demonstração (sem Supabase configurado).
// Deixa explícito que os dados são de exemplo e não vêm do banco real.
export function DemoBanner() {
  if (!IS_DEMO) return null;
  return (
    <div className="border-b border-amber-500/20 bg-amber-500/10 px-6 py-2 text-center text-xs font-medium text-amber-300">
      Modo demonstração — dados de exemplo em memória. Configure as chaves do
      Supabase (.env.local) para usar dados reais.
    </div>
  );
}
