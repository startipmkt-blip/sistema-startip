import { useMemo, useState } from 'react';
import {
  linkPublicoOnboarding,
  useOnboardingTemplates,
  useOnboardingAndamentos,
  useToggleEtapa,
  useToggleItem,
  useOnboardingConclusoes,
  useConcluirOnboarding,
  useReabrirOnboarding,
  useExcluirOnboarding,
  useExcluirTemplate,
} from '@/modules/onboarding/api/onboardingApi';
import type { OnboardingAndamento, OnboardingTemplate } from '@/modules/onboarding/types';
import { EtapasTimeline } from '@/modules/onboarding/components/EtapasTimeline';
import { TemplateFormModal } from '@/modules/onboarding/components/TemplateFormModal';
import { NovoOnboardingModal } from '@/modules/onboarding/components/NovoOnboardingModal';
import { CopiarLinkButton } from '@/modules/onboarding/components/CopiarLinkButton';
import { PageHeader } from '@/shared/ui/PageHeader';
import { Card } from '@/shared/ui/Card';
import { Button } from '@/shared/ui/Button';
import { Badge } from '@/shared/ui/Badge';
import { Spinner } from '@/shared/ui/Spinner';
import { EmptyState } from '@/shared/ui/EmptyState';
import { formatDate } from '@/shared/lib/format';
import { GlassIcon, glassify } from '@/shared/ui/GlassIcon';

type Aba = 'andamento' | 'concluidos' | 'templates';

type TemplateForm = { template?: OnboardingTemplate; base?: OnboardingTemplate };

export function OnboardingPage() {
  const [aba, setAba] = useState<Aba>('andamento');
  // undefined = fechado; '' = aberto sem modelo pré-escolhido.
  const [novoOnboarding, setNovoOnboarding] = useState<string | undefined>();
  const [templateForm, setTemplateForm] = useState<TemplateForm | null>(null);
  const { data: conclusoes } = useOnboardingConclusoes();
  const { data: andamentos } = useOnboardingAndamentos();

  const concluidosSet = useMemo(
    () => new Set((conclusoes ?? []).map((c) => c.cliente_id)),
    [conclusoes],
  );
  const qtdConcluidos = (andamentos ?? []).filter((a) => concluidosSet.has(a.cliente_id)).length;
  const qtdAndamento = (andamentos ?? []).length - qtdConcluidos;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Onboarding"
        subtitle="Modelos de passo a passo, progresso de cada cliente e a página que o cliente acompanha."
      >
        {aba === 'templates' ? (
          <Button onClick={() => setTemplateForm({})}>+ Novo modelo</Button>
        ) : (
          <Button onClick={() => setNovoOnboarding('')}>+ Novo onboarding</Button>
        )}
      </PageHeader>

      <div className="flex gap-1 overflow-x-auto border-b border-white/10">
        {([
          { id: 'andamento',  label: `Em andamento${qtdAndamento ? ` (${qtdAndamento})` : ''}` },
          { id: 'concluidos', label: `Concluídos${qtdConcluidos ? ` (${qtdConcluidos})` : ''}` },
          { id: 'templates',  label: 'Modelos' },
        ] as const).map((t) => (
          <button
            key={t.id}
            onClick={() => setAba(t.id)}
            className={`whitespace-nowrap border-b-2 px-4 py-2 text-sm font-medium transition-colors ${
              aba === t.id
                ? 'border-brand-600 text-brand-300'
                : 'border-transparent text-slate-400 hover:text-slate-100'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {aba === 'andamento'  && <Andamentos concluidosSet={concluidosSet} onNovo={() => setNovoOnboarding('')} />}
      {aba === 'concluidos' && <Concluidos concluidosSet={concluidosSet} />}
      {aba === 'templates'  && (
        <Templates
          onAplicar={(t) => setNovoOnboarding(t.id)}
          onEditar={(t) => setTemplateForm({ template: t })}
          onDuplicar={(t) => setTemplateForm({ base: t })}
        />
      )}

      {templateForm && (
        <TemplateFormModal
          template={templateForm.template}
          base={templateForm.base}
          onClose={() => setTemplateForm(null)}
        />
      )}
      {novoOnboarding !== undefined && (
        <NovoOnboardingModal
          templateIdInicial={novoOnboarding}
          onClose={() => { setNovoOnboarding(undefined); setAba((a) => (a === 'templates' ? 'andamento' : a)); }}
        />
      )}
    </div>
  );
}

function CardAndamento({ a, concluido }: { a: OnboardingAndamento; concluido: boolean }) {
  const toggle = useToggleEtapa();
  const toggleItem = useToggleItem();
  const concluir = useConcluirOnboarding();
  const reabrir = useReabrirOnboarding();
  const excluir = useExcluirOnboarding();
  const [detalhes, setDetalhes] = useState(true);

  const total = a.etapas.length;
  const feitas = a.etapas.filter((e) => e.concluida).length;
  const pct = total ? Math.round((feitas / total) * 100) : 0;
  const link = linkPublicoOnboarding(a.token);
  const erro = toggle.error ?? toggleItem.error ?? concluir.error ?? reabrir.error ?? excluir.error;

  return (
    <Card className={`p-5 ${concluido ? 'opacity-90' : ''}`}>
      <div className="flex items-center justify-between gap-3">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <div className="font-semibold text-slate-100">{a.cliente_nome}</div>
            {concluido && <Badge tone="green"><GlassIcon name="check-circle" /> Concluído</Badge>}
          </div>
          <div className="text-xs text-slate-400">
            {[a.template_nome, a.created_at && `iniciado em ${formatDate(a.created_at)}`].filter(Boolean).join(' · ')}
          </div>
        </div>
        <span className="shrink-0 text-sm font-medium text-slate-400">{feitas}/{total} · {pct}%</span>
      </div>
      <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-white/10">
        <div className={`h-full rounded-full transition-all ${concluido ? 'bg-emerald-500' : 'bg-brand-500'}`} style={{ width: `${pct}%` }} />
      </div>

      <ul className="mt-4 space-y-2">
        {a.etapas.map((e) => {
          const feitosSet = new Set(e.itens_feitos ?? []);
          const subTotal = e.itens.length;
          const subFeitos = e.itens.reduce((n, _it, j) => n + (feitosSet.has(j) ? 1 : 0), 0);
          return (
            <li key={e.id}>
              <button
                onClick={() => toggle.mutate({ etapaId: e.id, concluida: !e.concluida })}
                disabled={concluido || toggle.isPending}
                className="flex w-full items-start gap-2 text-left text-sm"
              >
                <span
                  className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-xs ${
                    e.concluida ? 'bg-emerald-500/15 text-emerald-300' : 'bg-white/10 text-slate-400'
                  }`}
                >{glassify(e.concluida ? '✓' : '')}</span>
                <span className="min-w-0 flex-1">
                  <span className={e.concluida ? 'text-slate-400 line-through' : 'text-slate-200'}>{e.etapa}</span>
                  {e.tempo && <span className="ml-2 text-xs text-amber-300/80"><GlassIcon name="timer" /> {e.tempo}</span>}
                  {subTotal > 0 && (
                    <span className="ml-2 text-xs text-slate-400">{subFeitos}/{subTotal}</span>
                  )}
                </span>
              </button>
              {detalhes && e.itens.length > 0 && (
                <ul className="ml-7 mt-1 space-y-1">
                  {e.itens.map((it, j) => {
                    const feito = feitosSet.has(j);
                    return (
                      <li key={j}>
                        <button
                          type="button"
                          onClick={(ev) => {
                            ev.stopPropagation();
                            toggleItem.mutate({ etapaId: e.id, index: j, feito: !feito });
                          }}
                          disabled={concluido || toggleItem.isPending}
                          className="flex w-full items-start gap-2 text-left text-xs"
                        >
                          <span
                            className={`mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded border text-[10px] ${
                              feito
                                ? 'border-emerald-400/60 bg-emerald-500/20 text-emerald-200'
                                : 'border-white/20 bg-white/5 text-transparent'
                            }`}
                          >
                            {feito ? '✓' : ''}
                          </span>
                          <span className={feito ? 'text-slate-500 line-through' : 'text-slate-300'}>{it}</span>
                        </button>
                      </li>
                    );
                  })}
                </ul>
              )}
            </li>
          );
        })}
      </ul>
      {a.etapas.some((e) => e.itens.length > 0) && (
        <button className="mt-3 text-xs font-medium text-brand-300 hover:underline" onClick={() => setDetalhes((d) => !d)}>
          {detalhes ? 'Ocultar sub-tarefas' : 'Ver sub-tarefas de cada etapa'}
        </button>
      )}

      {erro && (
        <p className="mt-3 text-sm text-red-300">
          Não foi possível salvar: {erro instanceof Error ? erro.message : 'erro inesperado'}
        </p>
      )}

      <div className="mt-4 flex flex-wrap items-center justify-between gap-2 border-t border-white/5 pt-3">
        <div className="flex flex-wrap gap-2">
          <CopiarLinkButton link={link} />
          <a href={link} target="_blank" rel="noreferrer">
            <Button variant="ghost">Abrir página</Button>
          </a>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button
            variant="ghost"
            className="text-red-300"
            onClick={() => {
              if (confirm(`Excluir o onboarding de ${a.cliente_nome}? As etapas e o link do cliente deixam de existir.`)) {
                excluir.mutate(a.cliente_id);
              }
            }}
          >
            Excluir
          </Button>
          {concluido ? (
            <Button
              variant="secondary"
              onClick={() => { if (confirm(`Reabrir onboarding de ${a.cliente_nome}?`)) reabrir.mutate(a.cliente_id); }}
            >
              ↩️ Reabrir
            </Button>
          ) : (
            <Button
              onClick={() => {
                const aviso = feitas < total ? ` Ainda há ${total - feitas} etapa(s) em aberto.` : '';
                if (confirm(`Concluir onboarding de ${a.cliente_nome}?${aviso}`)) {
                  concluir.mutate({ cliente_id: a.cliente_id });
                }
              }}
            >
              <GlassIcon name="check-circle" /> Concluir
            </Button>
          )}
        </div>
      </div>
    </Card>
  );
}

function Andamentos({ concluidosSet, onNovo }: { concluidosSet: Set<string>; onNovo: () => void }) {
  const { data, isLoading, error } = useOnboardingAndamentos();

  if (isLoading) return <Card className="flex justify-center p-12"><Spinner /></Card>;
  if (error) return <Card><EmptyState message="Não foi possível carregar os onboardings. Recarregue a página." /></Card>;
  const emAndamento = (data ?? []).filter((a) => !concluidosSet.has(a.cliente_id));
  if (emAndamento.length === 0)
    return (
      <Card className="flex flex-col items-center gap-2 pb-8">
        <EmptyState message="Nenhum onboarding em andamento." />
        <Button onClick={onNovo}>+ Novo onboarding</Button>
      </Card>
    );

  return (
    <div className="grid grid-cols-1 items-start gap-4 lg:grid-cols-2">
      {emAndamento.map((a) => <CardAndamento key={a.id} a={a} concluido={false} />)}
    </div>
  );
}

function Concluidos({ concluidosSet }: { concluidosSet: Set<string> }) {
  const { data, isLoading } = useOnboardingAndamentos();

  if (isLoading) return <Card className="flex justify-center p-12"><Spinner /></Card>;
  const concluidos = (data ?? []).filter((a) => concluidosSet.has(a.cliente_id));
  if (concluidos.length === 0)
    return <Card><EmptyState message="Nenhum onboarding concluído ainda." /></Card>;

  return (
    <div className="grid grid-cols-1 items-start gap-4 lg:grid-cols-2">
      {concluidos.map((a) => <CardAndamento key={a.id} a={a} concluido />)}
    </div>
  );
}

function Templates({ onAplicar, onEditar, onDuplicar }: {
  onAplicar: (t: OnboardingTemplate) => void;
  onEditar: (t: OnboardingTemplate) => void;
  onDuplicar: (t: OnboardingTemplate) => void;
}) {
  const { data, isLoading } = useOnboardingTemplates();
  const excluir = useExcluirTemplate();
  const [aberto, setAberto] = useState<string | null>(null);

  if (isLoading) return <Card className="flex justify-center p-12"><Spinner /></Card>;
  if (!data || data.length === 0)
    return <Card><EmptyState message="Nenhum modelo. Crie o primeiro." /></Card>;

  return (
    <div className="space-y-4">
      {data.map((t) => (
        <Card key={t.id} className="p-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <div className="font-semibold text-slate-100">{t.nome}</div>
              <div className="text-xs text-slate-400">{t.etapas.length} etapas</div>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <Button variant="ghost" onClick={() => setAberto(aberto === t.id ? null : t.id)}>
                {aberto === t.id ? 'Ocultar etapas' : 'Ver etapas'}
              </Button>
              <Button variant="ghost" onClick={() => onEditar(t)}>Editar</Button>
              <Button variant="ghost" onClick={() => onDuplicar(t)}>Duplicar</Button>
              <Button
                variant="ghost"
                className="text-red-300"
                onClick={() => { if (confirm(`Excluir o modelo "${t.nome}"? Onboardings já iniciados não são afetados.`)) excluir.mutate(t.id); }}
              >
                Excluir
              </Button>
              <Button onClick={() => onAplicar(t)}>Usar em um cliente</Button>
            </div>
          </div>
          {aberto === t.id && (
            <div className="mt-4">
              <EtapasTimeline etapas={t.etapas.map((e) => ({ etapa: e.titulo, tempo: e.tempo, itens: e.itens }))} />
            </div>
          )}
        </Card>
      ))}
    </div>
  );
}
