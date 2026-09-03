import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { Card } from '@/shared/ui/Card';
import { Badge } from '@/shared/ui/Badge';
import { Spinner } from '@/shared/ui/Spinner';

interface Dados {
  cliente: { id: string; nome: string; logo_url: string | null; status: string; servicos: string[]; data_entrada: string; tipo_negocio: string };
  saude:  { score_saude: number | null; score_contrato: number | null; score_aprovacao: number | null; score_suporte: number | null } | null;
  contratos: { id: string; titulo: string; status: string; start_date: string; end_date: string | null; monthly_value: number }[];
  entregas_semana: { id: string; tipo: string; titulo: string; descricao: string | null; url: string | null; thumb_url: string | null; entregue_em: string }[];
  otimizacoes: { id: string; titulo: string; descricao: string | null; plataforma: string | null; criada_em: string }[];
  investimento: { id: string; semana_inicio: string; investimento_total: number; media_diaria: number; observacoes: string | null }[];
  avisos: { id: string; titulo: string; conteudo: string; criado_em: string }[];
  persona: { persona: string | null; planejamento_estrategico: string | null; tom_de_voz: string | null; produtos_servicos: string | null; atualizado_em: string } | null;
  ideias_mes: { id: string; titulo: string; descricao: string; formato: string; semana: number; dia_postagem: string | null; status: string; justificativa: string; mes_referencia: string }[];
  mes_ref: string;
  semana_inicio: string;
}

const FN_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/central-cliente`;

type Aba = 'geral' | 'aprovacao' | 'entregas' | 'otimizacoes' | 'investimento' | 'avisos' | 'persona';

function fmtDia(iso: string): string {
  return new Date(iso).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' });
}
function fmtMoney(v: number): string {
  return v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}
function fmtSemana(iso: string): string {
  const d = new Date(iso); const fim = new Date(d); fim.setDate(fim.getDate() + 6);
  return `${fmtDia(iso)} a ${fmtDia(fim.toISOString())}`;
}

export function CentralClientePage() {
  const { slug = '' } = useParams<{ slug: string }>();
  const [dados, setDados] = useState<Dados | null>(null);
  const [erro, setErro] = useState<string | null>(null);
  const [aba, setAba] = useState<Aba>('geral');

  useEffect(() => {
    (async () => {
      try {
        const r = await fetch(`${FN_URL}?slug=${encodeURIComponent(slug)}`);
        const body = await r.json().catch(() => ({}));
        if (!r.ok) throw new Error(body?.error ?? 'erro');
        setDados(body as Dados);
      } catch (e) { setErro((e as Error).message); }
    })();
  }, [slug]);

  if (erro) return (
    <div className="flex min-h-screen items-center justify-center bg-slate-950 px-4">
      <Card className="w-full max-w-md p-6 text-center">
        <div className="mb-3 text-3xl">⚠️</div>
        <div className="text-slate-100">{erro}</div>
        <p className="mt-2 text-xs text-slate-400">O link pode estar expirado ou incorreto.</p>
      </Card>
    </div>
  );
  if (!dados) return <div className="flex min-h-screen items-center justify-center bg-slate-950"><Spinner /></div>;

  const c = dados.cliente;
  const abas: { id: Aba; label: string; icone: string; badge?: number }[] = [
    { id: 'geral',        label: 'Visão geral',       icone: '🏠' },
    { id: 'aprovacao',    label: 'Aprovar conteúdo',  icone: '✅', badge: dados.ideias_mes.filter((i) => i.status === 'pendente').length },
    { id: 'entregas',     label: 'Entregas da semana', icone: '📦', badge: dados.entregas_semana.length },
    { id: 'otimizacoes',  label: 'Otimizações',       icone: '⚡', badge: dados.otimizacoes.length },
    { id: 'investimento', label: 'Investimento',      icone: '💰' },
    { id: 'avisos',       label: 'Avisos',            icone: '📌', badge: dados.avisos.length },
    { id: 'persona',      label: 'Persona',           icone: '🎯' },
  ];

  return (
    <div className="min-h-screen bg-slate-950 pb-10">
      {/* Header do cliente */}
      <header className="border-b border-white/5 bg-gradient-to-b from-slate-900 to-slate-950 px-4 py-6">
        <div className="mx-auto flex max-w-5xl items-center gap-4">
          {c.logo_url ? (
            <img src={c.logo_url} alt="" className="h-14 w-14 rounded-full border border-white/10 object-cover" />
          ) : (
            <div className="flex h-14 w-14 items-center justify-center rounded-full bg-white/5 text-2xl">🏢</div>
          )}
          <div className="min-w-0 flex-1">
            <h1 className="text-xl font-semibold text-white">{c.nome}</h1>
            <p className="text-xs text-slate-400">Central do Cliente · Startip</p>
          </div>
        </div>
      </header>

      {/* Abas */}
      <nav className="sticky top-0 z-10 border-b border-white/5 bg-slate-950/90 px-4 py-2 backdrop-blur">
        <div className="mx-auto flex max-w-5xl gap-1 overflow-x-auto">
          {abas.map((a) => (
            <button
              key={a.id}
              onClick={() => setAba(a.id)}
              className={`flex shrink-0 items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium transition-colors ${
                aba === a.id ? 'bg-brand-500 text-white' : 'text-slate-300 hover:bg-white/5'
              }`}
            >
              <span>{a.icone}</span>
              <span>{a.label}</span>
              {a.badge && a.badge > 0 && (
                <span className={`rounded-full px-1.5 text-[10px] font-semibold ${
                  aba === a.id ? 'bg-white/20 text-white' : 'bg-brand-500/30 text-brand-200'
                }`}>{a.badge}</span>
              )}
            </button>
          ))}
        </div>
      </nav>

      <main className="mx-auto mt-6 max-w-5xl space-y-6 px-4">
        {aba === 'geral' && <VisaoGeral d={dados} />}
        {aba === 'aprovacao' && <AbaAprovacao slug={slug} ideias={dados.ideias_mes} mes={dados.mes_ref} />}
        {aba === 'entregas' && <AbaEntregas itens={dados.entregas_semana} semana={dados.semana_inicio} />}
        {aba === 'otimizacoes' && <AbaOtimizacoes itens={dados.otimizacoes} />}
        {aba === 'investimento' && <AbaInvestimento itens={dados.investimento} />}
        {aba === 'avisos' && <AbaAvisos itens={dados.avisos} />}
        {aba === 'persona' && <AbaPersona p={dados.persona} />}
      </main>

      <footer className="mt-10 text-center text-[11px] text-slate-500">
        Startip · Cliente desde {new Date(c.data_entrada).toLocaleDateString('pt-BR')}
      </footer>
    </div>
  );
}

function Barra({ label, valor }: { label: string; valor: number | null }) {
  const cor = valor == null ? 'bg-slate-600' : valor >= 60 ? 'bg-emerald-500' : valor >= 40 ? 'bg-amber-500' : 'bg-red-500';
  return (
    <div>
      <div className="mb-1 flex items-center justify-between text-xs">
        <span className="text-slate-300">{label}</span>
        <span className="font-mono text-slate-400">{valor == null ? '—' : `${valor}%`}</span>
      </div>
      <div className="h-2 overflow-hidden rounded-full bg-white/5">
        <div className={`h-full ${cor}`} style={{ width: `${valor ?? 0}%` }} />
      </div>
    </div>
  );
}

function VisaoGeral({ d }: { d: Dados }) {
  const s = d.saude;
  const classe = s?.score_saude == null ? 'Sem dados' : s.score_saude >= 80 ? 'Ótima' : s.score_saude >= 60 ? 'Boa' : s.score_saude >= 40 ? 'Atenção' : 'Crítica';
  const tone: Parameters<typeof Badge>[0]['tone'] = s?.score_saude == null ? 'slate' : s.score_saude >= 60 ? 'green' : s.score_saude >= 40 ? 'amber' : 'red';
  const invAtual = d.investimento[0];
  return (
    <>
      <Card className="p-5">
        <div className="mb-3 flex items-center gap-2">
          <h2 className="text-sm font-semibold text-slate-200">Score de saúde</h2>
          <Badge tone={tone}>{classe}</Badge>
          <span className="ml-auto text-3xl font-semibold text-slate-100">
            {s?.score_saude ?? '—'}<span className="ml-1 text-sm text-slate-500">/100</span>
          </span>
        </div>
        <div className="grid gap-3 sm:grid-cols-3">
          <Barra label="Contrato"  valor={s?.score_contrato  ?? null} />
          <Barra label="Aprovação" valor={s?.score_aprovacao ?? null} />
          <Barra label="Suporte"   valor={s?.score_suporte   ?? null} />
        </div>
      </Card>

      <div className="grid gap-4 sm:grid-cols-3">
        <Card className="p-4">
          <div className="text-[10px] uppercase tracking-wider text-slate-500">Entregas na semana</div>
          <div className="mt-1 text-2xl font-semibold text-slate-100">{d.entregas_semana.length}</div>
        </Card>
        <Card className="p-4">
          <div className="text-[10px] uppercase tracking-wider text-slate-500">Otimizações recentes</div>
          <div className="mt-1 text-2xl font-semibold text-slate-100">{d.otimizacoes.length}</div>
        </Card>
        <Card className="p-4">
          <div className="text-[10px] uppercase tracking-wider text-slate-500">Investimento (semana atual)</div>
          <div className="mt-1 text-xl font-semibold text-slate-100">
            {invAtual ? fmtMoney(Number(invAtual.investimento_total)) : '—'}
          </div>
        </Card>
      </div>

      <Card className="p-5">
        <h2 className="mb-3 text-sm font-semibold text-slate-200">Contratos</h2>
        {d.contratos.length === 0 ? <p className="text-xs text-slate-500">Nenhum contrato ativo.</p> : (
          <ul className="space-y-2">
            {d.contratos.map((k) => (
              <li key={k.id} className="flex items-center justify-between rounded-md border border-white/5 bg-white/[0.02] px-3 py-2">
                <div>
                  <div className="text-sm text-slate-100">{k.titulo}</div>
                  <div className="text-[11px] text-slate-400">
                    {new Date(k.start_date).toLocaleDateString('pt-BR')} → {k.end_date ? new Date(k.end_date).toLocaleDateString('pt-BR') : '—'}
                  </div>
                </div>
                <div className="text-right">
                  <Badge tone={k.status === 'assinado' ? 'green' : k.status === 'aguardando' ? 'amber' : 'slate'}>{k.status}</Badge>
                  <div className="mt-1 text-xs text-slate-300">{fmtMoney(Number(k.monthly_value ?? 0))}/mês</div>
                </div>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </>
  );
}

function AbaAprovacao({ slug, ideias, mes }: { slug: string; ideias: Dados['ideias_mes']; mes: string }) {
  const pendentes = ideias.filter((i) => i.status === 'pendente').length;
  return (
    <Card className="p-6 text-center">
      <div className="mb-3 text-4xl">✅</div>
      <h2 className="text-lg font-semibold text-slate-100">Aprovação de conteúdo</h2>
      <p className="mt-2 text-sm text-slate-400">
        {pendentes > 0
          ? `Você tem ${pendentes} conteúdo(s) aguardando aprovação em ${mes}.`
          : ideias.length > 0 ? 'Todos os conteúdos deste mês já foram decididos.'
          : 'Nenhum conteúdo publicado neste mês ainda.'}
      </p>
      <Link
        to={`/aprovar/${slug}`}
        className="mt-4 inline-block rounded-md bg-brand-500 px-4 py-2 text-sm font-medium text-white hover:bg-brand-400"
      >
        Abrir aprovação →
      </Link>
    </Card>
  );
}

function AbaEntregas({ itens, semana }: { itens: Dados['entregas_semana']; semana: string }) {
  return (
    <>
      <Card className="p-4">
        <h2 className="text-sm font-semibold text-slate-200">
          📦 Conteúdos entregues · <span className="font-normal text-slate-400">{fmtSemana(semana)}</span>
        </h2>
      </Card>
      {itens.length === 0 ? <Card className="p-6 text-center text-sm text-slate-500">Nenhuma entrega registrada nesta semana.</Card> : (
        <div className="grid gap-3 sm:grid-cols-2">
          {itens.map((e) => (
            <Card key={e.id} className="p-4">
              <div className="mb-2 flex items-center gap-2">
                <Badge tone="blue">{e.tipo}</Badge>
                <span className="text-[11px] text-slate-500">{fmtDia(e.entregue_em)}</span>
              </div>
              <div className="text-sm font-medium text-slate-100">{e.titulo}</div>
              {e.descricao && <p className="mt-1 text-xs text-slate-400">{e.descricao}</p>}
              {e.url && <a href={e.url} target="_blank" rel="noopener" className="mt-2 inline-block text-xs font-medium text-brand-300 hover:underline">🔗 Ver publicação</a>}
            </Card>
          ))}
        </div>
      )}
    </>
  );
}

function AbaOtimizacoes({ itens }: { itens: Dados['otimizacoes'] }) {
  return itens.length === 0
    ? <Card className="p-6 text-center text-sm text-slate-500">Nenhuma otimização registrada ainda.</Card>
    : (
      <ul className="space-y-2">
        {itens.map((o) => (
          <li key={o.id}>
            <Card className="p-4">
              <div className="mb-1 flex items-center gap-2">
                <span className="text-xs font-medium uppercase tracking-wider text-amber-300">⚡ {o.plataforma}</span>
                <span className="text-[11px] text-slate-500">{new Date(o.criada_em).toLocaleString('pt-BR', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}</span>
              </div>
              <div className="text-sm font-medium text-slate-100">{o.titulo}</div>
              {o.descricao && <p className="mt-1 whitespace-pre-line text-xs text-slate-400">{o.descricao}</p>}
            </Card>
          </li>
        ))}
      </ul>
    );
}

function AbaInvestimento({ itens }: { itens: Dados['investimento'] }) {
  return itens.length === 0
    ? <Card className="p-6 text-center text-sm text-slate-500">Sem registros de investimento ainda.</Card>
    : (
      <div className="space-y-3">
        {itens.map((s) => (
          <Card key={s.id} className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-[10px] uppercase tracking-wider text-slate-500">Semana</div>
                <div className="text-sm font-medium text-slate-100">{fmtSemana(s.semana_inicio)}</div>
              </div>
              <div className="text-right">
                <div className="text-2xl font-semibold text-emerald-300">{fmtMoney(Number(s.investimento_total))}</div>
                <div className="text-[11px] text-slate-500">média diária: {fmtMoney(Number(s.media_diaria))}</div>
              </div>
            </div>
            {s.observacoes && <p className="mt-2 whitespace-pre-line text-xs text-slate-400">{s.observacoes}</p>}
          </Card>
        ))}
      </div>
    );
}

function AbaAvisos({ itens }: { itens: Dados['avisos'] }) {
  return itens.length === 0
    ? <Card className="p-6 text-center text-sm text-slate-500">Nenhum aviso ainda.</Card>
    : (
      <ul className="space-y-2">
        {itens.map((a) => (
          <li key={a.id}>
            <Card className="p-4">
              <div className="mb-1 flex items-center gap-2">
                <span className="text-xs font-semibold text-amber-300">📌 AVISO</span>
                <span className="text-[11px] text-slate-500">{new Date(a.criado_em).toLocaleDateString('pt-BR')}</span>
              </div>
              <div className="text-sm font-semibold text-slate-100">{a.titulo}</div>
              <p className="mt-1 whitespace-pre-line text-xs text-slate-300">{a.conteudo}</p>
            </Card>
          </li>
        ))}
      </ul>
    );
}

function AbaPersona({ p }: { p: Dados['persona'] }) {
  if (!p) return <Card className="p-6 text-center text-sm text-slate-500">Persona ainda não foi mapeada.</Card>;
  return (
    <div className="grid gap-4 sm:grid-cols-2">
      {p.persona && <Card className="p-4"><h3 className="mb-2 text-xs font-semibold uppercase tracking-wider text-brand-300">🎯 Persona</h3><p className="whitespace-pre-line text-sm text-slate-200">{p.persona}</p></Card>}
      {p.planejamento_estrategico && <Card className="p-4"><h3 className="mb-2 text-xs font-semibold uppercase tracking-wider text-brand-300">📋 Planejamento estratégico</h3><p className="whitespace-pre-line text-sm text-slate-200">{p.planejamento_estrategico}</p></Card>}
      {p.tom_de_voz && <Card className="p-4"><h3 className="mb-2 text-xs font-semibold uppercase tracking-wider text-brand-300">🎙️ Tom de voz</h3><p className="whitespace-pre-line text-sm text-slate-200">{p.tom_de_voz}</p></Card>}
      {p.produtos_servicos && <Card className="p-4"><h3 className="mb-2 text-xs font-semibold uppercase tracking-wider text-brand-300">🛍️ Produtos / serviços</h3><p className="whitespace-pre-line text-sm text-slate-200">{p.produtos_servicos}</p></Card>}
    </div>
  );
}
