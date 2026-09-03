import { Badge } from '@/shared/ui/Badge';
import { STATUS_LABEL, type ClienteStatus } from '@/modules/clientes/types';

const TONE: Record<ClienteStatus, 'green' | 'amber' | 'slate'> = {
  ativo: 'green',
  prospect: 'amber',
  inativo: 'slate',
};

export function StatusBadge({ status }: { status: ClienteStatus }) {
  return <Badge tone={TONE[status]}>{STATUS_LABEL[status]}</Badge>;
}
