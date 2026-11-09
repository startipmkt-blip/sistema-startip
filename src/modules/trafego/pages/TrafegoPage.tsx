import { useState } from 'react';
import { Tabs } from '@/shared/ui/Tabs';
import { PageHeader } from '@/shared/ui/PageHeader';
import { Card } from '@/shared/ui/Card';
import { Select } from '@/shared/ui/Select';
import { useClientes } from '@/modules/clientes/api/clientesApi';
import { MetaAdsGestorPage } from '@/modules/meta-ads/pages/MetaAdsGestorPage';
import { AbaChecklist } from '../components/AbaChecklist';
import { AbaOtimizacoes } from '../components/AbaOtimizacoes';
import { AbaSaldo } from '../components/AbaSaldo';
import { AbaPainelGestor } from '../components/AbaPainelGestor';
import { GlassIcon } from '@/shared/ui/GlassIcon';

type Aba = 'meta' | 'gestor' | 'checklist' | 'otimizacoes' | 'saldo';

const ABAS: Array<{ id: Aba; label: string; icone: string }> = [
  { id: 'meta',        label: 'Meta Ads',    icone: '🎯' },
  { id: 'gestor',      label: 'Painel do Gestor', icone: '📊' },
  { id: 'checklist',   label: 'Checklist',   icone: '📋' },
  { id: 'otimizacoes', label: 'Otimizações', icone: '📈' },
  { id: 'saldo',       label: 'Saldo diário', icone: '💰' },
];

export function TrafegoPage() {
  const [aba, setAba] = useState<Aba>('meta');

  // O Painel do Gestor ocupa a tela toda (tem o próprio cabeçalho e menu).
  if (aba === 'gestor') {
    return (
      <div>
        <NavAbas aba={aba} setAba={setAba} />
        <AbaPainelGestor />
      </div>
    );
  }

  // Meta Ads já tem PageHeader próprio; nas outras abas o PageHeader vive aqui.
  if (aba === 'meta') {
    return (
      <div>
        <NavAbas aba={aba} setAba={setAba} />
        <MetaAdsGestorPage />
      </div>
    );
  }

  return (
    <div className="space-y-4 sm:p-4">
      <PageHeader
        title="🎯 Tráfego Pago"
        subtitle="Checklist diário, otimizações da semana e saldo consolidado de todos os clientes."
      />
      <NavAbas aba={aba} setAba={setAba} />

      {aba === 'checklist'   && <AbaChecklistStandalone />}
      {aba === 'otimizacoes' && <AbaOtimizacoes />}
      {aba === 'saldo'       && <AbaSaldo />}
    </div>
  );
}

function NavAbas({ aba, setAba }: { aba: Aba; setAba: (a: Aba) => void }) {
  return (
    <Tabs
      className={aba === 'meta' || aba === 'gestor' ? 'mx-4 mt-4' : ''}
      tabs={ABAS.map((a) => ({ id: a.id, label: a.label, icon: <GlassIcon emoji={a.icone} /> }))}
      value={aba}
      onChange={setAba}
    />
  );
}

function AbaChecklistStandalone() {
  const { data: clientes } = useClientes('');
  const disponiveis = (clientes ?? []).filter((c) => (c.servicos ?? []).includes('trafego_pago'));
  const [clienteId, setClienteId] = useState<string>('');
  const selecionado = disponiveis.find((c) => c.id === clienteId);

  return (
    <div className="space-y-3">
      <Card className="flex flex-wrap items-center gap-3 p-3">
        <span className="text-xs uppercase tracking-wider text-slate-400">Cliente</span>
        <Select
          id="cli"
          value={clienteId}
          onChange={(e) => setClienteId(e.target.value)}
          options={[
            { value: '', label: 'selecione…' },
            ...disponiveis.map((c) => ({ value: c.id, label: c.nome })),
          ]}
        />
        <span className="ml-auto text-xs text-slate-400">
          {disponiveis.length} cliente(s) com tráfego pago
        </span>
      </Card>
      <AbaChecklist clienteId={selecionado?.id} clienteNome={selecionado?.nome} />
    </div>
  );
}
