import { useState } from 'react';
import {
  useReceitas,
  useDespesas,
  useMarcarDespesaPaga,
} from '@/modules/financeiro/api/financeiroApi';
import {
  DESPESA_CATEGORIA_LABEL,
  type Despesa,
  type ReceitaClienteView,
} from '@/modules/financeiro/types';
import { ReceitaFormModal } from '@/modules/financeiro/components/ReceitaFormModal';
import { DespesaFormModal } from '@/modules/financeiro/components/DespesaFormModal';
import { PageHeader } from '@/shared/ui/PageHeader';
import { StatCard } from '@/shared/ui/StatCard';
import { Card } from '@/shared/ui/Card';
import { Button } from '@/shared/ui/Button';
import { Badge } from '@/shared/ui/Badge';
import { Spinner } from '@/shared/ui/Spinner';
import { Table, type Column } from '@/shared/ui/Table';
import { formatMoney, formatDate } from '@/shared/lib/format';

export function FinanceiroPage() {
  const { data: receitas, isLoading: loadingR } = useReceitas();
  const { data: despesas, isLoading: loadingD } = useDespesas();
  const marcarPaga = useMarcarDespesaPaga();

  const [receitaEdit, setReceitaEdit] = useState<ReceitaClienteView | undefined>();
  const [receitaOpen, setReceitaOpen] = useState(false);
  const [despesaEdit, setDespesaEdit] = useState<Despesa | undefined>();
  const [despesaOpen, setDespesaOpen] = useState(false);

  const listaR = receitas ?? [];
  const listaD = despesas ?? [];

  // MRR = soma das receitas de contratos ativos.
  const mrr = listaR.filter((r) => r.ativo).reduce((s, r) => s + r.valor_mensal, 0);
  // Despesa mensal = recorrentes.
  const despesaMensal = listaD.filter((d) => d.recorrente).reduce((s, d) => s + d.valor, 0);
  // Contas a pagar = despesas pendentes.
  const aPagar = listaD.filter((d) => d.status === 'pendente').reduce((s, d) => s + d.valor, 0);

  const colReceitas: Column<ReceitaClienteView>[] = [
    { header: 'Cliente', render: (r) => r.cliente_nome },
    { header: 'Valor mensal', render: (r) => formatMoney(r.valor_mensal) },
    { header: 'Vencimento', render: (r) => `Dia ${r.dia_vencimento}` },
    {
      header: 'Pagamento',
      render: (r) => (
        <Badge tone={r.status === 'em_dia' ? 'green' : 'red'}>
          {r.status === 'em_dia' ? 'Em dia' : 'Atrasado'}
        </Badge>
      ),
    },
    {
      header: 'Contrato',
      render: (r) => (
        <Badge tone={r.ativo ? 'blue' : 'slate'}>{r.ativo ? 'Ativo' : 'Inativo'}</Badge>
      ),
    },
    {
      header: '',
      className: 'text-right',
      render: (r) => (
        <button
          className="text-xs font-medium text-brand-300 hover:underline"
          onClick={() => {
            setReceitaEdit(r);
            setReceitaOpen(true);
          }}
        >
          Editar
        </button>
      ),
    },
  ];

  const colDespesas: Column<Despesa>[] = [
    { header: 'Descrição', render: (d) => d.descricao },
    { header: 'Categoria', render: (d) => DESPESA_CATEGORIA_LABEL[d.categoria] },
    { header: 'Vencimento', render: (d) => formatDate(d.vencimento) },
    { header: 'Recorrência', render: (d) => (d.recorrente ? 'Mensal' : 'Única') },
    { header: 'Valor', render: (d) => formatMoney(d.valor) },
    {
      header: 'Status',
      render: (d) => (
        <button onClick={() => marcarPaga.mutate(d.id)} title="Alternar pago/pendente">
          <Badge tone={d.status === 'paga' ? 'green' : 'amber'}>
            {d.status === 'paga' ? 'Paga' : 'Pendente'}
          </Badge>
        </button>
      ),
    },
    {
      header: '',
      className: 'text-right',
      render: (d) => (
        <button
          className="text-xs font-medium text-brand-300 hover:underline"
          onClick={() => {
            setDespesaEdit(d);
            setDespesaOpen(true);
          }}
        >
          Editar
        </button>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Financeiro da agência"
        subtitle="Receita recorrente dos clientes, despesas e contas a pagar."
      />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Receita mensal (MRR)" value={formatMoney(mrr)} tone="green" hint={`${listaR.filter((r) => r.ativo).length} contratos ativos`} />
        <StatCard label="Despesas mensais" value={formatMoney(despesaMensal)} tone="red" />
        <StatCard label="Saldo previsto/mês" value={formatMoney(mrr - despesaMensal)} tone="blue" />
        <StatCard label="Contas a pagar" value={formatMoney(aPagar)} tone="amber" hint={`${listaD.filter((d) => d.status === 'pendente').length} pendentes`} />
      </div>

      {/* Pagamentos dos clientes */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold text-slate-200">Pagamentos dos clientes</h2>
          <Button
            variant="secondary"
            onClick={() => {
              setReceitaEdit(undefined);
              setReceitaOpen(true);
            }}
          >
            + Pagamento
          </Button>
        </div>
        <Card>
          {loadingR ? (
            <div className="flex justify-center p-12"><Spinner /></div>
          ) : (
            <Table columns={colReceitas} data={listaR} keyOf={(r) => r.id} emptyMessage="Nenhum pagamento cadastrado." />
          )}
        </Card>
      </div>

      {/* Despesas / contas a pagar */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold text-slate-200">Despesas e contas a pagar</h2>
          <Button
            variant="secondary"
            onClick={() => {
              setDespesaEdit(undefined);
              setDespesaOpen(true);
            }}
          >
            + Despesa
          </Button>
        </div>
        <Card>
          {loadingD ? (
            <div className="flex justify-center p-12"><Spinner /></div>
          ) : (
            <Table columns={colDespesas} data={listaD} keyOf={(d) => d.id} emptyMessage="Nenhuma despesa cadastrada." />
          )}
        </Card>
      </div>

      {receitaOpen && (
        <ReceitaFormModal
          open={receitaOpen}
          onClose={() => setReceitaOpen(false)}
          receita={receitaEdit}
        />
      )}
      {despesaOpen && (
        <DespesaFormModal
          open={despesaOpen}
          onClose={() => setDespesaOpen(false)}
          despesa={despesaEdit}
        />
      )}
    </div>
  );
}
