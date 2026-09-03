import { useMemo, useState } from 'react';
import { PageHeader } from '@/shared/ui/PageHeader';
import { Card } from '@/shared/ui/Card';
import { Button } from '@/shared/ui/Button';
import { Input } from '@/shared/ui/Input';
import { Badge } from '@/shared/ui/Badge';
import { Modal } from '@/shared/ui/Modal';
import { Spinner } from '@/shared/ui/Spinner';
import { formatMoney } from '@/shared/lib/format';
import { useContasMeta, useSincronizarMeta, type ContaMetaComCliente } from '../api/metaAdsApi';
import {
  useKpisConta, useDiario, useCampanhas, useAnuncios,
  usePausarObjeto, useEditarOrcamento,
  type Periodo, type PeriodoPreset, type Campanha,
} from '../api/gestorApi';
import { MetaAdsPage as MetaAdsConfigPage } from './MetaAdsPage';

type Aba = 'painel' | 'campanhas' | 'anuncios' | 'config';

const PRESETS: Array<{ id: PeriodoPreset; label: string }> = [
  { id: 'today',    label: 'Hoje' },
  { id: 'yesterday',label: 'Ontem' },
  { id: 'last_7d',  label: '7 dias' },
  { id: 'last_14d', label: '14 dias' },
  { id: 'last_30d', label: '30 dias' },
  { id: 'last_90d', label: '90 dias' },
];

function fmtInt(n: number): string { return Intl.NumberFormat('pt-BR').format(Math.round(n)); }
function fmtDec(n: number, d = 2): string { return Number(n ?? 0).toLocaleString('pt-BR', { minimumFractionDigits: d, maximumFractionDigits: d }); }

export function MetaAdsGestorPage() {
  const contas = useContasMeta();
  const sync = useSincronizarMeta();

  const [contaId, setContaId] = useState<string>('');
  const [aba, setAba] = useState<Aba>('painel');
  const [preset, setPreset] = useState<PeriodoPreset | 'custom'>('last_7d');
  const [since, setSince] = useState('');
  const [until, setUntil] = useState('');

  const contaSelecionada: ContaMetaComCliente | undefined = useMemo(
    () => (contas.data ?? []).find((c) => c.id === contaId),
    [contas.data, contaId],
  );

  const contasProntas = (contas.data ?? []).filter((c) => c.tem_token && c.sincronizacao_ativa);

  const periodo: Periodo = preset === 'custom'
    ? { since: since || undefined, until: until || undefined }
    : { preset };

  return (
    <div className="space-y-4 p-4">
      <PageHeader
        title="🎯 Meta Ads — Gestor de Tráfego"
        subtitle="Controle das campanhas Meta de todos os clientes num só lugar."
      >
        {aba !== 'config' && contaSelecionada && (
          <Button variant="secondary" onClick={() => sync.mutate({ cliente_id: contaSelecionada.cliente_id })} disabled={sync.isPending}>
            {sync.isPending ? 'Sincronizando…' : '💾 Salvar cache'}
          </Button>
        )}
        <Button variant="secondary" onClick={() => setAba('config')}>⚙️ Contas</Button>
      </PageHeader>

      {/* Barra de seleção cliente */}
      {aba !== 'config' && (
        <SeletorClientes
          contas={contasProntas}
          contaAtivaId={contaId}
          onSelecionar={setContaId}
          carregando={contas.isLoading}
        />
      )}

      {aba !== 'config' && contaSelecionada && (
        <FiltroPeriodo
          preset={preset}
          onPreset={(p) => setPreset(p)}
          since={since} until={until}
          onSince={setSince} onUntil={setUntil}
        />
      )}

      {/* Abas internas quando cliente selecionado */}
      {contaSelecionada && aba !== 'config' && (
        <nav className="flex gap-1 border-b border-white/10">
          {([['painel','📊 Painel'],['campanhas','🎯 Campanhas'],['anuncios','🖼 Anúncios']] as [Aba, string][]).map(([id, label]) => (
            <button key={id} onClick={() => setAba(id)}
              className={`rounded-t-md px-4 py-2 text-sm font-medium transition-colors ${
                aba === id ? 'bg-white/5 text-white border-b-2 border-brand-400' : 'text-slate-400 hover:text-slate-200'
              }`}>{label}</button>
          ))}
        </nav>
      )}

      {aba === 'config' && (
        <div>
          <Button variant="secondary" className="mb-3" onClick={() => setAba('painel')}>← Voltar ao painel</Button>
          <MetaAdsConfigPage />
        </div>
      )}

      {aba !== 'config' && !contaSelecionada && !contas.isLoading && contasProntas.length === 0 && (
        <Card className="p-8 text-center">
          <div className="mb-2 text-4xl">🔌</div>
          <h2 className="text-lg font-semibold text-slate-100">Nenhuma conta conectada ainda</h2>
          <p className="mt-1 text-sm text-slate-400">Conecte a primeira conta Meta pra começar a gerenciar as campanhas.</p>
          <div className="mt-4 flex justify-center">
            <Button onClick={() => setAba('config')}>⚙️ Ir para Contas</Button>
          </div>
        </Card>
      )}

      {aba !== 'config' && !contaSelecionada && contasProntas.length > 0 && (
        <Card className="p-8 text-center text-sm text-slate-400">
          Escolha um cliente acima para ver as campanhas.
        </Card>
      )}

      {contaSelecionada && aba === 'painel'    && <AbaPainel   contaId={contaSelecionada.id} periodo={periodo} moeda={contaSelecionada.moeda ?? 'BRL'} />}
      {contaSelecionada && aba === 'campanhas' && <AbaCampanhas contaId={contaSelecionada.id} periodo={periodo} />}
      {contaSelecionada && aba === 'anuncios'  && <AbaAnuncios contaId={contaSelecionada.id} periodo={periodo} />}
    </div>
  );
}

// ------------------------------------------------ Seletor
function SeletorClientes({
  contas, contaAtivaId, onSelecionar, carregando,
}: {
  contas: ContaMetaComCliente[];
  contaAtivaId: string;
  onSelecionar: (id: string) => void;
  carregando: boolean;
}) {
  if (carregando) return <Card className="flex justify-center p-6"><Spinner /></Card>;
  return (
    <div className="flex flex-wrap gap-2 overflow-x-auto">
      {contas.map((c) => {
        const ativa = c.id === contaAtivaId;
        return (
          <button
            key={c.id}
            onClick={() => onSelecionar(c.id)}
            className={`group flex min-w-[220px] items-center gap-3 rounded-xl border p-3 text-left transition-all ${
              ativa
                ? 'border-brand-400/70 bg-gradient-to-br from-brand-500/20 to-transparent shadow-glow'
                : 'border-white/10 bg-white/5 hover:border-white/20 hover:bg-white/10'
            }`}
          >
            <div className={`grid h-10 w-10 place-items-center rounded-lg text-lg font-bold ${
              ativa ? 'bg-brand-500 text-white' : 'bg-white/10 text-slate-300 group-hover:bg-white/15'
            }`}>{c.cliente_nome.slice(0, 1).toUpperCase()}</div>
            <div className="min-w-0">
              <p className={`truncate text-sm font-semibold ${ativa ? 'text-white' : 'text-slate-100'}`}>{c.cliente_nome}</p>
              <p className="truncate text-[11px] text-slate-400">act_{c.id_externo}</p>
            </div>
          </button>
        );
      })}
    </div>
  );
}

// ------------------------------------------------ Filtro período
function FiltroPeriodo({
  preset, onPreset, since, until, onSince, onUntil,
}: {
  preset: PeriodoPreset | 'custom';
  onPreset: (p: PeriodoPreset | 'custom') => void;
  since: string; until: string;
  onSince: (v: string) => void; onUntil: (v: string) => void;
}) {
  return (
    <Card className="flex flex-wrap items-center gap-2 p-2">
      {PRESETS.map((p) => (
        <button
          key={p.id}
          onClick={() => onPreset(p.id)}
          className={`rounded-lg px-3 py-1.5 text-xs font-medium transition-colors ${
            preset === p.id ? 'bg-brand-500 text-white shadow-glow' : 'bg-white/5 text-slate-300 hover:bg-white/10'
          }`}
        >{p.label}</button>
      ))}
      <button
        onClick={() => onPreset('custom')}
        className={`rounded-lg px-3 py-1.5 text-xs font-medium transition-colors ${
          preset === 'custom' ? 'bg-brand-500 text-white shadow-glow' : 'bg-white/5 text-slate-300 hover:bg-white/10'
        }`}
      >Personalizado</button>
      {preset === 'custom' && (
        <>
          <input type="date" value={since} onChange={(e) => onSince(e.target.value)} className="glass-field rounded-md px-2 py-1 text-xs" />
          <span className="text-xs text-slate-500">→</span>
          <input type="date" value={until} onChange={(e) => onUntil(e.target.value)} className="glass-field rounded-md px-2 py-1 text-xs" />
        </>
      )}
    </Card>
  );
}

// ------------------------------------------------ Aba: Painel
function AbaPainel({ contaId, periodo, moeda }: { contaId: string; periodo: Periodo; moeda: string }) {
  const kpis = useKpisConta(contaId, periodo);
  const diario = useDiario(contaId, periodo);

  if (kpis.isLoading || diario.isLoading) return <Card className="flex justify-center p-10"><Spinner /></Card>;
  if (kpis.isError) return <Card className="p-6 text-sm text-red-300">❌ {(kpis.error as Error).message}</Card>;
  const k = kpis.data!;
  const dias = diario.data ?? [];
  const spendMax = Math.max(1, ...dias.map((d) => d.spend));

  const tiles: Array<{ label: string; valor: string; tone: string; icone: string; hint?: string }> = [
    { label: 'Investimento', valor: formatMoney(k.spend), tone: 'from-emerald-500/30 to-emerald-500/5 text-emerald-200', icone: '💸' },
    { label: 'ROAS',          valor: `${fmtDec(k.roas)}x`, tone: k.roas >= 2 ? 'from-emerald-500/30 to-emerald-500/5 text-emerald-200' : k.roas > 0 ? 'from-amber-500/30 to-amber-500/5 text-amber-200' : 'from-slate-500/20 to-slate-500/5 text-slate-300', icone: '📈' },
    { label: 'Conversões',    valor: fmtInt(k.conversions), tone: 'from-brand-500/30 to-brand-500/5 text-brand-100', icone: '🎯' },
    { label: 'CPA',           valor: k.cpa > 0 ? formatMoney(k.cpa) : '—', tone: 'from-fuchsia-500/25 to-fuchsia-500/5 text-fuchsia-100', icone: '🎟' },
    { label: 'Impressões',    valor: fmtInt(k.impressions), tone: 'from-sky-500/25 to-sky-500/5 text-sky-100', icone: '👁' },
    { label: 'Cliques',       valor: fmtInt(k.clicks), tone: 'from-indigo-500/25 to-indigo-500/5 text-indigo-100', icone: '🖱' },
    { label: 'CTR',           valor: `${fmtDec(k.ctr)}%`, tone: 'from-cyan-500/25 to-cyan-500/5 text-cyan-100', icone: '⚡' },
    { label: 'CPM',           valor: formatMoney(k.cpm), tone: 'from-slate-500/25 to-slate-500/5 text-slate-100', icone: '📊' },
  ];

  void moeda;
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        {tiles.map((t) => (
          <div key={t.label} className={`relative overflow-hidden rounded-xl border border-white/10 bg-gradient-to-br ${t.tone} p-4`}>
            <div className="mb-1 flex items-center justify-between">
              <span className="text-[10px] font-semibold uppercase tracking-wider text-white/80">{t.label}</span>
              <span className="text-lg">{t.icone}</span>
            </div>
            <div className="text-2xl font-bold text-white">{t.valor}</div>
            {t.hint && <div className="mt-1 text-[10px] text-white/60">{t.hint}</div>}
          </div>
        ))}
      </div>

      <Card className="p-4">
        <div className="mb-3 flex items-center justify-between">
          <h3 className="text-sm font-semibold text-slate-200">Spend diário</h3>
          <span className="text-xs text-slate-400">{dias.length} dia(s)</span>
        </div>
        {dias.length === 0 ? (
          <p className="py-8 text-center text-sm text-slate-500">Sem dados no período selecionado.</p>
        ) : (
          <div className="flex h-48 items-end gap-1">
            {dias.map((d) => {
              const h = Math.max(3, Math.round((d.spend / spendMax) * 100));
              return (
                <div key={d.dia} className="group relative flex flex-1 flex-col items-center">
                  <div
                    className="w-full rounded-t bg-gradient-to-t from-brand-500 to-brand-300 transition-opacity group-hover:opacity-90"
                    style={{ height: `${h}%` }}
                  />
                  <div className="pointer-events-none absolute -top-12 z-10 hidden rounded-lg border border-white/10 bg-slate-900 px-2 py-1 text-[10px] text-slate-100 shadow-lg group-hover:block whitespace-nowrap">
                    <p className="font-semibold">{new Date(d.dia).toLocaleDateString('pt-BR')}</p>
                    <p>{formatMoney(d.spend)}</p>
                    <p className="text-slate-400">{d.conversions} conv · ROAS {d.spend > 0 ? fmtDec(d.valor_conversao / d.spend) : '0.00'}x</p>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </Card>

      <div className="grid gap-3 md:grid-cols-3">
        <Card className="p-4">
          <p className="text-[11px] uppercase tracking-wider text-slate-500">Alcance</p>
          <p className="mt-1 text-xl font-semibold text-slate-100">{fmtInt(k.reach)}</p>
        </Card>
        <Card className="p-4">
          <p className="text-[11px] uppercase tracking-wider text-slate-500">Frequência</p>
          <p className="mt-1 text-xl font-semibold text-slate-100">{fmtDec(k.frequency)}</p>
        </Card>
        <Card className="p-4">
          <p className="text-[11px] uppercase tracking-wider text-slate-500">Valor de conversão</p>
          <p className="mt-1 text-xl font-semibold text-emerald-300">{formatMoney(k.valor_conversao)}</p>
        </Card>
      </div>
    </div>
  );
}

// ------------------------------------------------ Aba: Campanhas
function AbaCampanhas({ contaId, periodo }: { contaId: string; periodo: Periodo }) {
  const query = useCampanhas(contaId, periodo);
  const pausar = usePausarObjeto(contaId);
  const [editandoOrc, setEditandoOrc] = useState<Campanha | null>(null);
  const [filtro, setFiltro] = useState<'todas' | 'ativas' | 'pausadas'>('todas');
  const [ordem, setOrdem] = useState<'spend' | 'roas' | 'conversions' | 'nome'>('spend');

  if (query.isLoading) return <Card className="flex justify-center p-10"><Spinner /></Card>;
  if (query.isError) return <Card className="p-6 text-sm text-red-300">❌ {(query.error as Error).message}</Card>;

  let linhas = query.data?.campanhas ?? [];
  if (filtro === 'ativas')  linhas = linhas.filter((c) => c.status === 'ACTIVE');
  if (filtro === 'pausadas') linhas = linhas.filter((c) => c.status === 'PAUSED');
  linhas = [...linhas].sort((a, b) => {
    if (ordem === 'nome') return a.nome.localeCompare(b.nome);
    return (b as any)[ordem] - (a as any)[ordem];
  });

  const total = linhas.reduce((a, c) => a + c.spend, 0);

  return (
    <div className="space-y-3">
      <Card className="flex flex-wrap items-center gap-2 p-3">
        {(['todas','ativas','pausadas'] as const).map((f) => (
          <button key={f} onClick={() => setFiltro(f)}
            className={`rounded-md px-3 py-1 text-xs font-medium ${filtro === f ? 'bg-brand-500/20 text-brand-200' : 'text-slate-400 hover:bg-white/5'}`}>
            {f === 'todas' ? 'Todas' : f === 'ativas' ? '🟢 Ativas' : '⏸ Pausadas'}
          </button>
        ))}
        <span className="ml-auto text-xs text-slate-400">
          {linhas.length} campanha(s) · total {formatMoney(total)}
        </span>
        <select value={ordem} onChange={(e) => setOrdem(e.target.value as any)} className="glass-field rounded-md px-2 py-1 text-xs">
          <option value="spend">↓ Investimento</option>
          <option value="roas">↓ ROAS</option>
          <option value="conversions">↓ Conversões</option>
          <option value="nome">A-Z</option>
        </select>
      </Card>

      {linhas.length === 0 ? (
        <Card className="p-8 text-center text-sm text-slate-500">Nenhuma campanha no filtro.</Card>
      ) : (
        <div className="space-y-2">
          {linhas.map((c) => (
            <CardCampanha
              key={c.id}
              c={c}
              onPausar={() => pausar.mutate({ objeto_id: c.id, status: c.status === 'ACTIVE' ? 'PAUSED' : 'ACTIVE' })}
              onEditarOrcamento={() => setEditandoOrc(c)}
              alternando={pausar.isPending}
            />
          ))}
        </div>
      )}

      {editandoOrc && (
        <OrcamentoModal
          campanha={editandoOrc}
          contaId={contaId}
          onClose={() => setEditandoOrc(null)}
        />
      )}
    </div>
  );
}

function CardCampanha({ c, onPausar, onEditarOrcamento, alternando }: {
  c: Campanha; onPausar: () => void; onEditarOrcamento: () => void; alternando: boolean;
}) {
  const ativa = c.status === 'ACTIVE';
  return (
    <Card className={`p-4 ${ativa ? '' : 'opacity-70'}`}>
      <div className="flex flex-wrap items-start gap-3">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <span className={`h-2 w-2 rounded-full ${ativa ? 'bg-emerald-400 shadow-[0_0_10px_rgba(52,211,153,0.7)]' : 'bg-slate-500'}`} />
            <h4 className="truncate text-sm font-semibold text-slate-100">{c.nome}</h4>
            <Badge tone={ativa ? 'green' : 'slate'}>{ativa ? 'Ativa' : c.status}</Badge>
            <span className="text-[10px] uppercase tracking-wider text-slate-500">{c.objetivo}</span>
          </div>
          <p className="mt-1 text-[11px] text-slate-500">
            Orçamento diário: <span className="text-slate-300">{c.daily_budget != null ? formatMoney(c.daily_budget) : c.lifetime_budget != null ? `${formatMoney(c.lifetime_budget)} (total)` : '—'}</span>
          </p>
        </div>

        <div className="flex gap-2">
          <Button variant="secondary" onClick={onEditarOrcamento}>💰 Orçamento</Button>
          <Button
            variant="secondary"
            className={ativa ? 'text-amber-300 hover:bg-amber-500/10' : 'text-emerald-300 hover:bg-emerald-500/10'}
            onClick={onPausar}
            disabled={alternando}
          >
            {ativa ? '⏸ Pausar' : '▶ Ativar'}
          </Button>
        </div>
      </div>

      <div className="mt-3 grid grid-cols-2 gap-2 md:grid-cols-6">
        <Metrica label="Spend" valor={formatMoney(c.spend)} />
        <Metrica label="Impr." valor={fmtInt(c.impressions)} />
        <Metrica label="Cliques" valor={fmtInt(c.clicks)} />
        <Metrica label="CTR" valor={`${fmtDec(c.ctr)}%`} />
        <Metrica label="Conv" valor={fmtInt(c.conversions)} destaque />
        <Metrica label="ROAS" valor={`${fmtDec(c.roas)}x`} destaque tone={c.roas >= 2 ? 'green' : c.roas > 0 ? 'amber' : 'slate'} />
      </div>
    </Card>
  );
}

function Metrica({ label, valor, destaque, tone }: { label: string; valor: string; destaque?: boolean; tone?: 'green' | 'amber' | 'slate' }) {
  const cor = tone === 'green' ? 'text-emerald-300' : tone === 'amber' ? 'text-amber-300' : destaque ? 'text-brand-200' : 'text-slate-100';
  return (
    <div className="rounded-lg bg-white/5 px-2.5 py-1.5">
      <p className="text-[10px] uppercase tracking-wider text-slate-500">{label}</p>
      <p className={`text-sm font-semibold ${cor}`}>{valor}</p>
    </div>
  );
}

function OrcamentoModal({ campanha, contaId, onClose }: { campanha: Campanha; contaId: string; onClose: () => void }) {
  const editar = useEditarOrcamento(contaId);
  const [valor, setValor] = useState(String(campanha.daily_budget ?? campanha.lifetime_budget ?? ''));
  const [tipo, setTipo] = useState<'diario' | 'total'>(campanha.daily_budget != null ? 'diario' : 'total');
  const [erro, setErro] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setErro(null);
    const n = Number(valor.replace(',', '.'));
    if (!isFinite(n) || n <= 0) { setErro('Informe um valor válido.'); return; }
    try {
      await editar.mutateAsync({
        objeto_id: campanha.id,
        daily_budget_brl:    tipo === 'diario' ? n : undefined,
        lifetime_budget_brl: tipo === 'total'  ? n : undefined,
      });
      onClose();
    } catch (e) {
      setErro((e as Error).message);
    }
  }

  return (
    <Modal open onClose={onClose} title={`Editar orçamento — ${campanha.nome}`}
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>Cancelar</Button>
          <Button onClick={submit} disabled={editar.isPending}>{editar.isPending ? 'Salvando…' : 'Salvar'}</Button>
        </>
      }
    >
      <form onSubmit={submit} className="space-y-3">
        <div>
          <label className="text-sm font-medium text-slate-300">Tipo de orçamento</label>
          <div className="mt-1 flex gap-2">
            {(['diario','total'] as const).map((t) => (
              <button
                key={t}
                type="button"
                onClick={() => setTipo(t)}
                className={`flex-1 rounded-md border px-3 py-2 text-sm ${
                  tipo === t ? 'border-brand-400 bg-brand-500/20 text-white' : 'border-white/10 text-slate-300 hover:bg-white/5'
                }`}
              >{t === 'diario' ? 'Diário' : 'Vitalício (total)'}</button>
            ))}
          </div>
        </div>
        <Input id="v" label={`Novo valor (BRL${tipo === 'total' ? ' total' : ' por dia'})`} type="number" step="0.01" value={valor} onChange={(e) => setValor(e.target.value)} />
        {erro && <p role="alert" className="text-sm text-red-400">{erro}</p>}
      </form>
    </Modal>
  );
}

// ------------------------------------------------ Aba: Anúncios
function AbaAnuncios({ contaId, periodo }: { contaId: string; periodo: Periodo }) {
  const query = useAnuncios(contaId, periodo);
  const pausar = usePausarObjeto(contaId);
  const [ordem, setOrdem] = useState<'spend' | 'roas' | 'clicks'>('spend');

  if (query.isLoading) return <Card className="flex justify-center p-10"><Spinner /></Card>;
  if (query.isError) return <Card className="p-6 text-sm text-red-300">❌ {(query.error as Error).message}</Card>;

  const linhas = [...(query.data ?? [])].sort((a, b) => (b as any)[ordem] - (a as any)[ordem]);

  return (
    <div className="space-y-3">
      <Card className="flex flex-wrap items-center gap-2 p-3">
        <span className="text-xs text-slate-400">{linhas.length} anúncio(s)</span>
        <select value={ordem} onChange={(e) => setOrdem(e.target.value as any)} className="glass-field ml-auto rounded-md px-2 py-1 text-xs">
          <option value="spend">↓ Investimento</option>
          <option value="roas">↓ ROAS</option>
          <option value="clicks">↓ Cliques</option>
        </select>
      </Card>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {linhas.map((a) => {
          const ativa = a.status === 'ACTIVE';
          return (
            <Card key={a.id} className={`overflow-hidden p-0 ${ativa ? '' : 'opacity-70'}`}>
              {a.thumbnail ? (
                <img src={a.thumbnail} alt="" className="h-40 w-full object-cover" />
              ) : (
                <div className="grid h-40 w-full place-items-center bg-slate-800 text-4xl text-slate-600">🖼</div>
              )}
              <div className="p-3">
                <div className="mb-1 flex items-center gap-2">
                  <span className={`h-2 w-2 rounded-full ${ativa ? 'bg-emerald-400' : 'bg-slate-500'}`} />
                  <p className="truncate text-sm font-semibold text-slate-100">{a.nome}</p>
                </div>
                {a.titulo_criativo && <p className="line-clamp-1 text-[11px] font-medium text-slate-300">{a.titulo_criativo}</p>}
                {a.texto_criativo && <p className="mt-1 line-clamp-2 text-[11px] text-slate-500">{a.texto_criativo}</p>}
                <div className="mt-2 grid grid-cols-3 gap-1 text-[10px]">
                  <div className="rounded bg-white/5 p-1.5 text-center">
                    <p className="text-slate-500">Spend</p><p className="font-semibold text-slate-100">{formatMoney(a.spend)}</p>
                  </div>
                  <div className="rounded bg-white/5 p-1.5 text-center">
                    <p className="text-slate-500">Conv</p><p className="font-semibold text-brand-200">{fmtInt(a.conversions)}</p>
                  </div>
                  <div className="rounded bg-white/5 p-1.5 text-center">
                    <p className="text-slate-500">ROAS</p><p className={`font-semibold ${a.roas >= 2 ? 'text-emerald-300' : a.roas > 0 ? 'text-amber-300' : 'text-slate-400'}`}>{fmtDec(a.roas)}x</p>
                  </div>
                </div>
                <div className="mt-2 flex gap-2">
                  <Button variant="secondary"
                    className={`flex-1 text-xs ${ativa ? 'text-amber-300 hover:bg-amber-500/10' : 'text-emerald-300 hover:bg-emerald-500/10'}`}
                    onClick={() => pausar.mutate({ objeto_id: a.id, status: ativa ? 'PAUSED' : 'ACTIVE' })}
                    disabled={pausar.isPending}
                  >{ativa ? '⏸ Pausar' : '▶ Ativar'}</Button>
                </div>
              </div>
            </Card>
          );
        })}
      </div>

      {linhas.length === 0 && (
        <Card className="p-8 text-center text-sm text-slate-500">Nenhum anúncio no período.</Card>
      )}
    </div>
  );
}
