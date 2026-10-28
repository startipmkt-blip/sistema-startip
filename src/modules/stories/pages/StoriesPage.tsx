import { useState } from 'react';
import { PageHeader } from '@/shared/ui/PageHeader';
import { Spinner } from '@/shared/ui/Spinner';
import { useClientes } from '@/modules/clientes/api/clientesApi';
import { StoriesView } from '@/modules/stories/components/StoriesView';
import { StoriesAdmin } from '@/modules/stories/components/StoriesAdmin';

type Aba = 'ideias' | 'gerenciar';

export function StoriesPage() {
  const { data: clientes, isLoading } = useClientes('');
  const [aba, setAba] = useState<Aba>('ideias');
  const lista = (clientes ?? []).map((c) => ({ id: c.id, nome: c.nome }));

  return (
    <div className="space-y-6">
      <PageHeader
        title="Ideias de Stories"
        subtitle="Banco de ideias para a Black Friday 2026. Inspiração para o cliente produzir e postar quando quiser."
      />
      <div role="tablist" className="flex gap-2">
        {([['ideias', 'Ideias'], ['gerenciar', 'Gerenciar']] as const).map(([id, label]) => (
          <button
            key={id}
            role="tab"
            aria-selected={aba === id}
            onClick={() => setAba(id)}
            className={`rounded-xl px-4 py-2 text-sm font-semibold focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-400 ${aba === id ? 'bg-gradient-brand text-white shadow-glow' : 'border border-white/15 bg-white/5 text-slate-200 hover:bg-white/10'}`}
          >
            {label}
          </button>
        ))}
      </div>
      {isLoading ? <div className="flex justify-center py-16"><Spinner /></div>
        : !lista.length ? <p className="text-sm text-slate-400">Nenhum cliente cadastrado.</p>
        : aba === 'ideias' ? <StoriesView clientes={lista} /> : <StoriesAdmin clientes={lista} />}
    </div>
  );
}
