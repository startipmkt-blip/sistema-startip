import { useMemo, useState } from 'react';
import { useParams } from 'react-router-dom';
import { useOtimizacoesPublicas } from '@/modules/otimizacoes/api/otimizacoesApi';
import { clientePorSlug } from '@/modules/otimizacoes/clientes';
import { MESES_PT, fmtDia } from '@/modules/otimizacoes/utils';
import { BrandMark } from '@/shared/ui/BrandMark';
import { Spinner } from '@/shared/ui/Spinner';

export function OtimizacoesPublicaPage() {
  const { token } = useParams();
  const { data, isLoading, error } = useOtimizacoesPublicas(token);

  const porMes = useMemo(() => {
    const grupos: Record<string, typeof data> = {};
    for (const o of data ?? []) {
      const chave = o.data.slice(0, 7); // YYYY-MM
      (grupos[chave] ??= []).push(o);
    }
    return Object.entries(grupos).sort(([a], [b]) => b.localeCompare(a));
  }, [data]);

  const clienteNome = data && data.length > 0
    ? (clientePorSlug(data[0].cliente_slug)?.nome ?? data[0].cliente_slug)
    : null;

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      <header className="border-b border-white/10 bg-slate-900/60 px-4 py-4 backdrop-blur">
        <div className="mx-auto flex max-w-3xl items-center justify-between gap-3">
          <BrandMark />
          <div className="text-right">
            <h1 className="text-sm font-semibold">Otimização de Campanhas</h1>
            {clienteNome && <p className="text-xs text-slate-400">{clienteNome}</p>}
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-3xl space-y-6 p-4">
        {isLoading && <div className="flex justify-center p-10"><Spinner /></div>}

        {error && (
          <div className="rounded-lg border border-red-500/30 bg-red-500/10 p-4 text-sm text-red-200">
            Link inválido ou expirado. Fale com a agência.
          </div>
        )}

        {!isLoading && !error && (!data || data.length === 0) && (
          <div className="rounded-lg border border-white/10 bg-white/5 p-6 text-center text-sm text-slate-400">
            Ainda não há otimizações registradas.
          </div>
        )}

        {porMes.map(([chave, itens]) => {
          const [ano, mes] = chave.split('-').map(Number);
          return (
            <section key={chave}>
              <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-slate-400">
                {MESES_PT[mes - 1]} {ano}
              </h2>
              <div className="space-y-3">
                {(itens ?? []).map((o) => (
                  <BlocoPublico
                    key={`${o.cliente_slug}-${o.data}`}
                    data={o.data}
                    conteudo={o.conteudo}
                    anexos={o.anexos ?? []}
                  />
                ))}
              </div>
            </section>
          );
        })}

        <p className="pt-6 text-center text-[10px] text-slate-600">
          Startip · atualizações lançadas dia a dia pelo gestor de tráfego
        </p>
      </main>
    </div>
  );
}

function BlocoPublico({ data, conteudo, anexos }: {
  data: string;
  conteudo: string;
  anexos: { url: string; nome: string }[];
}) {
  const [expandido, setExpandido] = useState(false);
  const { dia, mesAbrev, diaSemana } = fmtDia(data);
  const longo = conteudo.split('\n').length > 10 || conteudo.length > 600;
  const mostraCorte = longo && !expandido;
  const conteudoMostrado = mostraCorte
    ? conteudo.split('\n').slice(0, 10).join('\n')
    : conteudo;

  return (
    <div className="flex gap-4 rounded-xl border border-white/10 bg-white/5 p-4">
      <div className="flex w-14 shrink-0 flex-col items-center rounded-lg bg-white/5 py-2">
        <span className="text-xl font-bold leading-none">{dia}</span>
        <span className="text-[10px] uppercase tracking-wide text-slate-400">{mesAbrev}</span>
        <span className="mt-1 text-[9px] text-slate-500">{diaSemana}</span>
      </div>
      <div className="min-w-0 flex-1">
        <pre className="whitespace-pre-wrap break-words font-sans text-sm text-slate-200">
          {conteudoMostrado}{mostraCorte && '...'}
        </pre>
        {longo && (
          <button
            onClick={() => setExpandido((v) => !v)}
            className="mt-2 text-xs text-brand-400 hover:underline"
          >
            {expandido ? 'ver menos' : 'ver mais'}
          </button>
        )}
        {anexos.length > 0 && (
          <div className="mt-3 grid grid-cols-3 gap-2 sm:grid-cols-4">
            {anexos.map((a, i) => (
              <a key={i} href={a.url} target="_blank" rel="noreferrer"
                className="block aspect-square overflow-hidden rounded-lg border border-white/10 bg-white/5 hover:border-brand-400/60">
                <img src={a.url} alt={a.nome} className="h-full w-full object-cover" loading="lazy" />
              </a>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
