import type { Formulario } from '@/modules/formularios/types';

export function RespostasView({ formulario }: { formulario: Formulario }) {
  const respostas = formulario.respostas ?? {};
  return (
    <div className="space-y-3">
      {formulario.perguntas.map((p) => (
        <div key={p.id} className="rounded-md border border-white/10 bg-white/5 p-3">
          <div className="text-xs font-semibold uppercase tracking-wide text-slate-400">
            {p.label}
          </div>
          <div className="mt-1 whitespace-pre-wrap text-sm text-slate-100">
            {String(respostas[p.id] ?? '').trim() || <span className="text-slate-500">— não respondido —</span>}
          </div>
        </div>
      ))}
    </div>
  );
}
