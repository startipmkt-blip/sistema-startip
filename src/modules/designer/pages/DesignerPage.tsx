import { useMemo, useState } from 'react';
import { PageHeader } from '@/shared/ui/PageHeader';
import { Card } from '@/shared/ui/Card';
import { Button } from '@/shared/ui/Button';
import { Input } from '@/shared/ui/Input';
import { Select } from '@/shared/ui/Select';
import { useClientes } from '@/modules/clientes/api/clientesApi';
import { useOperadores } from '@/modules/crm/api/atendimentoApi';
import { useDemandas, useDemandasRealtime, type DesignerDemanda } from '../api/demandasApi';
import { DemandasKanban } from '../components/DemandasKanban';
import { DemandaFormModal } from '../components/DemandaFormModal';
import { SocialMediaPage } from '@/modules/social-media/pages/SocialMediaPage';
import { AprovacaoConteudoPage } from '@/modules/aprovacao-conteudo/pages/AprovacaoConteudoPage';
import { ConteudoPage } from '@/modules/conteudo/pages/ConteudoPage';
import { DatasComemorativasPage } from '@/modules/datas-comemorativas/pages/DatasComemorativasPage';

type Aba = 'demandas' | 'producao' | 'calendario' | 'aprovacao' | 'datas';

const ABAS: Array<{ id: Aba; label: string; icone: string }> = [
  { id: 'demandas',    label: 'Demandas',   icone: '📥' },
  { id: 'producao',    label: 'Produção',   icone: '🎨' },
  { id: 'calendario',  label: 'Calendário', icone: '🗓' },
  { id: 'aprovacao',   label: 'Aprovação',  icone: '✅' },
  { id: 'datas',       label: 'Datas comemorativas', icone: '🎉' },
];

export function DesignerPage() {
  const [aba, setAba] = useState<Aba>('demandas');
  useDemandasRealtime();

  return (
    <div className="space-y-4 p-4">
      <PageHeader
        title="🎨 Designer"
        subtitle="Kanban unificado de demandas + calendário editorial + aprovação de conteúdo."
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
          >{a.icone} {a.label}</button>
        ))}
      </nav>

      {aba === 'demandas'    && <AbaDemandas />}
      {aba === 'producao'    && <ConteudoPage />}
      {aba === 'calendario'  && <SocialMediaPage />}
      {aba === 'aprovacao'   && <AprovacaoConteudoPage />}
      {aba === 'datas'       && <DatasComemorativasPage />}
    </div>
  );
}

// -------------------------------------------------- Aba Demandas
function AbaDemandas() {
  const [clienteId, setClienteId] = useState<string>('');
  const [responsavelId, setResponsavelId] = useState<string>('');
  const [busca, setBusca] = useState('');
  const [modalAberto, setModalAberto] = useState(false);
  const [editando, setEditando] = useState<DesignerDemanda | null>(null);

  const { data: clientes } = useClientes('');
  const { data: operadores } = useOperadores();
  const { data: demandas } = useDemandas();

  const stats = useMemo(() => {
    const t = demandas ?? [];
    const atrasadas = t.filter((d) => d.prazo && new Date(d.prazo) < new Date() && d.status !== 'concluido').length;
    const hoje = t.filter((d) => d.prazo && new Date(d.prazo).toDateString() === new Date().toDateString()).length;
    return { total: t.length, atrasadas, hoje };
  }, [demandas]);

  function abrir(d: DesignerDemanda | null) {
    setEditando(d);
    setModalAberto(true);
  }

  return (
    <div className="space-y-3">
      <Card className="flex flex-wrap items-center gap-3 p-3">
        <Input id="q" placeholder="🔍 buscar…" value={busca} onChange={(e) => setBusca(e.target.value)} className="w-52" />
        <Select
          id="c" value={clienteId} onChange={(e) => setClienteId(e.target.value)}
          options={[{ value: '', label: 'todos os clientes' }, ...((clientes ?? []).map((c) => ({ value: c.id, label: c.nome })))]}
        />
        <Select
          id="r" value={responsavelId} onChange={(e) => setResponsavelId(e.target.value)}
          options={[{ value: '', label: 'todos os responsáveis' }, ...((operadores ?? []).map((op) => ({ value: op.id, label: op.nome })))]}
        />
        <div className="ml-auto flex items-center gap-3 text-xs text-slate-400">
          <span>{stats.total} demanda(s)</span>
          {stats.hoje > 0 && <span className="rounded bg-amber-500/20 px-2 py-0.5 text-amber-300">📅 {stats.hoje} hoje</span>}
          {stats.atrasadas > 0 && <span className="rounded bg-red-500/20 px-2 py-0.5 text-red-300">⚠ {stats.atrasadas} atrasada(s)</span>}
          <Button onClick={() => abrir(null)}>+ Nova demanda</Button>
        </div>
      </Card>

      <DemandasKanban
        clienteId={clienteId || null}
        responsavelId={responsavelId || null}
        q={busca}
        onEditar={abrir}
      />

      <DemandaFormModal open={modalAberto} onClose={() => setModalAberto(false)} demanda={editando} />
    </div>
  );
}
