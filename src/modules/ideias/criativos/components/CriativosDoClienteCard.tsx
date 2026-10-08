import { Link } from 'react-router-dom';
import { Card } from '@/shared/ui/Card';
import { Badge } from '@/shared/ui/Badge';
import { Spinner } from '@/shared/ui/Spinner';
import { useCriativosDoCliente } from '@/modules/ideias/criativos/criativosApi';
import { FORMATO_LABEL, STATUS_LABEL, STATUS_TONE, formatarData } from '@/modules/ideias/criativos/types';

export function CriativosDoClienteCard({ clienteId }: { clienteId: string }) {
  const { data, isLoading, error } = useCriativosDoCliente(clienteId);

  return (
    <Card className="p-5">
      <h3 className="mb-3 text-sm font-semibold text-slate-200">Ideias de criativos</h3>
      {isLoading ? (
        <Spinner />
      ) : error ? (
        <p className="text-sm text-slate-400">Não foi possível carregar as ideias de criativos.</p>
      ) : !data || data.length === 0 ? (
        <p className="text-sm text-slate-400">Nenhuma ideia de criativo marcada para este cliente.</p>
      ) : (
        <ul className="space-y-2">
          {data.map((i) => (
            <li key={i.id}>
              <Link
                to={`/ideias?aba=criativos&ideia=${i.id}`}
                className="flex flex-wrap items-center gap-2 rounded-xl border border-white/10 bg-white/[0.02] px-3 py-2 text-sm hover:border-brand-400/40"
              >
                <span className="min-w-0 flex-1 truncate text-slate-100">{i.titulo}</span>
                {i.formato && <Badge tone="amber">{FORMATO_LABEL[i.formato]}</Badge>}
                <Badge tone={STATUS_TONE[i.status]}>{STATUS_LABEL[i.status]}</Badge>
                <span className="text-xs text-slate-500">{formatarData(i.data_ideia)}</span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}
