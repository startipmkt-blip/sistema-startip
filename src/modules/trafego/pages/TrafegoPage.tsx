import { useState } from 'react';
import { PageHeader } from '@/shared/ui/PageHeader';
import { Card } from '@/shared/ui/Card';
import { Select } from '@/shared/ui/Select';
import { useClientes } from '@/modules/clientes/api/clientesApi';
import { MetaAdsGestorPage } from '@/modules/meta-ads/pages/MetaAdsGestorPage';
import { AbaChecklist } from '../components/AbaChecklist';
import { AbaOtimizacoes } from '../components/AbaOtimizacoes';
import { AbaSaldo } from '../components/AbaSaldo';

type Aba = 'meta' | 'checklist' | 'otimizacoes' | 'saldo';

const ABAS: Array<{ id: Aba; label: string; icone: string }> = [
  { id: 'meta',        label: 'Meta Ads',    icone: '🎯' },
  { id: 'checklist',   label: 'Checklist',   icone: '📋' },
  { id: 'otimizacoes', label: 'Otimizações', icone: '📈' },
  { id: 'saldo',       label: 'Saldo diário', icone: '💰' },
];

export function TrafegoPage() {
  const [aba, setAba] = useState<Aba>('meta');

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
    <div className="space-y-4 p-4">
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
    <nav className={`flex gap-1 border-b border-white/10 ${aba === 'meta' ? 'px-4 pt-4' : ''}`}>
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
        <span className="text-xs uppercase tracking-wider text-slate-500">Cliente</span>
        <Select
          id="cli"
          value={clienteId}
          onChange={(e) => setClienteId(e.target.value)}
          options={[
            { value: '', label: 'selecione…' },
            ...disponiveis.map((c) => ({ value: c.id, label: c.nome })),
          ]}
        />
        <span className="ml-auto text-[11px] text-slate-500">
          {disponiveis.length} cliente(s) com tráfego pago
        </span>
      </Card>
      <AbaChecklist clienteId={selecionado?.id} clienteNome={selecionado?.nome} />
    </div>
  );
}
