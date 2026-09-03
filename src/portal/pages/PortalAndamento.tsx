import { useAuth } from '@/shared/auth/AuthProvider';
import { useOnboardingAndamentos } from '@/modules/onboarding/api/onboardingApi';
import { RoteiroMapa } from '@/modules/onboarding/components/RoteiroMapa';
import { useConteudos } from '@/modules/conteudo/api/conteudoApi';
import { CONTEUDO_COLUNAS, TIPO_LABEL } from '@/modules/conteudo/types';
import { Card } from '@/shared/ui/Card';
import { Badge } from '@/shared/ui/Badge';
import { Spinner } from '@/shared/ui/Spinner';
import { EmptyState } from '@/shared/ui/EmptyState';
import { formatDate } from '@/shared/lib/format';

const STATUS_LABEL = Object.fromEntries(CONTEUDO_COLUNAS.map((c) => [c.id, c.label]));
const STATUS_TONE: Record<string, 'slate' | 'amber' | 'blue' | 'green'> = {
  ideia: 'slate',
  producao: 'amber',
  aprovacao: 'blue',
  publicado: 'green',
};

export function PortalAndamento() {
  const { profile } = useAuth();
  const clienteId = profile?.cliente_id ?? '';
  const { data: andamentos, isLoading: loadingOb } = useOnboardingAndamentos();
  const { data: conteudos, isLoading: loadingCt } = useConteudos(clienteId);

  const meuOnboarding = (andamentos ?? []).find((a) => a.cliente_id === clienteId);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-white">Andamento</h1>
        <p className="text-sm text-slate-400">O que já foi feito e o que está em produção.</p>
      </div>

      {/* Onboarding / etapas concluídas */}
      <Card className="p-5">
        <h2 className="mb-3 text-sm font-semibold text-slate-200">Etapas do seu projeto</h2>
        {loadingOb ? (
          <Spinner />
        ) : !meuOnboarding ? (
          <EmptyState message="Nenhuma etapa registrada ainda." />
        ) : (
          <>
            {(() => {
              const total = meuOnboarding.etapas.length;
              const feitas = meuOnboarding.etapas.filter((e) => e.concluida).length;
              const pct = total ? Math.round((feitas / total) * 100) : 0;
              return (
                <div className="mb-4">
                  <div className="mb-1 flex justify-between text-xs text-slate-400">
                    <span>{feitas} de {total} concluídas</span>
                    <span>{pct}%</span>
                  </div>
                  <div className="h-2 w-full overflow-hidden rounded-full bg-white/10">
                    <div className="h-full rounded-full bg-brand-500 transition-all" style={{ width: `${pct}%` }} />
                  </div>
                </div>
              );
            })()}
          <ul className="space-y-2">
            {meuOnboarding.etapas.map((e, i) => (
              <li key={i} className="flex items-center gap-2 text-sm">
                <span
                  className={`flex h-5 w-5 items-center justify-center rounded-full text-xs ${
                    e.concluida ? 'bg-emerald-500/15 text-emerald-300' : 'bg-white/10 text-slate-400'
                  }`}
                >
                  {e.concluida ? '✓' : ''}
                </span>
                <span className={e.concluida ? 'text-slate-400 line-through' : 'text-slate-200'}>
                  {e.etapa}
                </span>
              </li>
            ))}
          </ul>
          </>
        )}
      </Card>

      {/* Passo a passo do onboarding (com o tempo de cada etapa) */}
      <Card className="p-5">
        <h2 className="mb-1 text-sm font-semibold text-slate-200">Como funciona o seu onboarding</h2>
        <p className="mb-4 text-xs text-slate-400">
          O passo a passo completo e o tempo de cada etapa.
        </p>
        <RoteiroMapa />
      </Card>

      {/* Conteúdo em produção */}
      <Card className="p-5">
        <h2 className="mb-3 text-sm font-semibold text-slate-200">Conteúdo do mês</h2>
        {loadingCt ? (
          <Spinner />
        ) : !conteudos || conteudos.length === 0 ? (
          <EmptyState message="Nenhum conteúdo em produção no momento." />
        ) : (
          <ul className="divide-y divide-white/10">
            {conteudos.map((c) => (
              <li key={c.id} className="flex items-center justify-between py-2 text-sm">
                <div>
                  <div className="font-medium text-slate-100">{c.titulo}</div>
                  <div className="text-xs text-slate-400">
                    {TIPO_LABEL[c.tipo]} · {formatDate(c.data_publicacao)}
                  </div>
                </div>
                <Badge tone={STATUS_TONE[c.status] ?? 'slate'}>{STATUS_LABEL[c.status]}</Badge>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </div>
  );
}
