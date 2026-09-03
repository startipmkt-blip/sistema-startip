// Marca da Startip: triângulo azul (#1E9BE0) + wordmark em Poppins.
// Reproduz o logo (wordmark branco com triângulos azuis) de forma vetorial.
interface Props {
  sub?: string; // subtítulo (ex.: 'OS', 'Área do Cliente')
  className?: string;
}

export function BrandMark({ sub = 'OS', className = '' }: Props) {
  return (
    <div className={`flex items-center gap-2.5 ${className}`}>
      <svg viewBox="0 0 24 24" className="h-7 w-7 shrink-0" aria-hidden>
        <polygon points="12,3 22,21 2,21" fill="#1e9be0" />
      </svg>
      <div className="leading-none">
        <div className="font-display text-lg font-semibold tracking-tight text-white">
          St<span className="text-brand-400">a</span>rtip
        </div>
        {sub && (
          <div className="text-[10px] font-medium uppercase tracking-[0.2em] text-slate-400">
            {sub}
          </div>
        )}
      </div>
    </div>
  );
}
