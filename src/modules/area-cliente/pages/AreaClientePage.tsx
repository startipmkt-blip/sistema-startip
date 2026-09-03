import { useMemo, useState } from 'react';
import { useRelatorios } from '@/modules/area-cliente/api/areaClienteApi';
import { useClientes } from '@/modules/clientes/api/clientesApi';
import { RelatorioFormModal } from '@/modules/area-cliente/components/RelatorioFormModal';
import { calcularRoi, inputsDoRelatorio } from '@/modules/area-cliente/lib/roiCalc';
import type { RelatorioMensalView } from '@/modules/area-cliente/types';
import { PageHeader } from '@/shared/ui/PageHeader';
import { Select } from '@/shared/ui/Select';
import { Button } from '@/shared/ui/Button';
import { Card } from '@/shared/ui/Card';
import { Spinner } from '@/shared/ui/Spinner';
import { EmptyState } from '@/shared/ui/EmptyState';
import { formatMoney, formatMonth } from '@/shared/lib/format';
import { AnexoLink } from '@/shared/ui/AnexoLink';

export function AreaClientePage() {
  const [clienteId, setClienteId] = useState('');
  const { data: relatorios, isLoading } = useRelatorios(clienteId);
  const { data: clientes } = useClientes('');
  // Só clientes ativos que contratam tráfego pago.
  const clienteOptions = useMemo(
    () => [{ value: '', label: 'Todos' }, ...(clientes ?? [])
      .filter((c) => c.status === 'ativo' && (c.servicos ?? []).includes('trafego_pago'))
      .sort((a, b) => a.nome.localeCompare(b.nome))
      .map((c) => ({ value: c.id, label: c.nome }))],
    [clientes],
  );
  const lista = relatorios ?? [];

  const [formOpen, setFormOpen] = useState(false);
  const [editando, setEditando] = useState<RelatorioMensalView | undefined>();

  return (
    <div className="space-y-6">
      <PageHeader
        title="Área do Cliente"
        subtitle="Relatório mensal por cliente, com a calculadora ROI/ROAS embutida."
      >
        <Select
          options={clienteOptions}
          value={clienteId}
          onChange={(e) => setClienteId(e.target.value)}
        />
        <Button
          onClick={() => {
            setEditando(undefined);
            setFormOpen(true);
          }}
        >
          + Novo relatório
        </Button>
      </PageHeader>

      {isLoading ? (
        <Card className="flex justify-center p-12">
          <Spinner />
        </Card>
      ) : lista.length === 0 ? (
        <Card>
          <EmptyState message="Nenhum relatório para este filtro. Crie o primeiro com a calculadora." />
        </Card>
      ) : (
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          {lista.map((r) => {
            const res = calcularRoi(inputsDoRelatorio(r));
            const num = (v: number) => v.toLocaleString('pt-BR', { maximumFractionDigits: 2 });
            return (
              <Card
                key={r.id}
                className="cursor-pointer p-5 transition-colors hover:border-brand-400/40"
                onClick={() => {
                  setEditando(r);
                  setFormOpen(true);
                }}
              >
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-sm font-semibold text-slate-100">{r.cliente_nome}</div>
                    <div className="text-xs capitalize text-slate-400">
                      {formatMonth(r.mes_referencia)}
                    </div>
                  </div>
                  <span className="rounded-full bg-emerald-500/15 px-3 py-1 text-sm font-semibold text-emerald-300">
                    ROI {num(res.roi)}%
                  </span>
                </div>

                <div className="mt-4 grid grid-cols-4 gap-3 text-center">
                  <Metric label="ROAS" value={`${num(res.roas)}x`} />
                  <Metric label="Investimento" value={formatMoney(r.investimento)} />
                  <Metric label="Leads" value={String(r.leads)} />
                  <Metric label="CPL" value={formatMoney(res.cpl)} />
                </div>

                {r.resumo && <p className="mt-4 text-sm text-slate-300">{r.resumo}</p>}
                <AnexoLink
                  bucket="relatorios"
                  path={r.pdf_url}
                  prefixo="📄"
                  className="mt-2 inline-block text-xs font-medium text-brand-300 hover:underline"
                />
              </Card>
            );
          })}
        </div>
      )}

      {formOpen && (
        <RelatorioFormModal
          open={formOpen}
          onClose={() => setFormOpen(false)}
          relatorio={editando}
        />
      )}
    </div>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="text-xs text-slate-400">{label}</div>
      <div className="text-sm font-medium text-slate-100">{value}</div>
    </div>
  );
}
