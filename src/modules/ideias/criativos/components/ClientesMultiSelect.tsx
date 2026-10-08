import { useMemo, useState } from 'react';
import { useClientes } from '@/modules/clientes/api/clientesApi';

interface Props {
  value: string[];
  geral: boolean;
  onChange: (ids: string[]) => void;
  onGeralChange: (geral: boolean) => void;
}

export function ClientesMultiSelect({ value, geral, onChange, onGeralChange }: Props) {
  const { data: clientes = [], isLoading } = useClientes('');
  const [busca, setBusca] = useState('');
  const [aberto, setAberto] = useState(false);

  const porId = useMemo(() => new Map(clientes.map((c) => [c.id, c])), [clientes]);
  const filtrados = useMemo(() => {
    const t = busca.trim().toLowerCase();
    return clientes.filter((c) => !t || c.nome.toLowerCase().includes(t));
  }, [clientes, busca]);

  function alternar(id: string) {
    onChange(value.includes(id) ? value.filter((x) => x !== id) : [...value, id]);
  }

  function selecionarTodos() {
    onGeralChange(false);
    onChange(clientes.map((c) => c.id));
  }

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap items-center gap-3 text-xs">
        <label className="flex cursor-pointer items-center gap-2 text-slate-300">
          <input
            type="checkbox"
            checked={geral}
            onChange={(e) => {
              onGeralChange(e.target.checked);
              if (e.target.checked) onChange([]);
            }}
          />
          Ideia geral (sem cliente específico)
        </label>
        {!geral && (
          <>
            <button type="button" onClick={selecionarTodos} className="text-brand-300 hover:underline">
              Selecionar todos
            </button>
            {value.length > 0 && (
              <button type="button" onClick={() => onChange([])} className="text-slate-400 hover:underline">
                Limpar
              </button>
            )}
          </>
        )}
      </div>

      {!geral && (
        <>
          {value.length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              {value.map((id) => (
                <span
                  key={id}
                  className="inline-flex items-center gap-1 rounded-full bg-brand-500/15 px-2.5 py-1 text-xs text-brand-100 ring-1 ring-inset ring-brand-400/30"
                >
                  {porId.get(id)?.nome ?? 'Cliente'}
                  <button
                    type="button"
                    onClick={() => alternar(id)}
                    className="rounded-full px-1 text-brand-200 hover:bg-white/10"
                    aria-label="Remover cliente"
                  >
                    ✕
                  </button>
                </span>
              ))}
            </div>
          )}

          <div className="relative">
            <input
              type="text"
              value={busca}
              onChange={(e) => { setBusca(e.target.value); setAberto(true); }}
              onFocus={() => setAberto(true)}
              placeholder={isLoading ? 'Carregando clientes…' : 'Buscar cliente para adicionar…'}
              className="glass-field w-full px-3 py-2 text-sm focus:border-brand-400/60 focus:outline-none focus:ring-1 focus:ring-brand-400/50"
            />
            {aberto && (
              <>
                <div className="fixed inset-0 z-10" onClick={() => setAberto(false)} />
                <ul className="absolute z-20 mt-1 max-h-56 w-full overflow-y-auto rounded-xl border border-white/10 bg-slate-900 py-1 shadow-glass">
                  {filtrados.length === 0 && (
                    <li className="px-3 py-2 text-xs text-slate-500">Nenhum cliente encontrado.</li>
                  )}
                  {filtrados.map((c) => {
                    const marcado = value.includes(c.id);
                    return (
                      <li key={c.id}>
                        <button
                          type="button"
                          onClick={() => alternar(c.id)}
                          className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-slate-200 hover:bg-white/5"
                        >
                          <span className={`grid h-4 w-4 place-items-center rounded border text-[10px] ${marcado ? 'border-brand-400 bg-brand-500 text-white' : 'border-white/20'}`}>
                            {marcado ? '✓' : ''}
                          </span>
                          {c.nome}
                        </button>
                      </li>
                    );
                  })}
                </ul>
              </>
            )}
          </div>
        </>
      )}
    </div>
  );
}
