import type { Cliente } from '@/modules/clientes/types';
import { TIPO_NEGOCIO_LABEL, SERVICO_LABEL } from '@/modules/clientes/types';
import { StatusBadge } from '@/modules/clientes/components/StatusBadge';
import { Badge } from '@/shared/ui/Badge';

export function ClienteHeader({ cliente }: { cliente: Cliente }) {
  const iniciais = cliente.nome.slice(0, 2).toUpperCase();
  const dataEntrada = new Date(cliente.data_entrada).toLocaleDateString('pt-BR');

  return (
    <div className="flex items-center gap-4">
      {cliente.logo_url ? (
        <img
          src={cliente.logo_url}
          alt={`Logo de ${cliente.nome}`}
          className="h-16 w-16 rounded-lg border border-white/10 object-cover"
        />
      ) : (
        <div className="flex h-16 w-16 items-center justify-center rounded-lg bg-brand-500/10 text-lg font-semibold text-brand-300">
          {iniciais}
        </div>
      )}

      <div className="min-w-0">
        <div className="flex items-center gap-3">
          <h1 className="truncate text-2xl font-semibold text-white">
            {cliente.nome}
          </h1>
          <StatusBadge status={cliente.status} />
        </div>
        <p className="mt-1 text-sm text-slate-400">
          {TIPO_NEGOCIO_LABEL[cliente.tipo_negocio]} · cliente desde {dataEntrada}
          {cliente.conteudos_por_semana > 0 && (
            <> · {cliente.conteudos_por_semana} conteúdos/semana</>
          )}
        </p>
        {cliente.servicos.length > 0 && (
          <div className="mt-2 flex flex-wrap gap-1">
            {cliente.servicos.map((s) => (
              <Badge key={s} tone="blue">{SERVICO_LABEL[s]}</Badge>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
