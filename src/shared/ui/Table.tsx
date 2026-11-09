import type { ReactNode } from 'react';
import { EmptyState } from '@/shared/ui/EmptyState';

export interface Column<T> {
  header: string;
  render: (row: T) => ReactNode;
  className?: string;
}

interface TableProps<T> {
  columns: Column<T>[];
  data: T[];
  keyOf: (row: T) => string;
  onRowClick?: (row: T) => void;
  emptyMessage?: string;
  /** Celular: `cards` (padrão) mostra cada linha como cartão; `scroll` mantém a tabela com rolagem lateral. */
  mobile?: 'cards' | 'scroll';
}

export function Table<T>({
  columns,
  data,
  keyOf,
  onRowClick,
  emptyMessage = 'Nenhum registro encontrado.',
  mobile = 'cards',
}: TableProps<T>) {
  if (data.length === 0) return <EmptyState message={emptyMessage} />;

  const [titulo, ...resto] = columns;
  const campos = resto.filter((c) => c.header);
  const acoes = resto.filter((c) => !c.header);

  return (
    <>
      {mobile === 'cards' && (
        <ul className="space-y-2 md:hidden">
          {data.map((row) => (
            <li
              key={keyOf(row)}
              onClick={() => onRowClick?.(row)}
              className={`cartao-linha rounded-xl border border-white/[0.08] bg-white/[0.02] p-3.5 ${
                onRowClick ? 'cursor-pointer active:bg-white/[0.05]' : ''
              }`}
            >
              {titulo && <div className="min-w-0 text-[15px] font-medium text-slate-100">{titulo.render(row)}</div>}
              {campos.length > 0 && (
                <dl className="mt-2 grid grid-cols-2 gap-x-3 gap-y-2 text-sm">
                  {campos.map((col) => (
                    <div key={col.header} className="min-w-0">
                      <dt className="text-[11px] font-medium uppercase tracking-wide text-slate-400">{col.header}</dt>
                      <dd className="mt-0.5 min-w-0 break-words text-slate-300">{col.render(row)}</dd>
                    </div>
                  ))}
                </dl>
              )}
              {acoes.length > 0 && (
                <div className="mt-3 flex flex-wrap items-center justify-end gap-2 border-t border-white/[0.06] pt-2.5" onClick={(e) => e.stopPropagation()}>
                  {acoes.map((col, i) => <div key={i}>{col.render(row)}</div>)}
                </div>
              )}
            </li>
          ))}
        </ul>
      )}

      <div className={`overflow-x-auto ${mobile === 'cards' ? 'hidden md:block' : ''}`}>
        <table className="w-full border-collapse text-sm">
          <thead>
            <tr className="border-b border-white/10 bg-white/[0.03] text-left text-xs font-medium text-slate-400">
              {columns.map((col, i) => (
                <th key={col.header || i} className={`whitespace-nowrap px-4 py-2.5 font-medium ${col.className ?? ''}`}>
                  {col.header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-white/[0.06]">
            {data.map((row) => (
              <tr
                key={keyOf(row)}
                onClick={() => onRowClick?.(row)}
                className={onRowClick ? 'cursor-pointer transition-colors hover:bg-white/[0.04]' : ''}
              >
                {columns.map((col, i) => (
                  <td key={col.header || i} className={`h-12 px-4 py-2 text-slate-300 ${col.className ?? ''}`}>
                    {col.render(row)}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}
