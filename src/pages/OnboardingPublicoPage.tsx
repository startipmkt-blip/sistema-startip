import { useParams } from 'react-router-dom';
import { useOnboardingPublico } from '@/modules/onboarding/api/onboardingApi';
import { EtapasTimeline } from '@/modules/onboarding/components/EtapasTimeline';
import { BrandMark } from '@/shared/ui/BrandMark';
import { Spinner } from '@/shared/ui/Spinner';
import { formatDate } from '@/shared/lib/format';

// Página pública (/onb/:token) que o cliente abre para ver todo o processo
// de onboarding e em que ponto ele está.
export function OnboardingPublicoPage() {
  const { token } = useParams();
  const { data, isLoading, error } = useOnboardingPublico(token);

  const total = data?.etapas.length ?? 0;
  const feitas = data?.etapas.filter((e) => e.concluida).length ?? 0;
  const pct = total ? Math.round((feitas / total) * 100) : 0;
  const atual = data?.etapas.find((e) => !e.concluida);
  const finalizado = Boolean(data?.concluido_em) || (total > 0 && feitas === total);

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      <header className="border-b border-white/10 bg-slate-900/60 px-4 py-4 backdrop-blur">
        <div className="mx-auto flex max-w-3xl items-center justify-between gap-3">
          <BrandMark sub="Onboarding" />
          {data && <p className="truncate text-sm font-medium text-slate-300">{data.cliente_nome}</p>}
        </div>
      </header>

      <main className="mx-auto max-w-3xl space-y-6 p-4 pb-12">
        {isLoading && <div className="flex justify-center p-10"><Spinner /></div>}

        {!isLoading && (error || !data) && (
          <div className="rounded-lg border border-red-500/30 bg-red-500/10 p-4 text-sm text-red-200">
            Link inválido ou expirado. Fale com a agência.
          </div>
        )}

        {data && (
          <>
            <section className="pt-4">
              <h1 className="font-display text-2xl font-semibold text-white">
                {finalizado ? 'Onboarding concluído 🎉' : `Bem-vindo(a), ${data.cliente_nome}!`}
              </h1>
              <p className="mt-2 text-sm text-slate-300">
                {finalizado
                  ? 'Todas as etapas de entrada foram finalizadas. Daqui em diante seguimos na rotina de entregas.'
                  : 'Este é o passo a passo do início da nossa parceria. Aqui você acompanha cada etapa, o tempo previsto e o que já foi concluído.'}
              </p>
            </section>

            <section className="rounded-xl border border-white/10 bg-white/5 p-5">
              <div className="mb-2 flex items-end justify-between gap-3">
                <div>
                  <div className="text-xs uppercase tracking-wide text-slate-400">Progresso</div>
                  <div className="text-lg font-semibold text-white">{feitas} de {total} etapas</div>
                </div>
                <div className="text-2xl font-semibold text-brand-300">{pct}%</div>
              </div>
              <div className="h-2.5 w-full overflow-hidden rounded-full bg-white/10">
                <div
                  className={`h-full rounded-full transition-all ${finalizado ? 'bg-emerald-500' : 'bg-brand-500'}`}
                  style={{ width: `${pct}%` }}
                />
              </div>
              <div className="mt-3 flex flex-wrap gap-x-6 gap-y-1 text-xs text-slate-400">
                {data.iniciado_em && <span>Início: {formatDate(data.iniciado_em)}</span>}
                {data.concluido_em && <span>Conclusão: {formatDate(data.concluido_em)}</span>}
                {!finalizado && atual && <span>Etapa atual: <span className="text-slate-200">{atual.etapa}</span></span>}
              </div>
            </section>

            <section>
              <h2 className="mb-4 text-sm font-semibold uppercase tracking-wide text-slate-400">
                Todo o processo
              </h2>
              <EtapasTimeline etapas={data.etapas} comStatus />
            </section>

            <p className="pt-2 text-center text-xs text-slate-500">
              Dúvidas sobre alguma etapa? Fale com a gente no grupo do WhatsApp.
            </p>
          </>
        )}
      </main>
    </div>
  );
}
