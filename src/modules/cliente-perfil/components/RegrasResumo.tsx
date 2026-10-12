import { useState } from 'react';
import { Link } from 'react-router-dom';
import { glassify } from '@/shared/ui/GlassIcon';
import { REGRA_TIPOS, useRegras } from '../api/regrasApi';

/** Regras do cliente em modo consulta (ex.: dentro da demanda do designer). */
export function RegrasResumo({ clienteId, clienteNome }: { clienteId: string; clienteNome?: string }) {
  const { data: regras, isLoading } = useRegras(clienteId);
  const [aberto, setAberto] = useState(true);

  if (isLoading) return null;
  const lista = regras ?? [];
  const criticas = lista.filter((r) => r.critica).length;

  return (
    <div className="rounded-xl border border-amber-500/30 bg-amber-500/5 p-3">
      <button
        type="button"
        onClick={() => setAberto((v) => !v)}
        aria-expanded={aberto}
        className="flex w-full items-center justify-between text-left"
      >
        <span className="text-xs font-semibold text-amber-100">
          Regras{clienteNome ? ` · ${clienteNome}` : ' do cliente'}
          <span className="ml-2 rounded-full bg-white/10 px-1.5 py-0.5 text-[10px] font-normal text-slate-300">
            {lista.length}{criticas > 0 ? ` · ${criticas} crítica${criticas > 1 ? 's' : ''}` : ''}
          </span>
        </span>
        <span className="text-[11px] text-slate-400">{aberto ? 'Recolher ▲' : 'Ver ▼'}</span>
      </button>

      {aberto && (
        lista.length === 0 ? (
          <p className="mt-2 text-[11px] text-slate-400">
            Nenhuma regra cadastrada para este cliente.{' '}
            <Link to={`/clientes/${clienteId}`} className="text-brand-300 hover:underline">Cadastrar na aba do cliente</Link>
          </p>
        ) : (
          <div className="mt-2 space-y-2">
            {REGRA_TIPOS.map((t) => {
              const itens = lista.filter((r) => r.tipo === t.id);
              if (itens.length === 0) return null;
              return (
                <div key={t.id}>
                  <p className="text-[11px] font-semibold text-slate-300">{glassify(t.emoji)} {t.label}</p>
                  <ul className="ml-4 list-disc space-y-0.5 text-xs">
                    {itens.map((r) => (
                      <li key={r.id} className={r.critica ? 'font-semibold text-amber-200' : 'text-slate-200'}>
                        {r.critica && '★ '}{r.texto}
                      </li>
                    ))}
                  </ul>
                </div>
              );
            })}
          </div>
        )
      )}
    </div>
  );
}
