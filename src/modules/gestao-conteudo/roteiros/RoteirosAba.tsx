import { useMemo, useState } from 'react';
import { Card } from '@/shared/ui/Card';
import { Button } from '@/shared/ui/Button';
import { Spinner } from '@/shared/ui/Spinner';
import { GlassIcon } from '@/shared/ui/GlassIcon';
import { confirmar } from '@/shared/ui/ConfirmDialog';
import { pilaresEditoriais } from '@/modules/gestao-conteudo/api/pilaresApi';
import { descartarAnexo } from '@/modules/ideias/criativos/criativosApi';
import { SEMANA_EXTRA, mesLabel } from '@/modules/gestao-conteudo/types';
import { FaixaDestaque } from '@/modules/gestao-conteudo/components/FaixaDestaque';
import { roteiros, TIPOS_ROTEIRO, type Roteiro, type TipoRoteiro } from './roteirosApi';
import { RoteiroFormModal } from './RoteiroFormModal';
import { baixarPdfRoteiros } from './pdfRoteiros';
import { textoPuro } from '@/shared/ui/texto-rico/regras';

interface Props {
  clientes: { id: string; nome: string }[];
  clienteId: string;
  mes: string;
  onCliente: (id: string | null) => void;
}

const FORMATO: Record<string, string> = { reels: 'Vídeo', carrossel: 'Carrossel', estatico: 'Imagem' };

/** Central de produção organizada por roteiro, separada em orgânico e tráfego pago. */
export function RoteirosAba({ clientes, clienteId, mes, onCliente }: Props) {
  const lista = roteiros.useLista({ mes_referencia: mes });
  const salvar = roteiros.useSalvar();
  const excluir = roteiros.useExcluir();
  const pilaresQ = pilaresEditoriais.useLista();

  const [status, setStatus] = useState<'pendente' | 'concluido' | 'todos'>('todos');
  const [tipo, setTipo] = useState<TipoRoteiro | 'todos'>('todos');
  const [pilar, setPilar] = useState('');
  const [visao, setVisao] = useState<'lista' | 'grade'>('lista');
  const [subAba, setSubAba] = useState<'producao' | 'usados'>('producao');
  const [form, setForm] = useState<{ roteiro?: Roteiro } | null>(null);

  const pilares = useMemo(() => new Map((pilaresQ.data ?? []).map((p) => [p.id, p])), [pilaresQ.data]);
  const nomeCliente = useMemo(() => new Map(clientes.map((c) => [c.id, c.nome])), [clientes]);

  const filtrados = (lista.data ?? []).filter((r) => (!clienteId || r.cliente_id === clienteId) && (tipo === 'todos' || r.tipo === tipo));
  const usados = filtrados.filter((r) => r.usado_em);
  const doPeriodo = filtrados.filter((r) => !r.usado_em);
  const daAba = subAba === 'usados' ? usados : doPeriodo;
  const visiveis = daAba.filter((r) => (status === 'todos' || r.status === status) && (!pilar || r.pilar_id === pilar));
  const concluidos = doPeriodo.filter((r) => r.status === 'concluido').length;

  async function alternarConcluido(r: Roteiro) {
    await salvar.mutateAsync({ id: r.id, dados: { status: r.status === 'concluido' ? 'pendente' : 'concluido' } });
  }
  async function alternarUsado(r: Roteiro) {
    await salvar.mutateAsync({ id: r.id, dados: { usado_em: r.usado_em ? null : new Date().toISOString() } });
  }
  async function apagar(r: Roteiro) {
    if (!(await confirmar(`Excluir o roteiro "${r.titulo}"?`))) return;
    await excluir.mutateAsync(r.id);
    for (const a of r.anexos) void descartarAnexo(a.path);
  }

  const pilula = (ativo: boolean) =>
    `inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-xs font-semibold transition-colors ${
      ativo ? 'aba-escura border-transparent bg-[#0e1a24] text-[#ffffff]' : 'border-white/10 text-slate-300 hover:border-white/25'}`;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-lg font-bold text-slate-100">Roteiros de Produção</h2>
          <p className="text-xs text-slate-400">Central de produção organizada por roteiro · {mesLabel(mes)}</p>
        </div>
        <Button onClick={() => setForm({})}><GlassIcon name="plus" className="h-4 w-4" /> Novo Roteiro</Button>
      </div>

      <div className="abas-linha flex gap-1 border-b border-white/10" role="tablist" aria-label="Roteiros">
        {([['producao', 'Em produção', 'clapperboard', doPeriodo.length], ['usados', 'Usados', 'archive', usados.length]] as const).map(([id, label, icone, n]) => (
          <button key={id} role="tab" aria-selected={subAba === id} onClick={() => setSubAba(id)}
            className={`-mb-px inline-flex items-center gap-1.5 border-b-2 px-3 py-2 text-sm font-semibold transition-colors ${
              subAba === id ? 'border-brand-400 text-brand-300' : 'border-transparent text-slate-400 hover:text-slate-200'}`}>
            <GlassIcon name={icone} className="h-4 w-4" /> {label}
            <span className="rounded-full bg-white/[0.06] px-1.5 text-[11px] font-bold text-slate-300">{n}</span>
          </button>
        ))}
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <div className="flex gap-1" role="radiogroup" aria-label="Tipo de roteiro">
          <button className={pilula(tipo === 'todos')} onClick={() => setTipo('todos')} role="radio" aria-checked={tipo === 'todos'}>Todos</button>
          {TIPOS_ROTEIRO.map((t) => (
            <button key={t.id} className={pilula(tipo === t.id)} onClick={() => setTipo(t.id)} role="radio" aria-checked={tipo === t.id}>
              <GlassIcon name={t.icone} className="h-3.5 w-3.5" /> {t.label}
            </button>
          ))}
        </div>
        <span className="mx-1 hidden h-5 w-px bg-white/10 sm:block" />
        <select value={status} onChange={(e) => setStatus(e.target.value as typeof status)} className="glass-field px-2.5 py-1.5 text-xs [&>option]:bg-slate-900" aria-label="Status">
          <option value="todos">Todos os status</option>
          <option value="pendente">Pendentes</option>
          <option value="concluido">Concluídos</option>
        </select>
        <select value={pilar} onChange={(e) => setPilar(e.target.value)} className="glass-field px-2.5 py-1.5 text-xs [&>option]:bg-slate-900" aria-label="Pilar">
          <option value="">Todos os pilares</option>
          {(pilaresQ.data ?? []).map((p) => <option key={p.id} value={p.id}>{p.nome}</option>)}
        </select>
        <select value={clienteId} onChange={(e) => onCliente(e.target.value || null)} className="glass-field px-2.5 py-1.5 text-xs [&>option]:bg-slate-900" aria-label="Cliente">
          <option value="">Todos os clientes</option>
          {clientes.map((c) => <option key={c.id} value={c.id}>{c.nome}</option>)}
        </select>
        <div className="ml-auto flex items-center gap-1">
          <button className={pilula(visao === 'lista')} onClick={() => setVisao('lista')} aria-pressed={visao === 'lista'}><GlassIcon name="list" className="h-3.5 w-3.5" /> Lista</button>
          <button className={pilula(visao === 'grade')} onClick={() => setVisao('grade')} aria-pressed={visao === 'grade'} aria-label="Grade"><GlassIcon name="grid" className="h-3.5 w-3.5" /></button>
          <Button variant="secondary" size="sm" disabled={visiveis.length === 0}
            onClick={() => void baixarPdfRoteiros({
              titulo: subAba === 'usados' ? 'Roteiros usados' : 'Roteiros de Produção', mes, roteiros: visiveis,
              nomeCliente: (id) => nomeCliente.get(id) ?? '', nomePilar: (id) => (id ? pilares.get(id)?.nome ?? '' : ''),
            })}>
            <GlassIcon name="download" className="h-3.5 w-3.5" /> Baixar PDF
          </Button>
        </div>
      </div>

      {subAba === 'producao' && <FaixaDestaque
        selo="Produção do período"
        titulo={`${doPeriodo.length} ${doPeriodo.length === 1 ? 'roteiro planejado' : 'roteiros planejados'}`}
        direita={
          <div className="text-right">
            <div className="text-[11px] font-bold uppercase tracking-[0.14em]" style={{ color: '#a9b8c5' }}>Concluídos</div>
            <div className="text-2xl font-bold" style={{ color: '#7cc8f0' }}>{concluidos}<span className="text-sm" style={{ color: '#a9b8c5' }}>/{doPeriodo.length}</span></div>
          </div>
        }
      />}

      {lista.isLoading ? (
        <Card className="flex justify-center p-12"><Spinner /></Card>
      ) : lista.error ? (
        <Card className="p-4 text-sm text-red-300">Erro ao carregar: {(lista.error as Error).message}. Se citar "roteiros", aplique a migration 0091.</Card>
      ) : visiveis.length === 0 ? (
        <Card className="flex flex-col items-center gap-2 px-6 py-14 text-center">
          <span className="chip-icone h-11 w-11 bg-brand-500/10"><GlassIcon name="clapperboard" tone="brand" className="h-5 w-5" /></span>
          <p className="text-sm text-slate-400">{daAba.length ? 'Nenhum roteiro com esses filtros.'
            : subAba === 'usados' ? 'Nenhum roteiro usado neste período. Marque um roteiro como usado e ele aparece aqui.'
              : 'Nenhum roteiro neste período. Comece adicionando.'}</p>
        </Card>
      ) : (
        <div className={visao === 'grade' ? 'grid gap-3 sm:grid-cols-2 xl:grid-cols-3' : 'flex flex-col gap-2'}>
          {visiveis.map((r) => {
            const p = r.pilar_id ? pilares.get(r.pilar_id) : undefined;
            const feito = r.status === 'concluido';
            return (
              <Card key={r.id} className="relative flex items-start gap-3 overflow-hidden p-4 pl-5">
                <span className="absolute inset-y-0 left-0 w-1" style={{ backgroundColor: p?.cor ?? '#94a3b8' }} aria-hidden />
                <button
                  onClick={() => void alternarConcluido(r)}
                  aria-label={feito ? 'Marcar como pendente' : 'Marcar como concluído'}
                  title={feito ? 'Concluído (clique para reabrir)' : 'Marcar como concluído'}
                  className={`mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full border transition-colors ${
                    feito ? 'border-emerald-500 bg-emerald-500' : 'border-white/20 hover:border-emerald-400'}`}
                >
                  {feito && <GlassIcon name="check" tone="white" className="h-3.5 w-3.5" />}
                </button>
                <button onClick={() => setForm({ roteiro: r })} className="min-w-0 flex-1 text-left">
                  <div className="flex flex-wrap items-center gap-1.5">
                    <span className={`rounded-md px-1.5 py-0.5 text-[11px] font-semibold ${r.tipo === 'trafego' ? 'bg-orange-500/10 text-orange-300' : 'bg-pink-500/10 text-pink-300'}`}>
                      {r.tipo === 'trafego' ? 'Tráfego pago' : 'Orgânico'}
                    </span>
                    {p && (
                      <span className="inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 text-[11px] font-semibold" style={{ backgroundColor: `${p.cor}1a`, color: p.cor }}>
                        <span className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: p.cor }} /> {p.nome}
                      </span>
                    )}
                    <span className="text-[11px] text-slate-400">
                      {FORMATO[r.formato] ?? r.formato} · {r.semana === SEMANA_EXTRA ? 'Conteúdo extra' : `Semana ${r.semana}`}
                      {r.cenas.length ? ` · ${r.cenas.length} cenas` : ''}
                    </span>
                  </div>
                  <div className={`mt-1 text-sm font-semibold ${feito ? 'text-slate-400 line-through' : 'text-slate-100'}`}>{r.titulo}</div>
                  {!clienteId && <div className="text-xs text-slate-400">{nomeCliente.get(r.cliente_id) ?? 'Cliente'}</div>}
                  {r.usado_em && <div className="text-[11px] font-medium text-emerald-400">Usado em {new Date(r.usado_em).toLocaleDateString('pt-BR')}</div>}
                  {r.descricao && <p className="mt-1 line-clamp-2 text-xs text-slate-400">{textoPuro(r.descricao)}</p>}
                </button>
                <div className="flex shrink-0 items-center">
                  <button onClick={() => void alternarUsado(r)}
                    className={`mr-1 inline-flex items-center gap-1 rounded-md border px-2 py-1 text-[11px] font-semibold transition-colors ${
                      r.usado_em ? 'border-white/10 text-slate-300 hover:bg-white/10' : 'border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/10'}`}
                    title={r.usado_em ? 'Voltar para Em produção' : 'Marcar como usado (vai para a aba Usados)'}>
                    <GlassIcon name={r.usado_em ? 'undo' : 'check-circle'} className="h-3.5 w-3.5" />
                    {r.usado_em ? 'Desfazer' : 'Usado'}
                  </button>
                  <button
                    onClick={() => void baixarPdfRoteiros({
                      titulo: 'Roteiro de Produção', mes, roteiros: [r], arquivo: r.titulo,
                      nomeCliente: (id) => nomeCliente.get(id) ?? '', nomePilar: (id) => (id ? pilares.get(id)?.nome ?? '' : ''),
                    })}
                    className="rounded p-1.5 text-slate-400 hover:bg-white/10" aria-label="Baixar PDF deste roteiro" title="Baixar PDF deste roteiro">
                    <GlassIcon name="download" className="h-4 w-4" />
                  </button>
                  <button onClick={() => setForm({ roteiro: r })} className="rounded p-1.5 text-slate-400 hover:bg-white/10" aria-label="Editar" title="Editar"><GlassIcon name="pencil" className="h-4 w-4" /></button>
                  <button onClick={() => void apagar(r)} className="rounded p-1.5 text-slate-400 hover:bg-red-500/10 hover:text-red-400" aria-label="Excluir" title="Excluir"><GlassIcon name="trash" className="h-4 w-4" /></button>
                </div>
              </Card>
            );
          })}
        </div>
      )}

      {form && (
        <RoteiroFormModal
          onClose={() => setForm(null)}
          mes={mes}
          clientes={clientes}
          clienteId={clienteId || undefined}
          roteiro={form.roteiro}
          inicial={!form.roteiro && tipo !== 'todos' ? { tipo } : undefined}
        />
      )}
    </div>
  );
}
