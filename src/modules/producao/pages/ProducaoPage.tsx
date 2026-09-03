import { useMemo, useState } from 'react';
import { useProgressoMensal, useTarefasProducao, useSalvarTarefa, useMudarFase, useApagarTarefa, type ProducaoTipo, type ProducaoFase } from '@/modules/producao/api/producaoApi';
import { useClientes } from '@/modules/clientes/api/clientesApi';
import { Card } from '@/shared/ui/Card';
import { Button } from '@/shared/ui/Button';
import { StatCard } from '@/shared/ui/StatCard';
import { Badge } from '@/shared/ui/Badge';
import { Spinner } from '@/shared/ui/Spinner';
import { EmptyState } from '@/shared/ui/EmptyState';

interface Props { tipo: ProducaoTipo; }

const FASES_VIDEO: ProducaoFase[] = ['planejado', 'captado', 'editado', 'entregue'];
const FASES_POST:  ProducaoFase[] = ['planejado', 'arte', 'revisao', 'entregue'];

const FASE_LABEL: Record<ProducaoFase, string> = {
  planejado: 'Planejado',
  captado:   'Captado',
  editado:   'Editado',
  arte:      'Em arte',
  revisao:   'Revisão',
  entregue:  'Entregue',
};

export function ProducaoPage({ tipo }: Props) {
  const fases = tipo === 'video' ? FASES_VIDEO : FASES_POST;
  const { data: progresso } = useProgressoMensal();
  const { data: tarefas, isLoading } = useTarefasProducao(tipo);
  const clientesQ = useClientes('');
  const salvar = useSalvarTarefa();
  const mudarFase = useMudarFase();
  const apagar = useApagarTarefa();

  const [clienteFiltro, setClienteFiltro] = useState<string>('');
  const [novoCli, setNovoCli] = useState<string>('');
  const [novoTitulo, setNovoTitulo] = useState<string>('');

  const kpis = useMemo(() => {
    const p = (progresso ?? []);
    if (tipo === 'video') {
      return {
        meta:       p.reduce((s, x) => s + x.meta_video, 0),
        entregues:  p.reduce((s, x) => s + x.videos_entregues, 0),
        emAndamento:p.reduce((s, x) => s + Math.max(0, x.videos_feitos - x.videos_entregues), 0),
        faltam:     p.reduce((s, x) => s + x.faltam_videos, 0),
      };
    }
    return {
      meta:       p.reduce((s, x) => s + x.meta_post, 0),
      entregues:  p.reduce((s, x) => s + x.posts_entregues, 0),
      emAndamento:p.reduce((s, x) => s + Math.max(0, x.posts_feitos - x.posts_entregues), 0),
      faltam:     p.reduce((s, x) => s + x.faltam_posts, 0),
    };
  }, [progresso, tipo]);

  const porFase = useMemo(() => {
    const m: Record<ProducaoFase, typeof tarefas> = { planejado: [], captado: [], editado: [], arte: [], revisao: [], entregue: [] };
    (tarefas ?? [])
      .filter((t) => !clienteFiltro || t.cliente_id === clienteFiltro)
      .forEach((t) => { m[t.fase]!.push(t); });
    return m;
  }, [tarefas, clienteFiltro]);

  const nomeCli = useMemo(() => {
    const m = new Map<string, string>();
    (clientesQ.data ?? []).forEach((c) => m.set(c.id, c.nome));
    return m;
  }, [clientesQ.data]);

  async function criarTarefa() {
    if (!novoCli || !novoTitulo.trim()) return;
    await salvar.mutateAsync({
      dados: {
        cliente_id: novoCli,
        tipo,
        fase: 'planejado',
        titulo: novoTitulo.trim(),
      },
    });
    setNovoTitulo('');
  }

  function proximaFase(atual: ProducaoFase): ProducaoFase | null {
    const idx = fases.indexOf(atual);
    if (idx < 0 || idx === fases.length - 1) return null;
    return fases[idx + 1];
  }

  const nomeModulo = tipo === 'video' ? 'Video Maker' : 'Webdesigner';
  const emoji      = tipo === 'video' ? '🎬' : '🎨';

  return (
    <div className="space-y-4 p-4">
      <header className="flex flex-wrap items-center gap-3">
        <h1 className="text-xl font-semibold text-white">{emoji} {nomeModulo}</h1>
        <select
          value={clienteFiltro}
          onChange={(e) => setClienteFiltro(e.target.value)}
          className="ml-auto rounded-md border border-white/10 bg-slate-800 px-2 py-1 text-xs text-slate-100 [color-scheme:dark]"
        >
          <option value="">Todos os clientes</option>
          {(clientesQ.data ?? []).map((c) => <option key={c.id} value={c.id}>{c.nome}</option>)}
        </select>
      </header>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard label={`${nomeModulo} no mês (meta)`} value={String(kpis.meta)} tone="slate" />
        <StatCard label="Entregues" value={String(kpis.entregues)} tone="green" />
        <StatCard label="Em andamento" value={String(kpis.emAndamento)} tone="blue" />
        <StatCard label="Falta entregar" value={String(kpis.faltam)} tone="amber" />
      </div>

      {/* Adicionar nova tarefa */}
      <Card className="flex flex-wrap items-end gap-2 p-3">
        <label className="text-xs text-slate-300">
          Cliente
          <select
            value={novoCli}
            onChange={(e) => setNovoCli(e.target.value)}
            className="mt-1 block w-52 rounded-md border border-white/10 bg-slate-800 px-3 py-2 text-sm text-slate-100 [color-scheme:dark]"
          >
            <option value="">Selecione…</option>
            {(clientesQ.data ?? []).map((c) => <option key={c.id} value={c.id}>{c.nome}</option>)}
          </select>
        </label>
        <label className="min-w-64 flex-1 text-xs text-slate-300">
          Título / descrição
          <input
            type="text"
            value={novoTitulo}
            onChange={(e) => setNovoTitulo(e.target.value)}
            placeholder={tipo === 'video' ? 'Ex: Reels de bastidor' : 'Ex: Carrossel 3 slides sobre X'}
            className="mt-1 w-full rounded-md border border-white/10 bg-white/5 px-3 py-2 text-sm text-slate-100 placeholder:text-slate-500 focus:border-brand-400 focus:outline-none"
          />
        </label>
        <Button onClick={criarTarefa} disabled={!novoCli || !novoTitulo.trim() || salvar.isPending}>
          + Adicionar
        </Button>
      </Card>

      {isLoading ? (
        <Card className="flex justify-center p-10"><Spinner /></Card>
      ) : (
        <div className={`grid gap-3 ${tipo === 'video' ? 'lg:grid-cols-4' : 'lg:grid-cols-4'}`}>
          {fases.map((f) => (
            <Card key={f} className="flex min-h-[240px] flex-col p-3">
              <div className="mb-2 flex items-center justify-between">
                <h3 className="text-sm font-semibold text-slate-100">{FASE_LABEL[f]}</h3>
                <Badge tone={f === 'entregue' ? 'green' : 'slate'}>{(porFase[f] ?? []).length}</Badge>
              </div>
              <ul className="space-y-1.5">
                {(porFase[f] ?? []).map((t) => (
                  <li key={t.id} className="rounded-md border border-white/10 bg-white/5 p-2 text-xs">
                    <div className="mb-1 truncate font-medium text-slate-100">{t.titulo || 'Sem título'}</div>
                    <div className="mb-2 truncate text-[10px] text-slate-400">{nomeCli.get(t.cliente_id) ?? '—'}</div>
                    <div className="flex items-center gap-1">
                      {proximaFase(f) && (
                        <button
                          onClick={() => mudarFase.mutate({ id: t.id, fase: proximaFase(f) as ProducaoFase })}
                          className="rounded-md bg-brand-500/15 px-1.5 py-0.5 text-[10px] text-brand-200 hover:bg-brand-500/30"
                        >
                          → {FASE_LABEL[proximaFase(f) as ProducaoFase]}
                        </button>
                      )}
                      <button
                        onClick={() => { if (confirm('Apagar?')) apagar.mutate(t.id); }}
                        className="ml-auto rounded-md px-1 text-[10px] text-red-300 hover:bg-red-500/10"
                        title="Apagar"
                      >
                        🗑️
                      </button>
                    </div>
                  </li>
                ))}
                {(porFase[f] ?? []).length === 0 && (
                  <li className="text-center text-[11px] text-slate-600">vazio</li>
                )}
              </ul>
            </Card>
          ))}
        </div>
      )}

      {(!tarefas || tarefas.length === 0) && !isLoading && (
        <EmptyState message="Nenhuma tarefa. Adicione uma acima." />
      )}
    </div>
  );
}
