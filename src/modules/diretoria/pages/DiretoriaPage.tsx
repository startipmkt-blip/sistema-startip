import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/shared/lib/supabaseClient';
import { useAuth } from '@/shared/auth/AuthProvider';
import { Card } from '@/shared/ui/Card';
import { Button } from '@/shared/ui/Button';
import { Input } from '@/shared/ui/Input';
import { Badge } from '@/shared/ui/Badge';
import { StatCard } from '@/shared/ui/StatCard';
import { Spinner } from '@/shared/ui/Spinner';
import { formatMoney, formatDate } from '@/shared/lib/format';
import {
  useDiretoriaCarteira, useDiretoriaTrafego30d, useDiretoriaTrafegoDiario,
  useSincronizarMeta,
} from '@/modules/meta-ads/api/metaAdsApi';

const AREA = 'diretoria';
const CHAVE_SESSAO = 'startip-os:diretoria-pin-ok';

interface Executivo {
  clientes_ativos: number;
  clientes_total: number;
  contratos_ativos: number;
  mrr: number;
  onboarding_30d: number;
  saude_media_score: number | null;
  solicitacoes_pendentes: number;
  solicitacoes_concluidas_30d: number;
}

async function verificarPin(pin: string): Promise<boolean> {
  const { data, error } = await supabase.rpc('verificar_pin' as never, { area: AREA, pin_plain: pin } as never);
  if (error) throw error;
  return data === true;
}

async function definirPin(pin: string): Promise<void> {
  const { error } = await supabase.rpc('definir_pin' as never, { area: AREA, pin_plain: pin } as never);
  if (error) throw error;
}

export function DiretoriaPage() {
  const { isAdmin } = useAuth();
  const [liberado, setLiberado] = useState<boolean>(() => sessionStorage.getItem(CHAVE_SESSAO) === '1');

  return liberado
    ? <DashboardExecutivo onSair={() => { sessionStorage.removeItem(CHAVE_SESSAO); setLiberado(false); }} />
    : <PinGate isAdmin={isAdmin} onOk={() => { sessionStorage.setItem(CHAVE_SESSAO, '1'); setLiberado(true); }} />;
}

// ----------------------------------------------------------- PIN
function PinGate({ isAdmin, onOk }: { isAdmin: boolean; onOk: () => void }) {
  const [pin, setPin] = useState('');
  const [erro, setErro] = useState<string | null>(null);
  const [modoDefinir, setModoDefinir] = useState(false);
  const [pin1, setPin1] = useState('');
  const [pin2, setPin2] = useState('');
  const [salvando, setSalvando] = useState(false);

  async function tentar(e: React.FormEvent) {
    e.preventDefault();
    setErro(null);
    try {
      const ok = await verificarPin(pin);
      if (ok) onOk();
      else setErro('PIN incorreto.');
    } catch (err) { setErro((err as Error).message ?? 'Erro ao verificar PIN.'); }
  }

  async function salvarPin(e: React.FormEvent) {
    e.preventDefault();
    setErro(null);
    if (pin1.length < 4) { setErro('Use ao menos 4 dígitos.'); return; }
    if (pin1 !== pin2)   { setErro('Os PINs não coincidem.'); return; }
    setSalvando(true);
    try {
      await definirPin(pin1);
      setModoDefinir(false); setPin1(''); setPin2('');
      alert('PIN salvo. Use-o para entrar na Diretoria.');
    } catch (err) { setErro((err as Error).message ?? 'Erro ao salvar PIN.'); }
    finally { setSalvando(false); }
  }

  return (
    <div className="flex min-h-full items-center justify-center p-6">
      <Card className="w-full max-w-sm p-6">
        <div className="mb-4 text-center">
          <div className="mb-2 text-3xl">👑</div>
          <h1 className="text-lg font-semibold text-slate-100">Diretoria</h1>
          <p className="mt-1 text-xs text-slate-400">Área restrita. Informe o PIN.</p>
        </div>
        {!modoDefinir ? (
          <form onSubmit={tentar} className="space-y-3">
            <Input id="pin" type="password" label="PIN" value={pin} onChange={(e) => setPin(e.target.value)} autoComplete="off" inputMode="numeric" />
            {erro && <p role="alert" className="text-sm text-red-400">{erro}</p>}
            <Button type="submit" className="w-full">Entrar</Button>
            {isAdmin && (
              <button type="button" onClick={() => setModoDefinir(true)} className="w-full text-xs text-brand-300 hover:underline">
                Definir/alterar PIN (admin)
              </button>
            )}
          </form>
        ) : (
          <form onSubmit={salvarPin} className="space-y-3">
            <Input id="p1" type="password" label="Novo PIN" value={pin1} onChange={(e) => setPin1(e.target.value)} />
            <Input id="p2" type="password" label="Repetir PIN" value={pin2} onChange={(e) => setPin2(e.target.value)} />
            {erro && <p role="alert" className="text-sm text-red-400">{erro}</p>}
            <div className="flex gap-2">
              <Button variant="secondary" type="button" className="flex-1" onClick={() => setModoDefinir(false)}>Cancelar</Button>
              <Button type="submit" className="flex-1" disabled={salvando}>{salvando ? 'Salvando…' : 'Salvar'}</Button>
            </div>
          </form>
        )}
      </Card>
    </div>
  );
}

// ------------------------------------------------------- Dashboard
type Aba = 'visao' | 'carteira' | 'trafego';

function DashboardExecutivo({ onSair }: { onSair: () => void }) {
  const [aba, setAba] = useState<Aba>('visao');
  const sync = useSincronizarMeta();

  return (
    <div className="space-y-4 p-4">
      <header className="flex flex-wrap items-center gap-3">
        <h1 className="text-xl font-semibold text-white">👑 Diretoria</h1>
        <span className="text-xs text-slate-400">Visão executiva consolidada</span>
        <div className="ml-auto flex gap-2">
          <Button variant="secondary" onClick={() => sync.mutate({})} disabled={sync.isPending}>
            {sync.isPending ? 'Sincronizando…' : '🔄 Sincronizar Meta'}
          </Button>
          <Button variant="secondary" onClick={onSair}>🔒 Sair</Button>
        </div>
      </header>

      <nav className="flex gap-1 border-b border-white/10">
        {([
          ['visao',    '📊 Visão geral'],
          ['carteira', '👥 Carteira de clientes'],
          ['trafego',  '🎯 Tráfego pago (30d)'],
        ] as [Aba, string][]).map(([id, label]) => (
          <button
            key={id}
            onClick={() => setAba(id)}
            className={`rounded-t-md px-4 py-2 text-sm font-medium transition-colors ${
              aba === id
                ? 'bg-white/5 text-white border-b-2 border-brand-400'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >{label}</button>
        ))}
      </nav>

      {aba === 'visao'    && <AbaVisao />}
      {aba === 'carteira' && <AbaCarteira />}
      {aba === 'trafego'  && <AbaTrafego />}
    </div>
  );
}

// ----------- Aba 1: Visão geral (versão original) -----------
function AbaVisao() {
  const { data: exec, isLoading } = useQuery({
    queryKey: ['diretoria', 'executivo'],
    queryFn: async (): Promise<Executivo | null> => {
      const { data, error } = await supabase.from('diretoria_executivo').select('*').limit(1).maybeSingle();
      if (error) throw error;
      return (data as unknown as Executivo) ?? null;
    },
  });

  if (isLoading || !exec) return <Card className="flex justify-center p-10"><Spinner /></Card>;
  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard label="Clientes ativos"    value={String(exec.clientes_ativos)} tone="green" />
        <StatCard label="Contratos ativos"   value={String(exec.contratos_ativos)} tone="blue" />
        <StatCard label="MRR"                value={formatMoney(Number(exec.mrr ?? 0))} tone="green" />
        <StatCard label="Onboarding (30d)"   value={formatMoney(Number(exec.onboarding_30d ?? 0))} tone="slate" />
      </div>
      <div className="grid grid-cols-1 gap-3 lg:grid-cols-3">
        <Card className="p-5">
          <h3 className="mb-2 text-sm font-semibold text-slate-200">Saúde média da carteira</h3>
          <div className="text-4xl font-semibold text-slate-100">
            {exec.saude_media_score ?? '—'}<span className="ml-1 text-sm text-slate-500">/100</span>
          </div>
        </Card>
        <Card className="p-5">
          <h3 className="mb-2 text-sm font-semibold text-slate-200">Solicitações pendentes</h3>
          <div className="text-4xl font-semibold text-amber-300">{exec.solicitacoes_pendentes}</div>
        </Card>
        <Card className="p-5">
          <h3 className="mb-2 text-sm font-semibold text-slate-200">Resolvidas (30d)</h3>
          <div className="text-4xl font-semibold text-emerald-300">{exec.solicitacoes_concluidas_30d}</div>
        </Card>
      </div>
    </div>
  );
}

// ----------- Aba 2: Carteira (uma linha por cliente) -----------
function AbaCarteira() {
  const { data, isLoading } = useDiretoriaCarteira();
  const [busca, setBusca] = useState('');
  const [filtro, setFiltro] = useState<'todos' | 'ativos' | 'trafego'>('todos');

  const linhas = useMemo(() => {
    let l = data ?? [];
    if (filtro === 'ativos')   l = l.filter((r) => r.cliente_status === 'ativo');
    if (filtro === 'trafego')  l = l.filter((r) => r.trafego_conectado);
    if (busca.trim())          l = l.filter((r) => r.cliente_nome.toLowerCase().includes(busca.toLowerCase()));
    return l;
  }, [data, busca, filtro]);

  if (isLoading) return <Card className="flex justify-center p-10"><Spinner /></Card>;

  const totalMrr = linhas.reduce((a, r) => a + Number(r.mrr ?? 0), 0);
  const totalSpend = linhas.reduce((a, r) => a + Number(r.spend_30d ?? 0), 0);

  return (
    <div className="space-y-3">
      <Card className="flex flex-wrap items-center gap-3 p-3">
        <Input id="busca" placeholder="Buscar cliente…" value={busca} onChange={(e) => setBusca(e.target.value)} className="w-64" />
        <div className="flex gap-1">
          {([['todos','Todos'],['ativos','Ativos'],['trafego','Com tráfego']] as const).map(([k, l]) => (
            <button key={k} onClick={() => setFiltro(k)}
              className={`rounded-md px-3 py-1 text-xs ${filtro === k ? 'bg-brand-500/20 text-brand-200' : 'text-slate-400 hover:bg-white/5'}`}>
              {l}
            </button>
          ))}
        </div>
        <div className="ml-auto text-xs text-slate-400">
          {linhas.length} cliente(s) · MRR {formatMoney(totalMrr)} · Spend 30d {formatMoney(totalSpend)}
        </div>
      </Card>

      <Card className="overflow-x-auto p-0">
        <table className="min-w-full text-xs">
          <thead className="border-b border-white/10 text-left text-[10px] uppercase tracking-wider text-slate-500">
            <tr>
              <th className="px-3 py-2">Cliente</th>
              <th className="px-3 py-2">Status</th>
              <th className="px-3 py-2 text-right">Saúde</th>
              <th className="px-3 py-2 text-right">MRR</th>
              <th className="px-3 py-2 text-right">Spend 30d</th>
              <th className="px-3 py-2 text-right">Conv. 30d</th>
              <th className="px-3 py-2 text-right">CPA</th>
              <th className="px-3 py-2 text-right">ROAS</th>
              <th className="px-3 py-2 text-right">CTR</th>
              <th className="px-3 py-2">Última sync</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/5">
            {linhas.map((r) => (
              <tr key={r.cliente_id} className="hover:bg-white/5">
                <td className="px-3 py-2">
                  <a href={`/clientes/${r.cliente_id}`} className="font-medium text-slate-100 hover:underline">{r.cliente_nome}</a>
                  {!r.trafego_conectado && (r.servicos ?? []).includes('trafego_pago') && (
                    <Badge tone="amber" className="ml-2">sem conta Meta</Badge>
                  )}
                </td>
                <td className="px-3 py-2">
                  <Badge tone={r.cliente_status === 'ativo' ? 'green' : 'slate'}>{r.cliente_status}</Badge>
                </td>
                <td className={`px-3 py-2 text-right font-semibold ${r.saude >= 70 ? 'text-emerald-300' : r.saude >= 40 ? 'text-amber-300' : 'text-red-300'}`}>{r.saude || '—'}</td>
                <td className="px-3 py-2 text-right text-slate-100">{formatMoney(Number(r.mrr ?? 0))}</td>
                <td className="px-3 py-2 text-right text-slate-100">{formatMoney(Number(r.spend_30d ?? 0))}</td>
                <td className="px-3 py-2 text-right text-slate-200">{Number(r.conversions_30d ?? 0).toFixed(0)}</td>
                <td className="px-3 py-2 text-right text-slate-200">{r.cpa_30d > 0 ? formatMoney(Number(r.cpa_30d)) : '—'}</td>
                <td className={`px-3 py-2 text-right font-semibold ${r.roas_30d >= 2 ? 'text-emerald-300' : r.roas_30d > 0 ? 'text-amber-300' : 'text-slate-500'}`}>
                  {r.roas_30d > 0 ? `${Number(r.roas_30d).toFixed(2)}x` : '—'}
                </td>
                <td className="px-3 py-2 text-right text-slate-400">{r.ctr_30d > 0 ? `${Number(r.ctr_30d).toFixed(2)}%` : '—'}</td>
                <td className="px-3 py-2 text-slate-500">{r.ultima_metrica_em ? formatDate(r.ultima_metrica_em) : '—'}</td>
              </tr>
            ))}
            {linhas.length === 0 && (
              <tr><td colSpan={10} className="px-3 py-8 text-center text-slate-500">Nenhum cliente encontrado.</td></tr>
            )}
          </tbody>
        </table>
      </Card>
    </div>
  );
}

// ----------- Aba 3: Tráfego pago (agregado) -----------
function AbaTrafego() {
  const trafego = useDiretoriaTrafego30d();
  const diario = useDiretoriaTrafegoDiario();
  const carteira = useDiretoriaCarteira();

  if (trafego.isLoading || diario.isLoading) return <Card className="flex justify-center p-10"><Spinner /></Card>;
  const t = trafego.data;

  const topClientes = (carteira.data ?? [])
    .filter((c) => c.spend_30d > 0)
    .sort((a, b) => Number(b.spend_30d) - Number(a.spend_30d))
    .slice(0, 8);

  const spendMax = Math.max(1, ...(diario.data ?? []).map((d) => Number(d.spend)));

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-5">
        <StatCard label="Spend total 30d"    value={formatMoney(Number(t?.spend_total ?? 0))} tone="green" />
        <StatCard label="Impressões"         value={Intl.NumberFormat('pt-BR').format(Number(t?.impressions_total ?? 0))} tone="slate" />
        <StatCard label="Cliques"            value={Intl.NumberFormat('pt-BR').format(Number(t?.clicks_total ?? 0))} tone="blue" />
        <StatCard label="Conversões"         value={Number(t?.conversions_total ?? 0).toFixed(0)} tone="green" />
        <StatCard label="ROAS médio"         value={`${Number(t?.roas_medio ?? 0).toFixed(2)}x`} tone={Number(t?.roas_medio ?? 0) >= 2 ? 'green' : 'slate'} />
      </div>

      <Card className="p-4">
        <h3 className="mb-3 text-sm font-semibold text-slate-200">Spend diário — últimos 30 dias</h3>
        {!(diario.data ?? []).length ? (
          <p className="py-8 text-center text-sm text-slate-500">Sem dados. Rode uma sincronização em Meta Ads.</p>
        ) : (
          <div className="flex h-40 items-end gap-1">
            {(diario.data ?? []).map((d) => {
              const alt = Math.max(2, Math.round((Number(d.spend) / spendMax) * 100));
              return (
                <div key={d.dia} className="group relative flex flex-1 flex-col items-center">
                  <div className="w-full rounded-t bg-brand-500/60 transition-colors hover:bg-brand-400" style={{ height: `${alt}%` }} />
                  <div className="pointer-events-none absolute -top-8 hidden rounded bg-slate-900 px-2 py-1 text-[10px] text-slate-100 shadow-lg group-hover:block">
                    {formatDate(d.dia)}<br />{formatMoney(Number(d.spend))}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </Card>

      <Card className="p-4">
        <h3 className="mb-3 text-sm font-semibold text-slate-200">Top clientes por spend (30d)</h3>
        {topClientes.length === 0 ? (
          <p className="text-sm text-slate-500">Nenhum cliente com spend registrado nos últimos 30 dias.</p>
        ) : (
          <ul className="space-y-2">
            {topClientes.map((c) => {
              const pct = Math.round((Number(c.spend_30d) / Number(topClientes[0].spend_30d)) * 100);
              return (
                <li key={c.cliente_id}>
                  <div className="mb-1 flex items-center justify-between text-xs text-slate-300">
                    <span className="font-medium">{c.cliente_nome}</span>
                    <span>{formatMoney(Number(c.spend_30d))} · ROAS {Number(c.roas_30d).toFixed(2)}x</span>
                  </div>
                  <div className="h-2 rounded-full bg-white/5">
                    <div className="h-2 rounded-full bg-brand-500/70" style={{ width: `${pct}%` }} />
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </Card>
    </div>
  );
}
