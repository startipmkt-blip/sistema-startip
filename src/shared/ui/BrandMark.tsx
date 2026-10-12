// Marca da Startip: logo oficial (wordmark + triângulos azuis) + subtítulo opcional.
// Duas versões do arquivo: texto branco (tema escuro, padrão) e texto escuro (html.light).
// A troca é por CSS (.brand-logo-dark / .brand-logo-light em index.css), sem JS.
interface Props {
  sub?: string; // subtítulo (ex.: 'OS', 'Área do Cliente')
  className?: string;
}

export function BrandMark({ sub = 'OS', className = '' }: Props) {
  return (
    <div className={`flex items-center gap-3 ${className}`}>
      <img
        src="/logo-startip-wordmark.png"
        alt="Startip"
        width={900}
        height={300}
        className="brand-logo-dark h-9 w-auto shrink-0 select-none"
        draggable={false}
      />
      <img
        src="/logo-startip-wordmark-dark.png"
        alt="Startip"
        width={900}
        height={300}
        className="brand-logo-light h-9 w-auto shrink-0 select-none"
        draggable={false}
      />
      {sub && (
        <span className="rounded-md border border-white/15 bg-white/[0.07] px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-[0.18em] text-slate-300 shadow-[inset_0_1px_0_rgba(255,255,255,0.18)]">
          {sub}
        </span>
      )}
    </div>
  );
}
