import { Link } from 'react-router-dom';
import { useAuth } from '@/shared/auth/AuthProvider';
import { useRelatorios } from '@/modules/area-cliente/api/areaClienteApi';
import { useIdeias } from '@/modules/aprovacao-conteudo/api/aprovacaoApi';
import { calcularRoi, inputsDoRelatorio } from '@/modules/area-cliente/lib/roiCalc';
import { demoFindCliente } from '@/shared/lib/demoData';
import { Card } from '@/shared/ui/Card';
import { StatCard } from '@/shared/ui/StatCard';
import { Spinner } from '@/shared/ui/Spinner';
import { EmptyState } from '@/shared/ui/EmptyState';
import { formatMoney, formatMonth } from '@/shared/lib/format';
import { AnexoLink } from '@/shared/ui/AnexoLink';

const num = (v: number) => v.toLocaleString('pt-BR', { maximumFractionDigits: 2 });

export function PortalRelatorios() {
  const { profile } = useAuth();
  const clienteId = profile?.cliente_id ?? '';
  const { data: relatorios, isLoading } = useRelatorios(clienteId);
  const { data: ideias } = useIdeias(clienteId);
  const lista = relatorios ?? [];

  const nomeCliente = clienteId ? demoFindCliente(clienteId)?.nome : null;
  const pendentesAprovacao = (ideias ?? []).filter((i) => i.status === 'pendente').length;
  const ultimo = lista[0];
  const resUltimo = ultimo ? calcularRoi(inputsDoRelatorio(ultimo)) : null;

  if (isLoading) {
    return <Card className="flex justify-center p-12"><Spinner /></Card>;
  }

  return (
    <div className="space-y-6">
      {/* Saudação + resumo */}
      <Card className="bg-brand-500/10 p-5">
        <h1 className="text-xl font-semibold text-white">
          Olá{nomeCliente ? `, ${nomeCliente}` : ''} 👋
        </h1>
        <p className="mt-1 text-sm text-slate-300">Acompanhe seus resultados e o andamento do seu projeto por aqui.</p>
        <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-3">
          {resUltimo && (
            <>
              <StatCard label={`ROAS (${formatMonth(ultimo.mes_referencia)})`} value={`${num(resUltimo.roas)}x`} tone="green" />
              <StatCard label="ROI do último mês" value={`${num(resUltimo.roi)}%`} tone={resUltimo.roi >= 0 ? 'green' : 'red'} />
            </>
          )}
          <Link to="/portal/aprovacao">
            <StatCard
              label="Conteúdos p/ aprovar"
              value={String(pendentesAprovacao)}
              tone={pendentesAprovacao > 0 ? 'amber' : 'slate'}
              hint={pendentesAprovacao > 0 ? 'toque para revisar' : 'tudo em dia'}
            />
          </Link>
        </div>
      </Card>

      <div>
        <h2 className="text-lg font-semibold text-white">Seus resultados</h2>
        <p className="text-sm text-slate-400">Relatórios mensais das suas campanhas.</p>
      </div>

      {lista.length === 0 ? (
        <Card><EmptyState message="Ainda não há relatórios publicados." /></Card>
      ) : (
        <div className="space-y-4">
          {lista.map((r) => {
            const res = calcularRoi(inputsDoRelatorio(r));
            return (
              <Card key={r.id} className="p-5">
                <div className="mb-4 flex items-center justify-between">
                  <h2 className="text-base font-semibold capitalize text-slate-100">
                    {formatMonth(r.mes_referencia)}
                  </h2>
                  <AnexoLink
                    bucket="relatorios"
                    path={r.pdf_url}
                    prefixo="📄"
                    className="text-xs font-medium text-brand-300 hover:underline"
                  />
                </div>
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                  <StatCard label="Investimento" value={formatMoney(r.investimento)} tone="slate" />
                  <StatCard label="Leads" value={String(r.leads)} tone="blue" />
                  <StatCard label="ROAS" value={`${num(res.roas)}x`} tone="green" />
                  <StatCard label="ROI" value={`${num(res.roi)}%`} tone={res.roi >= 0 ? 'green' : 'red'} />
                </div>
                {r.resumo && (
                  <div className="mt-4">
                    <div className="text-xs font-medium text-slate-400">Resumo do mês</div>
                    <p className="mt-1 text-sm text-slate-200">{r.resumo}</p>
                  </div>
                )}
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
