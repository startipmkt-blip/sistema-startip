import { useMemo, useState } from 'react';
import {
  useOnboardingTemplates,
  useOnboardingAndamentos,
  useToggleEtapa,
  useOnboardingConclusoes,
  useConcluirOnboarding,
  useReabrirOnboarding,
} from '@/modules/onboarding/api/onboardingApi';
import type { OnboardingAndamento, OnboardingTemplate } from '@/modules/onboarding/types';
import { FlowMap } from '@/modules/onboarding/components/FlowMap';
import { RoteiroMapa } from '@/modules/onboarding/components/RoteiroMapa';
import { NovoTemplateModal } from '@/modules/onboarding/components/NovoTemplateModal';
import { AplicarTemplateModal } from '@/modules/onboarding/components/AplicarTemplateModal';
import { PageHeader } from '@/shared/ui/PageHeader';
import { Card } from '@/shared/ui/Card';
import { Button } from '@/shared/ui/Button';
import { Badge } from '@/shared/ui/Badge';
import { Spinner } from '@/shared/ui/Spinner';
import { EmptyState } from '@/shared/ui/EmptyState';

type Aba = 'andamento' | 'concluidos' | 'templates' | 'fluxo';

export function OnboardingPage() {
  const [aba, setAba] = useState<Aba>('andamento');
  const [novoOpen, setNovoOpen] = useState(false);
  const [aplicar, setAplicar] = useState<OnboardingTemplate | null>(null);
  const { data: conclusoes } = useOnboardingConclusoes();

  const concluidosSet = useMemo(
    () => new Set((conclusoes ?? []).map((c) => c.cliente_id)),
    [conclusoes],
  );

  return (
    <div className="space-y-6">
      <PageHeader
        title="Onboarding"
        subtitle="Templates de passo a passo e progresso de cada cliente."
      >
        {aba === 'templates' && (
          <Button onClick={() => setNovoOpen(true)}>+ Novo template</Button>
        )}
      </PageHeader>

      <div className="flex gap-1 border-b border-white/10">
        {([
          { id: 'andamento',  label: 'Em andamento' },
          { id: 'concluidos', label: `Concluídos${concluidosSet.size ? ` (${concluidosSet.size})` : ''}` },
          { id: 'templates',  label: 'Templates' },
          { id: 'fluxo',      label: 'Fluxo (mapa)' },
        ] as const).map((t) => (
          <button
            key={t.id}
            onClick={() => setAba(t.id)}
            className={`border-b-2 px-4 py-2 text-sm font-medium transition-colors ${
              aba === t.id
                ? 'border-brand-600 text-brand-300'
                : 'border-transparent text-slate-400 hover:text-slate-100'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {aba === 'andamento'  && <Andamentos concluidosSet={concluidosSet} />}
      {aba === 'concluidos' && <Concluidos concluidosSet={concluidosSet} />}
      {aba === 'templates'  && <Templates onAplicar={setAplicar} />}
      {aba === 'fluxo'      && <RoteiroMapa editavel />}

      <NovoTemplateModal open={novoOpen} onClose={() => setNovoOpen(false)} />
      <AplicarTemplateModal
        open={aplicar !== null}
        onClose={() => setAplicar(null)}
        template={aplicar}
      />
    </div>
  );
}

function CardAndamento({ a, concluido, onConcluir, onReabrir }: {
  a: OnboardingAndamento; concluido: boolean;
  onConcluir?: () => void; onReabrir?: () => void;
}) {
  const toggle = useToggleEtapa();
  const total = a.etapas.length;
  const feitas = a.etapas.filter((e) => e.concluida).length;
  const pct = total ? Math.round((feitas / total) * 100) : 0;
  return (
    <Card className={`p-5 ${concluido ? 'opacity-90' : ''}`}>
      <div className="flex items-center justify-between gap-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <div className="font-semibold text-slate-100">{a.cliente_nome}</div>
            {concluido && <Badge tone="green">✅ Concluído</Badge>}
          </div>
          <div className="text-xs text-slate-400">{a.template_nome}</div>
        </div>
        <span className="text-sm font-medium text-slate-400">{feitas}/{total} · {pct}%</span>
      </div>
      <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-white/10">
        <div className={`h-full rounded-full transition-all ${concluido ? 'bg-emerald-500' : 'bg-brand-500'}`} style={{ width: `${pct}%` }} />
      </div>
      <ul className="mt-4 space-y-2">
        {a.etapas.map((e, i) => (
          <li key={i}>
            <button
              onClick={() => !concluido && toggle.mutate({ andamentoId: a.id, index: i })}
              disabled={concluido}
              className="flex w-full items-center gap-2 text-left text-sm"
            >
              <span
                className={`flex h-5 w-5 items-center justify-center rounded-full text-xs ${
                  e.concluida ? 'bg-emerald-500/15 text-emerald-300' : 'bg-white/10 text-slate-400'
                }`}
              >{e.concluida ? '✓' : ''}</span>
              <span className={e.concluida ? 'text-slate-400 line-through' : 'text-slate-200'}>
                {e.etapa}
              </span>
            </button>
          </li>
        ))}
      </ul>
      <div className="mt-4 flex justify-end gap-2 border-t border-white/5 pt-3">
        {concluido && onReabrir && (
          <Button variant="secondary" onClick={onReabrir}>↩️ Reabrir onboarding</Button>
        )}
        {!concluido && onConcluir && (
          <Button onClick={onConcluir}>✅ Concluir onboarding</Button>
        )}
      </div>
    </Card>
  );
}

function Andamentos({ concluidosSet }: { concluidosSet: Set<string> }) {
  const { data, isLoading } = useOnboardingAndamentos();
  const concluir = useConcluirOnboarding();

  if (isLoading) return <Card className="flex justify-center p-12"><Spinner /></Card>;
  const emAndamento = (data ?? []).filter((a) => !concluidosSet.has(a.cliente_id));
  if (emAndamento.length === 0)
    return <Card><EmptyState message="Nenhum onboarding em andamento. Aplique um template a um cliente." /></Card>;

  return (
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
      {emAndamento.map((a) => (
        <CardAndamento
          key={a.id}
          a={a}
          concluido={false}
          onConcluir={() => {
            if (confirm(`Concluir onboarding de ${a.cliente_nome}?`)) {
              concluir.mutate({ cliente_id: a.cliente_id });
            }
          }}
        />
      ))}
    </div>
  );
}

function Concluidos({ concluidosSet }: { concluidosSet: Set<string> }) {
  const { data, isLoading } = useOnboardingAndamentos();
  const reabrir = useReabrirOnboarding();

  if (isLoading) return <Card className="flex justify-center p-12"><Spinner /></Card>;
  const concluidos = (data ?? []).filter((a) => concluidosSet.has(a.cliente_id));
  if (concluidos.length === 0)
    return <Card><EmptyState message="Nenhum onboarding concluído ainda." /></Card>;

  return (
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
      {concluidos.map((a) => (
        <CardAndamento
          key={a.id}
          a={a}
          concluido={true}
          onReabrir={() => { if (confirm(`Reabrir onboarding de ${a.cliente_nome}?`)) reabrir.mutate(a.cliente_id); }}
        />
      ))}
    </div>
  );
}

function Templates({ onAplicar }: { onAplicar: (t: OnboardingTemplate) => void }) {
  const { data, isLoading } = useOnboardingTemplates();

  if (isLoading) return <Card className="flex justify-center p-12"><Spinner /></Card>;
  if (!data || data.length === 0)
    return <Card><EmptyState message="Nenhum template. Crie o primeiro." /></Card>;

  return (
    <div className="space-y-4">
      {data.map((t) => (
        <Card key={t.id} className="p-5">
          <div className="mb-4 flex items-center justify-between">
            <div>
              <div className="font-semibold text-slate-100">{t.nome}</div>
              <div className="text-xs text-slate-400">{t.etapas.length} etapas</div>
            </div>
            <Button onClick={() => onAplicar(t)}>Aplicar a um cliente</Button>
          </div>
          <div className="overflow-x-auto">
            <FlowMap etapas={t.etapas} />
          </div>
        </Card>
      ))}
    </div>
  );
}
