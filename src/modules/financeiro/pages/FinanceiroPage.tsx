import { useMemo, useState } from 'react';
import {
  useReceitas,
  useDespesas,
  useMarcarDespesaPaga,
} from '@/modules/financeiro/api/financeiroApi';
import {
  DESPESA_CATEGORIA_LABEL,
  type Despesa,
  type ReceitaClienteView,
} from '@/modules/financeiro/types';
import { ReceitaFormModal } from '@/modules/financeiro/components/ReceitaFormModal';
import { DespesaFormModal } from '@/modules/financeiro/components/DespesaFormModal';
import { GraficoReceitasDespesas, type PontoMes } from '@/modules/financeiro/components/GraficoReceitasDespesas';
import { PageHeader } from '@/shared/ui/PageHeader';
import { StatCard } from '@/shared/ui/StatCard';
import { Card } from '@/shared/ui/Card';
import { Button } from '@/shared/ui/Button';
import { Badge } from '@/shared/ui/Badge';
import { Spinner } from '@/shared/ui/Spinner';
import { Tabs } from '@/shared/ui/Tabs';
import { EmptyState } from '@/shared/ui/EmptyState';
import { GlassIcon } from '@/shared/ui/GlassIcon';
import { formatMoney, formatDate } from '@/shared/lib/format';

type Aba = 'painel' | 'transacoes' | 'recorrentes';

// ---------- Mês de referência ----------
interface Mes { ano: number; mes: number } // mes: 0-11

function mesAtual(): Mes {
  const d = new Date();
  return { ano: d.getFullYear(), mes: d.getMonth() };
}
function deslocar(m: Mes, n: number): Mes {
  const d = new Date(m.ano, m.mes + n, 1);
  return { ano: d.getFullYear(), mes: d.getMonth() };
}
function chave(m: Mes) {
  return m.ano * 12 + m.mes;
}
function nomeMes(m: Mes, curto = false) {
  const s = new Date(m.ano, m.mes, 1).toLocaleDateString('pt-BR', curto ? { month: 'short' } : { month: 'long', year: 'numeric' });
  return s.replace('.', '').replace(/^\w/, (c) => c.toUpperCase());
}
function mesDe(iso: string): Mes {
  const [a, m] = iso.slice(0, 10).split('-').map(Number);
  return { ano: a, mes: m - 1 };
}
function isoDia(m: Mes, dia: number) {
  const ultimo = new Date(m.ano, m.mes + 1, 0).getDate();
  return `${m.ano}-${String(m.mes + 1).padStart(2, '0')}-${String(Math.min(dia, ultimo)).padStart(2, '0')}`;
}

// Despesa recorrente vale todo mês a partir do primeiro vencimento; a única, só no mês dela.
function despesaNoMes(d: Despesa, m: Mes): boolean {
  const k = chave(mesDe(d.vencimento));
  return d.recorrente ? k <= chave(m) : k === chave(m);
}
function vencimentoNoMes(d: Despesa, m: Mes) {
  return d.recorrente ? isoDia(m, Number(d.vencimento.slice(8, 10))) : d.vencimento;
}
// Contrato conta a partir do mês em que foi cadastrado (não temos a data de encerramento).
function receitaNoMes(r: ReceitaClienteView, m: Mes): boolean {
  return r.ativo && chave(mesDe(r.created_at)) <= chave(m);
}

interface Transacao {
  id: string;
  tipo: 'entrada' | 'saida';
  data: string;
  descricao: string;
  categoria: string;
  valor: number;
  pago: boolean;
  statusLabel: string;
  receita?: ReceitaClienteView;
  despesa?: Despesa;
}

export function FinanceiroPage() {
  const { data: receitas, isLoading: loadingR } = useReceitas();
  const { data: despesas, isLoading: loadingD } = useDespesas();
  const marcarPaga = useMarcarDespesaPaga();

  const [aba, setAba] = useState<Aba>('painel');
  const [mes, setMes] = useState<Mes>(mesAtual);
  const [menuNovo, setMenuNovo] = useState(false);
  const [receitaEdit, setReceitaEdit] = useState<ReceitaClienteView | undefined>();
  const [receitaOpen, setReceitaOpen] = useState(false);
  const [despesaEdit, setDespesaEdit] = useState<Despesa | undefined>();
  const [despesaOpen, setDespesaOpen] = useState(false);

  const listaR = useMemo(() => receitas ?? [], [receitas]);
  const listaD = useMemo(() => despesas ?? [], [despesas]);
  const carregando = loadingR || loadingD;

  function novaReceita() { setMenuNovo(false); setReceitaEdit(undefined); setReceitaOpen(true); }
  function novaDespesa() { setMenuNovo(false); setDespesaEdit(undefined); setDespesaOpen(true); }
  function editar(t: Transacao) {
    if (t.receita) { setReceitaEdit(t.receita); setReceitaOpen(true); }
    if (t.despesa) { setDespesaEdit(t.despesa); setDespesaOpen(true); }
  }

  const transacoes = useMemo<Transacao[]>(() => {
    const entradas: Transacao[] = listaR.filter((r) => receitaNoMes(r, mes)).map((r) => ({
      id: `r-${r.id}`, tipo: 'entrada', data: isoDia(mes, r.dia_vencimento), descricao: r.cliente_nome,
      categoria: 'Mensalidade', valor: r.valor_mensal, pago: r.status === 'em_dia',
      statusLabel: r.status === 'em_dia' ? 'Em dia' : 'Atrasado', receita: r,
    }));
    const saidas: Transacao[] = listaD.filter((d) => despesaNoMes(d, mes)).map((d) => ({
      id: `d-${d.id}`, tipo: 'saida', data: vencimentoNoMes(d, mes), descricao: d.descricao,
      categoria: DESPESA_CATEGORIA_LABEL[d.categoria], valor: d.valor, pago: d.status === 'paga',
      statusLabel: d.status === 'paga' ? 'Paga' : 'Pendente', despesa: d,
    }));
    return [...entradas, ...saidas].sort((a, b) => a.data.localeCompare(b.data));
  }, [listaR, listaD, mes]);

  const entradas = transacoes.filter((t) => t.tipo === 'entrada');
  const saidas = transacoes.filter((t) => t.tipo === 'saida');
  const soma = (l: Transacao[]) => l.reduce((s, t) => s + t.valor, 0);
  const recebido = soma(entradas.filter((t) => t.pago));
  const previsto = soma(entradas);
  const aReceber = previsto - recebido;
  const pago = soma(saidas.filter((t) => t.pago));
  const lucro = recebido - pago;
  const margem = recebido > 0 ? Math.round((lucro / recebido) * 1000) / 10 : 0;

  const serie = useMemo<PontoMes[]>(() => {
    const pontos: PontoMes[] = [];
    for (let i = 5; i >= 0; i--) {
      const m = deslocar(mes, -i);
      pontos.push({
        rotulo: nomeMes(m, true),
        receitas: listaR.filter((r) => receitaNoMes(r, m)).reduce((s, r) => s + r.valor_mensal, 0),
        despesas: listaD.filter((d) => despesaNoMes(d, m)).reduce((s, d) => s + d.valor, 0),
      });
    }
    return pontos;
  }, [listaR, listaD, mes]);

  const hojeIso = new Date().toISOString().slice(0, 10);
  const proximos = transacoes.filter((t) => !t.pago && (chave(mes) !== chave(mesAtual()) || t.data >= hojeIso || t.tipo === 'saida')).slice(0, 6);

  return (
    <div className="space-y-6">
      <PageHeader title="Financeiro" subtitle="Receitas, despesas e saldo da agência.">
        <div className="flex items-center gap-1 rounded-lg border border-white/10 bg-white/[0.04] p-0.5 mes-seletor">
          <button className="rounded-md p-1.5 text-slate-300 hover:bg-white/10" onClick={() => setMes((m) => deslocar(m, -1))} aria-label="Mês anterior">
            <GlassIcon name="chevron-left" className="h-4 w-4" />
          </button>
          <span className="flex min-w-[9.5rem] items-center justify-center gap-1.5 text-sm font-semibold text-slate-100">
            <GlassIcon name="calendar" className="h-4 w-4" /> {nomeMes(mes)}
          </span>
          <button className="rounded-md p-1.5 text-slate-300 hover:bg-white/10" onClick={() => setMes((m) => deslocar(m, 1))} aria-label="Próximo mês">
            <GlassIcon name="chevron-right" className="h-4 w-4" />
          </button>
        </div>
        <div className="relative">
          <Button onClick={() => setMenuNovo((v) => !v)} aria-expanded={menuNovo} aria-haspopup="menu">
            <GlassIcon name="plus" className="h-4 w-4" /> Lançamento
          </Button>
          {menuNovo && (
            <div role="menu" className="glass absolute right-0 z-20 mt-2 w-52 p-1 shadow-pop">
              <button role="menuitem" onClick={novaReceita} className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm text-slate-100 hover:bg-white/10">
                <span className="chip-icone h-7 w-7 bg-emerald-500/10"><GlassIcon name="trending-up" className="h-4 w-4" /></span> Receita (mensalidade)
              </button>
              <button role="menuitem" onClick={novaDespesa} className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm text-slate-100 hover:bg-white/10">
                <span className="chip-icone h-7 w-7 bg-red-500/10"><GlassIcon name="card" className="h-4 w-4" /></span> Despesa
              </button>
            </div>
          )}
        </div>
      </PageHeader>

      <div className="flex justify-center">
        <Tabs<Aba>
          tabs={[
            { id: 'painel', label: 'Painel', icon: <GlassIcon name="grid" className="h-4 w-4" /> },
            { id: 'transacoes', label: 'Transações', icon: <GlassIcon name="list" className="h-4 w-4" />, count: transacoes.length },
            { id: 'recorrentes', label: 'Recorrentes', icon: <GlassIcon name="repeat" className="h-4 w-4" /> },
          ]}
          value={aba}
          onChange={setAba}
        />
      </div>

      {carregando ? (
        <Card className="flex justify-center p-12"><Spinner /></Card>
      ) : aba === 'painel' ? (
        <>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <StatCard label="Receitas pagas" value={formatMoney(recebido)} tone="green" icon="trending-up" hint={`de ${formatMoney(previsto)} previstos`} />
            <StatCard label="Despesas pagas" value={formatMoney(pago)} tone="red" icon="card" hint={`de ${formatMoney(soma(saidas))} no mês`} />
            <StatCard label="Lucro do mês" value={formatMoney(lucro)} tone={lucro >= 0 ? 'slate' : 'red'} icon="financeiro" hint={recebido > 0 ? `Margem ${margem.toLocaleString('pt-BR')}%` : 'Sem receitas pagas'} />
            <StatCard label="A receber" value={formatMoney(aReceber)} tone="amber" icon="clock" hint={`${entradas.filter((t) => !t.pago).length} ${entradas.filter((t) => !t.pago).length === 1 ? 'cliente' : 'clientes'} em atraso`} />
          </div>

          <div className="grid items-start gap-4 lg:grid-cols-[1.4fr_1fr]">
            <Card className="p-5">
              <h3 className="text-sm font-bold text-slate-100">Receitas vs. despesas · 6 meses</h3>
              <p className="text-xs text-slate-400">Estimativa pelos contratos ativos e despesas cadastrados.</p>
              <GraficoReceitasDespesas pontos={serie} />
            </Card>
            <Card className="overflow-hidden p-0">
              <div className="flex items-center justify-between px-5 pb-2 pt-5">
                <h3 className="text-sm font-bold text-slate-100">Próximos vencimentos</h3>
                <button className="text-xs font-semibold text-brand-300 hover:underline" onClick={() => setAba('transacoes')}>Ver transações</button>
              </div>
              {proximos.length === 0 ? (
                <p className="px-5 pb-5 text-sm text-slate-400">Nada pendente em {nomeMes(mes)}.</p>
              ) : (
                <ul>
                  {proximos.map((t) => (
                    <li key={t.id} className="flex items-center justify-between gap-3 border-t border-white/[0.06] px-5 py-3">
                      <div className="min-w-0">
                        <div className="truncate text-sm font-semibold text-slate-100">{t.descricao}</div>
                        <div className="text-xs text-slate-400">{t.categoria} · {formatDate(t.data)}</div>
                      </div>
                      <span className={`shrink-0 text-sm font-bold tabular-nums ${t.tipo === 'entrada' ? 'text-emerald-400' : 'text-red-400'}`}>
                        {t.tipo === 'entrada' ? '+' : '−'} {formatMoney(t.valor)}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </Card>
          </div>
        </>
      ) : aba === 'transacoes' ? (
        <AbaTransacoes
          transacoes={transacoes}
          mesLabel={nomeMes(mes)}
          onEditar={editar}
          onAlternarPago={(t) => t.despesa && marcarPaga.mutate(t.despesa.id)}
          onNovaReceita={novaReceita}
          onNovaDespesa={novaDespesa}
        />
      ) : (
        <AbaRecorrentes
          receitas={listaR}
          despesas={listaD.filter((d) => d.recorrente)}
          onEditarReceita={(r) => { setReceitaEdit(r); setReceitaOpen(true); }}
          onEditarDespesa={(d) => { setDespesaEdit(d); setDespesaOpen(true); }}
          onNovaReceita={novaReceita}
          onNovaDespesa={novaDespesa}
        />
      )}

      {receitaOpen && (
        <ReceitaFormModal open={receitaOpen} onClose={() => setReceitaOpen(false)} receita={receitaEdit} />
      )}
      {despesaOpen && (
        <DespesaFormModal open={despesaOpen} onClose={() => setDespesaOpen(false)} despesa={despesaEdit} />
      )}
    </div>
  );
}

// ---------- Transações ----------
function AbaTransacoes({ transacoes, mesLabel, onEditar, onAlternarPago, onNovaReceita, onNovaDespesa }: {
  transacoes: Transacao[]; mesLabel: string;
  onEditar: (t: Transacao) => void; onAlternarPago: (t: Transacao) => void;
  onNovaReceita: () => void; onNovaDespesa: () => void;
}) {
  const [tipo, setTipo] = useState<'todas' | 'entrada' | 'saida'>('todas');
  const [busca, setBusca] = useState('');
  const termo = busca.trim().toLowerCase();
  const visiveis = transacoes.filter((t) =>
    (tipo === 'todas' || t.tipo === tipo) && (!termo || t.descricao.toLowerCase().includes(termo) || t.categoria.toLowerCase().includes(termo)));
  const totalEntradas = visiveis.filter((t) => t.tipo === 'entrada').reduce((s, t) => s + t.valor, 0);
  const totalSaidas = visiveis.filter((t) => t.tipo === 'saida').reduce((s, t) => s + t.valor, 0);

  return (
    <Card className="overflow-hidden p-0">
      <div className="flex flex-wrap items-center gap-2 px-5 py-4">
        <div className="flex gap-1.5" role="tablist" aria-label="Tipo de transação">
          {([['todas', 'Todas'], ['entrada', 'Entradas'], ['saida', 'Saídas']] as const).map(([id, label]) => (
            <button
              key={id}
              role="tab"
              aria-selected={tipo === id}
              onClick={() => setTipo(id)}
              className={`rounded-full border px-3 py-1 text-xs font-semibold transition-colors ${
                tipo === id ? 'border-brand-500 bg-brand-500 text-white' : 'border-white/10 text-slate-300 hover:border-white/25'}`}
            >
              {label}
            </button>
          ))}
        </div>
        <div className="relative ml-auto w-full sm:w-56">
          <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"><GlassIcon name="search" className="h-4 w-4" /></span>
          <input
            type="search" value={busca} onChange={(e) => setBusca(e.target.value)} placeholder="Buscar transação…"
            className="glass-field w-full py-1.5 pl-9 pr-3 text-sm focus:border-brand-400 focus:outline-none" aria-label="Buscar transação"
          />
        </div>
        <Button variant="secondary" size="sm" onClick={onNovaReceita}>+ Receita</Button>
        <Button variant="secondary" size="sm" onClick={onNovaDespesa}>+ Despesa</Button>
      </div>

      {visiveis.length === 0 ? (
        <EmptyState message={`Nenhuma transação em ${mesLabel}${termo ? ' para essa busca' : ''}.`} />
      ) : (
        <>
        {/* Celular: lista no estilo extrato de banco; toque na linha para editar. */}
        <ul className="divide-y divide-white/[0.06] border-t border-white/10 md:hidden">
          {visiveis.map((t) => (
            <li key={t.id} className="flex items-center gap-3 px-4 py-3">
              <span className={`chip-icone h-9 w-9 ${t.tipo === 'entrada' ? 'bg-emerald-500/10' : 'bg-red-500/10'}`}>
                <GlassIcon name={t.tipo === 'entrada' ? 'trending-up' : 'card'} className="h-4 w-4" />
              </span>
              <button onClick={() => onEditar(t)} className="min-w-0 flex-1 text-left">
                <div className="truncate text-sm font-medium text-slate-100">{t.descricao}</div>
                <div className="truncate text-xs text-slate-400">{formatDate(t.data)} · {t.categoria}</div>
              </button>
              <div className="flex shrink-0 flex-col items-end gap-1">
                <span className={`whitespace-nowrap text-sm font-bold tabular-nums ${t.tipo === 'entrada' ? 'text-emerald-400' : 'text-red-400'}`}>
                  {t.tipo === 'entrada' ? '+' : '−'} {formatMoney(t.valor)}
                </span>
                {t.despesa ? (
                  <button onClick={() => onAlternarPago(t)} aria-label={`Status: ${t.statusLabel}. Toque para alternar`}>
                    <Badge tone={t.pago ? 'green' : 'amber'}>{t.statusLabel}</Badge>
                  </button>
                ) : (
                  <Badge tone={t.pago ? 'green' : 'red'}>{t.statusLabel}</Badge>
                )}
              </div>
            </li>
          ))}
          <li className="flex items-center justify-between px-4 py-3 text-sm">
            <span className="font-semibold text-slate-300">Saldo de {mesLabel}</span>
            <span className={`font-bold tabular-nums ${totalEntradas - totalSaidas >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
              {formatMoney(totalEntradas - totalSaidas)}
            </span>
          </li>
        </ul>
        <div className="hidden overflow-x-auto md:block">
          <table className="w-full border-collapse text-sm">
            <thead>
              <tr className="border-y border-white/10 text-left text-xs font-medium text-slate-400">
                <th className="px-5 py-2.5 font-medium">Data</th>
                <th className="px-3 py-2.5 font-medium">Descrição</th>
                <th className="px-3 py-2.5 font-medium">Categoria</th>
                <th className="px-3 py-2.5 font-medium">Status</th>
                <th className="px-3 py-2.5 text-right font-medium">Valor</th>
                <th className="px-5 py-2.5" />
              </tr>
            </thead>
            <tbody className="divide-y divide-white/[0.06]">
              {visiveis.map((t) => (
                <tr key={t.id}>
                  <td className="whitespace-nowrap px-5 py-3 text-slate-300 tabular-nums">{formatDate(t.data)}</td>
                  <td className="px-3 py-3">
                    <div className="flex items-center gap-2.5">
                      <span className={`chip-icone h-7 w-7 ${t.tipo === 'entrada' ? 'bg-emerald-500/10' : 'bg-red-500/10'}`}>
                        <GlassIcon name={t.tipo === 'entrada' ? 'trending-up' : 'card'} className="h-3.5 w-3.5" />
                      </span>
                      <span className="font-medium text-slate-100">{t.descricao}</span>
                    </div>
                  </td>
                  <td className="px-3 py-3 text-slate-300">{t.categoria}</td>
                  <td className="px-3 py-3">
                    {t.despesa ? (
                      <button onClick={() => onAlternarPago(t)} title="Clique para alternar entre paga e pendente">
                        <Badge tone={t.pago ? 'green' : 'amber'}>{t.statusLabel}</Badge>
                      </button>
                    ) : (
                      <Badge tone={t.pago ? 'green' : 'red'}>{t.statusLabel}</Badge>
                    )}
                  </td>
                  <td className={`whitespace-nowrap px-3 py-3 text-right font-bold tabular-nums ${t.tipo === 'entrada' ? 'text-emerald-400' : 'text-red-400'}`}>
                    {t.tipo === 'entrada' ? '+' : '−'} {formatMoney(t.valor)}
                  </td>
                  <td className="px-5 py-3 text-right">
                    <button className="text-xs font-semibold text-brand-300 hover:underline" onClick={() => onEditar(t)}>Editar</button>
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="border-t border-white/10 text-sm">
                <td colSpan={4} className="px-5 py-3 font-semibold text-slate-300">Saldo de {mesLabel}</td>
                <td className={`whitespace-nowrap px-3 py-3 text-right font-bold tabular-nums ${totalEntradas - totalSaidas >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                  {formatMoney(totalEntradas - totalSaidas)}
                </td>
                <td />
              </tr>
            </tfoot>
          </table>
        </div>
        </>
      )}
    </Card>
  );
}

// ---------- Recorrentes ----------
function AbaRecorrentes({ receitas, despesas, onEditarReceita, onEditarDespesa, onNovaReceita, onNovaDespesa }: {
  receitas: ReceitaClienteView[]; despesas: Despesa[];
  onEditarReceita: (r: ReceitaClienteView) => void; onEditarDespesa: (d: Despesa) => void;
  onNovaReceita: () => void; onNovaDespesa: () => void;
}) {
  const entradas = receitas.filter((r) => r.ativo).reduce((s, r) => s + r.valor_mensal, 0);
  const saidas = despesas.reduce((s, d) => s + d.valor, 0);

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <StatCard label="Entradas recorrentes" value={formatMoney(entradas)} tone="green" icon="trending-up" hint={`${receitas.filter((r) => r.ativo).length} contratos ativos`} />
        <StatCard label="Despesas fixas" value={formatMoney(saidas)} tone="red" icon="repeat" hint={`${despesas.length} ${despesas.length === 1 ? 'despesa mensal' : 'despesas mensais'}`} />
        <StatCard label="Saldo recorrente" value={formatMoney(entradas - saidas)} tone={entradas - saidas >= 0 ? 'slate' : 'red'} icon="financeiro" hint="Por mês, sem gastos avulsos" />
      </div>

      <div className="grid items-start gap-4 lg:grid-cols-2">
        <Card className="overflow-hidden p-0">
          <div className="flex items-center justify-between px-5 pb-2 pt-5">
            <h3 className="text-sm font-bold text-slate-100">Mensalidades dos clientes</h3>
            <Button variant="secondary" size="sm" onClick={onNovaReceita}>+ Mensalidade</Button>
          </div>
          {receitas.length === 0 ? <EmptyState message="Nenhuma mensalidade cadastrada." /> : (
            <ul>
              {receitas.map((r) => (
                <li key={r.id} className="flex items-center gap-3 border-t border-white/[0.06] px-5 py-3">
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-sm font-semibold text-slate-100">{r.cliente_nome}</div>
                    <div className="text-xs text-slate-400">Todo dia {r.dia_vencimento}</div>
                  </div>
                  <Badge tone={r.ativo ? 'blue' : 'slate'}>{r.ativo ? 'Ativo' : 'Inativo'}</Badge>
                  <span className="text-right text-sm font-bold tabular-nums text-emerald-400 sm:w-24">{formatMoney(r.valor_mensal)}</span>
                  <button className="text-xs font-semibold text-brand-300 hover:underline" onClick={() => onEditarReceita(r)}>Editar</button>
                </li>
              ))}
            </ul>
          )}
        </Card>

        <Card className="overflow-hidden p-0">
          <div className="flex items-center justify-between px-5 pb-2 pt-5">
            <h3 className="text-sm font-bold text-slate-100">Despesas fixas</h3>
            <Button variant="secondary" size="sm" onClick={onNovaDespesa}>+ Despesa</Button>
          </div>
          {despesas.length === 0 ? <EmptyState message="Nenhuma despesa recorrente cadastrada." /> : (
            <ul>
              {despesas.map((d) => (
                <li key={d.id} className="flex items-center gap-3 border-t border-white/[0.06] px-5 py-3">
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-sm font-semibold text-slate-100">{d.descricao}</div>
                    <div className="text-xs text-slate-400">
                      {DESPESA_CATEGORIA_LABEL[d.categoria]} · todo dia {Number(d.vencimento.slice(8, 10))}
                      {d.parcelas_total ? ` · parcela ${d.parcela_atual ?? 1}/${d.parcelas_total}` : ''}
                    </div>
                  </div>
                  <span className="w-24 text-right text-sm font-bold tabular-nums text-red-400">{formatMoney(d.valor)}</span>
                  <button className="text-xs font-semibold text-brand-300 hover:underline" onClick={() => onEditarDespesa(d)}>Editar</button>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>
    </div>
  );
}
