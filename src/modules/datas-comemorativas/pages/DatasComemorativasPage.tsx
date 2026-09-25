import { useEffect, useMemo, useState } from 'react';
import { useClientes } from '@/modules/clientes/api/clientesApi';
import {
  useCalendarioConfig, useDatasBase, useDatasCliente, useRemoverDataCliente, useSalvarCalendario,
} from '@/modules/datas-comemorativas/api/datasApi';
import {
  agruparPorMes, anoDe, formatarData, gerarOcorrencias, hojeSaoPaulo, periodoVigente, slugify,
} from '@/modules/datas-comemorativas/lib/recorrencia';
import type { CalendarioConfig, DataCliente, Ocorrencia } from '@/modules/datas-comemorativas/types';
import { OcorrenciaCard } from '@/modules/datas-comemorativas/components/OcorrenciaCard';
import { BaseMaeModal } from '@/modules/datas-comemorativas/components/BaseMaeModal';
import { AdicionarDatasModal } from '@/modules/datas-comemorativas/components/AdicionarDatasModal';
import { EditarDataClienteModal } from '@/modules/datas-comemorativas/components/EditarDataClienteModal';
import { PageHeader } from '@/shared/ui/PageHeader';
import { Button } from '@/shared/ui/Button';
import { Card } from '@/shared/ui/Card';
import { Badge } from '@/shared/ui/Badge';
import { Input } from '@/shared/ui/Input';
import { Spinner } from '@/shared/ui/Spinner';
import { EmptyState } from '@/shared/ui/EmptyState';

type Filtro = 'todas' | 'proximas' | 'historico';

export function DatasComemorativasPage() {
  const hoje = hojeSaoPaulo();
  const [ano, setAno] = useState(anoDe(hoje));
  const [clienteId, setClienteId] = useState('');
  const [filtro, setFiltro] = useState<Filtro>('todas');
  const [baseAberta, setBaseAberta] = useState(false);
  const [adicionarAberto, setAdicionarAberto] = useState(false);
  const [editando, setEditando] = useState<DataCliente | null>(null);
  const remover = useRemoverDataCliente();

  const clientesQ = useClientes('');
  const clientes = useMemo(
    () => (clientesQ.data ?? [])
      .filter((c) => c.status === 'ativo' && (c.servicos ?? []).includes('social_midia'))
      .sort((a, b) => a.nome.localeCompare(b.nome)),
    [clientesQ.data],
  );
  useEffect(() => { if (!clienteId && clientes[0]) setClienteId(clientes[0].id); }, [clientes, clienteId]);
  const clienteAtual = clientes.find((c) => c.id === clienteId);

  const baseQ = useDatasBase();
  const itensQ = useDatasCliente(clienteId);
  const calQ = useCalendarioConfig(clienteId);
  const base = baseQ.data ?? [];
  const itens = itensQ.data ?? [];
  const cal = calQ.data ?? null;

  const ocorrencias = useMemo(() => gerarOcorrencias(itens, base, [ano], hoje), [itens, base, ano, hoje]);
  const visiveis = ocorrencias.filter((o) =>
    filtro === 'todas' ? true : filtro === 'proximas' ? o.status !== 'passada' : o.status === 'passada');
  const contagem = {
    proximas: ocorrencias.filter((o) => o.status !== 'passada').length,
    planejamento: ocorrencias.filter((o) => o.status === 'em_planejamento' || o.status === 'hoje').length,
    passadas: ocorrencias.filter((o) => o.status === 'passada').length,
  };

  function removerData(o: Ocorrencia) {
    if (!confirm(`Remover "${o.base.nome}" do calendário de ${clienteAtual?.nome}? (continua na Base Mãe)`)) return;
    remover.mutate(o.item.id);
  }

  return (
    <div className="space-y-4">
      <PageHeader title="Datas comemorativas" subtitle="Calendário de datas por cliente. Cada cliente acompanha o seu pelo link exclusivo.">
        <select
          value={ano}
          onChange={(e) => setAno(Number(e.target.value))}
          className="rounded-md border border-white/10 bg-slate-800 px-2 py-1 text-xs text-slate-100 [color-scheme:dark]"
        >
          {[anoDe(hoje) - 1, anoDe(hoje), anoDe(hoje) + 1].map((a) => <option key={a} value={a}>{a}</option>)}
        </select>
        <Button variant="secondary" onClick={() => setBaseAberta(true)}>📚 Base Mãe</Button>
        <Button onClick={() => setAdicionarAberto(true)} disabled={!clienteId || baseQ.isLoading}>+ Adicionar datas</Button>
      </PageHeader>

      <div className="flex min-h-[60vh] flex-col gap-3 md:flex-row">
        <aside className="flex shrink-0 flex-col rounded-lg border border-white/10 bg-white/[0.02] md:w-64">
          <div className="border-b border-white/5 p-2 text-[10px] font-semibold uppercase tracking-wider text-slate-500">
            Clientes ativos ({clientes.length})
          </div>
          <ul className="max-h-60 overflow-y-auto md:max-h-none md:flex-1">
            {clientesQ.isLoading && <div className="p-4"><Spinner /></div>}
            {clientes.map((c) => (
              <li key={c.id}>
                <button
                  onClick={() => setClienteId(c.id)}
                  className={`flex w-full items-center gap-2 border-b border-white/5 p-2 text-left text-sm ${
                    clienteId === c.id ? 'bg-brand-500/15 text-white' : 'text-slate-200 hover:bg-white/5'
                  }`}
                >
                  {c.logo_url
                    ? <img src={c.logo_url} alt="" className="h-6 w-6 shrink-0 rounded-full object-cover" />
                    : <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-white/5 text-[10px]">🏢</span>}
                  <span className="truncate">{c.nome}</span>
                </button>
              </li>
            ))}
            {!clientesQ.isLoading && clientes.length === 0 && (
              <li className="p-4 text-center text-xs text-slate-500">Nenhum cliente ativo com Social Mídia.</li>
            )}
          </ul>
        </aside>

        <div className="min-w-0 flex-1 space-y-3">
          {!clienteAtual ? (
            <Card><EmptyState message="Selecione um cliente na barra ao lado." /></Card>
          ) : (
            <>
              <LinkCalendario key={clienteAtual.id} clienteId={clienteAtual.id} clienteNome={clienteAtual.nome} cal={cal} carregando={calQ.isLoading} hoje={hoje} />

              <div className="flex flex-wrap items-center gap-2">
                {([
                  ['todas', `Todas de ${ano} (${ocorrencias.length})`],
                  ['proximas', `Próximas (${contagem.proximas})`],
                  ['historico', `Histórico (${contagem.passadas})`],
                ] as const).map(([id, label]) => (
                  <button
                    key={id}
                    onClick={() => setFiltro(id)}
                    className={`rounded-full border px-3 py-1 text-xs ${
                      filtro === id ? 'border-brand-400 bg-brand-500/20 text-white' : 'border-white/10 text-slate-300 hover:bg-white/5'
                    }`}
                  >
                    {label}
                  </button>
                ))}
                {contagem.planejamento > 0 && (
                  <span className="text-[11px] text-amber-300">⏳ {contagem.planejamento} em planejamento agora</span>
                )}
              </div>

              {itensQ.isLoading || baseQ.isLoading ? (
                <Card className="flex justify-center p-12"><Spinner /></Card>
              ) : itens.length === 0 ? (
                <Card>
                  <EmptyState message={`${clienteAtual.nome} ainda não tem datas. Clique em "+ Adicionar datas" para escolher da Base Mãe.`} />
                </Card>
              ) : visiveis.length === 0 ? (
                <Card><EmptyState message="Nenhuma data neste filtro." /></Card>
              ) : (
                <div className="space-y-5">
                  {agruparPorMes(visiveis).map((g) => (
                    <section key={g.chave}>
                      <div className="mb-2 flex items-center gap-2">
                        <span className="rounded-full border border-brand-400/30 bg-brand-500/10 px-3 py-1 text-xs font-semibold text-brand-200">{g.titulo}</span>
                        <span className="text-[10px] text-slate-500">{g.itens.length} data(s)</span>
                        <div className="h-px flex-1 bg-white/5" />
                      </div>
                      <div className="grid gap-3 xl:grid-cols-2">
                        {g.itens.map((o) => (
                          <OcorrenciaCard
                            key={o.key}
                            ocorrencia={o}
                            hoje={hoje}
                            etiquetas={
                              <>
                                {o.item.visivel_cliente === false && <Badge tone="amber">🙈 Oculta do cliente</Badge>}
                                {cal && o.data < cal.inicio && <Badge tone="slate">Antes do início do calendário</Badge>}
                              </>
                            }
                            acoes={
                              <>
                                <button onClick={() => setEditando(o.item)} className="text-xs font-medium text-brand-300 hover:underline">✎ Ajustar</button>
                                <button onClick={() => removerData(o)} className="text-xs text-slate-500 hover:text-red-300">Remover</button>
                              </>
                            }
                          />
                        ))}
                      </div>
                    </section>
                  ))}
                </div>
              )}
            </>
          )}
        </div>
      </div>

      <BaseMaeModal open={baseAberta} onClose={() => setBaseAberta(false)} />
      {clienteAtual && adicionarAberto && (
        <AdicionarDatasModal
          open
          onClose={() => setAdicionarAberto(false)}
          clienteId={clienteAtual.id}
          clienteNome={clienteAtual.nome}
          base={base}
          itens={itens}
        />
      )}
      {editando && base.find((b) => b.id === editando.data_id) && (
        <EditarDataClienteModal
          item={editando}
          base={base.find((b) => b.id === editando.data_id)!}
          onClose={() => setEditando(null)}
        />
      )}
    </div>
  );
}

interface LinkProps {
  clienteId: string;
  clienteNome: string;
  cal: CalendarioConfig | null;
  carregando: boolean;
  hoje: string;
}

function LinkCalendario({ clienteId, clienteNome, cal, carregando, hoje }: LinkProps) {
  const salvar = useSalvarCalendario();
  const [editando, setEditando] = useState(false);
  const [slug, setSlug] = useState(cal?.slug ?? slugify(clienteNome));
  const [inicio, setInicio] = useState(cal?.inicio ?? hoje);
  const [erro, setErro] = useState<string | null>(null);
  const [copiado, setCopiado] = useState(false);

  useEffect(() => {
    setSlug(cal?.slug ?? slugify(clienteNome));
    setInicio(cal?.inicio ?? hoje);
  }, [cal, clienteNome, hoje]);

  if (carregando) return null;

  async function gravar() {
    setErro(null);
    const s = slugify(slug);
    if (!s) { setErro('Informe um endereço válido.'); return; }
    try {
      await salvar.mutateAsync({ cliente_id: clienteId, slug: s, inicio });
      setEditando(false);
    } catch (e) {
      setErro((e as Error).message === 'slug em uso' ? 'Esse endereço já é usado por outro cliente.' : (e as Error).message);
    }
  }

  if (!cal || editando) {
    return (
      <div className="space-y-2 rounded-lg border border-dashed border-white/15 bg-white/[0.02] p-3">
        <div className="text-xs text-slate-300">
          {cal ? 'Ajustar link do calendário' : `🔗 ${clienteNome} ainda não tem link do calendário.`}
        </div>
        <div className="grid gap-2 sm:grid-cols-[1fr_180px_auto] sm:items-end">
          <Input id="cal-slug" label={`${window.location.origin}/calendario/…`} value={slug} onChange={(e) => setSlug(e.target.value)} />
          <Input id="cal-inicio" label="Início do calendário" type="date" value={inicio} onChange={(e) => setInicio(e.target.value)} className="[color-scheme:dark]" />
          <div className="flex gap-2">
            {cal && <Button variant="secondary" onClick={() => setEditando(false)}>Cancelar</Button>}
            <Button onClick={() => void gravar()} disabled={salvar.isPending || !inicio}>{cal ? 'Salvar' : 'Gerar link'}</Button>
          </div>
        </div>
        {erro && <div className="text-xs text-red-300">{erro}</div>}
      </div>
    );
  }

  const url = `${window.location.origin}/calendario/${cal.slug}`;
  const periodo = periodoVigente(cal.inicio, hoje);
  return (
    <div className="space-y-1 rounded-lg border border-dashed border-white/15 bg-white/[0.02] px-3 py-2 text-xs text-slate-400">
      <div className="flex flex-wrap items-center gap-2">
        🔗 <span className="text-slate-300">Link do cliente:</span>
        <code className="min-w-0 flex-1 truncate rounded bg-slate-800 px-2 py-0.5 text-slate-200">{url}</code>
        <button
          onClick={() => { void navigator.clipboard.writeText(url); setCopiado(true); setTimeout(() => setCopiado(false), 1500); }}
          className="rounded-md border border-white/10 px-2 py-0.5 text-slate-200 hover:bg-white/5"
        >
          {copiado ? 'Copiado ✓' : 'Copiar'}
        </button>
        <a href={url} target="_blank" rel="noreferrer" className="rounded-md border border-white/10 px-2 py-0.5 text-slate-200 hover:bg-white/5">Abrir</a>
        <button onClick={() => setEditando(true)} className="text-brand-300 hover:underline">Ajustar</button>
      </div>
      <div>
        Calendário vigente para o cliente: <span className="text-slate-200">{formatarData(periodo.de)} → {formatarData(periodo.ate)}</span>
        {' '}· início configurado em {formatarData(cal.inicio)}
      </div>
    </div>
  );
}
