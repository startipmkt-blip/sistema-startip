import { useMemo, useState } from 'react';
import { useContratos, useApagarContrato } from '@/modules/contratos/api/contratosApi';
import { NovoContratoModal } from '@/modules/contratos/components/NovoContratoModal';
import { ModelosContrato } from '@/modules/contratos/components/ModelosContrato';
import { gerarPdfContrato } from '@/modules/contratos/lib/gerarPdf';
import type { Contract, ContractStatus } from '@/modules/contratos/types';
import { Button } from '@/shared/ui/Button';
import { Card } from '@/shared/ui/Card';
import { Badge } from '@/shared/ui/Badge';
import { Spinner } from '@/shared/ui/Spinner';
import { EmptyState } from '@/shared/ui/EmptyState';
import { StatCard } from '@/shared/ui/StatCard';
import { formatMoney } from '@/shared/lib/format';

const TABS: { id: ContractStatus | 'todos'; label: string; tone: Parameters<typeof Badge>[0]['tone'] }[] = [
  { id: 'todos',      label: 'Todos',      tone: 'slate' },
  { id: 'rascunho',   label: 'Rascunho',   tone: 'slate' },
  { id: 'aguardando', label: 'Aguardando', tone: 'amber' },
  { id: 'assinado',   label: 'Assinado',   tone: 'green' },
  { id: 'expirado',   label: 'Expirado',   tone: 'red' },
  { id: 'cancelado',  label: 'Cancelado',  tone: 'slate' },
];

function fmtData(iso: string | null): string {
  return iso ? new Date(iso).toLocaleDateString('pt-BR') : '—';
}

export function ContratosPage() {
  const [aba, setAba] = useState<'contratos' | 'modelos'>('contratos');
  const [status, setStatus] = useState<ContractStatus | 'todos'>('todos');
  const { data: contratos, isLoading } = useContratos(status);
  const [novoOpen, setNovoOpen] = useState(false);
  const [editando, setEditando] = useState<Contract | null>(null);
  const apagar = useApagarContrato();

  const kpis = useMemo(() => {
    const lista = contratos ?? [];
    const assinados = lista.filter((c) => c.status === 'assinado');
    return {
      total:      lista.length,
      assinados:  assinados.length,
      mrr:        assinados.reduce((s, c) => s + Number(c.monthly_value ?? 0), 0),
      onboarding: assinados.reduce((s, c) => s + Number(c.onboarding_value ?? 0), 0),
    };
  }, [contratos]);

  function baixarPdf(c: Contract) {
    const blob = gerarPdfContrato(c, c.body_text);
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${(c.razao_social || c.titulo).replace(/[^A-Za-z0-9._-]+/g, '_')}.pdf`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 5000);
  }

  return (
    <div className="space-y-4 p-4">
      <header className="flex flex-wrap items-center gap-3">
        <div>
          <h1 className="text-xl font-semibold text-white">Contratos</h1>
          <p className="text-xs text-slate-400">Gere, edite e baixe contratos dos clientes. Assinatura eletrônica (Autentique) plugável.</p>
        </div>
        <div className="ml-auto flex flex-wrap items-center gap-2">
          {aba === 'contratos' && (
            <Button onClick={() => { setEditando(null); setNovoOpen(true); }}>+ Novo contrato</Button>
          )}
        </div>
      </header>

      {/* Abas */}
      <div className="flex gap-1 border-b border-white/10">
        {([
          { id: 'contratos', label: 'Contratos' },
          { id: 'modelos',   label: 'Modelos de contrato' },
        ] as const).map((t) => (
          <button
            key={t.id}
            onClick={() => setAba(t.id)}
            className={`border-b-2 px-4 py-2 text-sm font-medium transition-colors ${
              aba === t.id ? 'border-brand-500 text-brand-300' : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {aba === 'modelos' ? <ModelosContrato /> : (<>


      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard label="Contratos" value={String(kpis.total)} tone="slate" />
        <StatCard label="Assinados" value={String(kpis.assinados)} tone="green" />
        <StatCard label="MRR" value={formatMoney(kpis.mrr)} tone="blue" />
        <StatCard label="Onboarding acumulado" value={formatMoney(kpis.onboarding)} tone="slate" />
      </div>

      <div className="flex flex-wrap gap-1">
        {TABS.map((t) => (
          <button
            key={t.id}
            onClick={() => setStatus(t.id)}
            className={`rounded-full px-3 py-1 text-xs font-medium ${
              status === t.id ? 'bg-brand-500 text-white' : 'bg-white/5 text-slate-300 hover:bg-white/10'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      <Card className="p-0">
        {isLoading ? (
          <div className="flex justify-center p-10"><Spinner /></div>
        ) : !contratos || contratos.length === 0 ? (
          <EmptyState message="Nenhum contrato ainda. Clique em '+ Novo contrato' pra começar." />
        ) : (
          <table className="w-full text-sm">
            <thead className="border-b border-white/5 text-left text-xs text-slate-400">
              <tr>
                <th className="p-3">Cliente</th>
                <th className="p-3">Vigência</th>
                <th className="p-3">Onboarding</th>
                <th className="p-3">Mensalidade</th>
                <th className="p-3">Status</th>
                <th className="p-3 text-right">Ações</th>
              </tr>
            </thead>
            <tbody>
              {contratos.map((c) => (
                <tr key={c.id} className="border-t border-white/5 hover:bg-white/[0.02]">
                  <td className="p-3">
                    <div className="font-medium text-slate-100">{c.razao_social || c.titulo}</div>
                    <div className="text-xs text-slate-500">{c.signer_name || c.signer_email || '—'}</div>
                  </td>
                  <td className="p-3 text-xs text-slate-300">
                    {fmtData(c.start_date)} → {fmtData(c.end_date)}
                    <div className="text-[10px] text-slate-500">{c.duration_months}m</div>
                  </td>
                  <td className="p-3 text-slate-200">{formatMoney(Number(c.onboarding_value ?? 0))}</td>
                  <td className="p-3 text-slate-200">{formatMoney(Number(c.monthly_value ?? 0))}</td>
                  <td className="p-3">
                    <Badge tone={TABS.find((t) => t.id === c.status)?.tone ?? 'slate'}>{c.status}</Badge>
                  </td>
                  <td className="p-3">
                    <div className="flex justify-end gap-1">
                      <Button variant="secondary" onClick={() => baixarPdf(c)}>📄 PDF</Button>
                      <Button variant="secondary" onClick={() => { setEditando(c); setNovoOpen(true); }}>Editar</Button>
                      <button
                        onClick={() => { if (confirm('Apagar contrato?')) apagar.mutate(c.id); }}
                        className="rounded-md px-2 text-xs text-red-300 hover:bg-red-500/10"
                      >
                        🗑️
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Card>

      {novoOpen && (
        <NovoContratoModal
          open={novoOpen}
          onClose={() => { setNovoOpen(false); setEditando(null); }}
          contrato={editando}
        />
      )}
      </>)}
    </div>
  );
}
