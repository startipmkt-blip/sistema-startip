// Mapa visual do passo a passo: nós numerados conectados por setas.
// Serve como "mapa mental" de como proceder com o onboarding.
export function FlowMap({ etapas }: { etapas: string[] }) {
  return (
    <div className="flex flex-wrap items-stretch gap-y-3">
      {etapas.map((etapa, i) => (
        <div key={i} className="flex items-stretch">
          <div className="flex w-40 flex-col items-center gap-2 rounded-lg border border-brand-500/25 bg-brand-500/10 p-3 text-center">
            <span className="flex h-7 w-7 items-center justify-center rounded-full bg-brand-600 text-xs font-semibold text-white">
              {i + 1}
            </span>
            <span className="text-xs leading-snug text-slate-200">{etapa}</span>
          </div>
          {i < etapas.length - 1 && (
            <div className="flex items-center px-1 text-brand-400" aria-hidden>
              →
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
