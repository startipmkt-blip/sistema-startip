import { useMemo, useState } from 'react';
import {
  linkPublicoOnboarding,
  useOnboardingTemplates,
  useOnboardingAndamentos,
  useToggleEtapa,
  useToggleItem,
  useToggleEtapaInterna,
  useToggleItemInterno,
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
import { GlassIcon } from '@/shared/ui/GlassIcon';
import { confirmar } from '@/shared/ui/ConfirmDialog';

type Aba = 'andamento' | 'concluidos' | 'templates';

type TemplateForm = { template?: OnboardingTemplate; base?: OnboardingTemplate };

export function OnboardingPage() {
  const [aba, setAba] = useState<Aba>('andamento');
  // undefined = fechado; '' = aberto sem modelo pré-escolhido.
  const [novoOnboarding, setNovoOnboarding] = useState<string | undefined>();
  const [templateForm, setTemplateForm] = useState<TemplateForm | null>(null);
  const { data: conclusoes } = useOnboardingConclusoes();
  const andamentosQ = useOnboardingAndamentos();

  const concluidosSet = useMemo(
    () => new Set((conclusoes ?? []).map((c) => c.cliente_id)),
    [conclusoes],
  );

  return (
    <div className="space-y-6">
      <PageHeader
        title={aba === 'templates' ? 'Modelos de onboarding' : 'Onboarding'}
        subtitle={aba === 'templates'
          ? 'Passo a passo reutilizável para aplicar em cada cliente novo.'
          : 'Selecione um cliente à esquerda para acompanhar o andamento dele.'}
      >
        {aba === 'templates' ? (
          <>
            <Button variant="secondary" onClick={() => setAba('andamento')}><GlassIcon name="chevron-left" className="h-4 w-4" /> Voltar</Button>
            <Button onClick={() => setTemplateForm({})}><GlassIcon name="plus" className="h-4 w-4" /> Novo modelo</Button>
          </>
        ) : (
          <>
            <Button variant="secondary" onClick={() => setAba('templates')}><GlassIcon name="file-text" className="h-4 w-4" /> Modelos</Button>
            <Button onClick={() => setNovoOnboarding('')}><GlassIcon name="plus" className="h-4 w-4" /> Novo onboarding</Button>
          </>
        )}
      </PageHeader>

      {aba === 'templates' ? (
        <Templates
          onAplicar={(t) => setNovoOnboarding(t.id)}
          onEditar={(t) => setTemplateForm({ template: t })}
          onDuplicar={(t) => setTemplateForm({ base: t })}
        />
      ) : (
        <PainelOnboarding
          andamentos={andamentosQ.data ?? []}
          carregando={andamentosQ.isLoading}
          erro={Boolean(andamentosQ.error)}
          concluidosSet={concluidosSet}
          onNovo={() => setNovoOnboarding('')}
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
          onClose={() => { setNovoOnboarding(undefined); setAba('andamento'); }}
        />
      )}
    </div>
  );
}

function iniciais(nome: string) {
  const partes = nome.trim().split(/\s+/);
  return (partes.length > 1 ? partes[0][0] + partes[1][0] : nome.slice(0, 2)).toUpperCase();
}

function progresso(a: OnboardingAndamento) {
  const total = a.etapas.length;
  const feitas = a.etapas.filter((e) => e.concluida).length;
  return { total, feitas, pct: total ? Math.round((feitas / total) * 100) : 0 };
}

function diasDesde(a: OnboardingAndamento) {
  return Math.floor((Date.now() - new Date(a.created_at).getTime()) / 86_400_000);
}

/** Lista de clientes à esquerda e o andamento do selecionado à direita. */
function PainelOnboarding({ andamentos, carregando, erro, concluidosSet, onNovo }: {
  andamentos: OnboardingAndamento[]; carregando: boolean; erro: boolean; concluidosSet: Set<string>; onNovo: () => void;
}) {
  const [filtro, setFiltro] = useState<'andamento' | 'concluidos'>('andamento');
  const [selecionado, setSelecionado] = useState<string | null>(null);

  const emAndamento = andamentos.filter((a) => !concluidosSet.has(a.cliente_id));
  const concluidos = andamentos.filter((a) => concluidosSet.has(a.cliente_id));
  const lista = filtro === 'andamento' ? emAndamento : concluidos;
  const atual = lista.find((a) => a.id === selecionado) ?? lista[0] ?? null;

  if (carregando) return <Card className="flex justify-center p-12"><Spinner /></Card>;
  if (erro) return <Card><EmptyState message="Não foi possível carregar os onboardings. Recarregue a página." /></Card>;
  if (andamentos.length === 0) {
    return (
      <Card className="flex flex-col items-center gap-2 pb-8">
        <EmptyState message="Nenhum onboarding iniciado ainda." />
        <Button onClick={onNovo}><GlassIcon name="plus" className="h-4 w-4" /> Novo onboarding</Button>
      </Card>
    );
  }

  return (
    <div className="grid items-start gap-4 lg:grid-cols-[minmax(280px,380px)_1fr]">
      <Card className="overflow-hidden p-0">
        <div className="px-4 pb-3 pt-4">
          <div className="tabs-clean inline-flex gap-1 rounded-xl border border-white/10 bg-white/[0.03] p-1" role="tablist">
            {([
              { id: 'andamento', label: `Em andamento (${emAndamento.length})` },
              { id: 'concluidos', label: `Concluídos (${concluidos.length})` },
            ] as const).map((t) => (
              <button
                key={t.id}
                role="tab"
                aria-selected={filtro === t.id}
                onClick={() => { setFiltro(t.id); setSelecionado(null); }}
                className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors ${
                  filtro === t.id ? 'tab-ativa bg-white/10 text-white' : 'text-slate-400 hover:text-slate-200'}`}
              >
                {t.label}
              </button>
            ))}
          </div>
        </div>
        {lista.length === 0 ? (
          <p className="px-4 pb-6 text-sm text-slate-400">
            {filtro === 'andamento' ? 'Nenhum onboarding em andamento.' : 'Nenhum onboarding concluído ainda.'}
          </p>
        ) : (
          <ul className="border-t border-white/[0.08]">
            {lista.map((a) => {
              const { pct } = progresso(a);
              const ativo = atual?.id === a.id;
              const dias = diasDesde(a);
              return (
                <li key={a.id}>
                  <button
                    onClick={() => setSelecionado(a.id)}
                    aria-current={ativo ? 'true' : undefined}
                    className={`onb-item flex w-full items-center gap-3 border-b border-white/[0.06] px-4 py-3 text-left transition-colors ${
                      ativo ? 'onb-item-ativo bg-brand-500/10' : 'hover:bg-white/[0.04]'}`}
                  >
                    <span className="logo-iniciais flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-[#0e1a24] text-xs font-bold text-[#ffffff]">
                      {iniciais(a.cliente_nome)}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-semibold text-slate-100">{a.cliente_nome}</span>
                      <span className="block truncate text-xs text-slate-400">
                        {a.template_nome || 'Onboarding'} · há {dias} {dias === 1 ? 'dia' : 'dias'}
                      </span>
                    </span>
                    <Badge tone={pct === 100 ? 'green' : 'blue'}>{pct}%</Badge>
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </Card>

      {atual ? (
        <DetalheAndamento key={atual.id} a={atual} concluido={concluidosSet.has(atual.cliente_id)} />
      ) : (
        <Card><EmptyState message="Selecione um cliente à esquerda." /></Card>
      )}
    </div>
  );
}

function DetalheAndamento({ a, concluido }: { a: OnboardingAndamento; concluido: boolean }) {
  const toggle = useToggleEtapa();
  const toggleItem = useToggleItem();
  const toggleEtapaInterna = useToggleEtapaInterna();
  const toggleItemInterno = useToggleItemInterno();
  const concluir = useConcluirOnboarding();
  const reabrir = useReabrirOnboarding();
  const excluir = useExcluirOnboarding();
  const [abertas, setAbertas] = useState<Set<string>>(() => {
    const etapaAtual = a.etapas.find((e) => !e.concluida);
    return new Set(etapaAtual ? [etapaAtual.id] : []);
  });

  const { total, feitas, pct } = progresso(a);
  const indiceAtual = a.etapas.findIndex((e) => !e.concluida);
  const link = linkPublicoOnboarding(a.token);
  const erro = toggle.error ?? toggleItem.error ?? toggleEtapaInterna.error ?? toggleItemInterno.error ?? concluir.error ?? reabrir.error ?? excluir.error;

  function alternarAberta(id: string) {
    setAbertas((s) => {
      const n = new Set(s);
      if (n.has(id)) n.delete(id); else n.add(id);
      return n;
    });
  }

  return (
    <Card className="overflow-hidden p-0">
      <div className="px-5 pb-4 pt-5">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="text-lg font-bold text-slate-100">{a.cliente_nome}</h2>
              {concluido && <Badge tone="green"><GlassIcon name="check-circle" /> Concluído</Badge>}
            </div>
            <div className="text-xs text-slate-400">
              {[a.template_nome, a.created_at && `iniciado em ${formatDate(a.created_at)}`].filter(Boolean).join(' · ')}
            </div>
          </div>
          <Badge tone={pct === 100 ? 'green' : 'blue'}>{feitas}/{total} · {pct}%</Badge>
        </div>
        <div className="mt-3 h-2 w-full overflow-hidden rounded-full bg-white/10">
          <div className={`h-full rounded-full transition-all ${concluido || pct === 100 ? 'bg-emerald-500' : 'bg-brand-500'}`} style={{ width: `${pct}%` }} />
        </div>
      </div>

      <ol className="border-t border-white/[0.08]">
        {a.etapas.map((e, i) => {
          const feitosSet = new Set(e.itens_feitos ?? []);
          const internosSet = new Set(e.itens_internos ?? []);
          const subTotal = e.itens.length;
          const subFeitos = e.itens.reduce((n, _it, j) => n + (feitosSet.has(j) ? 1 : 0), 0);
          const ehAtual = !concluido && i === indiceAtual;
          const situacao = e.concluida ? 'Concluído' : ehAtual ? 'Em andamento' : 'A fazer';
          const aberta = abertas.has(e.id);
          return (
            <li key={e.id} className="border-b border-white/[0.06] last:border-b-0">
              <div className="flex items-center gap-3 px-5 py-3">
                <button
                  onClick={() => toggle.mutate({ etapaId: e.id, concluida: !e.concluida })}
                  disabled={concluido || toggle.isPending}
                  title={e.concluida ? 'Marcar como não concluída' : 'Marcar como concluída'}
                  className={`etapa-num flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-bold transition-colors ${
                    e.concluida
                      ? 'etapa-feita bg-emerald-500 text-white'
                      : ehAtual
                        ? 'border-2 border-brand-400 bg-brand-500/10 text-brand-300'
                        : 'border border-white/15 text-slate-400 hover:border-brand-400'}`}
                >
                  {e.concluida ? <GlassIcon name="check" tone="white" className="h-4 w-4" /> : i + 1}
                </button>
                <button
                  type="button"
                  onClick={() => subTotal > 0 && alternarAberta(e.id)}
                  className="min-w-0 flex-1 text-left"
                  aria-expanded={subTotal > 0 ? aberta : undefined}
                >
                  <span className={`block text-sm font-semibold ${e.concluida ? 'text-slate-400' : 'text-slate-100'}`}>
                    {e.etapa}
                    {e.interno && (
                      <span className="ml-2 rounded bg-slate-500/20 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-slate-400">só equipe</span>
                    )}
                  </span>
                  <span className="block text-xs text-slate-400">
                    {situacao}
                    {e.tempo && <> · <GlassIcon name="timer" className="h-3 w-3" /> {e.tempo}</>}
                    {subTotal > 0 && ` · ${subFeitos}/${subTotal} tarefas`}
                  </span>
                </button>
                {ehAtual && <Badge tone="blue">Agora</Badge>}
                <button
                  type="button"
                  title={e.interno ? 'Visível só para a equipe. Clique para mostrar ao cliente.' : 'Visível para o cliente. Clique para ocultar.'}
                  aria-label={e.interno ? 'Mostrar etapa ao cliente' : 'Ocultar etapa do cliente'}
                  onClick={() => toggleEtapaInterna.mutate({ etapaId: e.id, interno: !e.interno })}
                  disabled={concluido || toggleEtapaInterna.isPending}
                  className="shrink-0 rounded p-1 text-slate-400 hover:text-slate-200"
                >
                  <GlassIcon name={e.interno ? 'lock' : 'eye'} className="h-4 w-4" />
                </button>
                {subTotal > 0 && (
                  <button type="button" onClick={() => alternarAberta(e.id)} className="shrink-0 rounded p-1 text-slate-400 hover:text-slate-200" aria-label={aberta ? 'Recolher tarefas' : 'Ver tarefas'}>
                    <GlassIcon name={aberta ? 'chevron-down' : 'chevron-right'} className="h-4 w-4" />
                  </button>
                )}
              </div>
              {aberta && subTotal > 0 && (
                <ul className="space-y-1.5 pb-3 pl-[3.75rem] pr-5">
                  {e.itens.map((it, j) => {
                    const feito = feitosSet.has(j);
                    const interno = internosSet.has(j);
                    return (
                      <li key={j} className="flex items-start gap-2">
                        <button
                          type="button"
                          onClick={() => toggleItem.mutate({ etapaId: e.id, index: j, feito: !feito })}
                          disabled={concluido || toggleItem.isPending}
                          className="flex min-w-0 flex-1 items-start gap-2 text-left text-xs"
                        >
                          <span
                            className={`mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded border ${
                              feito ? 'etapa-feita border-emerald-500 bg-emerald-500' : 'border-white/20 bg-white/5'}`}
                          >
                            {feito && <GlassIcon name="check" tone="white" className="h-3 w-3" />}
                          </span>
                          <span className={feito ? 'text-slate-400 line-through' : 'text-slate-300'}>
                            {it}
                            {interno && (
                              <span className="ml-2 rounded bg-slate-500/20 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-slate-400">só equipe</span>
                            )}
                          </span>
                        </button>
                        <button
                          type="button"
                          title={interno ? 'Oculto do cliente. Clique para mostrar.' : 'Visível para o cliente. Clique para ocultar.'}
                          aria-label={interno ? 'Mostrar tarefa ao cliente' : 'Ocultar tarefa do cliente'}
                          onClick={() => toggleItemInterno.mutate({ etapaId: e.id, index: j, interno: !interno })}
                          disabled={concluido || toggleItemInterno.isPending}
                          className="shrink-0 rounded p-0.5 text-slate-400 hover:text-slate-200"
                        >
                          <GlassIcon name={interno ? 'lock' : 'eye'} className="h-3.5 w-3.5" />
                        </button>
                      </li>
                    );
                  })}
                </ul>
              )}
            </li>
          );
        })}
      </ol>

      {erro && (
        <p className="px-5 pt-3 text-sm text-red-300">
          Não foi possível salvar: {erro instanceof Error ? erro.message : 'erro inesperado'}
        </p>
      )}

      <div className="flex flex-wrap items-center justify-between gap-2 border-t border-white/[0.08] px-5 py-4">
        <div className="flex flex-wrap gap-2">
          <CopiarLinkButton link={link} />
          <a href={link} target="_blank" rel="noreferrer">
            <Button variant="ghost">Abrir página do cliente</Button>
          </a>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button
            variant="ghost"
            className="text-red-300"
            onClick={async () => {
              if ((await confirmar(`Excluir o onboarding de ${a.cliente_nome}? As etapas e o link do cliente deixam de existir.`))) {
                excluir.mutate(a.cliente_id);
              }
            }}
          >
            Excluir
          </Button>
          {concluido ? (
            <Button
              variant="secondary"
              onClick={async () => { if ((await confirmar(`Reabrir onboarding de ${a.cliente_nome}?`))) reabrir.mutate(a.cliente_id); }}
            >
              Reabrir
            </Button>
          ) : (
            <Button
              onClick={async () => {
                const aviso = feitas < total ? ` Ainda há ${total - feitas} etapa(s) em aberto.` : '';
                if ((await confirmar(`Concluir onboarding de ${a.cliente_nome}?${aviso}`))) {
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
                onClick={async () => { if ((await confirmar(`Excluir o modelo "${t.nome}"? Onboardings já iniciados não são afetados.`))) excluir.mutate(t.id); }}
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
