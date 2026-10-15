import { useMemo, useState } from 'react';
import { PageHeader } from '@/shared/ui/PageHeader';
import { Card } from '@/shared/ui/Card';
import { Button } from '@/shared/ui/Button';
import { Input } from '@/shared/ui/Input';
import { Select } from '@/shared/ui/Select';
import { useClientes } from '@/modules/clientes/api/clientesApi';
import { useOperadores } from '@/modules/crm/api/atendimentoApi';
import { useDemandas, useDemandasRealtime, type DesignerDemanda, type DesignerStatus } from '../api/demandasApi';
import { DemandasKanban } from '../components/DemandasKanban';
import { HistoricoDesigner } from '../components/HistoricoDesigner';
import { ResumoDesigner } from '../components/ResumoDesigner';
import { FuncoesDesigner } from '../components/FuncoesDesigner';
import { PeriodoSeletor } from '../components/PeriodoSeletor';
import { hojeLocal, mesDaSemana, periodoDoMes, semanaDe, semanasDoMes } from '../lib/periodo';
import { DemandaFormModal } from '../components/DemandaFormModal';
import { GerarSemanaModal } from '../components/GerarSemanaModal';
import { ConteudoPage } from '@/modules/conteudo/pages/ConteudoPage';
import { GlassIcon, glassify } from '@/shared/ui/GlassIcon';

type GrupoCliente = 'todos' | 'organico' | 'trafego';

const GRUPOS: Array<{ id: GrupoCliente; label: string; ajuda: string }> = [
  { id: 'todos',    label: '👥 Todos os clientes',        ajuda: 'Todos os clientes' },
  { id: 'organico', label: '📱 Com rede social (orgânico)', ajuda: 'Clientes com Social Mídia: posts, carrosséis, reels e stories' },
  { id: 'trafego',  label: '🎯 Só tráfego pago (criativos)', ajuda: 'Clientes só com Tráfego Pago: edição de criativos, quando houver demanda' },
];

type Aba = 'demandas' | 'producao' | 'funcoes';

const ABAS: Array<{ id: Aba; label: string; icone: string }> = [
  { id: 'demandas',    label: 'Demandas',   icone: '📥' },
  { id: 'producao',    label: 'Produção',   icone: '🎨' },
  { id: 'funcoes',     label: 'Funções',    icone: '📋' },
];

export function DesignerPage() {
  const [aba, setAba] = useState<Aba>('demandas');
  useDemandasRealtime();

  return (
    <div className="space-y-4 p-4">
      <PageHeader
        title="🎨 Designer"
        subtitle="Demandas, produção e funções do designer."
      />

      <nav className="flex gap-1 border-b border-white/10">
        {ABAS.map((a) => (
          <button
            key={a.id}
            onClick={() => setAba(a.id)}
            className={`rounded-t-md px-4 py-2 text-sm font-medium transition-colors ${
              aba === a.id
                ? 'bg-white/5 text-white border-b-2 border-brand-400'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          ><GlassIcon emoji={a.icone} /> {a.label}</button>
        ))}
      </nav>

      {aba === 'demandas'    && <AbaDemandas />}
      {aba === 'producao'    && <ConteudoPage />}
      {aba === 'funcoes'     && <FuncoesDesigner />}
    </div>
  );
}

// -------------------------------------------------- Aba Demandas
function AbaDemandas() {
  const [clienteId, setClienteId] = useState<string>('');
  const [responsavelId, setResponsavelId] = useState<string>('');
  const [busca, setBusca] = useState('');
  const [mes, setMes] = useState(() => mesDaSemana(hojeLocal()));
  const [semana, setSemana] = useState<number | null>(
    () => semanaDe(mesDaSemana(hojeLocal()), hojeLocal()).numero,
  );
  const [grupo, setGrupo] = useState<GrupoCliente>('todos');
  const periodo = useMemo(() => {
    if (semana === null) return periodoDoMes(mes);
    const s = semanasDoMes(mes).find((x) => x.numero === semana);
    return s ? { ini: s.ini, fim: s.fim } : periodoDoMes(mes);
  }, [mes, semana]);
  // Semana aberta no quadro vira a semana padrão da demanda nova (início da semana).
  const semanaSugerida = semana === null ? undefined : periodo.ini;
  const [visao, setVisao] = useState<'quadro' | 'historico'>('quadro');
  const [modalAberto, setModalAberto] = useState(false);
  const [gerarAberto, setGerarAberto] = useState(false);
  const [editando, setEditando] = useState<DesignerDemanda | null>(null);
  const [statusNovo, setStatusNovo] = useState<DesignerStatus>('a_fazer');

  const { data: clientes } = useClientes('');
  const { data: operadores } = useOperadores();
  const { data: demandas } = useDemandas();

  const clientesDoGrupo = useMemo(() => {
    const todos = clientes ?? [];
    if (grupo === 'organico') return todos.filter((c) => c.servicos?.includes('social_midia'));
    if (grupo === 'trafego') {
      return todos.filter((c) => c.servicos?.includes('trafego_pago') && !c.servicos.includes('social_midia'));
    }
    return todos;
  }, [clientes, grupo]);
  const clienteIds = useMemo(
    () => (grupo === 'todos' ? null : clientesDoGrupo.map((c) => c.id)),
    [grupo, clientesDoGrupo],
  );

  function trocarGrupo(g: GrupoCliente) {
    setGrupo(g);
    setClienteId('');
  }

  const stats = useMemo(() => {
    const t = demandas ?? [];
    const atrasadas = t.filter((d) => d.prazo && new Date(d.prazo) < new Date() && d.status !== 'concluido').length;
    const hoje = t.filter((d) => d.prazo && new Date(d.prazo).toDateString() === new Date().toDateString()).length;
    return { total: t.length, atrasadas, hoje };
  }, [demandas]);

  function abrir(d: DesignerDemanda | null, status: DesignerStatus = 'a_fazer') {
    setEditando(d);
    setStatusNovo(status);
    setModalAberto(true);
  }

  return (
    <div className="space-y-3">
      <Card className="flex flex-wrap items-center gap-3 p-3">
        <Input id="q" placeholder="buscar…" value={busca} onChange={(e) => setBusca(e.target.value)} className="w-52" />
        <Select
          id="c" value={clienteId} onChange={(e) => setClienteId(e.target.value)}
          options={[{ value: '', label: 'todos os clientes' }, ...(clientesDoGrupo.map((c) => ({ value: c.id, label: c.nome })))]}
        />
        <Select
          id="r" value={responsavelId} onChange={(e) => setResponsavelId(e.target.value)}
          options={[{ value: '', label: 'todos os responsáveis' }, ...((operadores ?? []).map((op) => ({ value: op.id, label: op.nome })))]}
        />
        <div className="ml-auto flex items-center gap-3 text-xs text-slate-400">
          <span>{stats.total} demanda(s)</span>
          {stats.hoje > 0 && <span className="rounded bg-amber-500/20 px-2 py-0.5 text-amber-300"><GlassIcon name="calendar" /> {stats.hoje} hoje</span>}
          {stats.atrasadas > 0 && <span className="rounded bg-red-500/20 px-2 py-0.5 text-red-300"><GlassIcon name="alert" /> {stats.atrasadas} atrasada(s)</span>}
          <Button onClick={() => abrir(null)}>+ Nova demanda</Button>
        </div>
      </Card>

      <ResumoDesigner />

      <div className="flex flex-wrap gap-1.5">
        {GRUPOS.map((g) => (
          <button
            key={g.id}
            type="button"
            title={g.ajuda}
            onClick={() => trocarGrupo(g.id)}
            className={`rounded-full border px-3 py-1.5 text-xs font-medium transition-colors ${
              grupo === g.id
                ? 'border-brand-400 bg-brand-500/20 text-brand-100'
                : 'border-white/10 bg-white/5 text-slate-300 hover:bg-white/10'
            }`}
          >
            {glassify(g.label)}{g.id !== 'todos' && grupo === g.id ? ` · ${clientesDoGrupo.length}` : ''}
          </button>
        ))}
      </div>

      <PeriodoSeletor mes={mes} semana={semana} onMes={setMes} onSemana={setSemana} />

      <div className="flex gap-1 border-b border-white/10">
        {([
          { id: 'quadro', label: '📋 Quadro' },
          { id: 'historico', label: '✅ Histórico (o que foi feito)' },
        ] as const).map((v) => (
          <button
            key={v.id}
            onClick={() => setVisao(v.id)}
            className={`border-b-2 px-3 py-1.5 text-xs font-medium transition-colors ${
              visao === v.id ? 'border-brand-500 text-brand-300' : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >{glassify(v.label)}</button>
        ))}
      </div>

      {visao === 'quadro' ? (
        <DemandasKanban
          clienteId={clienteId || null}
          responsavelId={responsavelId || null}
          q={busca}
          periodo={periodo}
          clienteIds={clienteIds}
          onEditar={abrir}
          onNova={(status) => abrir(null, status)}
          onGerarSemana={() => setGerarAberto(true)}
        />
      ) : (
        <HistoricoDesigner
          clienteId={clienteId || null}
          responsavelId={responsavelId || null}
          q={busca}
          periodo={periodo}
          clienteIds={clienteIds}
          onEditar={abrir}
        />
      )}

      <GerarSemanaModal open={gerarAberto} onClose={() => setGerarAberto(false)} semanaInicial={semanaSugerida} />
      <DemandaFormModal open={modalAberto} onClose={() => setModalAberto(false)} demanda={editando} statusInicial={statusNovo} semanaSugerida={semanaSugerida} />
    </div>
  );
}
