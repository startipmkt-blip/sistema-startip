import { useState } from 'react';
import { useIndicacoes } from '@/modules/indicacao/api/indicacaoApi';
import {
  INDICACAO_STATUS_LABEL,
  type IndicacaoStatus,
  type IndicacaoView,
} from '@/modules/indicacao/types';
import { IndicacaoFormModal } from '@/modules/indicacao/components/IndicacaoFormModal';
import { PageHeader } from '@/shared/ui/PageHeader';
import { Select } from '@/shared/ui/Select';
import { Button } from '@/shared/ui/Button';
import { Card } from '@/shared/ui/Card';
import { Spinner } from '@/shared/ui/Spinner';
import { Badge } from '@/shared/ui/Badge';
import { Table, type Column } from '@/shared/ui/Table';
import { formatMoney, formatDate } from '@/shared/lib/format';
import { demoClienteOptions } from '@/shared/lib/demoData';

const STATUS_TONE: Record<IndicacaoStatus, 'green' | 'amber' | 'blue' | 'slate'> = {
  convertido: 'green',
  em_contato: 'amber',
  novo: 'blue',
  perdido: 'slate',
};

export function IndicacaoPage() {
  const [clienteId, setClienteId] = useState('');
  const { data: indicacoes, isLoading } = useIndicacoes(clienteId);
  const [formOpen, setFormOpen] = useState(false);
  const [editando, setEditando] = useState<IndicacaoView | undefined>();

  const columns: Column<IndicacaoView>[] = [
    { header: 'Indicado', render: (i) => i.nome_indicado },
    { header: 'Contato', render: (i) => i.contato },
    { header: 'Indicado por', render: (i) => i.cliente_nome },
    {
      header: 'Status',
      render: (i) => (
        <Badge tone={STATUS_TONE[i.status]}>{INDICACAO_STATUS_LABEL[i.status]}</Badge>
      ),
    },
    { header: 'Data', render: (i) => formatDate(i.created_at) },
    {
      header: 'Recompensa',
      className: 'text-right',
      render: (i) => (i.recompensa > 0 ? formatMoney(i.recompensa) : '—'),
    },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Indicação"
        subtitle="Indicações feitas pelos clientes e recompensas."
      >
        <Select
          options={demoClienteOptions}
          value={clienteId}
          onChange={(e) => setClienteId(e.target.value)}
        />
        <Button
          onClick={() => {
            setEditando(undefined);
            setFormOpen(true);
          }}
        >
          + Nova indicação
        </Button>
      </PageHeader>

      <Card>
        {isLoading ? (
          <div className="flex justify-center p-12">
            <Spinner />
          </div>
        ) : (
          <Table
            columns={columns}
            data={indicacoes ?? []}
            keyOf={(i) => i.id}
            onRowClick={(i) => {
              setEditando(i);
              setFormOpen(true);
            }}
            emptyMessage="Nenhuma indicação para este filtro."
          />
        )}
      </Card>

      {formOpen && (
        <IndicacaoFormModal
          open={formOpen}
          onClose={() => setFormOpen(false)}
          indicacao={editando}
        />
      )}
    </div>
  );
}
