import { useMemo, useState } from 'react';
import { useIdeias, useToggleFixada } from '@/modules/ideias/api/ideiasApi';
import { CATEGORIAS, type Ideia, type IdeiaCategoria } from '@/modules/ideias/types';
import { IdeiaFormModal } from '@/modules/ideias/components/IdeiaFormModal';
import { PageHeader } from '@/shared/ui/PageHeader';
import { Button } from '@/shared/ui/Button';
import { Card } from '@/shared/ui/Card';
import { Spinner } from '@/shared/ui/Spinner';
import { EmptyState } from '@/shared/ui/EmptyState';

export function IdeiasPage() {
  const { data: ideias, isLoading } = useIdeias();
  const toggleFixada = useToggleFixada();
  const [formOpen, setFormOpen] = useState(false);
  const [editando, setEditando] = useState<Ideia | undefined>();
  const [filtroCategoria, setFiltroCategoria] = useState<IdeiaCategoria | 'todas'>('todas');
  const [busca, setBusca] = useState('');

  const filtradas = useMemo(() => {
    let lista = ideias ?? [];
    if (filtroCategoria !== 'todas') {
      lista = lista.filter((i) => i.categoria === filtroCategoria);
    }
    if (busca.trim()) {
      const termo = busca.toLowerCase();
      lista = lista.filter(
        (i) => i.titulo.toLowerCase().includes(termo) || i.descricao.toLowerCase().includes(termo),
      );
    }
    return lista;
  }, [ideias, filtroCategoria, busca]);

  const fixadas = filtradas.filter((i) => i.fixada);
  const normais = filtradas.filter((i) => !i.fixada);

  const categoriaInfo = (cat: IdeiaCategoria) => CATEGORIAS.find((c) => c.id === cat);

  const formatData = (iso: string) =>
    new Date(iso).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' });

  const IdeiaCard = ({ ideia }: { ideia: Ideia }) => {
    const cat = categoriaInfo(ideia.categoria);
    return (
      <Card className="group relative p-4 transition-colors hover:border-brand-500/30">
        <button
          onClick={() => { setEditando(ideia); setFormOpen(true); }}
          className="w-full text-left"
        >
          <div className="mb-2 flex items-start justify-between gap-2">
            <h3 className="font-medium text-slate-100">{ideia.titulo}</h3>
            {cat && (
              <span className={`shrink-0 rounded-full px-2 py-0.5 text-xs font-medium ${cat.cor}`}>
                {cat.label}
              </span>
            )}
          </div>
          {ideia.descricao && (
            <p className="mb-3 text-sm leading-relaxed text-slate-400 line-clamp-3">{ideia.descricao}</p>
          )}
          <div className="flex items-center justify-between text-xs text-slate-500">
            <span>{ideia.autor_nome || '—'}</span>
            <span>{formatData(ideia.created_at)}</span>
          </div>
        </button>
        <button
          onClick={(e) => { e.stopPropagation(); toggleFixada.mutate({ id: ideia.id, fixada: !ideia.fixada }); }}
          className={`absolute right-2 top-2 rounded p-1 text-sm transition-opacity ${
            ideia.fixada ? 'text-amber-400 opacity-100' : 'text-slate-500 opacity-0 group-hover:opacity-100'
          } hover:text-amber-300`}
          title={ideia.fixada ? 'Desafixar' : 'Fixar'}
        >
          📌
        </button>
      </Card>
    );
  };

  return (
    <div className="space-y-6">
      <PageHeader title="Ideias" subtitle="Anote ideias que surgem no dia a dia para não perder nenhuma.">
        <Button onClick={() => { setEditando(undefined); setFormOpen(true); }}>+ Nova ideia</Button>
      </PageHeader>

      {/* Filtros */}
      <div className="flex flex-wrap items-center gap-3">
        <input
          type="text"
          value={busca}
          onChange={(e) => setBusca(e.target.value)}
          placeholder="Buscar ideias..."
          className="w-full max-w-xs rounded-lg border border-white/10 bg-slate-800 px-3 py-2 text-sm text-slate-100 placeholder-slate-500 outline-none focus:border-brand-500 sm:w-auto"
        />
        <div className="flex flex-wrap gap-1">
          <button
            onClick={() => setFiltroCategoria('todas')}
            className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${
              filtroCategoria === 'todas'
                ? 'bg-brand-500/20 text-brand-300'
                : 'bg-slate-700 text-slate-400 hover:text-slate-200'
            }`}
          >
            Todas
          </button>
          {CATEGORIAS.map((c) => (
            <button
              key={c.id}
              onClick={() => setFiltroCategoria(c.id)}
              className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${
                filtroCategoria === c.id ? c.cor : 'bg-slate-700 text-slate-400 hover:text-slate-200'
              }`}
            >
              {c.label}
            </button>
          ))}
        </div>
      </div>

      {isLoading ? (
        <Card className="flex justify-center p-12"><Spinner /></Card>
      ) : filtradas.length === 0 ? (
        <Card>
          <EmptyState message={busca || filtroCategoria !== 'todas' ? 'Nenhuma ideia encontrada com esses filtros.' : 'Nenhuma ideia anotada ainda. Clique em "+ Nova ideia" para começar!'} />
        </Card>
      ) : (
        <div className="space-y-6">
          {fixadas.length > 0 && (
            <div>
              <h2 className="mb-3 flex items-center gap-1.5 text-sm font-medium text-amber-400">
                📌 Fixadas
              </h2>
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {fixadas.map((i) => <IdeiaCard key={i.id} ideia={i} />)}
              </div>
            </div>
          )}
          <div>
            {fixadas.length > 0 && (
              <h2 className="mb-3 text-sm font-medium text-slate-400">Todas</h2>
            )}
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {normais.map((i) => <IdeiaCard key={i.id} ideia={i} />)}
            </div>
          </div>
        </div>
      )}

      {formOpen && (
        <IdeiaFormModal open={formOpen} onClose={() => setFormOpen(false)} ideia={editando} />
      )}
    </div>
  );
}
