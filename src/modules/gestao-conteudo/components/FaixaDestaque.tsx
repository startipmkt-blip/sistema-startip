import type { ReactNode } from 'react';
import { GlassIcon } from '@/shared/ui/GlassIcon';

/** Faixa escura de abertura das abas (Inspirações, Roteiros). As cores são fixas: ela é escura nos dois temas. */
export function FaixaDestaque({ selo, titulo, subtitulo, direita }: {
  selo?: string; titulo: string; subtitulo?: string; direita?: ReactNode;
}) {
  return (
    <div className="faixa-destaque flex flex-wrap items-center justify-between gap-4 rounded-2xl px-6 py-5" style={{ background: 'linear-gradient(110deg, #0b131a 0%, #10202d 70%, #133149 100%)' }}>
      <div className="min-w-0">
        {selo && (
          <div className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-[0.14em]" style={{ color: '#7cc8f0' }}>
            <GlassIcon name="sparkles" className="h-3.5 w-3.5" /> {selo}
          </div>
        )}
        <div className="mt-1 text-xl font-bold" style={{ color: '#ffffff' }}>{titulo}</div>
        {subtitulo && <div className="text-sm" style={{ color: '#a9b8c5' }}>{subtitulo}</div>}
      </div>
      {direita}
    </div>
  );
}
