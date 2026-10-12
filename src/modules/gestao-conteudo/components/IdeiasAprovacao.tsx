import { Card } from '@/shared/ui/Card';
import { Select } from '@/shared/ui/Select';
import { Button } from '@/shared/ui/Button';
import { Spinner } from '@/shared/ui/Spinner';
import { useIdeiasDoMes } from '@/modules/gestao-conteudo/api/ideiasApi';
import { STATUS_IDEIA, STATUS_IDEIA_ORDEM, mesLabel } from '@/modules/gestao-conteudo/types';
import type { ClienteGestao } from '@/modules/gestao-conteudo/utils';
import { DetalheIdeias } from './DetalheIdeias';
import { GlassIcon } from '@/shared/ui/GlassIcon';

interface Props {
  clientes: ClienteGestao[];
  clienteId: string;
  mes: string;
  onCliente: (id: string | null) => void;
}

/** Sub-aba "Ideias de conteúdo": o cliente aprova a ideia antes de virar produção. */
export function IdeiasAprovacao({ clientes, clienteId, mes, onCliente }: Props) {
  const ideiasQ = useIdeiasDoMes(mes);
  const ideias = ideiasQ.data ?? [];
  const cliente = clientes.find((c) => c.id === clienteId) ?? null;

  return (
    <div className="space-y-4">
      <Card className="flex flex-wrap items-end gap-3 p-3">
        <div className="min-w-[14rem] flex-1 sm:flex-none">
          <Select
            label="Cliente"
            value={clienteId}
            onChange={(e) => onCliente(e.target.value || null)}
            options={[
              { value: '', label: `Todos os clientes (${clientes.length})` },
              ...clientes.map((c) => ({ value: c.id, label: c.nome })),
            ]}
          />
        </div>
        {cliente && <Button variant="secondary" onClick={() => onCliente(null)}>← Ver todos</Button>}
        <p className="basis-full text-xs text-slate-400 sm:ml-auto sm:basis-auto">
          Envie as ideias do mês para o cliente aprovar <em>antes</em> de produzir. Ele aprova ou reprova
          (explicando o que quer mudar).
        </p>
      </Card>

      {ideiasQ.isLoading && <div className="flex justify-center py-16"><Spinner /></div>}
      {ideiasQ.error && (
        <Card className="p-4 text-sm text-red-300">
          Erro ao carregar as ideias: {(ideiasQ.error as Error).message}
          <br />
          <span className="text-xs text-red-200/70">
            Se a mensagem citar &quot;ideias_conteudo&quot;, aplique a migration 0055 no Supabase.
          </span>
        </Card>
      )}

      {!ideiasQ.isLoading && cliente && (
        <DetalheIdeias
          key={cliente.id + mes}
          cliente={cliente}
          mes={mes}
          ideias={ideias.filter((i) => i.cliente_id === cliente.id)}
        />
      )}

      {!ideiasQ.isLoading && !cliente && (
        <Card className="overflow-x-auto p-0">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-white/10 text-left text-xs text-slate-400">
                <th className="px-3 py-2 font-medium">Cliente · {mesLabel(mes)}</th>
                {STATUS_IDEIA_ORDEM.map((s) => (
                  <th key={s} className="px-3 py-2 text-center font-medium">
                    <GlassIcon emoji={STATUS_IDEIA[s].emoji} /> {STATUS_IDEIA[s].label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {clientes.map((c) => {
                const dele = ideias.filter((i) => i.cliente_id === c.id);
                return (
                  <tr
                    key={c.id}
                    onClick={() => onCliente(c.id)}
                    className="cursor-pointer border-b border-white/5 hover:bg-white/[0.04]"
                  >
                    <td className="px-3 py-2 font-medium text-slate-100">{c.nome}</td>
                    {STATUS_IDEIA_ORDEM.map((s) => {
                      const n = dele.filter((i) => i.status === s).length;
                      return (
                        <td key={s} className={`px-3 py-2 text-center ${n ? 'text-white' : 'text-slate-600'}`}>{n}</td>
                      );
                    })}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </Card>
      )}
    </div>
  );
}
